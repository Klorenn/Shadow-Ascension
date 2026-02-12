/**
 * Skill/VFX effect system — modular, optimized for 100+ enemies.
 *
 * Usage:
 *   import { createSkillEffect, SKILL_IDS } from './effects/index.js';
 *   const effect = createSkillEffect(SKILL_IDS.GOLD_EXPLOSION, { x: 0, y: 0 }, { damageUpgrade: 1.2 });
 *   scene.add(effect.mesh);
 *   activeEffects.push(effect);
 *   // In game loop:
 *   for (const eff of activeEffects) {
 *     if (!eff.update(delta)) { eff.destroy(); scene.remove(eff.mesh); activeEffects.splice(...); continue; }
 *     eff.checkCollision(enemies);
 *   }
 */
import * as THREE from 'three';
import { SkillEffect, SKILL_TYPES, DAMAGE_TYPES } from './SkillEffect.js';
import {
  GoldExplosionEffect,
  CircleBlueExplosionEffect,
  GasExplosionEffect,
  CircleOrangeExplosionEffect,
  BlueExplosionEffect,
  CircleGasExplosionEffect,
  NuclearExplosionEffect,
  TwoColoredExplosionEffect,
  LightningEffect,
  SmokeEffect,
  FireEffect,
} from './skills/index.js';

export { SkillEffect, SKILL_TYPES, DAMAGE_TYPES } from './SkillEffect.js';
export { getEnemiesInRadius, applyDamageToEnemy, applyKnockback, getRadialTexture } from './effectUtils.js';
export * from './skills/index.js';

export const SKILL_IDS = {
  GOLD_EXPLOSION: 'gold_explosion',
  CIRCLE_BLUE: 'circle_blue',
  GAS: 'gas',
  CIRCLE_ORANGE: 'circle_orange',
  BLUE: 'blue',
  CIRCLE_GAS: 'circle_gas',
  NUCLEAR: 'nuclear',
  TWO_COLORED: 'two_colored',
  LIGHTNING: 'lightning',
  SMOKE: 'smoke',
  FIRE: 'fire',
};

const CONSTRUCTORS = {
  [SKILL_IDS.GOLD_EXPLOSION]: GoldExplosionEffect,
  [SKILL_IDS.CIRCLE_BLUE]: CircleBlueExplosionEffect,
  [SKILL_IDS.GAS]: GasExplosionEffect,
  [SKILL_IDS.CIRCLE_ORANGE]: CircleOrangeExplosionEffect,
  [SKILL_IDS.BLUE]: BlueExplosionEffect,
  [SKILL_IDS.CIRCLE_GAS]: CircleGasExplosionEffect,
  [SKILL_IDS.NUCLEAR]: NuclearExplosionEffect,
  [SKILL_IDS.TWO_COLORED]: TwoColoredExplosionEffect,
  [SKILL_IDS.LIGHTNING]: LightningEffect,
  [SKILL_IDS.SMOKE]: SmokeEffect,
  [SKILL_IDS.FIRE]: FireEffect,
};

/**
 * @param {string} skillId - One of SKILL_IDS
 * @param {THREE.Vector3|{x:number,y:number}} position
 * @param {Object} [options] - Override defaults (radiusUpgrade, damageUpgrade, etc.)
 * @returns {SkillEffect}
 */
export function createSkillEffect(skillId, position, options = {}) {
  const Ctor = CONSTRUCTORS[skillId];
  if (!Ctor) throw new Error('Unknown skill: ' + skillId);
  return new Ctor(position, options);
}
