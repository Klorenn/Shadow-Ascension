/**
 * LevelUpSystem (VS-style) — on level up: pause, show 3 options (new weapon / upgrade weapon / passive), apply and resume.
 * Uses existing gameplay/LevelUpSystem upgrades and adds weapon-related choices.
 */
import { getRandomUpgrades, applyUpgrade, UPGRADES, UPGRADE_IDS } from '../gameplay/LevelUpSystem.js';

export const LEVEL_UP_OPTION_TYPES = {
  NEW_WEAPON: 'new_weapon',
  UPGRADE_WEAPON: 'upgrade_weapon',
  PASSIVE: 'passive',
};

export class LevelUpSystem {
  constructor(options = {}) {
    this.excludeUpgradeIds = options.excludeUpgradeIds ?? new Set();
    this.weaponPool = options.weaponPool ?? [];
    this.passiveUpgrades = [...UPGRADES];
  }

  /**
   * Get 3 random choices for level up (weapons + passives mix).
   * @param {Object} player - has weapons[], level
   * @returns {Array<{ type, option }>}
   */
  getChoices(player) {
    const choices = [];
    const canNewWeapon = player.weapons && player.weapons.length < 6 && this.weaponPool.length > 0;
    const canUpgradeWeapon = player.weapons && player.weapons.length > 0;
    const availablePassives = this.passiveUpgrades.filter(u => !this.excludeUpgradeIds.has(u.id));
    const pool = [];
    if (canNewWeapon) {
      const notOwned = this.weaponPool.filter(w => !player.weapons.some(pw => pw.id === w.id));
      if (notOwned.length) pool.push({ type: LEVEL_UP_OPTION_TYPES.NEW_WEAPON, options: notOwned });
    }
    if (canUpgradeWeapon) {
      pool.push({ type: LEVEL_UP_OPTION_TYPES.UPGRADE_WEAPON, options: player.weapons });
    }
    if (availablePassives.length) {
      pool.push({ type: LEVEL_UP_OPTION_TYPES.PASSIVE, options: availablePassives });
    }
    for (let i = 0; i < 3 && pool.length > 0; i++) {
      const slot = pool[Math.floor(Math.random() * pool.length)];
      if (slot.options.length === 0) continue;
      const option = slot.options[Math.floor(Math.random() * slot.options.length)];
      choices.push({ type: slot.type, option });
    }
    return choices.slice(0, 3);
  }

  /**
   * Apply chosen option to player/stats.
   * @param {Object} choice - { type, option }
   * @param {Object} player
   * @param {Object} stats - playerStats object (for passives)
   */
  applyChoice(choice, player, stats) {
    if (choice.type === LEVEL_UP_OPTION_TYPES.NEW_WEAPON && choice.option) {
      player.addWeapon(choice.option);
    } else if (choice.type === LEVEL_UP_OPTION_TYPES.UPGRADE_WEAPON && choice.option) {
      choice.option.levelUp();
    } else if (choice.type === LEVEL_UP_OPTION_TYPES.PASSIVE && choice.option) {
      applyUpgrade(choice.option, stats);
      this.excludeUpgradeIds.add(choice.option.id);
    }
  }

  /** Legacy: get 3 random passive-only upgrades (for existing UI) */
  getRandomUpgrades(count = 3, exclude = new Set()) {
    return getRandomUpgrades(count, exclude);
  }
}
