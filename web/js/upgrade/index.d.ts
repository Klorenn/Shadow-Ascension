/**
 * Upgrade System — Modular Vampire Survivors–style upgrades (Space Dracula).
 * Pure Three.js; no UI; ready to integrate in game loop.
 *
 * Integration:
 * - Create playerStats (createDefaultPlayerStats), UpgradeManager (createDefaultUpgradeManager), VFXSystem.
 * - On level-up / pickup: choices = upgradeManager.getRandomUpgrades(3); apply chosen upgrade to playerStats and VFXSystem.applyUpgradeVFX(...).
 * - Each frame: vfxSystem.update(deltaTime, playerMesh.position) for clone/distortion; use playerStats for damage/speed/defense/projectiles.
 */
export { createDefaultPlayerStats, modifyStatPercent, modifyStatFlat, NUMERIC_STAT_KEYS } from './PlayerStats.js';
export type { PlayerStats, PlayerStatKey } from './PlayerStats.js';
export type { Upgrade, UpgradeType, UpgradeRarity, UpgradeVFX, VFXType } from './UpgradeTypes.js';
export { UpgradeManager } from './UpgradeManager.js';
export { VFXSystem } from './VFXSystem.js';
export { ALL_UPGRADES, CRIMSON_FURY, VOID_HELMET, ECLIPSE_DAGGER, SOLAR_CORRUPTION, BROKEN_BLADE, DARK_KNIGHT_PROTOCOL, BAT_WINGS, BLOOD_HARVEST, ABYSS_VISION, SHADOW_CLONE, STELLAR_PRECISION, GRAVITY_CURSE } from './Upgrades.js';
import { UpgradeManager } from './UpgradeManager.js';
/** Create manager with all 12 upgrades and weighted rarity (COMMON 60%, RARE 25%, CORRUPTED 10%, LEGENDARY 5%). */
export declare function createDefaultUpgradeManager(): UpgradeManager;
//# sourceMappingURL=index.d.ts.map