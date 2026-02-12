/**
 * Blue Explosion — Energy Pulse: high damage, pierces.
 */
import * as THREE from 'three';
import { SkillEffect, SKILL_TYPES, DAMAGE_TYPES } from '../SkillEffect.js';
import { getRadialTexture } from '../effectUtils.js';
import { getEnemiesInRadius, applyDamageToEnemy } from '../effectUtils.js';

let _sharedTex = null;
let _sharedGeo = null;

export class BlueExplosionEffect extends SkillEffect {
  constructor(position, options = {}) {
    super(position, {
      name: 'Blue Explosion',
      skillType: SKILL_TYPES.ENERGY_PULSE,
      damageType: DAMAGE_TYPES.LIGHTNING,
      duration: 0.8,
      cooldown: 3.5,
      radius: 3,
      damage: 35,
      pierce: true,
      ...options,
    });
    this._createVisual();
  }

  _createVisual() {
    if (!_sharedTex) _sharedTex = getRadialTexture('plasma', 0x4488ff, 0);
    if (!_sharedGeo) _sharedGeo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: _sharedTex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(_sharedGeo, mat);
    mesh.scale.setScalar(0.3);
    this._group.add(mesh);
    this._mesh = mesh;
    this._mat = mat;
  }

  update(delta) {
    this.elapsed += delta;
    const t = this.elapsed / this.duration;
    const scale = 0.3 + t * 2.5;
    this._mesh.scale.setScalar(scale);
    this._mat.opacity = 0.9 * (1 - t * 0.8);
    return this.elapsed < this.duration;
  }

  checkCollision(enemies) {
    const hit = getEnemiesInRadius(enemies, this.position.x, this.position.y, this.radius);
    const applied = [];
    for (const e of hit) {
      applied.push(e);
      applyDamageToEnemy(e, this.damage);
    }
    return applied;
  }

  destroy() {
    this._mat.dispose();
    super.destroy();
  }
}
