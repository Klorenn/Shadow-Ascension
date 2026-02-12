#![no_std]

//! # Stellar Survivor Arena
//!
//! Wager-match (pool) for "Last Man Standing" async gameplay.
//! Players pay entry (e.g. 10 XLM), join a pool (min 5, max 30).
//! Each plays their run; best survival time wins the whole pool.
//! Integrates with Stellar Game Studio Hub for start_game / end_game.
//! ZK proof placeholder for provable fairness (score verification).

use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Bytes, Env, Vec,
};
use soroban_sdk::token::{TokenClient, TokenInterface};

// ============================================================================
// Game Hub interface (Stellar Hacks Hub - mandatory)
// ============================================================================

#[contractclient(name = "GameHubClient")]
pub trait GameHub {
    fn start_game(
        env: Env,
        game_id: Address,
        session_id: u32,
        player1: Address,
        player2: Address,
        player1_points: i128,
        player2_points: i128,
    );

    fn end_game(env: Env, session_id: u32, player1_won: bool);
}

// ============================================================================
// Errors
// ============================================================================

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    ArenaNotFound = 1,
    ArenaNotOpen = 2,
    ArenaNotStarted = 3,
    ArenaAlreadyResolved = 4,
    NotInArena = 5,
    AlreadySubmitted = 6,
    NotEnoughPlayers = 7,
    ArenaFull = 8,
    InvalidProof = 9,
    NotAdmin = 10,
    ConfigAlreadySet = 11,
    InvalidConfig = 12,
    NotAllSubmitted = 13,
}

// ============================================================================
// Data types
// ============================================================================

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ArenaStatus {
    Open = 0,    // accepting joins
    Started = 1, // round started, accepting submissions
    Resolved = 2,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ArenaConfig {
    pub entry_fee: i128,
    pub min_players: u32,
    pub max_players: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ArenaSession {
    pub players: Vec<Address>,
    pub pool: i128,
    pub status: ArenaStatus,
    pub winner: Option<Address>,
    pub submitted_count: u32,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    GameHub,
    Token,
    Config,
    NextArenaId,
    /// Arena session by id
    Arena(u32),
    /// Survival time (seconds) for arena_id and player index
    SurvivalTime(u32, u32),
}

// ============================================================================
// Constants
// ============================================================================

const TTL_LEDGERS: u32 = 518_400; // ~30 days

// ============================================================================
// Contract
// ============================================================================

#[contract]
pub struct StellarSurvivorArena;

#[contractimpl]
impl StellarSurvivorArena {
    /// One-time init: admin, Game Hub address, token, and arena params.
    /// Game Hub (hackathon): CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG
    pub fn initialize_arena(
        env: Env,
        admin: Address,
        game_hub: Address,
        token: Address,
        entry_fee: i128,
        min_players: u32,
        max_players: u32,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Config) {
            return Err(Error::ConfigAlreadySet);
        }
        if entry_fee <= 0 || min_players < 2 || max_players < min_players || max_players > 30 {
            return Err(Error::InvalidConfig);
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::GameHub, &game_hub);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(
            &DataKey::Config,
            &ArenaConfig {
                entry_fee,
                min_players,
                max_players,
            },
        );
        env.storage().instance().set(&DataKey::NextArenaId, &0u32);
        Ok(())
    }

    /// Join the current open arena (or create one). Pays entry_fee to the pool.
    pub fn join_arena(env: Env, player: Address) -> Result<u32, Error> {
        player.require_auth();

        let config: ArenaConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(Error::InvalidConfig)?;
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let mut next_id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::NextArenaId)
            .unwrap_or(0);

        // Find or create an open arena
        let mut arena_id = next_id;
        let mut session: Option<ArenaSession> = None;
        for i in 0..next_id {
            let key = DataKey::Arena(i);
            if let Some(s) = env.storage().temporary().get(&key) {
                let s: ArenaSession = s;
                if s.status == ArenaStatus::Open && (s.players.len() as u32) < config.max_players {
                    arena_id = i;
                    session = Some(s);
                    break;
                }
            }
        }
        if session.is_none() {
            // create new arena
            session = Some(ArenaSession {
                players: Vec::new(&env),
                pool: 0,
                status: ArenaStatus::Open,
                winner: None,
                submitted_count: 0,
            });
            env.storage()
                .instance()
                .set(&DataKey::NextArenaId, &(next_id + 1));
        }

        let mut s = session.unwrap();
        if (s.players.len() as u32) >= config.max_players {
            return Err(Error::ArenaFull);
        }

        // Transfer entry_fee from player to this contract
        let client = TokenClient::new(&env, &token);
        client.transfer(&env, &player, &env.current_contract_address(), &config.entry_fee);

        s.players.push_back(player);
        s.pool += config.entry_fee;

        let key = DataKey::Arena(arena_id);
        env.storage().temporary().set(&key, &s);
        env.storage().temporary().extend_ttl(&key, TTL_LEDGERS, TTL_LEDGERS);

        Ok(arena_id)
    }

    /// Close registration and start the round. Calls Hub start_game.
    pub fn start_round(env: Env, arena_id: u32) -> Result<(), Error> {
        let key = DataKey::Arena(arena_id);
        let mut session: ArenaSession = env
            .storage()
            .temporary()
            .get(&key)
            .ok_or(Error::ArenaNotFound)?;

        let config: ArenaConfig = env.storage().instance().get(&DataKey::Config).unwrap();
        if session.status != ArenaStatus::Open {
            return Err(Error::ArenaNotOpen);
        }
        if (session.players.len() as u32) < config.min_players {
            return Err(Error::NotEnoughPlayers);
        }

        session.status = ArenaStatus::Started;
        env.storage().temporary().set(&key, &session);
        env.storage().temporary().extend_ttl(&key, TTL_LEDGERS, TTL_LEDGERS);

        let hub: Address = env.storage().instance().get(&DataKey::GameHub).unwrap();
        let game_hub = GameHubClient::new(&env, &hub);
        let p1 = session.players.get(0).unwrap();
        let p2 = session.players.get(1).unwrap_or(p1.clone());
        game_hub.start_game(
            &env.current_contract_address(),
            &arena_id,
            &p1,
            &p2,
            &config.entry_fee,
            &config.entry_fee,
        );

        Ok(())
    }

    /// Submit survival time (seconds) and ZK proof. Proof is verified (placeholder: non-empty).
    pub fn submit_result(
        env: Env,
        arena_id: u32,
        player: Address,
        survival_time_sec: u64,
        proof: Bytes,
    ) -> Result<(), Error> {
        player.require_auth();

        if proof.len() == 0 {
            return Err(Error::InvalidProof);
        }

        let key = DataKey::Arena(arena_id);
        let mut session: ArenaSession = env
            .storage()
            .temporary()
            .get(&key)
            .ok_or(Error::ArenaNotFound)?;

        if session.status != ArenaStatus::Started {
            return Err(Error::ArenaNotStarted);
        }

        let mut player_index = None;
        let len = session.players.len();
        for i in 0..len {
            if session.players.get(i).unwrap() == player {
                player_index = Some(i);
                break;
            }
        }
        let idx: u32 = player_index.ok_or(Error::NotInArena)?;

        let time_key = DataKey::SurvivalTime(arena_id, idx);
        if env.storage().temporary().has(&time_key) {
            return Err(Error::AlreadySubmitted);
        }

        env.storage().temporary().set(&time_key, &survival_time_sec);
        env.storage().temporary().extend_ttl(&time_key, TTL_LEDGERS, TTL_LEDGERS);

        session.submitted_count += 1;
        env.storage().temporary().set(&key, &session);

        Ok(())
    }

    /// Resolve arena: pick winner (best time), pay pool, call Hub end_game.
    pub fn resolve_arena(env: Env, arena_id: u32) -> Result<Address, Error> {
        let key = DataKey::Arena(arena_id);
        let mut session: ArenaSession = env
            .storage()
            .temporary()
            .get(&key)
            .ok_or(Error::ArenaNotFound)?;

        if session.status == ArenaStatus::Resolved {
            return Ok(session.winner.unwrap());
        }
        if session.status != ArenaStatus::Started {
            return Err(Error::ArenaNotStarted);
        }
        if session.submitted_count != session.players.len() {
            return Err(Error::NotAllSubmitted);
        }

        let mut best_time: u64 = 0;
        let mut winner_idx: u32 = 0;
        let len = session.players.len();
        for i in 0..len {
            let time_key = DataKey::SurvivalTime(arena_id, i);
            let t: u64 = env.storage().temporary().get(&time_key).unwrap();
            if t > best_time {
                best_time = t;
                winner_idx = i;
            }
        }

        let winner = session.players.get(winner_idx).unwrap();
        session.winner = Some(winner.clone());
        session.status = ArenaStatus::Resolved;
        env.storage().temporary().set(&key, &session);

        let hub: Address = env.storage().instance().get(&DataKey::GameHub).unwrap();
        let game_hub = GameHubClient::new(&env, &hub);
        let p1 = session.players.get(0).unwrap();
        let player1_won = winner == p1;
        game_hub.end_game(&arena_id, &player1_won);

        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let client = TokenClient::new(&env, &token);
        client.transfer(
            &env,
            &env.current_contract_address(),
            &winner,
            &session.pool,
        );

        Ok(winner)
    }

    /// Get arena session (players, pool, status, winner, submitted_count).
    pub fn get_arena(env: Env, arena_id: u32) -> Result<ArenaSession, Error> {
        env.storage()
            .temporary()
            .get(&DataKey::Arena(arena_id))
            .ok_or(Error::ArenaNotFound)
    }

    /// Get config (entry_fee, min_players, max_players).
    pub fn get_config(env: Env) -> Result<ArenaConfig, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(Error::InvalidConfig)
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    pub fn get_hub(env: Env) -> Address {
        env.storage().instance().get(&DataKey::GameHub).unwrap()
    }

    pub fn get_token(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Token).unwrap()
    }
}
