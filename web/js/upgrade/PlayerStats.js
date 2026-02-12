/**
 * PlayerStats — Base stats for Vampire Survivors–style bullet heaven (Space Dracula).
 * Used by the upgrade system to apply buffs/debuffs.
 */
export const NUMERIC_STAT_KEYS = [
    'damage', 'attackSpeed', 'moveSpeed', 'defense', 'maxHealth', 'currentHealth',
    'critChance', 'critMultiplier', 'projectileCount', 'projectileSpeed',
    'lifeSteal', 'visionRadius', 'dodgeChance'
];
/** Modify a numeric stat by a percentage (e.g. 0.15 = +15%). */
export function modifyStatPercent(stats, stat, percent) {
    const key = stat;
    const v = stats[key];
    if (typeof v === 'number') {
        ;
        stats[key] = v * (1 + percent);
    }
}
/** Modify a numeric stat by a flat value. */
export function modifyStatFlat(stats, stat, value) {
    const key = stat;
    const v = stats[key];
    if (typeof v === 'number') {
        ;
        stats[key] = v + value;
    }
}
/** Create default player stats. */
export function createDefaultPlayerStats() {
    return {
        damage: 10,
        attackSpeed: 1,
        moveSpeed: 1,
        defense: 0,
        maxHealth: 100,
        currentHealth: 100,
        critChance: 0,
        critMultiplier: 2,
        projectileCount: 1,
        projectileSpeed: 1,
        lifeSteal: 0,
        visionRadius: 1,
        dodgeChance: 0,
        hasClone: false,
        attacksCanFail: false,
        hasHealthDrain: false
    };
}
