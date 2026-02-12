# Skill / VFX effect system

Modular skill effects for Vampire Survivors–style gameplay. Each effect has:

- **Name, skill type, damage type**
- **Gameplay effect** (burst, DoT, slow, knockback, chain, etc.)
- **Animation** (scale, opacity, blending)
- **Collision** (sphere distance check; chain uses nearest-enemy logic)
- **Duration, cooldown**
- **Upgrade scaling** (radiusUpgrade, damageUpgrade, etc.)
- **Performance**: shared textures/geometry, no new materials per frame, distance checks only

## Base class

```js
class SkillEffect {
  constructor(position, options)
  update(delta)        // return false when effect should be removed
  checkCollision(enemies)  // return hit enemies
  destroy()
}
```

## Skills

| ID | Type | Effect |
|----|------|--------|
| `gold_explosion` | Instant AoE | Burst + knockback |
| `circle_blue` | Frost AoE | Damage + 40% slow 2s |
| `gas` | DoT Area | Poison cloud, tick damage |
| `circle_orange` | Fire Burst | AoE + stackable burn |
| `blue` | Energy Pulse | High damage, pierce |
| `circle_gas` | Toxic Trap | Poison field, reduce defense |
| `nuclear` | Ultimate | Massive AoE, screen shake, instant kill weak |
| `two_colored` | Chaos Burst | Random Fire/Ice/Electric |
| `lightning` | Chain | Hits nearest, jumps to 3 more |
| `smoke` | Debuff | Vision reduction, slight slow |
| `fire` | Ground DoT | Fire patch, burn on step |

## Usage

```js
import { createSkillEffect, SKILL_IDS } from './effects/index.js';

const effect = createSkillEffect(SKILL_IDS.GOLD_EXPLOSION, { x: 10, y: 5 }, {
  damageUpgrade: 1.2,
  radiusUpgrade: 1.1,
});
scene.add(effect.mesh);

// Game loop
activeEffects = activeEffects.filter(eff => {
  if (!eff.update(delta)) {
    eff.destroy();
    scene.remove(eff.mesh);
    return false;
  }
  eff.checkCollision(enemies);
  return true;
});
```

## Auto-attach to player

Keep a cooldown per skill and spawn at player position (or target) when cooldown expires:

```js
let skillCooldowns = { [SKILL_IDS.GOLD_EXPLOSION]: 0 };
function tryCast(skillId) {
  const eff = createSkillEffect(skillId, { x: playerPos.x, y: playerPos.y });
  if (skillCooldowns[skillId] > 0) return;
  scene.add(eff.mesh);
  activeEffects.push(eff);
  skillCooldowns[skillId] = eff.cooldown;
}
// In update:
Object.keys(skillCooldowns).forEach(k => { skillCooldowns[k] -= delta; });
```

## Assets

Effect sprites (optional) live in `assets/effects/PNG/`. The system works with procedural canvas textures; replace with loaded PNGs in `effectUtils.js` or per-skill for custom art.
