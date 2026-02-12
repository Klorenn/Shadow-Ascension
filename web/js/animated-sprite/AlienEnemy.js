/**
 * AlienEnemy — Animated enemy that moves toward the player, uses walk/idle/death animations.
 * Extends AnimatedSprite; frame update and direction are driven by movement.
 */
import * as THREE from 'three';
import { AnimatedSprite } from './AnimatedSprite.js';

const BASE_MOVE_SPEED = 0.18;
const DIR_DOWN = 0;
const DIR_LEFT = 1;
const DIR_RIGHT = 2;
const DIR_UP = 3;

/**
 * Angle (radians) to LPC direction: 0=down, 1=left, 2=right, 3=up.
 * Down = +Y in world (atan2(1,0)=π/2), but LPC row 0 is "down" (character facing camera).
 * We use: angle from movement vector; down ≈ -π/2 (world +Y), up ≈ π/2 (world -Y).
 */
function angleToDirection(angleRad) {
  const a = angleRad;
  if (a >= -Math.PI * 0.25 && a < Math.PI * 0.25) return DIR_RIGHT;
  if (a >= Math.PI * 0.25 && a < Math.PI * 0.75) return DIR_UP;
  if (a >= -Math.PI * 0.75 && a < -Math.PI * 0.25) return DIR_DOWN;
  return DIR_LEFT;
}

export const ALIEN_ANIM_CONFIG = {
  frameWidth: 64,
  frameHeight: 64,
  animations: {
    idle: { frameCount: 13, fps: 8 },
    walk: { frameCount: 13, fps: 12 },
    attack: { frameCount: 8, fps: 14 },
    death: { frameCount: 6, fps: 10, loop: false },
  },
};

export class AlienEnemy extends AnimatedSprite {
  /**
   * @param {THREE.Texture} texture - Default spritesheet (e.g. idle or walk).
   * @param {Object} [config] - AnimatedSpriteConfig; defaults to ALIEN_ANIM_CONFIG.
   * @param {number} [x=0]
   * @param {number} [y=0]
   * @param {number} [size=2.4]
   */
  constructor(texture, config, x = 0, y = 0, size = 2.4) {
    super(texture, config || ALIEN_ANIM_CONFIG, size);
    this.pos = new THREE.Vector2(x, y);
    this._mesh.position.set(x, y, 0);
    this._health = 12;
    this._maxHealth = 12;
    this._moveSpeed = BASE_MOVE_SPEED;
    this._damageMult = 1;
    this._deathCallback = null;
    this._deathAnimDone = false;
    this.attackCooldown = 0;
    this.isElite = false;
    this.xpMult = 1;
    this.explodeChance = 0;
  }

  setDifficulty(healthMult, speedMult, damageMult = 1) {
    this._maxHealth = Math.max(1, Math.floor(this._maxHealth * healthMult));
    this._health = this._maxHealth;
    this._moveSpeed = BASE_MOVE_SPEED * speedMult;
    this._damageMult = damageMult;
  }

  setTierStats(baseHp, baseSpeed, baseDamage, isElite = false, xpMult = 1, explodeChance = 0) {
    this._maxHealth = Math.max(1, Math.floor(baseHp));
    this._health = this._maxHealth;
    this._moveSpeed = baseSpeed;
    this._damageMult = baseDamage;
    this.isElite = isElite;
    this.xpMult = xpMult;
    this.explodeChance = explodeChance;
  }

  get health() {
    return this._health;
  }
  set health(v) {
    this._health = v;
  }
  get maxHealth() {
    return this._maxHealth;
  }
  set maxHealth(v) {
    this._maxHealth = v;
  }
  get dead() {
    return this._health <= 0;
  }

  setDeathCallback(fn) {
    this._deathCallback = fn;
  }

  takeDamage(amount) {
    if (this._health <= 0) return;
    this._health = Math.max(0, this._health - amount);
    if (this._health <= 0) {
      this.setAnimation('death');
      this._deathAnimDone = false;
    }
  }

  /**
   * @param {number} delta - Seconds since last frame.
   * @param {{ x: number, y: number }} playerPosition - Player world position.
   */
  update(delta, playerPosition) {
    if (this._health <= 0) {
      super.update(delta);
      const deathAnim = this._animations['death'];
      if (deathAnim && !this._deathAnimDone) {
        const totalFrames = deathAnim.frameCount;
        if (this._currentFrame >= totalFrames - 1) {
          this._deathAnimDone = true;
          if (this._deathCallback) this._deathCallback();
        }
      }
      return;
    }

    const dx = playerPosition.x - this.pos.x;
    const dy = playerPosition.y - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0.05) {
      const nx = dx / dist;
      const ny = dy / dist;
      const speed = Math.min(this._moveSpeed * 60 * delta, 3);
      this.pos.x += nx * speed;
      this.pos.y += ny * speed;
      this.setAnimation('walk');
      const angle = Math.atan2(ny, nx);
      this.setDirection(angleToDirection(angle));
      this._mesh.scale.x = nx >= 0 ? 1 : -1;
    } else {
      this.setAnimation('idle');
    }

    this._mesh.position.set(this.pos.x, this.pos.y, 0);
    super.update(delta);
  }
}
