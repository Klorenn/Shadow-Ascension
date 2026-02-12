/**
 * Shared texture and material helpers for skill effects.
 * Reuse textures/materials to avoid per-frame allocations (100+ enemies).
 */
import * as THREE from 'three';

const _canvas = document.createElement('canvas');
const _ctx = _canvas.getContext('2d');
const _textureCache = new Map();
const _materialCache = new Map();

function getCacheKey(type, ...args) {
  return type + '_' + args.join('_');
}

/** Create or reuse a simple radial gradient texture (color, optional inner). */
export function getRadialTexture(key, colorHex, innerAlpha = 0) {
  const k = getCacheKey('radial', colorHex.toString(16), String(innerAlpha));
  if (_textureCache.has(k)) return _textureCache.get(k);
  const size = 64;
  _canvas.width = size;
  _canvas.height = size;
  _ctx.clearRect(0, 0, size, size);
  const g = _ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, hexToRgba(colorHex, 1));
  g.addColorStop(0.5, hexToRgba(colorHex, 0.6));
  g.addColorStop(1, hexToRgba(colorHex, innerAlpha));
  _ctx.fillStyle = g;
  _ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(_canvas);
  tex.needsUpdate = true;
  _textureCache.set(k, tex);
  return tex;
}

/** Solid color 1x1 texture. */
export function getSolidTexture(key, colorHex) {
  const k = getCacheKey('solid', colorHex.toString(16));
  if (_textureCache.has(k)) return _textureCache.get(k);
  _canvas.width = 1;
  _canvas.height = 1;
  _ctx.fillStyle = hexToRgba(colorHex, 1);
  _ctx.fillRect(0, 0, 1, 1);
  const tex = new THREE.CanvasTexture(_canvas);
  _textureCache.set(k, tex);
  return tex;
}

function hexToRgba(hex, a) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return `rgba(${r},${g},${b},${a})`;
}

/** Reusable SpriteMaterial (do not dispose texture). */
export function getSpriteMaterial(key, options = {}) {
  if (_materialCache.has(key)) return _materialCache.get(key).clone();
  const {
    map = null,
    color = 0xffffff,
    transparent = true,
    opacity = 1,
    blending = THREE.NormalBlending,
    depthWrite = false,
  } = options;
  const mat = new THREE.SpriteMaterial({
    map,
    color,
    transparent,
    opacity,
    blending,
    depthWrite,
  });
  _materialCache.set(key, mat);
  return mat.clone();
}

/** Distance from effect (x,y) to enemy (e.pos or {x,y}). */
export function distanceToEnemy(effectX, effectY, enemy) {
  const ex = enemy.pos?.x ?? enemy.position?.x ?? 0;
  const ey = enemy.pos?.y ?? enemy.position?.y ?? 0;
  const dx = ex - effectX;
  const dy = ey - effectY;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Sphere/AoE hit check; returns list of enemies within radius. */
export function getEnemiesInRadius(enemies, x, y, radius) {
  const hit = [];
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.dead) continue;
    if (distanceToEnemy(x, y, e) <= radius) hit.push(e);
  }
  return hit;
}

/** Apply damage to enemy (supports takeDamage or direct health). */
export function applyDamageToEnemy(enemy, amount) {
  if (enemy.takeDamage) enemy.takeDamage(amount);
  else if (enemy.health !== undefined) {
    enemy.health = Math.max(0, (enemy.health ?? 0) - amount);
    if (enemy.health <= 0 && enemy.onDeath) enemy.onDeath();
  }
}

/** Apply knockback: move enemy away from (originX, originY) by force. */
export function applyKnockback(enemy, originX, originY, force) {
  const ex = enemy.pos?.x ?? enemy.position?.x ?? 0;
  const ey = enemy.pos?.y ?? enemy.position?.y ?? 0;
  const dx = ex - originX;
  const dy = ey - originY;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = (dx / d) * force;
  const ny = (dy / d) * force;
  if (enemy.pos) {
    enemy.pos.x += nx;
    enemy.pos.y += ny;
  }
  if (enemy.mesh?.position) {
    enemy.mesh.position.x += nx;
    enemy.mesh.position.y += ny;
  }
}
