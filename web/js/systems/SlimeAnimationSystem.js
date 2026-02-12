/**
 * SlimeAnimationSystem
 *
 * Usa sprites LPC (Idle / Walk / Run / Attack / Hurt / Death) para animar slimes.
 * - No crea materiales nuevos por instancia: reutiliza texturas compartidas.
 * - Calcula el número de frames automáticamente a partir del tamaño de la imagen.
 * - Preparado para cientos de slimes en pantalla (object pooling friendly).
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

export class SlimeAnimationSystem {
  /**
   * @param {Object} options
   * @param {{ idle: THREE.Texture, walk: THREE.Texture, run?: THREE.Texture, attack: THREE.Texture, hurt: THREE.Texture, death: THREE.Texture }} options.textures
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
    this._slimes = new Map();

    this._setupTexture(this.textures.idle);
    this._setupTexture(this.textures.walk);
    if (this.textures.run) this._setupTexture(this.textures.run);
    this._setupTexture(this.textures.attack);
    this._setupTexture(this.textures.hurt);
    this._setupTexture(this.textures.death);
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
   * Registrar / resetear un slime concreto (desde SlimeEnemy.reset()).
   */
  register(enemy) {
    if (!enemy || enemy.type !== 'slime') return;
    const texIdle = this.textures.idle;
    if (!texIdle || !enemy.mesh) return;

    const mat = enemy.mesh.material;
    mat.map = texIdle;
    const animator = new SpriteAnimator(mat.map, { fps: 10, loop: true });
    enemy.setAnimator(animator);

    this._slimes.set(enemy, {
      animator,
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

  _getData(enemy) {
    return this._slimes.get(enemy);
  }

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
      fps: 6,
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
      fps: 10,
    });
    data.state = ENEMY_STATE.WALK;
  }

  _playRun(enemy) {
    const data = this._getData(enemy);
    if (!data) return;
    const tex = this.textures.run || this.textures.walk || this.textures.idle;
    if (!tex || !enemy.mesh) return;
    enemy.mesh.material.map = tex;
    data.animator.texture = tex;
    data.animator.play('run', {
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
      if (data.state !== ENEMY_STATE.DEATH) this._playIdle(enemy);
    });
    data.state = ENEMY_STATE.HIT;
  }

  _playDeath(enemy) {
    const data = this._getData(enemy);
    if (!data) return;
    const tex = this.textures.death || this.textures.hurt || this.textures.idle;
    if (!tex || !enemy.mesh) return;
    enemy.mesh.material.map = tex;
    this._setupTexture(tex);
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
    const fps = 10;
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

  /**
   * Llamar cada frame desde SlimeEnemy.update(delta).
   */
  updateEnemy(enemy, delta) {
    const data = this._getData(enemy);
    if (!data) return;

    const speed = this._computeDirectionAndSpeed(data, enemy, delta);

    if (enemy.dead || enemy.hp <= 0 || enemy.state === ENEMY_STATE.DEATH) {
      if (data.state !== ENEMY_STATE.DEATH) this._playDeath(enemy);
    } else if (enemy.state === ENEMY_STATE.ATTACK) {
      // Ataque: avanzar tiempo y aplicar daño en el frame medio.
      data.attackTime += delta;
      const half = data.attackDuration * 0.5;
      if (!data.attackApplied && data.attackDuration > 0 && data.attackTime >= half) {
        data.attackApplied = true;
        this.onDealDamage(enemy);
      }
    } else if (enemy.state === ENEMY_STATE.HIT) {
      // Hurt ya está gestionado por _playHurt (no cambiar a walk/idle hasta onComplete).
    } else {
      // Movimiento base: idle / walk / run según velocidad.
      if (speed < 0.1) this._playIdle(enemy);
      else if (speed < 4) this._playWalk(enemy);
      else this._playRun(enemy);
    }

    // Efecto slime: pequeño squash/stretch con la animación.
    if (enemy.mesh && enemy.mesh.scale) {
      const t = performance.now() * 0.002;
      const squash = 1 + Math.sin(t) * 0.06;
      enemy.mesh.scale.y *= squash;
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

