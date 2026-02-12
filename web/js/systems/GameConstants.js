/**
 * Configurable constants for Vampire Survivors–style systems.
 * No magic numbers in gameplay code.
 */

// --- XP & Level
export const XP = {
  BASE_XP: 50,
  /** xpToNextLevel = BASE_XP * level * XP_SCALE */
  XP_SCALE: 1.25,
  ORB_MAGNET_RADIUS: 6,
  ORB_PICKUP_RADIUS: 1.15,
};

// --- Player
export const PLAYER = {
  BASE_HP: 3,
  BASE_ATTACK_SPEED_MULT: 1,
  BASE_DAMAGE_MULT: 1,
  BASE_CRIT_CHANCE: 0,
  BASE_CRIT_DAMAGE: 1.5,
  MAX_WEAPONS: 6,
};

// --- Weapons
export const WEAPON = {
  EVOLVE_LEVEL: 5,
  BASE_COOLDOWN: 1.2,
  BASE_RANGE: 12,
  BASE_PROJECTILE_COUNT: 1,
  BASE_AREA_MULT: 1,
};

// --- Difficulty (infinite scaling per minute)
export const DIFFICULTY = {
  /** Every 60s: enemy HP multiplier increase */
  HP_PER_MINUTE: 0.1,
  /** Every 60s: enemy damage multiplier increase */
  DAMAGE_PER_MINUTE: 0.08,
  /** Every 60s: spawn rate multiplier (reduces interval) */
  SPAWN_RATE_PER_MINUTE: 0.15,
  INTERVAL_SECONDS: 60,
  MIN_SPAWN_INTERVAL: 0.25,
  MAX_ENEMIES: 200,
};

// --- Combat
export const COMBAT = {
  KNOCKBACK_FORCE: 0.4,
  PROJECTILE_SPEED: 18,
  PROJECTILE_LIFETIME: 2,
  PROJECTILE_PENETRATION: 1,
};

// --- Spawn
export const SPAWN = {
  BASE_SPAWN_INTERVAL: 3,
  INTERVAL_DECAY_PER_MINUTE: 0.9,
  ELITE_CHANCE_AFTER_MINUTES: 3,
  BOSS_SPAWN_AFTER_MINUTES: 5,
  MIN_SPAWN_INTERVAL: 0.25,
  MAX_ENEMIES: 200,
};

// --- Enemy
export const ENEMY = {
  HIT_FLASH_DURATION: 0.1,
  ELITE_HP_MULT: 2,
  ELITE_DAMAGE_MULT: 1.5,
  ELITE_XP_MULT: 1.5,
  BOSS_SLIME_HP_MULT: 15,
  BOSS_SLIME_DAMAGE_MULT: 3,
  BOSS_SLIME_SPEED_MULT: 0.4,
  BOSS_SLIME_XP_MULT: 3,
  BOSS_SLIME_SCALE_MULT: 3,
};
