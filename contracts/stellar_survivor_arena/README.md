# Stellar Survivor Arena (Soroban)

Smart contract para **Stellar Hacks: ZK Gaming** — pool de apuestas "Last Man Standing" con integración al Game Hub obligatorio.

## Hub de la hackathon

- **Testnet:** `CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG`
- El contrato llama `start_game` y `end_game` en ese Hub.

## Funciones

| Función | Descripción |
|--------|-------------|
| `initialize_arena(admin, game_hub, token, entry_fee, min_players, max_players)` | Configura una sola vez: admin, Hub, token (XLM/asset), entrada y límites de jugadores (ej. 5–30). |
| `join_arena(player)` | El jugador paga `entry_fee` y entra al pool (o se crea una nueva arena). Devuelve `arena_id`. |
| `start_round(arena_id)` | Cierra la arena y llama al Hub `start_game`. Requiere al menos `min_players`. |
| `submit_result(arena_id, player, survival_time_sec, proof)` | Envía tiempo de supervivencia (segundos) y prueba ZK (por ahora solo se exige `proof` no vacío). |
| `resolve_arena(arena_id)` | Cuando todos enviaron resultado: gana quien tenga mayor tiempo, se paga el pool y se llama al Hub `end_game`. |
| `get_arena(arena_id)` / `get_config()` | Consulta estado de la arena y configuración. |

## Build (desde `contracts/`)

```bash
cd contracts
cargo build -p stellar_survivor_arena --target wasm32-unknown-unknown --release
```

Para integrar en **Stellar Game Studio**: copia esta carpeta en `contracts/stellar_survivor_arena` del repo y añade en el `Cargo.toml` raíz:

```toml
members = [ ..., "contracts/stellar_survivor_arena" ]
```

## ZK (Provable Fairness)

- Hoy: `submit_result` exige `proof` no vacío (placeholder).
- Próximo paso: circuito Noir/Risc0 que tome `game_logs` o `final_score` y genere una prueba; el contrato verifica la prueba antes de aceptar el tiempo.
