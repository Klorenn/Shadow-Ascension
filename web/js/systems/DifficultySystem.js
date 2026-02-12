/**
 * DifficultySystem — infinite scaling: every minute +10% HP, +8% damage, +15% spawn rate.
 * Can wrap existing DifficultyManager or run in parallel. No wave limit.
 */
import { DIFFICULTY } from './GameConstants.js';

export class DifficultySystem {
  constructor(options = {}) {
    this.hpPerMinute = options.hpPerMinute ?? DIFFICULTY.HP_PER_MINUTE;
    this.damagePerMinute = options.damagePerMinute ?? DIFFICULTY.DAMAGE_PER_MINUTE;
    this.spawnRatePerMinute = options.spawnRatePerMinute ?? DIFFICULTY.SPAWN_RATE_PER_MINUTE;
    this.intervalSeconds = options.intervalSeconds ?? DIFFICULTY.INTERVAL_SECONDS;
    this.minSpawnInterval = options.minSpawnInterval ?? DIFFICULTY.MIN_SPAWN_INTERVAL;
    this.maxEnemies = options.maxEnemies ?? DIFFICULTY.MAX_ENEMIES;
    this._elapsed = 0;
    this._minutes = 0;
    this._hpMult = 1;
    this._damageMult = 1;
    this._spawnRateMult = 1;
  }

  update(delta) {
    this._elapsed += delta;
    const newMinutes = Math.floor(this._elapsed / this.intervalSeconds);
    if (newMinutes > this._minutes) {
      this._minutes = newMinutes;
      this._hpMult *= 1 + this.hpPerMinute;
      this._damageMult *= 1 + this.damagePerMinute;
      this._spawnRateMult *= 1 + this.spawnRatePerMinute;
    }
  }

  getHpMultiplier() {
    return this._hpMult;
  }

  getDamageMultiplier() {
    return this._damageMult;
  }

  /** Base spawn interval gets divided by this (faster spawns over time) */
  getSpawnRateMultiplier() {
    return this._spawnRateMult;
  }

  /** Suggested spawn interval in seconds */
  getSpawnInterval(baseInterval) {
    const reduced = baseInterval / this._spawnRateMult;
    return Math.max(this.minSpawnInterval, reduced);
  }

  getMaxEnemies() {
    return this.maxEnemies;
  }

  getMinutesElapsed() {
    return this._minutes;
  }
}
