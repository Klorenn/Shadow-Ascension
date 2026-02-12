/**
 * AutoAttack — automatically targets nearest enemy in range and spawns an effect.
 * No manual input. Cooldown and attack speed upgradeable.
 */
import { SKILL_IDS } from '../effects/index.js';

function distanceToEnemy(px, py, enemy) {
  const ex = enemy.pos?.x ?? enemy.position?.x ?? 0;
  const ey = enemy.pos?.y ?? enemy.position?.y ?? 0;
  const dx = ex - px;
  const dy = ey - py;
  return Math.sqrt(dx * dx + dy * dy);
}

export class AutoAttack {
  /**
   * @param {Object} player - { position: { x, y } or getPosition() }
   * @param {EffectManager} effectManager
   * @param {Object} [options]
   * @param {number} options.cooldown - seconds between attacks (default 1.2)
   * @param {number} options.range - max distance to target (default 12)
   * @param {string} options.skillId - SKILL_IDS.GOLD_EXPLOSION | SKILL_IDS.LIGHTNING (default GOLD_EXPLOSION)
   * @param {number} options.attackSpeedMult - upgrade multiplier (default 1)
   * @param {number} options.damageUpgrade - damage multiplier (default 1)
   * @param {number} options.radiusUpgrade - radius multiplier (default 1)
   */
  constructor(player, effectManager, options = {}) {
    this.player = player;
    this.effectManager = effectManager;
    this.cooldown = options.cooldown ?? 1.2;
    this.range = options.range ?? 12;
    this.skillId = options.skillId ?? SKILL_IDS.GOLD_EXPLOSION;
    this.attackSpeedMult = options.attackSpeedMult ?? 1;
    this.damageUpgrade = options.damageUpgrade ?? 1;
    this.radiusUpgrade = options.radiusUpgrade ?? 1;
    this._timer = 0;
  }

  getPosition() {
    const p = this.player;
    if (p.position) return p.position;
    if (p.getPosition) return p.getPosition();
    return { x: p.x ?? 0, y: p.y ?? 0 };
  }

  /**
   * @param {number} delta
   * @param {Array} enemies - live enemies (not dead)
   */
  update(delta, enemies) {
    this._timer -= delta;
    if (this._timer > 0) return;
    const pos = this.getPosition();
    const effectiveCooldown = this.cooldown / Math.max(0.2, this.attackSpeedMult);
    this._timer = effectiveCooldown;

    let nearest = null;
    let nearestD = this.range;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.dead) continue;
      const d = distanceToEnemy(pos.x, pos.y, e);
      if (d < nearestD) {
        nearestD = d;
        nearest = e;
      }
    }
    if (!nearest) return;

    const tx = nearest.pos?.x ?? nearest.position?.x ?? pos.x;
    const ty = nearest.pos?.y ?? nearest.position?.y ?? pos.y;
    this.effectManager.spawn(this.skillId, { x: tx, y: ty }, {
      damageUpgrade: this.damageUpgrade,
      radiusUpgrade: this.radiusUpgrade,
    });
  }

  setAttackSpeedMult(mult) {
    this.attackSpeedMult = Math.max(0.2, mult);
  }

  setDamageUpgrade(mult) {
    this.damageUpgrade = mult;
  }

  setRadiusUpgrade(mult) {
    this.radiusUpgrade = mult;
  }
}
