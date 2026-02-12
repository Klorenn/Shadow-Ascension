/**
 * EnemyAISystem — move toward player, attack in range, optional light separation.
 */
export class EnemyAISystem {
  /**
   * @param {Object} options
   * @param {Function} options.getPlayerPosition - () => { x, y }
   * @param {Function} [options.onEnemyAttack] - (enemy, player) => void (e.g. deal damage)
   * @param {number} [options.separationRadius] - 0 to disable
   */
  constructor(options = {}) {
    this.getPlayerPosition = options.getPlayerPosition;
    this.onEnemyAttack = options.onEnemyAttack ?? (() => {});
    this.separationRadius = options.separationRadius ?? 0;
    this._time = 0;
    this._aggressionBoost = 0; // 0..1, increases when many enemies alive
  }

  /** Call from game.js to pass the current enemy count for aggression scaling */
  setAggressionFromCount(activeCount, maxCount) {
    // When >60% of max enemies are alive, enemies get more aggressive
    const ratio = maxCount > 0 ? activeCount / maxCount : 0;
    this._aggressionBoost = ratio > 0.6 ? (ratio - 0.6) * 2.5 : 0; // 0 .. 1
  }

  update(delta, enemies) {
    this._time += delta;
    const player = this.getPlayerPosition();
    const px = player.x ?? 0;
    const py = player.y ?? 0;

    for (const e of enemies) {
      if (e.dead || !e.pos) continue;

      const ex = e.pos.x;
      const ey = e.pos.y;
      let dx = px - ex;
      let dy = py - ey;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

      if (dist <= (e.attackRange ?? 1.2)) {
        const didAttack = e.attack && e.attack(player);
        if (didAttack && !e.deferAttack && this.onEnemyAttack) this.onEnemyAttack(e, player);
        if (e.mesh) e.mesh.position.set(e.pos.x, e.pos.y, 0);
        continue;
      }

      let nx = dx / dist;
      let ny = dy / dist;

      // --- AI Variation by type ---
      if (e.type === 'alien') {
        // Aliens zigzag: perpendicular oscillation based on time + enemy id hash
        const hash = (e.id ? e.id.charCodeAt(e.id.length - 1) : 0) * 0.37;
        const zigFreq = 3.0 + hash * 0.5;
        const zigAmp = 0.35;
        const perpX = -ny;
        const perpY = nx;
        const zig = Math.sin(this._time * zigFreq + hash) * zigAmp;
        nx += perpX * zig;
        ny += perpY * zig;
      }
      // Slimes are slow but steady: no variation, just direct chase (default behavior)

      if (this.separationRadius > 0) {
        const sep = this._separation(e, enemies);
        nx += sep.x;
        ny += sep.y;
      }

      // Normalize
      const len = Math.sqrt(nx * nx + ny * ny) || 0.001;
      nx /= len;
      ny /= len;

      // Aggression boost: slightly increase effective speed when overwhelmed
      const aggrMult = 1 + this._aggressionBoost * 0.25;
      const speed = (e.speed ?? e._moveSpeed ?? 0.12) * 60 * delta * aggrMult;
      e.pos.x += nx * speed;
      e.pos.y += ny * speed;

      if (e.mesh) {
        e.mesh.position.set(e.pos.x, e.pos.y, 0);
        if (e.mesh.scale) e.mesh.scale.x = nx >= 0 ? Math.abs(e.mesh.scale.x) : -Math.abs(e.mesh.scale.x);
      }
    }
  }

  _separation(self, enemies) {
    let sx = 0, sy = 0;
    const r = this.separationRadius;
    for (const o of enemies) {
      if (o === self || o.dead || !o.pos) continue;
      const dx = self.pos.x - o.pos.x;
      const dy = self.pos.y - o.pos.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0 && d2 < r * r) {
        const d = Math.sqrt(d2);
        const f = (1 - d / r) / d;
        sx += dx * f;
        sy += dy * f;
      }
    }
    return { x: sx * 0.3, y: sy * 0.3 };
  }
}
