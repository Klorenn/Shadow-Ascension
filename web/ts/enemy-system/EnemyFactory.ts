/**
 * EnemyFactory — Creates Enemy instances from pre-loaded meshes.
 * SpawnSystem should load slime/alien meshes once, then call createSlime(mesh) / createAlien(mesh) per spawn.
 *
 * Difficulty scaling: after createSlime/createAlien, call (enemy as any).setDifficulty(healthMult, speedMult).
 * Example: healthMult = 1 + level * 0.1, speedMult = 1 + level * 0.05 (modifies maxHealth/health and moveSpeed).
 */

import * as THREE from 'three'
import type { Enemy } from './EnemyTypes.js'
import { createSlimeEnemy } from './SlimeEnemy.js'
import { createAlienEnemy } from './AlienEnemy.js'

export interface EnemyFactory {
  createSlime(mesh: THREE.Mesh): Enemy
  createAlien(mesh: THREE.Mesh): Enemy
}

class EnemyFactoryImpl implements EnemyFactory {
  createSlime(mesh: THREE.Mesh): Enemy {
    return createSlimeEnemy(mesh)
  }

  createAlien(mesh: THREE.Mesh): Enemy {
    return createAlienEnemy(mesh)
  }
}

let _instance: EnemyFactory | null = null

export function getEnemyFactory(): EnemyFactory {
  if (!_instance) _instance = new EnemyFactoryImpl()
  return _instance
}

export function createEnemyFactory(): EnemyFactory {
  return new EnemyFactoryImpl()
}
