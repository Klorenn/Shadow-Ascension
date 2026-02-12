/**
 * Circle Blue Explosion — Frost AoE: damage + 40% slow for 2s.
 */
import * as THREE from 'three';
import { SkillEffect, SKILL_TYPES, DAMAGE_TYPES } from '../SkillEffect.js';
import { getRadialTexture } from '../effectUtils.js';
import { getEnemiesInRadius, applyDamageToEnemy } from '../effectUtils.js';

let _sharedTex = null;
let _sharedGeo = null;
const SLOW_PERCENT = 0.4;
const SLOW_DURATION = 2;

export class CircleBlueExplosionEffect extends SkillEffect {
  constructor(position, options = {}) {
    super(position, {
      name: 'Circle Blue Explosion',
      skillType: SKILL_TYPES.FROST_AOE,
      damageType: DAMAGE_TYPES.FROST,
      duration: 1.2,
      cooldown: 3,
      radius: 3.5,
      damage: 15,
      slowPercent: SLOW_PERCENT,
      slowDuration: SLOW_DURATION,
      ...options,
    });
    this._createVisual();
  }

  _createVisual() {
    if (!_sharedTex) _sharedTex = getRadialTexture('frost', 0x88ccff, 0);
    if (!_sharedGeo) _sharedGeo = new THREE.RingGeometry(0.3, 1, 32);
    const mat = new THREE.MeshBasicMaterial({
      map: _sharedTex,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(_sharedGeo, mat);
    mesh.scale.setScalar(2);
    this._group.add(mesh);
    this._mesh = mesh;
    this._mat = mat;
  }

  update(delta) {
    this.elapsed += delta;
    const t = this.elapsed / this.duration;
    const scale = 0.5 + t * 2.5;
    this._mesh.scale.setScalar(scale);
    this._mesh.rotation.z += delta * 2;
    this._mat.opacity = 0.85 * (1 - t);
    return this.elapsed < this.duration;
  }

  checkCollision(enemies) {
    const hit = getEnemiesInRadius(enemies, this.position.x, this.position.y, this.radius);
    const applied = [];
    for (const e of hit) {
      if (this._hitEnemies.has(e)) continue;
      this._hitEnemies.add(e);
      applied.push(e);
      applyDamageToEnemy(e, this.damage);
      if (e.speedMult !== undefined) e.speedMult = 1 - (this.options.slowPercent ?? SLOW_PERCENT);
      if (e.slowUntil === undefined) e.slowUntil = 0;
      e.slowUntil = this.elapsed + (this.options.slowDuration ?? SLOW_DURATION);
    }
    return applied;
  }

  destroy() {
    this._mat.dispose();
    super.destroy();
  }
}
