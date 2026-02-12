/**
 * Upgrade structure and VFX types for the upgrade system.
 */

import type { PlayerStats } from './PlayerStats.js'

export type UpgradeType = 'BUFF' | 'DEBUFF' | 'HYBRID'
export type UpgradeRarity = 'COMMON' | 'RARE' | 'CORRUPTED' | 'LEGENDARY'

export type VFXType =
  | 'AURA'
  | 'TRAIL'
  | 'CLONE'
  | 'SCREEN_EFFECT'
  | 'PROJECTILE_MOD'
  | 'DISTORTION'
  | 'NONE'

export interface UpgradeVFX {
  type: VFXType
  color: string
  intensity: number
  loop: boolean
  shaderModifier?: string
}

export interface Upgrade {
  id: string
  name: string
  description: string
  type: UpgradeType
  rarity: UpgradeRarity
  vfx: UpgradeVFX
  apply: (player: PlayerStats) => void
}
