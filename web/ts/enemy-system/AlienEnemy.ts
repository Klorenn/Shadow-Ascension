/**
 * Alien enemy: low HP, high speed, dash every 4–6s (double speed 0.5s).
 * Fake motion blur via scale stretch; red emissive during dash.
 */

import * as THREE from 'three'
import type { Enemy } from './EnemyTypes.js'

const BASE_SPEED = 0.22
const DASH_SPEED_MULT = 2
const DASH_DURATION = 0.5
const DASH_COOLDOWN_MIN = 4
const DASH_COOLDOWN_MAX = 6
const EMISSIVE_NORMAL = 0x331111
const EMISSIVE_DASH = 0xcc2222
const EMISSIVE_INTENSITY_NORMAL = 0.05
const EMISSIVE_INTENSITY_DASH = 0.5
const STRETCH_DASH = 1.4

export function createAlienEnemy(mesh: THREE.Mesh): Enemy {
  const cloned = mesh.clone() as THREE.Mesh
  cloned.position.set(0, 0, 0)

  const mat = cloned.material as THREE.MeshBasicMaterial & { emissive?: THREE.Color; emissiveIntensity?: number }
  if (mat && 'emissive' in mat && mat.emissive) {
    mat.emissive = new THREE.Color(EMISSIVE_NORMAL)
    mat.emissiveIntensity = EMISSIVE_INTENSITY_NORMAL
  }

  // Base stats; difficulty scaling modifies these via setDifficulty(healthMult, speedMult) after creation
  let maxHealth = 12
  let moveSpeed = BASE_SPEED
  let health = maxHealth
  let specialBehaviorCooldown = DASH_COOLDOWN_MIN + Math.random() * (DASH_COOLDOWN_MAX - DASH_COOLDOWN_MIN)
  let dashTimeLeft = 0
  const toPlayer = new THREE.Vector2(0, 0)
  const pos = new THREE.Vector2(0, 0)
  let deathCallback: (() => void) | null = null
  const baseScaleX = cloned.scale.x
  const baseScaleY = cloned.scale.y
  const baseScaleZ = cloned.scale.z

  const alien: Enemy = {
    mesh: cloned,
    type: 'alien',
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
      if (dashTimeLeft > 0) {
        dashTimeLeft -= delta
        if (mat && 'emissive' in mat && mat.emissive) {
          mat.emissive.setHex(EMISSIVE_DASH)
          mat.emissiveIntensity = EMISSIVE_INTENSITY_DASH
        }
        const t = 1 - dashTimeLeft / DASH_DURATION
        const stretch = 1 + t * (STRETCH_DASH - 1)
        cloned.scale.set(baseScaleX * stretch, baseScaleY / stretch, baseScaleZ)
      } else {
        if (mat && 'emissive' in mat && mat.emissive) {
          mat.emissive.setHex(EMISSIVE_NORMAL)
          mat.emissiveIntensity = EMISSIVE_INTENSITY_NORMAL
        }
        cloned.scale.set(baseScaleX, baseScaleY, baseScaleZ)
      }

      const speedMult = dashTimeLeft > 0 ? DASH_SPEED_MULT : 1
      const currentSpeed = moveSpeed * speedMult

      if (distToPlayer > 0.1) {
        toPlayer.normalize()
        pos.x += toPlayer.x * currentSpeed * 60 * delta
        pos.y += toPlayer.y * currentSpeed * 60 * delta
      }

      if (specialBehaviorCooldown <= 0 && dashTimeLeft <= 0) {
        dashTimeLeft = DASH_DURATION
        specialBehaviorCooldown = DASH_COOLDOWN_MIN + Math.random() * (DASH_COOLDOWN_MAX - DASH_COOLDOWN_MIN)
      }

      cloned.position.set(pos.x, pos.y, cloned.position.z)
    },

    takeDamage(amount: number): void {
      health = Math.max(0, health - amount)
      if (health <= 0) alien.onDeath()
    },

    onDeath(): void {
      if (deathCallback) deathCallback()
    }
  }

  ;(alien as { setDeathCallback?: (fn: () => void) => void }).setDeathCallback = (fn: () => void) => {
    deathCallback = fn
  }
  ;(alien as { setDifficulty?: (healthMult: number, speedMult: number) => void }).setDifficulty = (
    healthMult: number,
    speedMult: number
  ) => {
    maxHealth *= healthMult
    health = maxHealth
    moveSpeed *= speedMult
  }

  return alien
}
