/**
 * Player — HP, XP, level, weapons, combat stats. No Three.js; game.js owns mesh/position.
 */
import { PLAYER, XP } from '../systems/GameConstants.js';

export class Player {
  constructor(options = {}) {
    this.hp = options.hp ?? PLAYER.BASE_HP;
    this.maxHp = options.maxHp ?? this.hp;
    this.xp = options.xp ?? 0;
    this.level = options.level ?? 1;
    this.xpToNextLevel = this._computeXpToNextLevel(this.level);
    this.weapons = [];
    this.attackSpeedMultiplier = options.attackSpeedMultiplier ?? PLAYER.BASE_ATTACK_SPEED_MULT;
    this.damageMultiplier = options.damageMultiplier ?? PLAYER.BASE_DAMAGE_MULT;
    this.critChance = options.critChance ?? PLAYER.BASE_CRIT_CHANCE;
    this.critDamage = options.critDamage ?? PLAYER.BASE_CRIT_DAMAGE;
    this._onLevelUp = null;
    this._onDeath = null;
  }

  _computeXpToNextLevel(level) {
    return Math.floor(XP.BASE_XP * level * XP.XP_SCALE);
  }

  update(delta) {
    // Timers / state updates if needed
  }

  addXP(amount) {
    if (this.hp <= 0) return;
    this.xp += amount;
    while (this.xp >= this.xpToNextLevel) {
      this.xp -= this.xpToNextLevel;
      this.levelUp();
    }
  }

  levelUp() {
    this.level++;
    this.xpToNextLevel = this._computeXpToNextLevel(this.level);
    if (this._onLevelUp) this._onLevelUp(this);
  }

  addWeapon(weapon) {
    if (this.weapons.length >= PLAYER.MAX_WEAPONS) return false;
    this.weapons.push(weapon);
    return true;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) this.die();
  }

  die() {
    this.hp = 0;
    if (this._onDeath) this._onDeath(this);
  }

  setOnLevelUp(cb) {
    this._onLevelUp = cb;
  }

  setOnDeath(cb) {
    this._onDeath = cb;
  }

  /** Effective damage after crit */
  rollDamage(baseDamage) {
    const mult = this.damageMultiplier ?? 1;
    const isCrit = Math.random() < (this.critChance ?? 0);
    const critMult = isCrit ? (this.critDamage ?? 1.5) : 1;
    return baseDamage * mult * critMult;
  }
}
