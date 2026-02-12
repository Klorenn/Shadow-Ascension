/**
 * BossEnemy — Boss Slime Gigante: 3x size, high hp, 3x damage, slow, big xpDrop. Life bar hook.
 */
import { Enemy } from './Enemy.js';
import { ENEMY } from '../systems/GameConstants.js';
import { getEnemyType, ENEMY_TYPE_IDS } from '../data/enemyTypes.js';

const BOSS_SLIME_HP_MULT = ENEMY.BOSS_SLIME_HP_MULT;
const BOSS_SLIME_DAMAGE_MULT = ENEMY.BOSS_SLIME_DAMAGE_MULT;
const BOSS_SLIME_SPEED_MULT = ENEMY.BOSS_SLIME_SPEED_MULT;
const BOSS_SLIME_XP_MULT = ENEMY.BOSS_SLIME_XP_MULT;
const BOSS_SLIME_SCALE_MULT = ENEMY.BOSS_SLIME_SCALE_MULT;

export class BossEnemy extends Enemy {
  constructor(options = {}) {
    super(options);
    this.isBoss = true;
  }

  reset(config) {
    const baseType = getEnemyType(config.type || ENEMY_TYPE_IDS.SLIME);
    const baseHp = config.maxHp ?? baseType.hp;
    const baseDamage = config.damage ?? baseType.damage;
    const baseSpeed = config.speed ?? baseType.speed;
    const baseXp = config.xpDrop ?? baseType.xpDrop;
    super.reset({
      ...config,
      maxHp: Math.floor(baseHp * BOSS_SLIME_HP_MULT),
      damage: baseDamage * BOSS_SLIME_DAMAGE_MULT,
      speed: baseSpeed * BOSS_SLIME_SPEED_MULT,
      xpDrop: Math.floor(baseXp * BOSS_SLIME_XP_MULT),
      isBoss: true,
    });
  }

  /** Hook: scale mesh for boss (3x). Call after mesh assigned. */
  applyBossScale() {
    if (this.mesh) this.mesh.scale.setScalar(BOSS_SLIME_SCALE_MULT);
  }

  /** Hook: UI can poll for boss life bar. */
  getLifeBarRatio() {
    return this.maxHp > 0 ? this.hp / this.maxHp : 0;
  }
}
