/**
 * Lightning — Chain: hits nearest enemy, jumps to 3 more.
 * Logic: find closest, then nearest to that, etc.
 */
import * as THREE from 'three';
import { SkillEffect, SKILL_TYPES, DAMAGE_TYPES } from '../SkillEffect.js';
import { distanceToEnemy, applyDamageToEnemy } from '../effectUtils.js';

let _sharedGeo = null;
const CHAIN_COUNT = 4;
const CHAIN_RANGE = 6;

export class LightningEffect extends SkillEffect {
  constructor(position, options = {}) {
    super(position, {
      name: 'Lightning',
      skillType: SKILL_TYPES.CHAIN,
      damageType: DAMAGE_TYPES.LIGHTNING,
      duration: 0.35,
      cooldown: 4,
      radius: 0.5,
      damage: 12,
      chainCount: CHAIN_COUNT,
      ...options,
    });
    this._createVisual();
    this._chainTargets = [];
    this._chainPositions = [];
  }

  _createVisual() {
    if (!_sharedGeo) _sharedGeo = new THREE.PlaneGeometry(0.3, 1);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xaaccff,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(_sharedGeo, mat);
    mesh.visible = false;
    this._group.add(mesh);
    this._segments = [];
    this._mats = [];
    for (let i = 0; i < CHAIN_COUNT; i++) {
      const m = mat.clone();
      const seg = new THREE.Mesh(_sharedGeo, m);
      seg.visible = false;
      this._group.add(seg);
      this._segments.push(seg);
      this._mats.push(m);
    }
  }

  _findChainTargets(enemies) {
    const out = [];
    let cx = this.position.x;
    let cy = this.position.y;
    const used = new Set();
    const range = this.options.chainRange ?? CHAIN_RANGE;
    const count = this.options.chainCount ?? CHAIN_COUNT;
    for (let k = 0; k < count; k++) {
      let best = null;
      let bestD = range;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.dead || used.has(e)) continue;
        const d = distanceToEnemy(cx, cy, e);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      if (!best) break;
      used.add(best);
      out.push(best);
      cx = best.pos?.x ?? best.position?.x ?? cx;
      cy = best.pos?.y ?? best.position?.y ?? cy;
    }
    return out;
  }

  update(delta) {
    this.elapsed += delta;
    const t = this.elapsed / this.duration;
    const flicker = Math.random() > 0.3 ? 1 : 0.7;
    this._mats.forEach(m => { m.opacity = 0.95 * (1 - t) * flicker; });
    if (this._chainPositions.length > 0) this._updateSegmentVisuals();
    return this.elapsed < this.duration;
  }

  checkCollision(enemies) {
    if (this._chainTargets.length === 0) {
      this._chainTargets = this._findChainTargets(enemies);
      this._chainPositions = this._chainTargets.map(e => ({
        x: e.pos?.x ?? e.position?.x ?? 0,
        y: e.pos?.y ?? e.position?.y ?? 0,
      }));
    }
    const applied = [];
    for (const e of this._chainTargets) {
      applyDamageToEnemy(e, this.damage);
      applied.push(e);
    }
    return applied;
  }

  _updateSegmentVisuals() {
    let prevX = this.position.x, prevY = this.position.y;
    this._segments.forEach((seg, i) => {
      if (i < this._chainPositions.length) {
        const p = this._chainPositions[i];
        seg.position.set((prevX + p.x) / 2, (prevY + p.y) / 2, 0);
        const dx = p.x - prevX, dy = p.y - prevY;
        seg.scale.set(0.2, Math.sqrt(dx * dx + dy * dy) || 0.1, 1);
        seg.rotation.z = -Math.atan2(dy, dx);
        seg.visible = true;
        prevX = p.x;
        prevY = p.y;
      } else {
        seg.visible = false;
      }
    });
  }

  destroy() {
    this._mats.forEach(m => m.dispose());
    super.destroy();
  }
}
