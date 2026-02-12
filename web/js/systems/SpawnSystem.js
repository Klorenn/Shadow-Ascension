/**
 * SpawnSystem — spawn at map edges, never on player. Progressive interval. Elite/Boss timers.
 */
import { SPAWN } from './GameConstants.js';
import { getAllEnemyTypeIds } from '../data/enemyTypes.js';

export class SpawnSystem {
  /**
   * @param {Object} options
   * @param {Function} options.spawn - (typeId, x, y, options) => enemy
   * @param {Function} options.getPlayerPosition - () => { x, y }
   * @param {number} [options.spawnDistance] - min distance from player
   * @param {number} [options.maxEnemies]
   */
  constructor(options = {}) {
    this.spawn = options.spawn;
    this.getPlayerPosition = options.getPlayerPosition;
    this.spawnDistance = options.spawnDistance ?? 20;
    this.maxEnemies = options.maxEnemies ?? SPAWN.MAX_ENEMIES;
    this.getActiveCount = options.getActiveCount ?? (() => 0);
    this._lastSpawnTime = 0;
    this._spawnInterval = options.baseSpawnInterval ?? SPAWN.BASE_SPAWN_INTERVAL;
    this._elapsedMinutes = 0;
    this._round = 1;
    this._typeIds = getAllEnemyTypeIds();
  }

  /** Set the current round for scaling. Called from game.js each frame. */
  setRound(round) {
    this._round = Math.max(1, round);
  }

  /** Round-based max enemies: 10 at round 1, +8 per round, capped at MAX_ENEMIES */
  _getMaxEnemiesForRound() {
    return Math.min(SPAWN.MAX_ENEMIES, 10 + (this._round - 1) * 8);
  }

  /** Round-based spawn interval: faster spawns at higher rounds */
  _getSpawnIntervalForRound() {
    // R1: 2s, R2: 1.5s, R3: 1.0s, R4: 0.7s, R5+: 0.33s approaching min
    const base = SPAWN.BASE_SPAWN_INTERVAL;
    const decay = Math.pow(0.72, this._round - 1);
    return Math.max(SPAWN.MIN_SPAWN_INTERVAL, base * decay);
  }

  /** How many enemies to spawn per tick at higher rounds */
  _getBatchSize() {
    if (this._round >= 7) return 4;
    if (this._round >= 5) return 3;
    if (this._round >= 3) return 2;
    return 1;
  }

  update(now, elapsedMinutes) {
    const maxForRound = this._getMaxEnemiesForRound();
    if (this.getActiveCount() >= maxForRound) return;
    const interval = this._getSpawnIntervalForRound();
    if (now - this._lastSpawnTime < interval) return;
    this._lastSpawnTime = now;
    this._elapsedMinutes = elapsedMinutes;

    const batch = this._getBatchSize();
    for (let b = 0; b < batch; b++) {
      if (this.getActiveCount() >= maxForRound) break;

      const pos = this.getPlayerPosition();
      const angle = Math.random() * Math.PI * 2;
      const dist = this.spawnDistance + (Math.random() - 0.5) * 6;
      const x = pos.x + Math.cos(angle) * dist;
      const y = pos.y + Math.sin(angle) * dist;

      const isBoss = elapsedMinutes >= SPAWN.BOSS_SPAWN_AFTER_MINUTES && Math.random() < 0.12;
      const isElite = !isBoss && elapsedMinutes >= SPAWN.ELITE_CHANCE_AFTER_MINUTES && Math.random() < (0.15 + this._round * 0.03);

      const typeId = this._typeIds[Math.floor(Math.random() * this._typeIds.length)];
      // Round scaling: enemy HP and speed increase per round
      const roundHpMult = 1 + (this._round - 1) * 0.15;
      const roundSpeedMult = 1 + (this._round - 1) * 0.06;

      if (isBoss) {
        this.spawn('slime', x, y, { isBoss: true, hpMult: roundHpMult, speedMult: roundSpeedMult });
      } else {
        this.spawn(typeId, x, y, { isElite, hpMult: roundHpMult, speedMult: roundSpeedMult });
      }
    }
  }

  setSpawnIntervalMultiplier(minutesElapsed) {
    // Still used for time-based decay on top of round system
    let interval = this._getSpawnIntervalForRound();
    for (let i = 0; i < minutesElapsed; i++) {
      interval *= SPAWN.INTERVAL_DECAY_PER_MINUTE;
    }
    this._spawnInterval = Math.max(SPAWN.MIN_SPAWN_INTERVAL, interval);
  }
}
