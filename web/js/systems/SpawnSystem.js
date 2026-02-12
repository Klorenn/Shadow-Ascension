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
    this._typeIds = getAllEnemyTypeIds();
  }

  update(now, elapsedMinutes) {
    if (this.getActiveCount() >= this.maxEnemies) return;
    if (now - this._lastSpawnTime < this._spawnInterval) return;
    this._lastSpawnTime = now;
    this._elapsedMinutes = elapsedMinutes;

    const pos = this.getPlayerPosition();
    const angle = Math.random() * Math.PI * 2;
    const x = pos.x + Math.cos(angle) * this.spawnDistance;
    const y = pos.y + Math.sin(angle) * this.spawnDistance;

    const isBoss = elapsedMinutes >= SPAWN.BOSS_SPAWN_AFTER_MINUTES && Math.random() < 0.15;
    const isElite = !isBoss && elapsedMinutes >= SPAWN.ELITE_CHANCE_AFTER_MINUTES && Math.random() < 0.2;

    const typeId = this._typeIds[Math.floor(Math.random() * this._typeIds.length)];
    if (isBoss) {
      this.spawn('slime', x, y, { isBoss: true });
    } else {
      this.spawn(typeId, x, y, { isElite });
    }
  }

  setSpawnIntervalMultiplier(minutesElapsed) {
    let interval = SPAWN.BASE_SPAWN_INTERVAL;
    for (let i = 0; i < minutesElapsed; i++) {
      interval *= SPAWN.INTERVAL_DECAY_PER_MINUTE;
    }
    this._spawnInterval = Math.max(SPAWN.MIN_SPAWN_INTERVAL, interval);
  }
}
