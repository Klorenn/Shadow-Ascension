/**
 * Slime enemy: medium HP, slow, wobble + squash animation, lunge when close.
 * Reuses vectors to avoid per-frame allocations.
 */

import * as THREE from 'three'
import type { Enemy } from './EnemyTypes.js'

const WOBBLE_SPEED = 3
const SQUASH_AMP = 0.1
const SQUASH_BASE = 1
const LUNGE_DISTANCE = 2.5
const LUNGE_SPEED_MULT = 2.5
const LUNGE_DURATION = 0.25
const BASE_SPEED = 0.08
const EMISSIVE_COLOR = 0x22aa44
const EMISSIVE_INTENSITY = 0.15

export function createSlimeEnemy(mesh: THREE.Mesh): Enemy {
  const cloned = mesh.clone() as THREE.Mesh
  cloned.position.set(0, 0, 0)

  const mat = cloned.material as THREE.MeshBasicMaterial & { emissive?: THREE.Color; emissiveIntensity?: number }
  if (mat && 'emissive' in mat && mat.emissive) {
    mat.emissive = new THREE.Color(EMISSIVE_COLOR)
    mat.emissiveIntensity = EMISSIVE_INTENSITY
  }

  // Base stats; difficulty scaling modifies these via setDifficulty(healthMult, speedMult) after creation
  let maxHealth = 30
  let moveSpeed = BASE_SPEED

  let health = maxHealth
  let specialBehaviorCooldown = 0
  const lungeVec = new THREE.Vector2(0, 0)
  let lungeTimeLeft = 0
  const toPlayer = new THREE.Vector2(0, 0)
  const pos = new THREE.Vector2(0, 0)
  let deathCallback: (() => void) | null = null
  const baseScaleX = cloned.scale.x
  const baseScaleY = cloned.scale.y
  const baseScaleZ = cloned.scale.z

  const slime: Enemy = {
    mesh: cloned,
    type: 'slime',
    get health() {
      return health
    },
    set health(v) {
      health = v
    },
    get maxHealth() {
      return maxHealth
    },
    set maxHealth(v) {
      maxHealth = v
    },
    get specialBehaviorCooldown() {
      return specialBehaviorCooldown
    },
    set specialBehaviorCooldown(v) {
      specialBehaviorCooldown = v
    },

    update(delta: number, playerPosition: THREE.Vector3): void {
      pos.set(cloned.position.x, cloned.position.y)
      toPlayer.set(playerPosition.x - pos.x, playerPosition.y - pos.y)
      const distToPlayer = toPlayer.length()

      specialBehaviorCooldown -= delta
      if (lungeTimeLeft > 0) {
        lungeTimeLeft -= delta
        const t = Math.min(1, (LUNGE_DURATION - lungeTimeLeft) / LUNGE_DURATION)
        const speed = moveSpeed * LUNGE_SPEED_MULT * (1 - t * 0.5)
        pos.x += lungeVec.x * speed * 60 * delta
        pos.y += lungeVec.y * speed * 60 * delta
      } else {
        if (distToPlayer < LUNGE_DISTANCE && distToPlayer > 0.1 && specialBehaviorCooldown <= 0) {
          lungeVec.copy(toPlayer).normalize()
          lungeTimeLeft = LUNGE_DURATION
          specialBehaviorCooldown = 1.5
        } else {
          if (distToPlayer > 0.1) {
            toPlayer.normalize()
            const wobble = Math.sin(performance.now() * 0.002) * 0.15
            const wx = toPlayer.x + wobble
            const wy = toPlayer.y + Math.sin(performance.now() * 0.0017) * 0.15
            const len = Math.sqrt(wx * wx + wy * wy) || 1
            pos.x += (wx / len) * moveSpeed * 60 * delta
            pos.y += (wy / len) * moveSpeed * 60 * delta
          }
        }
      }

      cloned.position.set(pos.x, pos.y, cloned.position.z)

      const squash = SQUASH_BASE + Math.sin(performance.now() * WOBBLE_SPEED * 0.001) * SQUASH_AMP
      cloned.scale.set(baseScaleX, baseScaleY * squash, baseScaleZ)
    },

    takeDamage(amount: number): void {
      health = Math.max(0, health - amount)
      if (health <= 0) slime.onDeath()
    },

    onDeath(): void {
      if (deathCallback) deathCallback()
      // Optional: 20% chance to spawn 2 mini slimes (handled by SpawnSystem when it subscribes to onDeath)
      // if (Math.random() < 0.2) { spawnMiniSlimes(cloned.position); }
    }
  }

  ;(slime as { setDeathCallback?: (fn: () => void) => void }).setDeathCallback = (fn: () => void) => {
    deathCallback = fn
  }
  ;(slime as { setDifficulty?: (healthMult: number, speedMult: number) => void }).setDifficulty = (
    healthMult: number,
    speedMult: number
  ) => {
    maxHealth *= healthMult
    health = maxHealth
    moveSpeed *= speedMult
  }

  return slime
}
