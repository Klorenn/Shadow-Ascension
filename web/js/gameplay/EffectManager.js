/**
 * EffectManager — holds active skill effects, updates and removes when done.
 * Used by AutoAttack to spawn effects. No new materials per frame; reuse from effect system.
 */
import { createSkillEffect, SKILL_IDS } from '../effects/index.js';

export class EffectManager {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
  }

  /**
   * Spawn effect at position. options passed to createSkillEffect (e.g. damageUpgrade).
   * @param {string} skillId - SKILL_IDS.GOLD_EXPLOSION | SKILL_IDS.LIGHTNING | etc.
   * @param {{ x: number, y: number }} position
   * @param {Object} [options]
   */
  spawn(skillId, position, options = {}) {
    const effect = createSkillEffect(skillId, position, options);
    this.scene.add(effect.mesh);
    this.active.push(effect);
    return effect;
  }

  /**
   * @param {number} delta
   * @param {Array} enemies
   */
  update(delta, enemies) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const eff = this.active[i];
      const stillAlive = eff.update(delta);
      eff.checkCollision(enemies);
      if (!stillAlive) {
        this.scene.remove(eff.mesh);
        eff.destroy();
        this.active.splice(i, 1);
      }
    }
  }

  clear() {
    for (const eff of this.active) {
      this.scene.remove(eff.mesh);
      eff.destroy();
    }
    this.active.length = 0;
  }
}
