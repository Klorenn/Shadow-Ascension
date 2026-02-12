/**
 * DamageSystem — apply damage to enemies (used by weapons / effects).
 * Stateless; weapons call enemy.takeDamage() directly; this can centralize crit/armor later.
 */
export class DamageSystem {
  /**
   * Apply damage to a single enemy (e.g. from projectile or melee hit).
   * @param {Object} enemy - has takeDamage(amount)
   * @param {number} amount - raw damage
   * @param {Object} [options] - crit, source
   */
  static applyDamage(enemy, amount, options = {}) {
    if (!enemy || enemy.dead) return;
    enemy.takeDamage(amount);
  }

  /**
   * Apply damage in radius (for area effects).
   */
  static applyDamageInRadius(centerX, centerY, radius, enemies, amount, damageMultiplier = 1) {
    const r2 = radius * radius;
    for (const e of enemies) {
      if (e.dead) continue;
      const ex = e.pos?.x ?? e.position?.x ?? 0;
      const ey = e.pos?.y ?? e.position?.y ?? 0;
      const dx = ex - centerX;
      const dy = ey - centerY;
      if (dx * dx + dy * dy <= r2) {
        e.takeDamage(amount * damageMultiplier);
      }
    }
  }
}
