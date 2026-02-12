/**
 * UpgradeManager — Weighted random selection of upgrades by rarity.
 * Prevents duplicates; rolls rarity first, then picks from that pool.
 */
const RARITY_WEIGHTS = {
    COMMON: 0.6,
    RARE: 0.25,
    CORRUPTED: 0.1,
    LEGENDARY: 0.05
};
const RARITY_ORDER = ['COMMON', 'RARE', 'CORRUPTED', 'LEGENDARY'];
function rollRarity() {
    const r = Math.random();
    let acc = 0;
    for (const rarity of RARITY_ORDER) {
        acc += RARITY_WEIGHTS[rarity];
        if (r < acc)
            return rarity;
    }
    return 'COMMON';
}
export class UpgradeManager {
    upgrades = [];
    constructor(upgrades) {
        this.upgrades = upgrades;
    }
    /** Get a pool of upgrades for a given rarity (excluding already chosen IDs). */
    getPoolByRarity(rarity, excludeIds) {
        return this.upgrades.filter((u) => u.rarity === rarity && !excludeIds.has(u.id));
    }
    /**
     * Return `count` random upgrades without duplicates.
     * Roll rarity first, then pick one upgrade from that rarity pool.
     */
    getRandomUpgrades(count) {
        const chosen = [];
        const chosenIds = new Set();
        for (let i = 0; i < count; i++) {
            const rarity = rollRarity();
            const pool = this.getPoolByRarity(rarity, chosenIds);
            if (pool.length === 0) {
                const fallback = this.upgrades.filter((u) => !chosenIds.has(u.id));
                if (fallback.length === 0)
                    break;
                const u = fallback[Math.floor(Math.random() * fallback.length)];
                chosen.push(u);
                chosenIds.add(u.id);
                continue;
            }
            const u = pool[Math.floor(Math.random() * pool.length)];
            chosen.push(u);
            chosenIds.add(u.id);
        }
        return chosen;
    }
    getByRarity(rarity) {
        return this.upgrades.filter((u) => u.rarity === rarity);
    }
}
