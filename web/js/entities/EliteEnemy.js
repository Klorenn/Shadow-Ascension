/**
 * EliteEnemy — 2x hp, 1.5x damage, 1.5x xpDrop, glow/color. Hook for special drop.
 */
import { Enemy } from './Enemy.js';
import { ENEMY } from '../systems/GameConstants.js';

export class EliteEnemy extends Enemy {
  constructor(options = {}) {
    super(options);
    this.isElite = true;
  }

  reset(config) {
    const hpMult = ENEMY.ELITE_HP_MULT;
    const dmgMult = ENEMY.ELITE_DAMAGE_MULT;
    const xpMult = ENEMY.ELITE_XP_MULT;
    super.reset({
      ...config,
      maxHp: (config.maxHp ?? this.maxHp) * hpMult,
      damage: (config.damage ?? this.damage) * dmgMult,
      xpDrop: Math.floor((config.xpDrop ?? this.xpDrop) * xpMult),
      isElite: true,
    });
  }

  /** Hook: override or listen for special drop chance. Return item or null. */
  getSpecialDrop() {
    return null;
  }
}
