/**
 * SlimeAnimationSystem
 *
 * Spritesheet-based animations for slimes (Idle / Walk / Run / Attack / Hurt / Death).
 * Each enemy gets its own cloned textures so offset/repeat are independent.
 */
import { SpriteAnimator } from '../entities/SpriteAnimator.js';
import { ENEMY_STATE } from '../entities/Enemy.js';

const DIR_DOWN = 0;
const DIR_LEFT = 1;
const DIR_RIGHT = 2;
const DIR_UP = 3;

function angleToDirection(angleRad) {
  const a = angleRad;
  if (a >= -Math.PI * 0.25 && a < Math.PI * 0.25) return DIR_RIGHT;
  if (a >= Math.PI * 0.25 && a < Math.PI * 0.75) return DIR_UP;
  if (a >= -Math.PI * 0.75 && a < -Math.PI * 0.25) return DIR_DOWN;
  return DIR_LEFT;
}

/** Clone a texture and carry over userData so SpriteAnimator gets frameWidth etc. */
function cloneTex(src) {
  if (!src) return null;
  const t = src.clone();
  t.needsUpdate = true;
  t.userData = { ...(src.userData || {}) };
  return t;
}

function setupTexUserData(tex, fw, fh) {
  if (!tex || !tex.image) return;
  const img = tex.image;
  const cols = Math.max(1, Math.floor(img.width / fw));
  const rows = Math.max(1, Math.floor(img.height / fh));
  tex.userData = tex.userData || {};
  tex.userData.frameWidth = fw;
  tex.userData.frameHeight = fh;
  tex.userData.numFrames = cols;
  tex.userData.numRows = rows;
}

export class SlimeAnimationSystem {
  /**
   * @param {Object} options
   * @param {{ idle, walk, run?, attack, hurt, death }} options.textures - shared base textures
   * @param {number} [options.frameWidth=64]
   * @param {number} [options.frameHeight=64]
   * @param {Function} [options.onDealDamage]
   */
  constructor(options = {}) {
    this._baseTex = options.textures || {};
    this.frameWidth = options.frameWidth ?? 64;
    this.frameHeight = options.frameHeight ?? 64;
    this.onDealDamage = options.onDealDamage || (() => {});
    /** @type {Map<any, any>} */
    this._slimes = new Map();

    // Pre-compute userData on base textures (used as template for clones)
    for (const key of ['idle', 'walk', 'run', 'attack', 'hurt', 'death']) {
      setupTexUserData(this._baseTex[key], this.frameWidth, this.frameHeight);
    }
  }

  /** Register / reset a slime. Clones all textures for this instance. */
  register(enemy) {
    if (!enemy || enemy.type !== 'slime') return;
    if (!this._baseTex.idle || !enemy.mesh) return;

    // Clone textures so each enemy has independent offset/repeat
    const texSet = {
      idle:   cloneTex(this._baseTex.idle),
      walk:   cloneTex(this._baseTex.walk)   || cloneTex(this._baseTex.idle),
      run:    cloneTex(this._baseTex.run)     || cloneTex(this._baseTex.walk) || cloneTex(this._baseTex.idle),
      attack: cloneTex(this._baseTex.attack)  || cloneTex(this._baseTex.idle),
      hurt:   cloneTex(this._baseTex.hurt)    || cloneTex(this._baseTex.idle),
      death:  cloneTex(this._baseTex.death)   || cloneTex(this._baseTex.hurt) || cloneTex(this._baseTex.idle),
    };

    // Ensure userData on all clones
    for (const key of Object.keys(texSet)) {
      setupTexUserData(texSet[key], this.frameWidth, this.frameHeight);
    }

    const mat = enemy.mesh.material;
    mat.map = texSet.idle;
    mat.needsUpdate = true;

    const animator = new SpriteAnimator(texSet.idle, { fps: 10, loop: true });
    enemy.setAnimator(animator);

    this._slimes.set(enemy, {
      animator,
      texSet,
      state: ENEMY_STATE.WALK,
      direction: DIR_DOWN,
      prevX: enemy.pos?.x ?? 0,
      prevY: enemy.pos?.y ?? 0,
      attackTime: 0,
      attackDuration: 0,
      attackApplied: false,
    });

    this._playIdle(enemy);
  }

  _getData(enemy) { return this._slimes.get(enemy); }

  _computeDirectionAndSpeed(data, enemy, delta) {
    const x = enemy.pos?.x ?? 0;
    const y = enemy.pos?.y ?? 0;
    const dx = x - data.prevX;
    const dy = y - data.prevY;
    data.prevX = x;
    data.prevY = y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = delta > 0 ? dist / delta : 0;
    if (dist > 0.001) {
      const angle = Math.atan2(dy, dx);
      data.direction = angleToDirection(angle);
      if (enemy.mesh && enemy.mesh.scale) {
        enemy.mesh.scale.x = (dx >= 0 ? 1 : -1) * Math.abs(enemy.mesh.scale.x || 1);
      }
    }
    return speed;
  }

  _switchTex(enemy, data, key, animName, opts) {
    const tex = data.texSet[key];
    if (!tex || !enemy.mesh) return;
    enemy.mesh.material.map = tex;
    enemy.mesh.material.needsUpdate = true;
    data.animator.texture = tex;
    const { _onComplete, ...config } = opts;
    data.animator.play(animName, {
      row: data.direction,
      frameWidth: this.frameWidth,
      frameHeight: this.frameHeight,
      ...config,
    }, _onComplete || null);
  }

  _playIdle(enemy) {
    const data = this._getData(enemy);
    if (!data) return;
    this._switchTex(enemy, data, 'idle', 'idle', { loop: true, fps: 6 });
    data.state = ENEMY_STATE.IDLE;
  }

  _playWalk(enemy) {
    const data = this._getData(enemy);
    if (!data) return;
    this._switchTex(enemy, data, 'walk', 'walk', { loop: true, fps: 10 });
    data.state = ENEMY_STATE.WALK;
  }

  _playRun(enemy) {
    const data = this._getData(enemy);
    if (!data) return;
    this._switchTex(enemy, data, 'run', 'run', { loop: true, fps: 12 });
    data.state = ENEMY_STATE.WALK;
  }

  _playHurt(enemy) {
    const data = this._getData(enemy);
    if (!data) return;
    this._switchTex(enemy, data, 'hurt', 'hurt', {
      loop: false, fps: 12,
      _onComplete: () => { if (data.state !== ENEMY_STATE.DEATH) this._playIdle(enemy); },
    });
    data.state = ENEMY_STATE.HIT;
  }

  _playDeath(enemy) {
    const data = this._getData(enemy);
    if (!data) return;
    this._switchTex(enemy, data, 'death', 'death', { loop: false, fps: 10 });
    data.state = ENEMY_STATE.DEATH;
  }

  _playAttack(enemy) {
    const data = this._getData(enemy);
    if (!data) return;
    const tex = data.texSet.attack;
    if (!tex || !enemy.mesh) return;

    const img = tex.image;
    const cols = img ? Math.max(1, Math.floor(img.width / this.frameWidth)) : (tex.userData?.numFrames ?? 1);
    const fps = 10;
    data.attackTime = 0;
    data.attackDuration = cols / fps;
    data.attackApplied = false;

    this._switchTex(enemy, data, 'attack', 'attack', {
      loop: false, fps,
      _onComplete: () => { if (data.state !== ENEMY_STATE.DEATH) this._playIdle(enemy); },
    });
    data.state = ENEMY_STATE.ATTACK;
  }

  /** Called each frame from SlimeEnemy.update(delta). */
  updateEnemy(enemy, delta) {
    const data = this._getData(enemy);
    if (!data) return;

    const speed = this._computeDirectionAndSpeed(data, enemy, delta);

    if (enemy.dead || enemy.hp <= 0 || enemy.state === ENEMY_STATE.DEATH) {
      if (data.state !== ENEMY_STATE.DEATH) this._playDeath(enemy);
    } else if (enemy.state === ENEMY_STATE.ATTACK) {
      data.attackTime += delta;
      const half = data.attackDuration * 0.5;
      if (!data.attackApplied && data.attackDuration > 0 && data.attackTime >= half) {
        data.attackApplied = true;
        this.onDealDamage(enemy);
      }
    } else if (enemy.state === ENEMY_STATE.HIT) {
      // Hurt managed by _playHurt onComplete
    } else {
      if (speed < 0.1) {
        if (data.state !== ENEMY_STATE.IDLE) this._playIdle(enemy);
      } else if (speed < 4) {
        if (data.state !== ENEMY_STATE.WALK) this._playWalk(enemy);
      } else {
        this._playRun(enemy);
      }
    }

    // Squash/stretch
    if (enemy.mesh && enemy.mesh.scale) {
      const t = performance.now() * 0.002;
      const squash = 1 + Math.sin(t) * 0.06;
      const baseY = Math.abs(enemy.mesh.scale.y) / (1 + Math.sin((t - delta) * 1000 * 0.002) * 0.06) || 1;
      enemy.mesh.scale.y = baseY * squash;
    }

    if (data.animator) data.animator.update(delta);
  }

  onDamaged(enemy) {
    const data = this._getData(enemy);
    if (!data || data.state === ENEMY_STATE.DEATH) return;
    this._playHurt(enemy);
  }

  onAttackStarted(enemy) {
    const data = this._getData(enemy);
    if (!data || data.state === ENEMY_STATE.DEATH) return;
    this._playAttack(enemy);
  }

  onDeath(enemy) {
    this._playDeath(enemy);
  }
}
