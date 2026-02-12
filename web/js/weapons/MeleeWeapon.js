/**
 * MeleeWeapon — circular area damage around player. Optional slash animation and knockback.
 */
import { BaseWeapon } from './BaseWeapon.js';
import { COMBAT } from '../systems/GameConstants.js';

export class MeleeWeapon extends BaseWeapon {
  constructor(options = {}) {
    super(options);
    this.radius = options.radius ?? 3;
    this.knockback = options.knockback ?? COMBAT.KNOCKBACK_FORCE;
    this.slashAnimationRow = options.slashAnimationRow ?? 0;
  }

  attack(player, enemies) {
    const px = player.position?.x ?? player.x ?? 0;
    const py = player.position?.y ?? player.y ?? 0;
    const r2 = (this.radius * (this.areaMultiplier ?? 1)) ** 2;
    let hitAny = false;
    for (const e of enemies) {
      if (e.dead) continue;
      const ex = e.pos?.x ?? e.position?.x ?? 0;
      const ey = e.pos?.y ?? e.position?.y ?? 0;
      const dx = ex - px;
      const dy = ey - py;
      if (dx * dx + dy * dy <= r2) {
        const damage = player.rollDamage ? player.rollDamage(this.damage) : this.damage;
        e.takeDamage(damage);
        if (this.knockback && e.pos) {
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          e.pos.x += (dx / len) * this.knockback;
          e.pos.y += (dy / len) * this.knockback;
        }
        hitAny = true;
      }
    }
    return hitAny;
  }

  levelUp() {
    super.levelUp();
    this.damage = Math.floor(this.damage * 1.15);
    this.areaMultiplier = (this.areaMultiplier ?? 1) * 1.08;
  }
}
