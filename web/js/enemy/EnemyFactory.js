/**
 * EnemyFactory — Creates Enemy instances from pre-loaded meshes.
 * SpawnSystem should load slime/alien meshes once, then call createSlime(mesh) / createAlien(mesh) per spawn.
 *
 * Difficulty scaling: after createSlime/createAlien, call (enemy as any).setDifficulty(healthMult, speedMult).
 * Example: healthMult = 1 + level * 0.1, speedMult = 1 + level * 0.05 (modifies maxHealth/health and moveSpeed).
 */
import { createSlimeEnemy } from './SlimeEnemy.js';
import { createAlienEnemy } from './AlienEnemy.js';
class EnemyFactoryImpl {
    createSlime(mesh) {
        return createSlimeEnemy(mesh);
    }
    createAlien(mesh) {
        return createAlienEnemy(mesh);
    }
}
let _instance = null;
export function getEnemyFactory() {
    if (!_instance)
        _instance = new EnemyFactoryImpl();
    return _instance;
}
export function createEnemyFactory() {
    return new EnemyFactoryImpl();
}
