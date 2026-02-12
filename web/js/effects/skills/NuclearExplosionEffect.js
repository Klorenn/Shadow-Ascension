/**
 * Nuclear Explosion — Ultimate: massive AoE, screen shake, instant kill weak.
 * Cooldown 20s. Optimized: remove after animation, minimal geometry.
 */
import * as THREE from 'three';
import { SkillEffect, SKILL_TYPES, DAMAGE_TYPES } from '../SkillEffect.js';
import { getRadialTexture } from '../effectUtils.js';
import { getEnemiesInRadius, applyDamageToEnemy } from '../effectUtils.js';

let _sharedTex = null;
let _sharedGeo = null;
const WEAK_THRESHOLD = 15;

export class NuclearExplosionEffect extends SkillEffect {
  constructor(position, options = {}) {
    super(position, {
      name: 'Nuclear Explosion',
      skillType: SKILL_TYPES.ULTIMATE,
      damageType: DAMAGE_TYPES.PHYSICAL,
      duration: 2.5,
      cooldown: 20,
      radius: 12,
      damage: 80,
      radiusUpgrade: 1,
      damageUpgrade: 1,
      ...options,
    });
    this._createVisual();
    this._screenShake = options.screenShakeCallback || (() => {});
  }

  _createVisual() {
    if (!_sharedTex) _sharedTex = getRadialTexture('nuclear', 0xffffaa, 0);
    if (!_sharedGeo) _sharedGeo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: _sharedTex,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(_sharedGeo, mat);
    mesh.scale.setScalar(0.5);
    this._group.add(mesh);
    this._mesh = mesh;
    this._mat = mat;
  }

  update(delta) {
    this.elapsed += delta;
    const t = this.elapsed / this.duration;
    const scale = 0.5 + t * 5;
    this._mesh.scale.setScalar(scale);
    this._mat.opacity = 1 - t * 0.9;
    if (t < 0.1) this._screenShake(0.3 - t * 2);
    return this.elapsed < this.duration;
  }

  checkCollision(enemies) {
    const hit = getEnemiesInRadius(enemies, this.position.x, this.position.y, this.radius);
    const applied = [];
    for (const e of hit) {
      if (this._hitEnemies.has(e)) continue;
      this._hitEnemies.add(e);
      applied.push(e);
      const maxHp = e.maxHealth ?? 20;
      const dmg = maxHp <= WEAK_THRESHOLD ? 9999 : this.damage;
      applyDamageToEnemy(e, dmg);
    }
    return applied;
  }

  destroy() {
    this._mat.dispose();
    super.destroy();
  }
}
