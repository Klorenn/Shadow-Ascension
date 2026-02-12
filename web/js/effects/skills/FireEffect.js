/**
 * Fire — Ground DoT: leaves fire on ground, enemies stepping take burn.
 */
import * as THREE from 'three';
import { SkillEffect, SKILL_TYPES, DAMAGE_TYPES } from '../SkillEffect.js';
import { getRadialTexture } from '../effectUtils.js';
import { getEnemiesInRadius, applyDamageToEnemy } from '../effectUtils.js';

let _sharedTex = null;
let _sharedGeo = null;
const BURN_TICK = 0.4;

export class FireEffect extends SkillEffect {
  constructor(position, options = {}) {
    super(position, {
      name: 'Fire',
      skillType: SKILL_TYPES.GROUND_DOT,
      damageType: DAMAGE_TYPES.FIRE,
      duration: 4,
      cooldown: 3,
      radius: 2.5,
      damage: 0,
      burnDamagePerTick: 3,
      dotTickRate: BURN_TICK,
      ...options,
    });
    this._lastTick = 0;
    this._createVisual();
  }

  _createVisual() {
    if (!_sharedTex) _sharedTex = getRadialTexture('fire', 0xff4400, 0.2);
    if (!_sharedGeo) _sharedGeo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: _sharedTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
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
    const flicker = 1 + 0.1 * Math.sin(this.elapsed * 12);
    this._mesh.scale.setScalar(this.radius * 2 * flicker);
    this._mat.opacity = 0.85 * (1 - t * 0.5);
    return this.elapsed < this.duration;
  }

  checkCollision(enemies) {
    const hit = getEnemiesInRadius(enemies, this.position.x, this.position.y, this.radius);
    const tickRate = this.options.dotTickRate ?? BURN_TICK;
    const damagePerTick = this.options.burnDamagePerTick ?? 3;
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
