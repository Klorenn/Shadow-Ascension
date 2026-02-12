/**
 * Enemy interface and base types for bullet-heaven enemy behavior system.
 * Integrate with SpawnSystem: spawner creates meshes, factory wraps them as Enemy.
 */

import type * as THREE from 'three'

export interface Enemy {
  readonly mesh: THREE.Mesh
  readonly type: 'slime' | 'alien'
  health: number
  maxHealth: number
  /** Cooldown for special behavior (lunge, dash) in seconds. */
  specialBehaviorCooldown: number

  update(delta: number, playerPosition: THREE.Vector3): void
  takeDamage(amount: number): void
  onDeath(): void
}

/** Base stats; difficulty scaling can multiply these (e.g. health *= 1 + level * 0.1). */
export interface EnemyStats {
  maxHealth: number
  moveSpeed: number
  damage?: number
}
