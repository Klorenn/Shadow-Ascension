/**
 * PlayerStats — Base stats for Vampire Survivors–style bullet heaven (Space Dracula).
 * Used by the upgrade system to apply buffs/debuffs.
 */

export interface PlayerStats {
  damage: number
  attackSpeed: number
  moveSpeed: number
  defense: number
  maxHealth: number
  currentHealth: number
  critChance: number
  critMultiplier: number
  projectileCount: number
  projectileSpeed: number
  lifeSteal: number
  visionRadius: number
  dodgeChance: number
  hasClone: boolean
  attacksCanFail: boolean
  hasHealthDrain: boolean
}

export const NUMERIC_STAT_KEYS = [
  'damage', 'attackSpeed', 'moveSpeed', 'defense', 'maxHealth', 'currentHealth',
  'critChance', 'critMultiplier', 'projectileCount', 'projectileSpeed',
  'lifeSteal', 'visionRadius', 'dodgeChance'
] as const

export type PlayerStatKey = keyof PlayerStats

/** Modify a numeric stat by a percentage (e.g. 0.15 = +15%). */
export function modifyStatPercent(
  stats: PlayerStats,
  stat: keyof PlayerStats,
  percent: number
): void {
  const key = stat as keyof PlayerStats
  const v = stats[key]
  if (typeof v === 'number') {
    ;(stats as unknown as Record<string, number>)[key] = v * (1 + percent)
  }
}

/** Modify a numeric stat by a flat value. */
export function modifyStatFlat(
  stats: PlayerStats,
  stat: keyof PlayerStats,
  value: number
): void {
  const key = stat as keyof PlayerStats
  const v = stats[key]
  if (typeof v === 'number') {
    ;(stats as unknown as Record<string, number>)[key] = v + value
  }
}

/** Create default player stats. */
export function createDefaultPlayerStats(): PlayerStats {
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
  }
}
