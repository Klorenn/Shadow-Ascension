# Enemy behavior system

**Slime** (medium HP, slow, wobble + squash, lunge when close) and **Alien** (low HP, fast, dash every 4–6s with motion-blur stretch and red glow). Both implement the `Enemy` interface: `update(delta, playerPosition)`, `takeDamage(amount)`, `onDeath()`, `specialBehaviorCooldown`.

## Build

From project root:

```bash
npm run build:enemies
```

Output: `web/js/enemy/*.js`.

## Integration with SpawnSystem

1. **Load meshes once** (e.g. from `assets/mobs/slime/slime.png` and `assets/mobs/alien/...`), create `THREE.Mesh` with texture.
2. **Create enemies** via factory:

   ```ts
   import { getEnemyFactory } from './enemy/index.js'
   const factory = getEnemyFactory()
   const slime = factory.createSlime(slimeMesh)
   const alien = factory.createAlien(alienMesh)
   ```

3. **Set spawn position** and add to scene:

   ```ts
   slime.mesh.position.set(x, y, 0)
   scene.add(slime.mesh)
   ```

4. **Difficulty scaling** (optional): before adding to scene, call  
   `(enemy as any).setDifficulty(healthMult, speedMult)`  
   e.g. `healthMult = 1 + level * 0.1`, `speedMult = 1 + level * 0.05`.

5. **Game loop**: for each enemy, `enemy.update(delta, playerPosition)`.
6. **Combat**: when weapon hits, `enemy.takeDamage(amount)`; on death, `enemy.onDeath()` is called. Subscribe with `(enemy as any).setDeathCallback(() => { ... remove from scene, drop orbs, etc. })`.

## Behavior summary

- **Slime**: moves toward player with sin-based wobble; scale Y oscillates 0.9–1.1 (squash); lunges when within 2.5 units (cooldown 1.5s). Green emissive if material supports it.
- **Alien**: direct tracking; every 4–6s dashes (2x speed for 0.5s), fake motion blur (scale stretch), red emissive during dash.

No placeholder geometry; meshes are assumed loaded and passed into the factory.
