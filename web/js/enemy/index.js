/**
 * Enemy behavior system — Slime and Alien with update/takeDamage/onDeath.
 * Integrate in SpawnSystem: load slime/alien meshes, then use factory.createSlime(mesh) / factory.createAlien(mesh).
 * In game loop: for each enemy call enemy.update(delta, playerPosition).
 *
 * Difficulty scaling: after creating an enemy, call (enemy as any).setDifficulty(healthMult, speedMult)
 * e.g. healthMult = 1 + level * 0.1, speedMult = 1 + level * 0.05
 */
export { createSlimeEnemy } from './SlimeEnemy.js';
export { createAlienEnemy } from './AlienEnemy.js';
export { getEnemyFactory, createEnemyFactory } from './EnemyFactory.js';
