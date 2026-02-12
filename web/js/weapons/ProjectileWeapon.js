/**
 * ProjectileWeapon — auto-aim at nearest enemy, projectiles with speed, lifetime, penetration.
 */
import { BaseWeapon } from './BaseWeapon.js';
import { COMBAT } from '../systems/GameConstants.js';

function distanceTo(ax, ay, b) {
  const bx = b.pos?.x ?? b.position?.x ?? 0;
  const by = b.pos?.y ?? b.position?.y ?? 0;
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export class ProjectileWeapon extends BaseWeapon {
  constructor(options = {}) {
    super(options);
    this.speed = options.speed ?? COMBAT.PROJECTILE_SPEED;
    this.lifetime = options.lifetime ?? COMBAT.PROJECTILE_LIFETIME;
    this.penetration = options.penetration ?? COMBAT.PROJECTILE_PENETRATION;
    this._projectiles = [];
  }

  /** Call from WeaponManager: update projectile positions and hit detection */
  updateProjectiles(delta, enemies, onHit) {
    const toRemove = [];
    for (const p of this._projectiles) {
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.life -= delta;
      if (p.life <= 0) {
        toRemove.push(p);
        continue;
      }
      let hits = 0;
      for (const e of enemies) {
        if (e.dead) continue;
        const d = distanceTo(p.x, p.y, e);
        if (d < 0.8) {
          const dmg = p.damage ?? this.damage;
          e.takeDamage(dmg);
          if (onHit) onHit(e, p);
          hits++;
          if (hits >= (p.penetration ?? this.penetration)) break;
        }
      }
      if (hits >= (p.penetration ?? this.penetration)) toRemove.push(p);
    }
    this._projectiles = this._projectiles.filter(x => !toRemove.includes(x));
  }

  spawnProjectile(x, y, vx, vy, damage, penetration) {
    this._projectiles.push({
      x, y, vx, vy,
      life: this.lifetime,
      damage: damage ?? this.damage,
      penetration: penetration ?? this.penetration,
    });
  }

  attack(player, enemies) {
    const px = player.position?.x ?? player.x ?? 0;
    const py = player.position?.y ?? player.y ?? 0;
    let nearest = null;
    let nearestD = this.range;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = distanceTo(px, py, e);
      if (d < nearestD) {
        nearestD = d;
        nearest = e;
      }
    }
    if (!nearest) return false;
    const tx = nearest.pos?.x ?? nearest.position?.x ?? px;
    const ty = nearest.pos?.y ?? nearest.position?.y ?? py;
    const dx = tx - px;
    const dy = ty - py;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const vx = (dx / len) * this.speed;
    const vy = (dy / len) * this.speed;
    const damage = player.rollDamage ? player.rollDamage(this.damage) : this.damage;
    const count = Math.max(1, this.projectileCount ?? 1);
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.15;
      const vx2 = vx + dy * spread;
      const vy2 = vy - dx * spread;
      this.spawnProjectile(px, py, vx2, vy2, damage, this.penetration);
    }
    return true;
  }

  levelUp() {
    super.levelUp();
    this.damage = Math.floor(this.damage * 1.2);
    if (this.level % 2 === 0) this.projectileCount = (this.projectileCount ?? 1) + 1;
  }

  getProjectiles() {
    return this._projectiles;
  }
}
