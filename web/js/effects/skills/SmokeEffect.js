/**
 * Smoke — Debuff: reduces vision radius, slight slow.
 */
import * as THREE from 'three';
import { SkillEffect, SKILL_TYPES, DAMAGE_TYPES } from '../SkillEffect.js';
import { getRadialTexture } from '../effectUtils.js';
import { getEnemiesInRadius } from '../effectUtils.js';

let _sharedTex = null;
let _sharedGeo = null;

export class SmokeEffect extends SkillEffect {
  constructor(position, options = {}) {
    super(position, {
      name: 'Smoke',
      skillType: SKILL_TYPES.DEBUFF,
      damageType: DAMAGE_TYPES.PHYSICAL,
      duration: 5,
      cooldown: 8,
      radius: 5,
      damage: 0,
      slowPercent: 0.15,
      ...options,
    });
    this._createVisual();
  }

  _createVisual() {
    if (!_sharedTex) _sharedTex = getRadialTexture('smoke', 0x666666, 0.5);
    if (!_sharedGeo) _sharedGeo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: _sharedTex,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });
    const mesh = new THREE.Mesh(_sharedGeo, mat);
    mesh.scale.setScalar(this.radius * 1.5);
    this._group.add(mesh);
    this._mesh = mesh;
    this._mat = mat;
  }

  update(delta) {
    this.elapsed += delta;
    const t = this.elapsed / this.duration;
    this._mesh.position.y += delta * 0.3;
    this._mat.opacity = 0.4 * (1 - t * 0.7);
    return this.elapsed < this.duration;
  }

  checkCollision(enemies) {
    const hit = getEnemiesInRadius(enemies, this.position.x, this.position.y, this.radius);
    for (const e of hit) {
      if (e.visionRadiusMult !== undefined) e.visionRadiusMult = 0.5;
      if (e.speedMult !== undefined) e.speedMult = 1 - (this.options.slowPercent ?? 0.15);
      if (e.slowUntil === undefined) e.slowUntil = 0;
      e.slowUntil = this.elapsed + 2;
    }
    return hit;
  }

  destroy() {
    this._mat.dispose();
    super.destroy();
  }
}
