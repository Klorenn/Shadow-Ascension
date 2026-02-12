/**
 * AlienAnimationSystem
 *
 * Spritesheet-based animations for aliens (Idle / Walk / Hurt / Attack).
 * Each enemy gets its own cloned textures so offset/repeat are independent.
 */
import { SpriteAnimator } from '../entities/SpriteAnimator.js';
import { ENEMY_STATE } from '../entities/Enemy.js';

function angleToDirection(angleRad) {
  const a = angleRad;
  if (a >= -Math.PI * 0.25 && a < Math.PI * 0.25) return 2; // right
  if (a >= Math.PI * 0.25 && a < Math.PI * 0.75) return 3;  // up
  if (a >= -Math.PI * 0.75 && a < -Math.PI * 0.25) return 0; // down
  return 1; // left
}

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

export class AlienAnimationSystem {
  /**
   * @param {Object} options
   * @param {{ idle, walk, hurt, attack }} options.textures - shared base textures
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
    this._aliens = new Map();

    for (const key of ['idle', 'walk', 'hurt', 'attack']) {
      setupTexUserData(this._baseTex[key], this.frameWidth, this.frameHeight);
    }
  }

  /** Register / reset an alien. Clones all textures for this instance. */
  register(enemy) {
    if (!enemy || enemy.type !== 'alien') return;
    if (!this._baseTex.idle || !enemy.mesh) return;

    const texSet = {
      idle:   cloneTex(this._baseTex.idle),
      walk:   cloneTex(this._baseTex.walk)   || cloneTex(this._baseTex.idle),
      hurt:   cloneTex(this._baseTex.hurt)   || cloneTex(this._baseTex.idle),
      attack: cloneTex(this._baseTex.attack) || cloneTex(this._baseTex.walk) || cloneTex(this._baseTex.idle),
    };

    for (const key of Object.keys(texSet)) {
      setupTexUserData(texSet[key], this.frameWidth, this.frameHeight);
    }

    const mat = enemy.mesh.material;
    mat.map = texSet.idle;
    mat.needsUpdate = true;

    const animator = new SpriteAnimator(texSet.idle, { fps: 10, loop: true });
    enemy.setAnimator(animator);

    this._aliens.set(enemy, {
      animator,
      texSet,
      state: ENEMY_STATE.WALK,
      direction: 0,
      prevX: enemy.pos?.x ?? 0,
      prevY: enemy.pos?.y ?? 0,
      attackTime: 0,
      attackDuration: 0,
      attackApplied: false,
    });

    this._playIdle(enemy);
  }

  _getData(enemy) { return this._aliens.get(enemy); }

  _computeDirection(data, enemy, delta) {
    const x = enemy.pos?.x ?? 0;
    const y = enemy.pos?.y ?? 0;
    const dx = x - data.prevX;
    const dy = y - data.prevY;
    data.prevX = x;
    data.prevY = y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.01 && delta > 0) {
      const angle = Math.atan2(dy, dx);
      data.direction = angleToDirection(angle);
    }
    return dist;
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
    this._switchTex(enemy, data, 'idle', 'idle', { loop: true, fps: 8 });
    data.state = ENEMY_STATE.IDLE;
  }

  _playWalk(enemy) {
    const data = this._getData(enemy);
    if (!data) return;
    this._switchTex(enemy, data, 'walk', 'walk', { loop: true, fps: 12 });
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
    this._switchTex(enemy, data, 'hurt', 'death', { loop: false, fps: 10 });
    data.state = ENEMY_STATE.DEATH;
  }

  _playAttack(enemy) {
    const data = this._getData(enemy);
    if (!data) return;
    const tex = data.texSet.attack;
    if (!tex || !enemy.mesh) return;

    const img = tex.image;
    const cols = img ? Math.max(1, Math.floor(img.width / this.frameWidth)) : (tex.userData?.numFrames ?? 1);
    const fps = 14;
    data.attackTime = 0;
    data.attackDuration = cols / fps;
    data.attackApplied = false;

    this._switchTex(enemy, data, 'attack', 'attack', {
      loop: false, fps,
      _onComplete: () => { if (data.state !== ENEMY_STATE.DEATH) this._playIdle(enemy); },
    });
    data.state = ENEMY_STATE.ATTACK;
  }

  /** Called each frame from AlienEnemy.update(delta). */
  updateEnemy(enemy, delta) {
    const data = this._getData(enemy);
    if (!data) return;

    const dist = this._computeDirection(data, enemy, delta);

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
      // Hurt managed by onComplete
    } else {
      if (dist > 0.01) {
        if (data.state !== ENEMY_STATE.WALK) this._playWalk(enemy);
      } else {
        if (data.state !== ENEMY_STATE.IDLE) this._playIdle(enemy);
      }
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
