/**
 * Advanced XP Orb system: 3 tiers, shared materials, magnet, merge. Pool-friendly for 300+ orbs.
 */
import * as THREE from 'three';

const PICKUP_RANGE = 1.15;
const BASE_MAGNET_SPEED = 6;
const MAX_MAGNET_SPEED = 32;
const MAGNET_ACCEL = 18;
const FLOAT_AMPLITUDE = 0.1;
const FLOAT_FREQ = 2.5;
const ROTATE_SPEED = 1.0;
const XP_SCALE_CLAMP = 1.5;
const MERGE_DIST_SMALL = 1.8;
const MERGE_DIST_MEDIUM = 1.5;

export const ORB_TIERS = {
  SMALL: 0,
  MEDIUM: 1,
  LARGE: 2,
};

export const ORB_TIER_CONFIG = [
  { id: ORB_TIERS.SMALL, baseXP: 5, weight: 0.7, size: 0.7, name: 'small' },
  { id: ORB_TIERS.MEDIUM, baseXP: 20, weight: 0.25, size: 0.95, name: 'medium', glow: true },
  { id: ORB_TIERS.LARGE, baseXP: 100, weight: 0.05, size: 1.2, name: 'large', glow: true, trail: true },
];

let _sharedGeo = null;
let _matsByTier = null;

function getSharedResources() {
  if (!_sharedGeo) _sharedGeo = new THREE.PlaneGeometry(1, 1);
  if (!_matsByTier) {
    _matsByTier = [
      new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
      new THREE.MeshBasicMaterial({
        color: 0x44ccdd,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
      new THREE.MeshBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    ];
  }
  return { geo: _sharedGeo, mats: _matsByTier };
}

/** Weighted random tier: 70% small, 25% medium, 5% large. */
export function rollOrbTier() {
  const r = Math.random();
  if (r < 0.7) return ORB_TIERS.SMALL;
  if (r < 0.95) return ORB_TIERS.MEDIUM;
  return ORB_TIERS.LARGE;
}

/** finalXP = baseXP * (1 + difficulty * 0.08), clamped to avoid inflation. */
export function scaleOrbXP(baseXP, difficultyRaw, xpMult = 1) {
  const scale = Math.min(XP_SCALE_CLAMP, 1 + (difficultyRaw || 0) * 0.08);
  return Math.max(1, Math.floor(baseXP * scale * (xpMult || 1)));
}

export class XPOrb {
  constructor(scene, position, value, tier = ORB_TIERS.SMALL) {
    this.scene = scene;
    this.pos = position && position.x != null
      ? new THREE.Vector2(position.x, position.y)
      : new THREE.Vector2(0, 0);
    this.value = value;
    this.tier = tier;
    this.active = true;
    this._collected = false;
    this._phase = Math.random() * Math.PI * 2;
    this._magnetTime = 0;
    const config = ORB_TIER_CONFIG[tier] || ORB_TIER_CONFIG[0];
    const { geo, mats } = getSharedResources();
    const mat = mats[tier] || mats[0];
    this._mesh = new THREE.Mesh(geo, mat);
    this._mesh.scale.setScalar(config.size);
    this._mesh.position.set(this.pos.x, this.pos.y, 0);
    scene.add(this._mesh);
  }

  checkMagnet(player) {
    const radius = (player.magnetRadius != null ? player.magnetRadius : 6);
    const dx = player.x - this.pos.x;
    const dy = player.y - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist <= radius;
  }

  collect(player) {
    if (this._collected) return 0;
    this._collected = true;
    this.active = false;
    return this.value;
  }

  update(delta, player) {
    if (!this.active) return 0;
    const radius = (player.magnetRadius != null ? player.magnetRadius : 6);
    const dx = player.x - this.pos.x;
    const dy = player.y - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= PICKUP_RANGE) return this.collect(player);

    const inMagnet = this.checkMagnet(player);
    if (inMagnet) {
      this._magnetTime += delta;
      const t = Math.max(0, 1 - dist / radius);
      const speedRamp = Math.min(1.5, 1 + this._magnetTime * 2);
      const speed = (BASE_MAGNET_SPEED + t * (MAX_MAGNET_SPEED - BASE_MAGNET_SPEED)) * speedRamp;
      const move = speed * delta;
      const nx = dx / dist;
      const ny = dy / dist;
      this.pos.x += nx * move;
      this.pos.y += ny * move;
    } else {
      this._magnetTime = 0;
      this._phase += delta * FLOAT_FREQ;
      this.pos.y += Math.sin(this._phase) * FLOAT_AMPLITUDE * delta * 60;
    }

    this._mesh.position.set(this.pos.x, this.pos.y, 0);
    this._mesh.rotation.z += delta * ROTATE_SPEED;
    return 0;
  }

  destroy() {
    this.active = false;
    this.scene.remove(this._mesh);
    this._mesh.visible = false;
  }

  get tierName() {
    return (ORB_TIER_CONFIG[this.tier] || ORB_TIER_CONFIG[0]).name;
  }

  get isRare() {
    return this.tier === ORB_TIERS.LARGE;
  }
}

/** Pool with merge: 3 small → 1 medium, 2 medium → 1 large. */
export class XPOrbPool {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.active = [];
    this._onCollect = null;
    this._onRareDrop = null;
  }

  setOnCollect(callback) {
    this._onCollect = callback;
  }

  setOnRareDrop(callback) {
    this._onRareDrop = callback;
  }

  spawn(x, y, value, tier = ORB_TIERS.SMALL) {
    let orb = this.pool.pop();
    if (!orb) {
      orb = new XPOrb(this.scene, { x, y }, value, tier);
    } else {
      orb.pos.set(x, y);
      orb.value = value;
      orb.tier = tier;
      orb.active = true;
      orb._collected = false;
      orb._magnetTime = 0;
      const config = ORB_TIER_CONFIG[tier] || ORB_TIER_CONFIG[0];
      orb._mesh.scale.setScalar(config.size);
      orb._mesh.position.set(x, y, 0);
      orb._mesh.visible = true;
      orb._mesh.rotation.z = 0;
      const { mats } = getSharedResources();
      orb._mesh.material = mats[tier] || mats[0];
      this.scene.add(orb._mesh);
    }
    this.active.push(orb);
    return orb;
  }

  _mergePass() {
    const toRemove = new Set();
    const toAdd = [];

    const small = this.active.filter(o => o.active && o.tier === ORB_TIERS.SMALL);
    for (let i = 0; i < small.length; i++) {
      if (toRemove.has(small[i])) continue;
      const group = [small[i]];
      for (let j = i + 1; j < small.length; j++) {
        if (toRemove.has(small[j])) continue;
        const d = small[i].pos.distanceTo(small[j].pos);
        if (d <= MERGE_DIST_SMALL) {
          group.push(small[j]);
          if (group.length >= 3) break;
        }
      }
      if (group.length >= 3) {
        let vx = 0, vy = 0, val = 0;
        group.forEach(o => {
          vx += o.pos.x; vy += o.pos.y; val += o.value;
          toRemove.add(o);
        });
        toAdd.push({ x: vx / 3, y: vy / 3, value: val, tier: ORB_TIERS.MEDIUM });
      }
    }

    const medium = this.active.filter(o => o.active && o.tier === ORB_TIERS.MEDIUM && !toRemove.has(o));
    for (let i = 0; i < medium.length; i++) {
      if (toRemove.has(medium[i])) continue;
      let pair = null;
      for (let j = i + 1; j < medium.length; j++) {
        if (toRemove.has(medium[j])) continue;
        if (medium[i].pos.distanceTo(medium[j].pos) <= MERGE_DIST_MEDIUM) {
          pair = [medium[i], medium[j]];
          break;
        }
      }
      if (pair) {
        const vx = (pair[0].pos.x + pair[1].pos.x) / 2;
        const vy = (pair[0].pos.y + pair[1].pos.y) / 2;
        const val = pair[0].value + pair[1].value;
        toRemove.add(pair[0]);
        toRemove.add(pair[1]);
        toAdd.push({ x: vx, y: vy, value: val, tier: ORB_TIERS.LARGE });
      }
    }

    toRemove.forEach(orb => {
      orb.destroy();
      this.pool.push(orb);
    });
    this.active = this.active.filter(o => !toRemove.has(o));
    toAdd.forEach(({ x, y, value, tier }) => this.spawn(x, y, value, tier));
  }

  update(delta, player) {
    let totalXP = 0;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const orb = this.active[i];
      const xp = orb.update(delta, player);
      totalXP += xp;
      if (xp > 0) {
        if (this._onCollect) this._onCollect(orb);
      }
      if (!orb.active) {
        orb.destroy();
        this.pool.push(orb);
        this.active.splice(i, 1);
      }
    }
    this._mergePass();
    return totalXP;
  }

  collectOrbsInRadius(x, y, radius) {
    let total = 0;
    for (const orb of this.active) {
      if (!orb.active) continue;
      const d = Math.sqrt((orb.pos.x - x) ** 2 + (orb.pos.y - y) ** 2);
      if (d <= radius) {
        total += orb.value;
        orb.active = false;
        orb.destroy();
        this.pool.push(orb);
      }
    }
    this.active = this.active.filter(o => o.active);
    return total;
  }

  clear() {
    for (const orb of this.active) {
      orb.destroy();
      this.pool.push(orb);
    }
    this.active.length = 0;
  }
}

/** Legacy: single tier value for backward compat. */
export function xpOrbValue(difficultyRaw, xpMult = 1) {
  const tier = rollOrbTier();
  const config = ORB_TIER_CONFIG[tier];
  return scaleOrbXP(config.baseXP, difficultyRaw, xpMult);
}
