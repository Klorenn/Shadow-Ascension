/**
 * Gold Explosion — Instant AoE, burst damage + knockback.
 */
import * as THREE from 'three';
import { SkillEffect, SKILL_TYPES, DAMAGE_TYPES } from '../SkillEffect.js';
import { getRadialTexture } from '../effectUtils.js';
import { getEnemiesInRadius, applyDamageToEnemy, applyKnockback } from '../effectUtils.js';

let _sharedTex = null;
let _sharedGeo = null;

export class GoldExplosionEffect extends SkillEffect {
  constructor(position, options = {}) {
    super(position, {
      name: 'Gold Explosion',
      skillType: SKILL_TYPES.INSTANT_AOE,
      damageType: DAMAGE_TYPES.PHYSICAL,
      duration: 0.6,
      cooldown: 2.5,
      radius: 4,
      damage: 25,
      knockbackForce: 2,
      radiusUpgrade: 1,
      damageUpgrade: 1,
      ...options,
    });
    this._createVisual();
  }

  _createVisual() {
    if (!_sharedTex) _sharedTex = getRadialTexture('gold', 0xffd700, 0);
    if (!_sharedGeo) _sharedGeo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: _sharedTex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(_sharedGeo, mat);
    mesh.scale.setScalar(0.2);
    this._group.add(mesh);
    this._mesh = mesh;
    this._mat = mat;
  }

  update(delta) {
    this.elapsed += delta;
    const t = this.elapsed / this.duration;
    const scale = 0.2 + t * (2.5 - 0.2);
    this._mesh.scale.setScalar(scale);
    this._mat.opacity = 1 - t;
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
      applyKnockback(e, this.position.x, this.position.y, this.options.knockbackForce ?? 2);
    }
    return applied;
  }

  destroy() {
    this._mat.dispose();
    super.destroy();
  }
}
