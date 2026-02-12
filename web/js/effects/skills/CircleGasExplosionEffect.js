/**
 * Circle Gas Explosion — Toxic Trap: circular poison field, reduces defense.
 */
import * as THREE from 'three';
import { SkillEffect, SKILL_TYPES, DAMAGE_TYPES } from '../SkillEffect.js';
import { getRadialTexture } from '../effectUtils.js';
import { getEnemiesInRadius, applyDamageToEnemy } from '../effectUtils.js';

let _sharedTex = null;
let _sharedGeo = null;

export class CircleGasExplosionEffect extends SkillEffect {
  constructor(position, options = {}) {
    super(position, {
      name: 'Circle Gas Explosion',
      skillType: SKILL_TYPES.TOXIC_TRAP,
      damageType: DAMAGE_TYPES.POISON,
      duration: 4,
      cooldown: 5,
      radius: 4,
      damage: 5,
      dotDamagePerTick: 2,
      dotTickRate: 0.5,
      ...options,
    });
    this._lastTick = 0;
    this._createVisual();
  }

  _createVisual() {
    if (!_sharedTex) _sharedTex = getRadialTexture('toxic', 0x55cc55, 0.4);
    if (!_sharedGeo) _sharedGeo = new THREE.RingGeometry(0.4, 1, 32);
    const mat = new THREE.MeshBasicMaterial({
      map: _sharedTex,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(_sharedGeo, mat);
    mesh.scale.setScalar(this.radius * 1.2);
    this._group.add(mesh);
    this._mesh = mesh;
    this._mat = mat;
  }

  update(delta) {
    this.elapsed += delta;
    this._mesh.rotation.z += delta * 1.5;
    const t = this.elapsed / this.duration;
    this._mat.opacity = 0.6 * (1 - t * 0.5);
    return this.elapsed < this.duration;
  }

  checkCollision(enemies) {
    const hit = getEnemiesInRadius(enemies, this.position.x, this.position.y, this.radius);
    const tickRate = this.options.dotTickRate ?? 0.5;
    const damagePerTick = this.options.dotDamagePerTick ?? 2;
    const applied = [];
    for (const e of hit) {
      applied.push(e);
      if (e.defenseMult !== undefined) e.defenseMult = 0.7;
      if (this.elapsed - this._lastTick >= tickRate) {
        applyDamageToEnemy(e, damagePerTick);
      }
    }
    if (this.elapsed - this._lastTick >= tickRate) this._lastTick = this.elapsed;
    return applied;
  }

  destroy() {
    this._mat.dispose();
    super.destroy();
  }
}
