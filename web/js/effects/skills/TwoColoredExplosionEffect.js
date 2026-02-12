/**
 * Two Colored Explosion — Chaos Burst: random damage type (Fire / Ice / Electric) per cast.
 * Animation: alternating blue/orange, pulsing.
 */
import * as THREE from 'three';
import { SkillEffect, SKILL_TYPES, DAMAGE_TYPES } from '../SkillEffect.js';
import { getRadialTexture } from '../effectUtils.js';
import { getEnemiesInRadius, applyDamageToEnemy } from '../effectUtils.js';

const CHAOS_TYPES = [DAMAGE_TYPES.FIRE, DAMAGE_TYPES.FROST, DAMAGE_TYPES.LIGHTNING];
const COLORS = [0xff6600, 0x4488ff, 0xaaccff];
let _sharedTexBlue = null;
let _sharedTexOrange = null;
let _sharedGeo = null;

export class TwoColoredExplosionEffect extends SkillEffect {
  constructor(position, options = {}) {
    const typeIndex = Math.floor(Math.random() * 3);
    super(position, {
      name: 'Two Colored Explosion',
      skillType: SKILL_TYPES.CHAOS_BURST,
      damageType: CHAOS_TYPES[typeIndex],
      duration: 1,
      cooldown: 2.5,
      radius: 3.5,
      damage: 20,
      ...options,
    });
    this._typeIndex = typeIndex;
    this._createVisual();
  }

  _createVisual() {
    if (!_sharedTexBlue) _sharedTexBlue = getRadialTexture('chaos_blue', 0x4488ff, 0);
    if (!_sharedTexOrange) _sharedTexOrange = getRadialTexture('chaos_orange', 0xff6600, 0);
    if (!_sharedGeo) _sharedGeo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: this._typeIndex === 0 ? _sharedTexOrange : _sharedTexBlue,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
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
    const scale = 0.2 + t * 2.8;
    this._mesh.scale.setScalar(scale);
    this._mat.opacity = 0.9 * (1 - t);
    if (this._mat.color) this._mat.color.setHex(COLORS[Math.floor(this.elapsed * 8) % 3]);
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
    }
    return applied;
  }

  destroy() {
    this._mat.dispose();
    super.destroy();
  }
}
