/**
 * AlienAnimationSystem
 *
 * - Gestiona animaciones del alien usando SpriteAnimator y los sprites LPC ya generados.
 * - No crea materiales por instancia: reutiliza texturas compartidas.
 * - Pensado para funcionar con muchos enemigos (200+) y object pooling.
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

export class AlienAnimationSystem {
  /**
   * @param {Object} options
   * @param {{ idle: THREE.Texture, walk: THREE.Texture, hurt: THREE.Texture, attack: THREE.Texture }} options.textures
   * @param {number} [options.frameWidth=64]
   * @param {number} [options.frameHeight=64]
   * @param {Function} [options.onDealDamage] - (enemy) => void, llamado en el frame de impacto del ataque
   */
  constructor(options = {}) {
    this.textures = options.textures || {};
    this.frameWidth = options.frameWidth ?? 64;
    this.frameHeight = options.frameHeight ?? 64;
    this.onDealDamage = options.onDealDamage || (() => {});
    /** @type {Map<any, any>} */
    this._aliens = new Map();

    // Preparar metadatos de spritesheets (sin hardcodear número de frames).
    this._setupTexture(this.textures.idle);
    this._setupTexture(this.textures.walk);
    this._setupTexture(this.textures.hurt);
    this._setupTexture(this.textures.attack);
  }

  _setupTexture(tex) {
    if (!tex || !tex.image) return;
    const img = tex.image;
    const cols = Math.max(1, Math.floor(img.width / this.frameWidth));
    const rows = Math.max(1, Math.floor(img.height / this.frameHeight));
    tex.userData = tex.userData || {};
    tex.userData.frameWidth = this.frameWidth;
    tex.userData.frameHeight = this.frameHeight;
    tex.userData.numFrames = cols;
    tex.userData.numRows = rows;
  }

  /**
   * Registrar o resetear un alien concreto (se llama desde AlienEnemy.reset).
   */
  register(enemy) {
    if (!enemy || enemy.type !== 'alien') return;
    const texIdle = this.textures.idle;
    if (!texIdle || !enemy.mesh) return;

    // Usar una sola instancia de SpriteAnimator por alien, asociada al material actual.
    const mat = enemy.mesh.material;
    mat.map = texIdle;
    const animator = new SpriteAnimator(mat.map, { fps: 10, loop: true });
    enemy.setAnimator(animator);

    this._aliens.set(enemy, {
      animator,
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

  _getData(enemy) {
    return this._aliens.get(enemy);
  }

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

  _playIdle(enemy) {
    const data = this._getData(enemy);
    if (!data) return;
    const tex = this.textures.idle;
    if (!tex || !enemy.mesh) return;
    enemy.mesh.material.map = tex;
    data.animator.texture = tex;
    data.animator.play('idle', {
      row: data.direction,
      loop: true,
      frameWidth: this.frameWidth,
      frameHeight: this.frameHeight,
      fps: 8,
    });
    data.state = ENEMY_STATE.IDLE;
  }

  _playWalk(enemy) {
    const data = this._getData(enemy);
    if (!data) return;
    const tex = this.textures.walk || this.textures.idle;
    if (!tex || !enemy.mesh) return;
    enemy.mesh.material.map = tex;
    data.animator.texture = tex;
    data.animator.play('walk', {
      row: data.direction,
      loop: true,
      frameWidth: this.frameWidth,
      frameHeight: this.frameHeight,
      fps: 12,
    });
    data.state = ENEMY_STATE.WALK;
  }

  _playHurt(enemy) {
    const data = this._getData(enemy);
    if (!data) return;
    const tex = this.textures.hurt || this.textures.idle;
    if (!tex || !enemy.mesh) return;
    enemy.mesh.material.map = tex;
    data.animator.texture = tex;
    data.animator.play('hurt', {
      row: data.direction,
      loop: false,
      frameWidth: this.frameWidth,
      frameHeight: this.frameHeight,
      fps: 12,
    }, () => {
      // Volver a idle o walk según se esté moviendo.
      if (data.state !== ENEMY_STATE.DEATH) this._playIdle(enemy);
    });
    data.state = ENEMY_STATE.HIT;
  }

  _playDeath(enemy) {
    const data = this._getData(enemy);
    if (!data) return;
    const tex = this.textures.hurt || this.textures.idle;
    if (!tex || !enemy.mesh) return;
    enemy.mesh.material.map = tex;
    data.animator.texture = tex;
    data.animator.play('death', {
      row: data.direction,
      loop: false,
      frameWidth: this.frameWidth,
      frameHeight: this.frameHeight,
      fps: 10,
    });
    data.state = ENEMY_STATE.DEATH;
  }

  _playAttack(enemy) {
    const data = this._getData(enemy);
    if (!data) return;
    const tex = this.textures.attack || this.textures.walk || this.textures.idle;
    if (!tex || !enemy.mesh) return;
    enemy.mesh.material.map = tex;
    this._setupTexture(tex);
    data.animator.texture = tex;

    const img = tex.image;
    const cols = img ? Math.max(1, Math.floor(img.width / this.frameWidth)) : (tex.userData?.numFrames ?? 1);
    const fps = 14;
    data.attackTime = 0;
    data.attackDuration = cols / fps;
    data.attackApplied = false;

    data.animator.play('attack', {
      row: data.direction,
      loop: false,
      frameWidth: this.frameWidth,
      frameHeight: this.frameHeight,
      fps,
    }, () => {
      if (data.state !== ENEMY_STATE.DEATH) this._playIdle(enemy);
    });
    data.state = ENEMY_STATE.ATTACK;
  }

  /** Llamar cada frame desde AlienEnemy.update(delta). */
  updateEnemy(enemy, delta) {
    const data = this._getData(enemy);
    if (!data) return;

    const dist = this._computeDirection(data, enemy, delta);

    // Cambiar animación base según estado y velocidad.
    if (enemy.dead || enemy.hp <= 0 || enemy.state === ENEMY_STATE.DEATH) {
      if (data.state !== ENEMY_STATE.DEATH) this._playDeath(enemy);
    } else if (enemy.state === ENEMY_STATE.ATTACK) {
      // El ataque se gestiona aparte (ver onAttackStarted / applyAttackDamage).
      data.attackTime += delta;
      const half = data.attackDuration * 0.5;
      if (!data.attackApplied && data.attackDuration > 0 && data.attackTime >= half) {
        data.attackApplied = true;
        this.onDealDamage(enemy);
      }
    } else if (enemy.state === ENEMY_STATE.HIT) {
      // Hurt ya está activo; SpriteAnimator se encarga del onComplete.
    } else {
      if (dist > 0.01) this._playWalk(enemy);
      else this._playIdle(enemy);
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

