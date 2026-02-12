/**
 * Gas Explosion — DoT Area: poison cloud, damage over time.
 * Duration 5s, tick 0.5s.
 */
import * as THREE from 'three';
import { SkillEffect, SKILL_TYPES, DAMAGE_TYPES } from '../SkillEffect.js';
import { getRadialTexture } from '../effectUtils.js';
import { getEnemiesInRadius, applyDamageToEnemy } from '../effectUtils.js';

let _sharedTex = null;
let _sharedGeo = null;

export class GasExplosionEffect extends SkillEffect {
  constructor(position, options = {}) {
    super(position, {
      name: 'Gas Explosion',
      skillType: SKILL_TYPES.DOT_AREA,
      damageType: DAMAGE_TYPES.POISON,
      duration: 5,
      cooldown: 4,
      radius: 4,
      damage: 3,
      dotTickRate: 0.5,
      dotDamagePerTick: 4,
      radiusUpgrade: 1,
      ...options,
    });
    this._lastTick = 0;
    this._createVisual();
  }

  _createVisual() {
    if (!_sharedTex) _sharedTex = getRadialTexture('gas', 0x44aa44, 0.3);
    if (!_sharedGeo) _sharedGeo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: _sharedTex,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(_sharedGeo, mat);
    mesh.scale.setScalar(this.radius * 2);
    this._group.add(mesh);
    this._mesh = mesh;
    this._mat = mat;
  }

  update(delta) {
    this.elapsed += delta;
    const t = this.elapsed / this.duration;
    const pulse = 1 + 0.08 * Math.sin(this.elapsed * 4);
    this._mesh.scale.setScalar(this.radius * 2 * pulse);
    this._mat.opacity = 0.5 * (0.3 + 0.7 * (1 - t));
    return this.elapsed < this.duration;
  }

  checkCollision(enemies) {
    const hit = getEnemiesInRadius(enemies, this.position.x, this.position.y, this.radius);
    const tickRate = this.options.dotTickRate ?? 0.5;
    const damagePerTick = this.options.dotDamagePerTick ?? 4;
    const applied = [];
    for (const e of hit) {
      applied.push(e);
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
