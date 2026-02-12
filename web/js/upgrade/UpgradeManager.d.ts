/**
 * UpgradeManager — Weighted random selection of upgrades by rarity.
 * Prevents duplicates; rolls rarity first, then picks from that pool.
 */
import type { Upgrade, UpgradeRarity } from './UpgradeTypes.js';
export declare class UpgradeManager {
    upgrades: Upgrade[];
    constructor(upgrades: Upgrade[]);
    /** Get a pool of upgrades for a given rarity (excluding already chosen IDs). */
    private getPoolByRarity;
    /**
     * Return `count` random upgrades without duplicates.
     * Roll rarity first, then pick one upgrade from that rarity pool.
     */
    getRandomUpgrades(count: number): Upgrade[];
    getByRarity(rarity: UpgradeRarity): Upgrade[];
}
//# sourceMappingURL=UpgradeManager.d.ts.map