/**
 * PlayerStats — Base stats for Vampire Survivors–style bullet heaven (Space Dracula).
 * Used by the upgrade system to apply buffs/debuffs.
 */
export interface PlayerStats {
    damage: number;
    attackSpeed: number;
    moveSpeed: number;
    defense: number;
    maxHealth: number;
    currentHealth: number;
    critChance: number;
    critMultiplier: number;
    projectileCount: number;
    projectileSpeed: number;
    lifeSteal: number;
    visionRadius: number;
    dodgeChance: number;
    hasClone: boolean;
    attacksCanFail: boolean;
    hasHealthDrain: boolean;
}
export declare const NUMERIC_STAT_KEYS: readonly ["damage", "attackSpeed", "moveSpeed", "defense", "maxHealth", "currentHealth", "critChance", "critMultiplier", "projectileCount", "projectileSpeed", "lifeSteal", "visionRadius", "dodgeChance"];
export type PlayerStatKey = keyof PlayerStats;
/** Modify a numeric stat by a percentage (e.g. 0.15 = +15%). */
export declare function modifyStatPercent(stats: PlayerStats, stat: keyof PlayerStats, percent: number): void;
/** Modify a numeric stat by a flat value. */
export declare function modifyStatFlat(stats: PlayerStats, stat: keyof PlayerStats, value: number): void;
/** Create default player stats. */
export declare function createDefaultPlayerStats(): PlayerStats;
//# sourceMappingURL=PlayerStats.d.ts.map