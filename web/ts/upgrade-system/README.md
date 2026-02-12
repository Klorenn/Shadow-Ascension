# Upgrade System (Space Dracula)

Modular Vampire Survivors–style upgrade system: **PlayerStats**, **Upgrade** types, **UpgradeManager** (weighted rarity), **VFXSystem** (Three.js aura/trail/clone/screen/distortion), and 12 predefined upgrades.

## Build

From project root:

```bash
npm run build:upgrades
```

Output: `web/js/upgrade/*.js` and `.d.ts`.

## Integration in game loop

1. **Create systems** (once at init):

   ```js
   import {
     createDefaultPlayerStats,
     createDefaultUpgradeManager,
     VFXSystem
   } from './upgrade/index.js'

   const playerStats = createDefaultPlayerStats()
   const upgradeManager = createDefaultUpgradeManager()
   const vfxSystem = new VFXSystem()
   ```

2. **On level-up / upgrade choice** (e.g. when player picks one of 3 options):

   ```js
   const choices = upgradeManager.getRandomUpgrades(3)
   // Show UI (your code); when user picks one:
   const chosen = choices[0] // or 1, 2
   chosen.apply(playerStats)
   vfxSystem.applyUpgradeVFX(chosen, playerMesh, scene, renderer)
   ```

3. **Each frame**:

   - Use `playerStats` for damage, moveSpeed, defense, projectileCount, critChance, etc.
   - `vfxSystem.update(deltaTime, playerMesh.position)` for clone position and distortion time.
   - If using trails: update trail geometry from projectile positions (see `VFXSystem.getTrailLines()`).
   - Conditional logic: **Dark Knight Protocol** (damage boost above 70% HP) and **attacksCanFail** (Broken Blade) must be applied in your combat/weapon code.

## Rarity weights

- COMMON 60%, RARE 25%, CORRUPTED 10%, LEGENDARY 5%.

## Upgrades (12)

Crimson Fury, Void Helmet, Eclipse Dagger, Solar Corruption, Broken Blade, Dark Knight Protocol, Bat Wings, Blood Harvest, Abyss Vision, Shadow Clone, Stellar Precision, Gravity Curse.

See `Upgrades.ts` for exact stats and VFX.
