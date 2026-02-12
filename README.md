# The Purge
A Vampire Survivors–inspired game (Godot 4 C# + web version with [Three.js](https://github.com/mrdoob/three.js/)).

## Web version (runs in the browser)
- `npm start` — serves the game at **http://localhost:3000**
- **Assets:** sprites, zonas y orbes viven en **`assets/`** (player, map, mobs, level-up). Para copiarlos a `web/assets/` y que el juego los use: **`npm run sync-assets`** (también se ejecuta en `npm run build`).
- Controls: **WASD** move, **Space** spend 10 energy for 5s speed buff
- Enemies spawn and chase you; get in melee range to hit them. Collect orbs (health/power/energy) and survive.
