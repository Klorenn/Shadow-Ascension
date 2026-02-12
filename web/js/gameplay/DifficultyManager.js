/**
 * DifficultyManager — infinite scaling from time, level, kills.
 * Updates once per second. Wave events every 60s. Map pressure + soft enrage.
 */

const BASE_SPAWN_INTERVAL = 2.0;
const MIN_SPAWN_INTERVAL = 0.25;
const MAX_ENEMIES = 200;
const MAX_SPEED_MULT = 2.5;
const WAVE_INTERVAL = 60;
const SWARM_DURATION = 20;
const ENRAGE_AFTER = 15 * 60;
const ENRAGE_SPEED_PER_MINUTE = 0.1;
const NEAR_MAX_SPAWN_AFTER = 25 * 60;

const TIER_BY_TIME = [
  { after: 0, tier: 0, name: 'Basic' },
  { after: 2 * 60, tier: 1, name: 'Faster' },
  { after: 5 * 60, tier: 2, name: 'Tank' },
  { after: 10 * 60, tier: 3, name: 'Elite' },
];

const BASE_STATS = {
  0: { hp: 12, speed: 0.18, damage: 1 },
  1: { hp: 10, speed: 0.24, damage: 1 },
  2: { hp: 28, speed: 0.14, damage: 1.2 },
  3: { hp: 36, speed: 0.2, damage: 1.5, elite: true, xpMult: 2, explodeChance: 0.25 },
};

const EVENTS = ['swarm', 'elite_surge', 'meteor_rain'];

export class DifficultyManager {
  constructor() {
    this._accum = 0;
    this._cached = null;
    this._timeSurvived = 0;
    this._playerLevel = 1;
    this._totalKills = 0;
    this._enrageSpeedStacks = 0;
    this._lastWaveTime = -999;
    this._eventName = null;
    this._eventEndTime = 0;
    this._eventTriggerThisTick = null;
    this._lastSpawnInterval = BASE_SPAWN_INTERVAL;
  }

  /**
   * Call every frame; internal update runs once per second.
   * @param {number} delta
   * @param {number} timeSurvived - seconds
   * @param {number} playerLevel
   * @param {number} totalKills
   */
  update(delta, timeSurvived, playerLevel, totalKills) {
    this._timeSurvived = timeSurvived;
    this._playerLevel = playerLevel;
    this._totalKills = totalKills;
    this._eventTriggerThisTick = null;

    this._accum += delta;
    if (this._accum < 1) return;
    this._accum -= 1;

    const t = timeSurvived;
    if (t >= ENRAGE_AFTER) {
      const minutesPast = Math.floor((t - ENRAGE_AFTER) / 60);
      if (minutesPast > this._enrageSpeedStacks) {
        this._enrageSpeedStacks = minutesPast;
      }
    }

    if (t - this._lastWaveTime >= WAVE_INTERVAL) {
      this._lastWaveTime = t;
      const idx = Math.floor(Math.random() * EVENTS.length);
      this._eventName = EVENTS[idx];
      this._eventEndTime = t + (this._eventName === 'swarm' ? SWARM_DURATION : 0);
      this._eventTriggerThisTick = this._eventName;
    }
    if (this._eventName === 'swarm' && t >= this._eventEndTime) {
      this._eventName = null;
    }
    if (this._eventName === 'elite_surge' || this._eventName === 'meteor_rain') {
      this._eventName = null;
    }

    this._recompute();
  }

  _recompute() {
    const d = this._difficultyRaw();
    const hpMult = 1 + d * 0.15;
    const damageMult = 1 + d * 0.1;
    let speedMult = 1 + d * 0.05;
    speedMult += this._enrageSpeedStacks * ENRAGE_SPEED_PER_MINUTE;
    speedMult = Math.min(speedMult, MAX_SPEED_MULT);

    let spawnInterval = BASE_SPAWN_INTERVAL - d * 0.02;
    if (this._timeSurvived >= NEAR_MAX_SPAWN_AFTER) {
      spawnInterval = Math.min(spawnInterval, 0.4);
    }
    if (this._eventName === 'swarm') spawnInterval = Math.max(MIN_SPAWN_INTERVAL, spawnInterval * 0.5);
    spawnInterval = Math.max(MIN_SPAWN_INTERVAL, spawnInterval);
    this._lastSpawnInterval = spawnInterval;

    const tier = this._tierFromTime(this._timeSurvived);
    const base = BASE_STATS[tier] || BASE_STATS[0];
    const elite = base.elite || false;

    this._cached = {
      difficulty: d,
      hpMult,
      damageMult,
      speedMult,
      spawnInterval,
      tier,
      tierName: TIER_BY_TIME.find(x => x.tier === tier)?.name || 'Basic',
      isElite: elite,
      baseHp: base.hp,
      baseSpeed: base.speed,
      baseDamage: base.damage,
      xpMult: base.xpMult || 1,
      explodeChance: base.explodeChance || 0,
      spawnDistance: this._spawnDistance(),
      maxEnemies: MAX_ENEMIES,
    };
  }

  _difficultyRaw() {
    return (
      this._timeSurvived * 0.05 +
      this._playerLevel * 0.1 +
      this._totalKills * 0.002
    );
  }

  _tierFromTime(seconds) {
    let tier = 0;
    for (const { after, tier: t } of TIER_BY_TIME) {
      if (seconds >= after) tier = t;
    }
    return tier;
  }

  _spawnDistance() {
    const t = this._timeSurvived;
    const base = 25;
    const min = 8;
    const pressure = Math.min(1, t / 600);
    return Math.max(min, base - pressure * (base - min));
  }

  /**
   * Returns stats for spawning an enemy. Cached; recomputed once per second.
   */
  getEnemyStats(tierOverride = null) {
    if (!this._cached) this._recompute();
    const c = this._cached;
    const tier = tierOverride != null ? tierOverride : c.tier;
    const base = BASE_STATS[tier] || BASE_STATS[0];
    return {
      hp: base.hp * c.hpMult,
      speed: base.speed * c.speedMult,
      damage: base.damage * c.damageMult,
      isElite: base.elite || false,
      xpMult: base.xpMult || 1,
      explodeChance: base.explodeChance || 0,
      tier,
    };
  }

  getSpawnRate() {
    if (!this._cached) this._recompute();
    return this._lastSpawnInterval;
  }

  getSpawnDistance() {
    if (!this._cached) this._recompute();
    return this._cached.spawnDistance;
  }

  getMaxEnemies() {
    return MAX_ENEMIES;
  }

  getDifficultyLevel() {
    if (!this._cached) this._recompute();
    return Math.min(10, Math.floor(this._cached.difficulty));
  }

  /** Raw difficulty value for XP orb scaling: value = baseXP * (1 + raw * 0.1). */
  getDifficultyRaw() {
    if (!this._cached) this._recompute();
    return this._cached.difficulty;
  }

  /** Multipliers for EnemyManager: hp, damage, speed. */
  getDifficultyMultipliers() {
    if (!this._cached) this._recompute();
    return {
      hpMultiplier: this._cached.hpMult,
      damageMultiplier: this._cached.damageMult,
      speedMultiplier: this._cached.speedMult,
    };
  }

  getActiveEvent() {
    if (!this._eventName) return null;
    return {
      name: this._eventName,
      endTime: this._eventEndTime,
    };
  }

  /** One-shot: returns event id if an event just triggered this second (e.g. 'elite_surge'). */
  getEventTrigger() {
    return this._eventTriggerThisTick;
  }

  /** For elite surge: return 5. For meteor rain: return number of explosions. */
  getEventSpawnCount() {
    if (this._eventTriggerThisTick === 'elite_surge') return 5;
    if (this._eventTriggerThisTick === 'meteor_rain') return 8;
    return 0;
  }
}
