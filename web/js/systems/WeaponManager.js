/**
 * WeaponManager — holds player weapons, runs cooldowns, triggers attacks and projectiles.
 */
import { ProjectileWeapon } from '../weapons/ProjectileWeapon.js';

export class WeaponManager {
  constructor(options = {}) {
    this.weapons = [];
    this._onMeleeAttack = options.onMeleeAttack ?? null;
    this._onProjectileSpawn = options.onProjectileSpawn ?? null;
  }

  addWeapon(weapon) {
    this.weapons.push(weapon);
  }

  update(delta, player, enemies) {
    const liveEnemies = Array.isArray(enemies) ? enemies.filter(e => !e.dead) : [];
    const attackSpeedMult = player.attackSpeedMultiplier ?? 1;
    for (const w of this.weapons) {
      w.update(delta);
      if (w.timer > 0) continue;
      const effectiveCooldown = w.getEffectiveCooldown ? w.getEffectiveCooldown(attackSpeedMult) : w.cooldown;
      const didAttack = w.attack(player, liveEnemies);
      if (didAttack) w.timer = effectiveCooldown;
      if (didAttack && w.constructor.name === 'MeleeWeapon' && this._onMeleeAttack) {
        this._onMeleeAttack(w, player);
      }
      if (w instanceof ProjectileWeapon) {
        w.updateProjectiles(delta, liveEnemies, this._onProjectileSpawn);
      }
    }
  }

  setOnMeleeAttack(cb) {
    this._onMeleeAttack = cb;
  }

  setOnProjectileSpawn(cb) {
    this._onProjectileSpawn = cb;
  }

  getWeapons() {
    return this.weapons;
  }

  getProjectiles() {
    const list = [];
    for (const w of this.weapons) {
      if (w.getProjectiles) list.push(...w.getProjectiles());
    }
    return list;
  }
}
