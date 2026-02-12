/**
 * SlimeEnemy — enemigo slime que extiende Enemy base
 * y delega las animaciones en SlimeAnimationSystem.
 */
import { Enemy, ENEMY_STATE } from './Enemy.js';

export class SlimeEnemy extends Enemy {
  /**
   * @param {Object} options
   * @param {import('../systems/SlimeAnimationSystem.js').SlimeAnimationSystem} [options.animSystem]
   */
  constructor(options = {}) {
    super(options);
    this.type = options.type ?? 'slime';
    this.animSystem = options.animSystem || null;
    // El daño se aplica desde la animación, no directamente desde EnemyAISystem.
    this.deferAttack = true;
  }

  reset(config) {
    // Config base de Enemy (hp, damage, speed, etc.) viene de EnemyManager.
    super.reset({ ...config, type: 'slime' });
    if (this.animSystem) this.animSystem.register(this);
  }

  update(delta) {
    super.update(delta);
    if (this.animSystem) this.animSystem.updateEnemy(this, delta);
  }

  takeDamage(amount, options = {}) {
    const dealt = super.takeDamage(amount, options);
    if (this.animSystem && dealt > 0 && this.state !== ENEMY_STATE.DEATH) {
      this.animSystem.onDamaged(this);
    }
    return dealt;
  }

  die() {
    if (this.dead) return;
    super.die();
    if (this.animSystem) this.animSystem.onDeath(this);
  }

  attack(player) {
    if (this.dead || this.state === ENEMY_STATE.DEATH) return false;
    const didAttack = super.attack(player);
    if (didAttack && this.animSystem) this.animSystem.onAttackStarted(this);
    return didAttack;
  }
}

