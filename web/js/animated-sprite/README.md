# AnimatedSprite system

LPC-style spritesheet animation for Three.js (top-down 2D). Uses **texture offset and repeat** only—no new materials per frame.

## Directions

- `0` = down  
- `1` = left  
- `2` = right  
- `3` = up  

## UV formula

- `offset.x = currentFrame / totalColumns`
- `offset.y = 1 - (rowIndex + 1) / totalRows` (rowIndex clamped to sheet rows)

## Usage

### AnimatedSprite

```js
import { AnimatedSprite } from './animated-sprite/index.js';

const config = {
  frameWidth: 64,
  frameHeight: 64,
  animations: {
    idle: { frameCount: 13, fps: 8 },
    walk: { frameCount: 13, fps: 12 },
    death: { frameCount: 6, fps: 10, loop: false },
  },
};
const sprite = new AnimatedSprite(texture, config, 2);
sprite.setAnimation('walk');
sprite.setDirection(0); // down
// each frame:
sprite.update(delta);
```

### AlienEnemy (extends AnimatedSprite)

```js
import { AlienEnemy, ALIEN_ANIM_CONFIG } from './animated-sprite/index.js';

const alien = new AlienEnemy(idleTexture, ALIEN_ANIM_CONFIG, x, y, 2.4);
alien.setAnimationTexture('walk', walkTexture);
alien.setAnimationTexture('death', hurtTexture);
scene.add(alien.mesh);
alien.setDeathCallback(() => {
  scene.remove(alien.mesh);
  alien.dispose();
  // remove from enemies array, drop orbs, etc.
});

// in game loop:
alien.update(dt, { x: playerPos.x, y: playerPos.y });
```

### Game loop integration

- Enemies array can mix legacy `{ mesh, pos, dead, ... }` and `AlienEnemy` instances.
- If `e.update(dt, playerPosition)` exists, call it; otherwise use legacy movement.
- If `e.takeDamage(amount)` exists, use it on hit; otherwise set `e.dead` and remove immediately.
- On restart, call `e.dispose()` when present before clearing the list.

## Assets

Alien LPC sheets live in `assets/mobs/alien/standard/` (idle.png, walk.png, hurt.png).  
`npm run sync-assets` copies them to `web/assets/mobs/alien/standard/`.
