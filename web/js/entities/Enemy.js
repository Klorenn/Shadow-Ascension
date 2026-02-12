/**
 * Enemy — base class with object pooling, state, takeDamage (crit/DOT/knockback), XP drop.
 * On death: state "death", notify manager (no mesh/material destroy).
 */
import * as THREE from 'three';
import { ENEMY } from '../systems/GameConstants.js';

export const ENEMY_STATE = {
  IDLE: 'idle',
  WALK: 'walk',
  ATTACK: 'attack',
  HIT: 'hit',
  DEATH: 'death',
};

let _idCounter = 0;

export class Enemy {
  constructor(options = {}) {
    this.id = options.id ?? 'enemy_' + (++_idCounter);
    this.type = options.type ?? 'slime';
    this.maxHp = options.maxHp ?? 10;
    this.hp = this.maxHp;
    this.damage = options.damage ?? 1;
    this.speed = options.speed ?? 0.12;
    this.attackCooldown = options.attackCooldown ?? 1.2;
    this.attackTimer = 0;
    this.xpDrop = options.xpDrop ?? 5;
    this.attackRange = options.attackRange ?? 1.2;
    this.mesh = options.mesh ?? null;
    this.state = options.state ?? ENEMY_STATE.IDLE;
    this.isElite = options.isElite ?? false;
    this.isBoss = options.isBoss ?? false;
    this.knockbackVelocity = options.knockbackVelocity ?? new THREE.Vector2(0, 0);
    this.pos = options.position ? options.position.clone() : new THREE.Vector2(0, 0);
    this.dead = false;
    this._deathCallback = null;
    this._animator = options.animator ?? null;
    this._flashUntil = 0;
  }

  get health() {
    return this.hp;
  }

  set health(v) {
    this.hp = Math.max(0, v);
  }

  takeDamage(amount, options = {}) {
    if (this.dead) return 0;
    const isCrit = options.crit === true;
    const finalAmount = (options.amount != null ? options.amount : amount) * (isCrit ? (options.critMultiplier ?? 1.5) : 1);
    this.hp = Math.max(0, this.hp - finalAmount);
    this._flashUntil = (typeof performance !== 'undefined' ? performance.now() * 0.001 : 0) + (options.flashDuration ?? ENEMY.HIT_FLASH_DURATION);
    this.state = ENEMY_STATE.HIT;
    if (options.knockback && this.pos) {
      const kx = options.knockbackX ?? 0;
      const ky = options.knockbackY ?? 0;
      this.knockbackVelocity.x = kx;
      this.knockbackVelocity.y = ky;
    }
    if (this.hp <= 0) this.die();
    return finalAmount;
  }

  attack(player) {
    if (this.dead || this.attackTimer > 0) return false;
    const px = player?.x ?? player?.position?.x ?? 0;
    const py = player?.y ?? player?.position?.y ?? 0;
    const dx = px - this.pos.x;
    const dy = py - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.attackRange) return false;
    this.attackTimer = this.attackCooldown;
    this.state = ENEMY_STATE.ATTACK;
    return true;
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.hp = 0;
    this.state = ENEMY_STATE.DEATH;
    if (this._deathCallback) this._deathCallback(this);
  }

  playAnimation(name, config = {}, onComplete) {
    if (this._animator) this._animator.play(name, config, onComplete);
  }

  reset(config) {
    this.type = config.type ?? this.type;
    this.maxHp = config.maxHp ?? this.maxHp;
    this.hp = this.maxHp;
    this.damage = config.damage ?? this.damage;
    this.speed = config.speed ?? this.speed;
    this.attackCooldown = config.attackCooldown ?? this.attackCooldown;
    this.attackTimer = 0;
    this.xpDrop = config.xpDrop ?? this.xpDrop;
    this.attackRange = config.attackRange ?? this.attackRange;
    this.isElite = config.isElite ?? false;
    this.isBoss = config.isBoss ?? false;
    this.dead = false;
    this.state = ENEMY_STATE.WALK;
    this.knockbackVelocity.set(0, 0);
    this.pos.set(config.x ?? 0, config.y ?? 0);
    this._flashUntil = 0;
    if (this.mesh) {
      this.mesh.position.set(this.pos.x, this.pos.y, 0);
      this.mesh.visible = true;
    }
  }

  setDeathCallback(cb) {
    this._deathCallback = cb;
  }

  setMesh(mesh) {
    this.mesh = mesh;
  }

  setAnimator(animator) {
    this._animator = animator;
  }

  update(delta) {
    if (this.dead) return;
    if (this._animator) this._animator.update(delta);
    if (this._flashUntil > 0 && this.mesh?.material?.color) {
      const now = typeof performance !== 'undefined' ? performance.now() * 0.001 : 0;
      this.mesh.material.color.setHex(now < this._flashUntil ? 0xff4444 : 0xffffff);
    }
    if (this.attackTimer > 0) this.attackTimer -= delta;
    const kb = this.knockbackVelocity;
    if (kb.x !== 0 || kb.y !== 0) {
      this.pos.x += kb.x * delta;
      this.pos.y += kb.y * delta;
      kb.x *= 0.85;
      kb.y *= 0.85;
      if (Math.abs(kb.x) < 0.01) kb.x = 0;
      if (Math.abs(kb.y) < 0.01) kb.y = 0;
    }
  }

  get position() {
    return { x: this.pos.x, y: this.pos.y };
  }

  /** Optional: for compatibility with legacy e.pos, e.health, e.takeDamage(amt) */
  get _damageMult() {
    return this.damage;
  }

  get _moveSpeed() {
    return this.speed;
  }
}
