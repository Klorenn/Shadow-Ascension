/**
 * Circle Explosion (Orange) — Fire Burst: AoE fire + stackable burn DoT (3s).
 */
import * as THREE from 'three';
import { SkillEffect, SKILL_TYPES, DAMAGE_TYPES } from '../SkillEffect.js';
import { getRadialTexture } from '../effectUtils.js';
import { getEnemiesInRadius, applyDamageToEnemy } from '../effectUtils.js';

let _sharedTex = null;
let _sharedGeo = null;
const BURN_DURATION = 3;

export class CircleOrangeExplosionEffect extends SkillEffect {
  constructor(position, options = {}) {
    super(position, {
      name: 'Circle Explosion (Orange)',
      skillType: SKILL_TYPES.FIRE_BURST,
      damageType: DAMAGE_TYPES.FIRE,
      duration: 1,
      cooldown: 2.8,
      radius: 3.5,
      damage: 18,
      burnDuration: BURN_DURATION,
      burnDamagePerTick: 2,
      ...options,
    });
    this._createVisual();
  }

  _createVisual() {
    if (!_sharedTex) _sharedTex = getRadialTexture('fire_ring', 0xff6600, 0);
    if (!_sharedGeo) _sharedGeo = new THREE.RingGeometry(0.2, 1, 32);
    const mat = new THREE.MeshBasicMaterial({
      map: _sharedTex,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(_sharedGeo, mat);
    mesh.scale.setScalar(1.5);
    this._group.add(mesh);
    this._mesh = mesh;
    this._mat = mat;
  }

  update(delta) {
    this.elapsed += delta;
    const t = this.elapsed / this.duration;
    this._mesh.scale.setScalar(1.5 + t * 2);
    this._mat.opacity = 0.95 * (1 - t);
    this._mesh.rotation.z += delta * 3;
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
      if (!e.burnStacks) e.burnStacks = [];
      e.burnStacks.push({
        until: this.elapsed + (this.options.burnDuration ?? BURN_DURATION),
        damagePerTick: this.options.burnDamagePerTick ?? 2,
      });
    }
    return applied;
  }

  destroy() {
    this._mat.dispose();
    super.destroy();
  }
}
