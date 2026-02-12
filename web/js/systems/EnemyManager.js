/**
 * EnemyManager — object pooling, difficulty scaling, on-death XP orb and pool return.
 * Does not destroy mesh/material; returns enemy to pool.
 */
import * as THREE from 'three';
import { Enemy } from '../entities/Enemy.js';
import { EliteEnemy } from '../entities/EliteEnemy.js';
import { BossEnemy } from '../entities/BossEnemy.js';
import { AlienEnemy } from '../entities/AlienEnemy.js';
import { SlimeEnemy } from '../entities/SlimeEnemy.js';
import { getEnemyType, getAllEnemyTypeIds, ENEMY_TYPE_IDS } from '../data/enemyTypes.js';

export class EnemyManager {
  /**
   * @param {Object} options
   * @param {THREE.Scene} options.scene
   * @param {Function} options.createMeshForType - (typeId) => THREE.Mesh
   * @param {Function} options.onEnemyDeath - (enemy) => void (spawn orb, dropOrbs, etc.)
   * @param {Object} [options.difficulty] - { hpMultiplier, damageMultiplier, speedMultiplier }
   * @param {import('./AlienAnimationSystem.js').AlienAnimationSystem} [options.alienAnimSystem]
   * @param {import('./SlimeAnimationSystem.js').SlimeAnimationSystem} [options.slimeAnimSystem]
   */
  constructor(options = {}) {
    this.scene = options.scene;
    this.createMeshForType = options.createMeshForType;
    this.onEnemyDeath = options.onEnemyDeath;
    this.getDifficulty = options.getDifficulty ?? (() => ({ hpMultiplier: 1, damageMultiplier: 1, speedMultiplier: 1 }));
    this.alienAnimSystem = options.alienAnimSystem || null;
    this.slimeAnimSystem = options.slimeAnimSystem || null;
    this._pool = [];
    this._active = [];
    this._meshPools = {};
    getAllEnemyTypeIds().forEach(id => { this._meshPools[id] = []; });
  }

  _getMesh(typeId) {
    const pool = this._meshPools[typeId];
    if (pool.length > 0) {
      const mesh = pool.pop();
      mesh.visible = true;
      return mesh;
    }
    return this.createMeshForType ? this.createMeshForType(typeId) : null;
  }

  _returnMesh(typeId, mesh) {
    if (!mesh) return;
    mesh.visible = false;
    if (this.scene && mesh.parent === this.scene) this.scene.remove(mesh);
    this._meshPools[typeId] = this._meshPools[typeId] || [];
    this._meshPools[typeId].push(mesh);
  }

  spawn(typeId, x, y, options = {}) {
    const diff = this.getDifficulty();
    const typeConfig = getEnemyType(typeId);
    const hp = Math.max(1, Math.floor((typeConfig.hp * (diff.hpMultiplier ?? 1)) * (options.hpMult ?? 1)));
    const damage = (typeConfig.damage * (diff.damageMultiplier ?? 1)) * (options.damageMult ?? 1);
    const speed = (typeConfig.speed * (diff.speedMultiplier ?? 1)) * (options.speedMult ?? 1);
    const xpDrop = Math.max(1, Math.floor(typeConfig.xpDrop * (options.xpMult ?? 1)));

    let enemy = this._pool.pop();
    const isElite = options.isElite === true;
    const isBoss = options.isBoss === true;

    if (!enemy) {
      if (isBoss) enemy = new BossEnemy({});
      else if (isElite) enemy = new EliteEnemy({});
      else if (typeId === ENEMY_TYPE_IDS.ALIEN) enemy = new AlienEnemy({ animSystem: this.alienAnimSystem });
      else if (typeId === ENEMY_TYPE_IDS.SLIME && this.slimeAnimSystem) enemy = new SlimeEnemy({ animSystem: this.slimeAnimSystem });
      else enemy = new Enemy({});
    }

    const mesh = this._getMesh(typeId);
    if (mesh) {
      mesh.position.set(x, y, 0);
      enemy.setMesh(mesh);
      if (enemy.isBoss && enemy.applyBossScale) enemy.applyBossScale();
      if (isElite) {
        const outline = new THREE.Mesh(
          new THREE.RingGeometry(1.1, 1.25, 16),
          new THREE.MeshBasicMaterial({ color: 0x8844ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false })
        );
        outline.scale.setScalar(typeConfig.scale ?? 1.8);
        mesh.add(outline);
        enemy._eliteOutline = outline;
      }
    }

    enemy.reset({
      type: typeId,
      x, y,
      maxHp: hp,
      damage,
      speed,
      xpDrop,
      attackRange: typeConfig.attackRange,
      attackCooldown: typeConfig.attackCooldown,
      isElite,
      isBoss,
    });

    enemy.setDeathCallback((e) => this._onDeath(e));
    if (this.scene && mesh) this.scene.add(mesh);
    this._active.push(enemy);
    return enemy;
  }

  _onDeath(enemy) {
    enemy.state = 'death';

    // Spawn XP orbs / drops immediately
    if (this.onEnemyDeath) this.onEnemyDeath(enemy);

    // Delay mesh removal so death animation can play (400ms)
    const DEATH_ANIM_MS = 400;
    setTimeout(() => {
      if (enemy.mesh) {
        if (enemy._eliteOutline) {
          enemy.mesh.remove(enemy._eliteOutline);
          enemy._eliteOutline = null;
        }
        this.scene.remove(enemy.mesh);
        this._returnMesh(enemy.type, enemy.mesh);
        enemy.setMesh(null);
      }
      const idx = this._active.indexOf(enemy);
      if (idx >= 0) this._active.splice(idx, 1);
      this._pool.push(enemy);
    }, DEATH_ANIM_MS);
  }

  getActive() {
    return this._active;
  }

  getActiveCount() {
    return this._active.length;
  }

  clear() {
    for (const enemy of this._active) {
      if (enemy.mesh) {
        this.scene.remove(enemy.mesh);
        this._returnMesh(enemy.type, enemy.mesh);
        enemy.setMesh(null);
      }
      this._pool.push(enemy);
    }
    this._active.length = 0;
  }
}
