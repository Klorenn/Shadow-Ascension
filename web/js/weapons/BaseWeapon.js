/**
 * BaseWeapon — level, damage, cooldown, range, area. No Three.js; WeaponManager drives attacks.
 */
import { WEAPON } from '../systems/GameConstants.js';

export class BaseWeapon {
  constructor(options = {}) {
    this.id = options.id ?? 'weapon_' + Math.random().toString(36).slice(2, 8);
    this.name = options.name ?? 'Weapon';
    this.level = options.level ?? 1;
    this.damage = options.damage ?? 10;
    this.cooldown = options.cooldown ?? WEAPON.BASE_COOLDOWN;
    this.timer = 0;
    this.range = options.range ?? WEAPON.BASE_RANGE;
    this.projectileCount = options.projectileCount ?? WEAPON.BASE_PROJECTILE_COUNT;
    this.areaMultiplier = options.areaMultiplier ?? WEAPON.BASE_AREA_MULT;
    this.evolutionId = options.evolutionId ?? null;
    this.requiredPassiveId = options.requiredPassiveId ?? null;
  }

  update(delta) {
    if (this.timer > 0) this.timer -= delta;
  }

  /** Override in subclasses. Returns true if attack was performed. */
  attack(player, enemies) {
    return false;
  }

  levelUp() {
    this.level++;
    // Subclasses can override to scale damage/cooldown/area
  }

  canEvolve() {
    return (
      this.level >= WEAPON.EVOLVE_LEVEL &&
      this.evolutionId != null &&
      this.requiredPassiveId != null
    );
  }

  /** Effective cooldown after player attack speed */
  getEffectiveCooldown(attackSpeedMultiplier) {
    return this.cooldown / Math.max(0.2, attackSpeedMultiplier ?? 1);
  }
}
