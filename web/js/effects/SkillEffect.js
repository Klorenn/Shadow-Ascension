/**
 * Base class for all skill/VFX effects.
 * - position: THREE.Vector3 or { x, y }
 * - options: name, skillType, damageType, duration, cooldown, radius, damage, upgrade levels, etc.
 * - update(delta): advance animation; return false when effect should be removed
 * - checkCollision(enemies): apply damage/effects; return array of hit enemies
 * - destroy(): remove from scene, dispose only non-shared resources
 */
import * as THREE from 'three';
import { getEnemiesInRadius, applyDamageToEnemy } from './effectUtils.js';

export const SKILL_TYPES = {
  INSTANT_AOE: 'Instant AoE',
  FROST_AOE: 'Frost AoE',
  DOT_AREA: 'DoT Area',
  FIRE_BURST: 'Fire Burst',
  ENERGY_PULSE: 'Energy Pulse',
  TOXIC_TRAP: 'Toxic Trap',
  ULTIMATE: 'Ultimate',
  CHAOS_BURST: 'Chaos Burst',
  CHAIN: 'Chain',
  DEBUFF: 'Debuff',
  GROUND_DOT: 'Ground DoT',
};

export const DAMAGE_TYPES = {
  PHYSICAL: 'physical',
  FIRE: 'fire',
  FROST: 'frost',
  POISON: 'poison',
  LIGHTNING: 'lightning',
  CHAOS: 'chaos',
};

export class SkillEffect {
  constructor(position, options = {}) {
    this.position = position instanceof THREE.Vector3
      ? position.clone()
      : new THREE.Vector3(position?.x ?? 0, position?.y ?? 0, 0);
    this.options = {
      name: 'Skill',
      skillType: SKILL_TYPES.INSTANT_AOE,
      damageType: DAMAGE_TYPES.PHYSICAL,
      duration: 1,
      cooldown: 2,
      radius: 3,
      damage: 10,
      knockbackForce: 0,
      slowPercent: 0,
      slowDuration: 0,
      burnDuration: 0,
      burnDamagePerTick: 0,
      dotTickRate: 0.5,
      dotDamagePerTick: 0,
      pierce: false,
      chainCount: 0,
      radiusUpgrade: 1,
      damageUpgrade: 1,
      ...options,
    };
    this.elapsed = 0;
    this.active = true;
    this._hitEnemies = new Set();
    this._group = new THREE.Group();
    this._group.position.copy(this.position);
  }

  get name() { return this.options.name; }
  get skillType() { return this.options.skillType; }
  get damageType() { return this.options.damageType; }
  get duration() { return this.options.duration; }
  get cooldown() { return this.options.cooldown; }
  get radius() { return this.options.radius * (this.options.radiusUpgrade ?? 1); }
  get damage() { return this.options.damage * (this.options.damageUpgrade ?? 1); }
  get mesh() { return this._group; }

  /**
   * Override in subclass to build visual (sprites, particles, etc.).
   * Add objects to this._group.
   */
  _createVisual() {}

  /**
   * Override to update animation (scale, opacity, etc.).
   * @param {number} delta
   * @returns {boolean} false when effect should be destroyed
   */
  update(delta) {
    this.elapsed += delta;
    if (this.elapsed >= this.duration) return false;
    return true;
  }

  /**
   * Collision: sphere distance check. Override for chain/line logic.
   * @param {Array} enemies - List of enemy objects with .pos or .position
   * @returns {Array} Hit enemies
   */
  checkCollision(enemies) {
    const inRadius = getEnemiesInRadius(enemies, this.position.x, this.position.y, this.radius);
    const hit = [];
    for (const e of inRadius) {
      if (this._hitEnemies.has(e)) continue;
      this._hitEnemies.add(e);
      hit.push(e);
      applyDamageToEnemy(e, this.damage);
    }
    return hit;
  }

  /** Remove from scene; dispose only instance materials/geometries, not shared textures. */
  destroy() {
    this.active = false;
    this._group.clear();
    this._hitEnemies.clear();
  }
}
