/**
 * XPSystem — XP to next level formula: baseXP * level * 1.25.
 * Does not replace XP orb pool; game uses pool for spawning/collecting and this for formula/player sync.
 */
import { XP } from './GameConstants.js';

export class XPSystem {
  constructor(options = {}) {
    this.baseXP = options.baseXP ?? XP.BASE_XP;
    this.xpScale = options.xpScale ?? XP.XP_SCALE;
  }

  /**
   * XP required to reach next level from current level.
   * @param {number} level - current level
   */
  xpToNextLevel(level) {
    return Math.floor(this.baseXP * Math.max(1, level) * this.xpScale);
  }

  /**
   * Grant XP to player (handles level-up loop; player.addXP is the source of truth).
   */
  grantXP(player, amount) {
    if (!player || player.hp <= 0) return;
    player.addXP(amount);
  }
}
