/**
 * AlienEnemy — enemigo tipo alien que extiende Enemy base
 * y delega las animaciones en AlienAnimationSystem.
 */
import { Enemy, ENEMY_STATE } from './Enemy.js';

export class AlienEnemy extends Enemy {
  /**
   * @param {Object} options
   * @param {import('../systems/AlienAnimationSystem.js').AlienAnimationSystem} [options.animSystem]
   */
  constructor(options = {}) {
    super(options);
    this.type = options.type ?? 'alien';
    this.animSystem = options.animSystem || null;
    // Para que EnemyAISystem no aplique el daño inmediatamente:
    this.deferAttack = true;
  }

  reset(config) {
    super.reset({ ...config, type: 'alien' });
    if (this.animSystem) this.animSystem.register(this);
  }

  /**
   * Llamado desde GameLoop antes de EnemyAISystem; AlienAnimationSystem
   * usa el delta de posición para estimar dirección.
   */
  update(delta) {
    super.update(delta);
    // Animation system must run even when dead (for death animation playback)
    if (this.animSystem) this.animSystem.updateEnemy(this, delta);
  }

  takeDamage(amount, options = {}) {
    const dealt = super.takeDamage(amount, options);
    if (this.animSystem) this.animSystem.onDamaged(this);
    return dealt;
  }

  die() {
    if (this.dead) return;
    super.die();
    if (this.animSystem) this.animSystem.onDeath(this);
  }

  /**
   * EnemyAISystem llama a attack() cuando está en rango.
   * Aquí sólo disparamos la animación; el daño real se aplica
   * desde AlienAnimationSystem en el frame de impacto.
   */
  attack(player) {
    if (this.dead || this.state === ENEMY_STATE.DEATH) return false;
    // Respetar cooldown base del Enemy:
    const didAttack = super.attack(player);
    if (didAttack && this.animSystem) this.animSystem.onAttackStarted(this);
    return didAttack;
  }
}

