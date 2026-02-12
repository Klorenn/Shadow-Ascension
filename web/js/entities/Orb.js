/**
 * Orb — XP orb entity (visual + value).
 * Game can use this with existing XPOrbPool: Orb is the logical representation;
 * the pool handles Three.js mesh and magnet. This class can wrap pool orb data.
 */
export class Orb {
  constructor(x, y, value) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.collected = false;
  }
}
