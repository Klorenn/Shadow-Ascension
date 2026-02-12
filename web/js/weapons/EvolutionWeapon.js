/**
 * EvolutionWeapon — replaces base weapon when conditions met (level 5 + passive).
 * Doubles damage and can add special effect (explosion / DOT).
 */
import { BaseWeapon } from './BaseWeapon.js';
import { WEAPON } from '../systems/GameConstants.js';

export class EvolutionWeapon extends BaseWeapon {
  constructor(options = {}) {
    super(options);
    this.baseWeaponId = options.baseWeaponId ?? null;
    this.specialEffect = options.specialEffect ?? null; // 'explosion' | 'dot' | null
    this.dotDamage = options.dotDamage ?? 0;
    this.dotDuration = options.dotDuration ?? 0;
  }

  /** Check if player has required passive (e.g. 'fire_orb') */
  static canEvolveFrom(baseWeapon, playerPassives) {
    if (!baseWeapon || baseWeapon.level < WEAPON.EVOLVE_LEVEL) return false;
    const required = baseWeapon.requiredPassiveId;
    return required && (playerPassives && playerPassives.has(required));
  }

  /** Create evolution from base (e.g. FireSlash + FireOrb -> InfernoBlade) */
  static fromBase(baseWeapon, evolutionConfig) {
    const evo = new EvolutionWeapon({
      id: evolutionConfig.id,
      name: evolutionConfig.name,
      level: 1,
      damage: (baseWeapon.damage ?? 10) * 2,
      cooldown: baseWeapon.cooldown,
      range: baseWeapon.range,
      projectileCount: baseWeapon.projectileCount,
      areaMultiplier: baseWeapon.areaMultiplier,
      baseWeaponId: baseWeapon.id,
      specialEffect: evolutionConfig.specialEffect ?? null,
      dotDamage: evolutionConfig.dotDamage ?? 0,
      dotDuration: evolutionConfig.dotDuration ?? 0,
    });
    return evo;
  }
}
