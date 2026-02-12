/**
 * LevelUpSystem — XP to next level, pause on level up, 3 random upgrades, apply and resume.
 */

const BASE_XP_LEVEL = 50;
const LEVEL_EXPONENT = 1.2;

/** XP required for next level: baseXP * (level ^ 1.2). Early fast, late slow. */
export function xpToNextLevel(level) {
  return Math.floor(BASE_XP_LEVEL * Math.pow(Math.max(1, level), LEVEL_EXPONENT));
}

export const UPGRADE_IDS = {
  DAMAGE_10: 'damage_10',
  ATTACK_SPEED_15: 'attack_speed_15',
  RADIUS_10: 'radius_10',
  MOVE_SPEED_5: 'move_speed_5',
  BURN_CHANCE_20: 'burn_chance_20',
  EXTRA_EXPLOSION_10: 'extra_explosion_10',
  CURSED_DAMAGE: 'cursed_damage',
  MAGNET_RADIUS_20: 'magnet_radius_20',
  MAGNET_FULLSCREEN: 'magnet_fullscreen',
  MAGNET_AUTO_COLLECT: 'magnet_auto_collect',
};

export const UPGRADES = [
  { id: UPGRADE_IDS.DAMAGE_10, name: '+10% Damage', damageUpgrade: 0.1 },
  { id: UPGRADE_IDS.ATTACK_SPEED_15, name: '+15% Attack Speed', attackSpeedUpgrade: 0.15 },
  { id: UPGRADE_IDS.RADIUS_10, name: '+10% Radius', radiusUpgrade: 0.1 },
  { id: UPGRADE_IDS.MOVE_SPEED_5, name: '+5% Move Speed', moveSpeedUpgrade: 0.05 },
  { id: UPGRADE_IDS.BURN_CHANCE_20, name: '20% Burn Chance', burnChance: 0.2 },
  { id: UPGRADE_IDS.EXTRA_EXPLOSION_10, name: '10% Extra Explosion', extraExplosionChance: 0.1 },
  { id: UPGRADE_IDS.CURSED_DAMAGE, name: 'Cursed: +30% Dmg, -20% Move', cursedDamage: 0.3, cursedMove: -0.2 },
  { id: UPGRADE_IDS.MAGNET_RADIUS_20, name: '+20% Magnet Radius', magnetRadiusUpgrade: 0.2 },
  { id: UPGRADE_IDS.MAGNET_FULLSCREEN, name: 'Full-Screen Magnet (5s)', magnetFullScreen: 5 },
  { id: UPGRADE_IDS.MAGNET_AUTO_COLLECT, name: '10% Auto-Collect Orbs on Kill', magnetAutoCollect: 0.1 },
];

/**
 * @param {number} count - number of choices (default 3)
 * @param {Set<string>} [exclude] - already taken upgrade ids to avoid duplicates
 */
export function getRandomUpgrades(count = 3, exclude = new Set()) {
  const available = UPGRADES.filter(u => !exclude.has(u.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Apply one upgrade to player stats object. Mutates stats.
 * @param {Object} upgrade - one entry from UPGRADES
 * @param {Object} stats - { damageUpgrade, attackSpeedUpgrade, radiusUpgrade, moveSpeedUpgrade, burnChance, extraExplosionChance, cursedMove }
 */
export function applyUpgrade(upgrade, stats) {
  if (!stats) return;
  if (upgrade.damageUpgrade != null) stats.damageUpgrade = (stats.damageUpgrade ?? 1) + upgrade.damageUpgrade;
  if (upgrade.attackSpeedUpgrade != null) stats.attackSpeedUpgrade = (stats.attackSpeedUpgrade ?? 0) + upgrade.attackSpeedUpgrade;
  if (upgrade.radiusUpgrade != null) stats.radiusUpgrade = (stats.radiusUpgrade ?? 0) + upgrade.radiusUpgrade;
  if (upgrade.moveSpeedUpgrade != null) stats.moveSpeedUpgrade = (stats.moveSpeedUpgrade ?? 0) + upgrade.moveSpeedUpgrade;
  if (upgrade.burnChance !== undefined) stats.burnChance = (stats.burnChance ?? 0) + upgrade.burnChance;
  if (upgrade.extraExplosionChance !== undefined) stats.extraExplosionChance = (stats.extraExplosionChance ?? 0) + upgrade.extraExplosionChance;
  if (upgrade.cursedDamage != null) stats.damageUpgrade = (stats.damageUpgrade ?? 1) + upgrade.cursedDamage;
  if (upgrade.cursedMove !== undefined) stats.moveSpeedUpgrade = (stats.moveSpeedUpgrade ?? 0) + upgrade.cursedMove;
  if (upgrade.magnetRadiusUpgrade != null) stats.magnetRadiusUpgrade = (stats.magnetRadiusUpgrade ?? 0) + upgrade.magnetRadiusUpgrade;
  if (upgrade.magnetFullScreen != null) stats.magnetFullScreenDuration = (stats.magnetFullScreenDuration ?? 0) + upgrade.magnetFullScreen;
  if (upgrade.magnetAutoCollect != null) stats.magnetAutoCollectChance = (stats.magnetAutoCollectChance ?? 0) + upgrade.magnetAutoCollect;
}
