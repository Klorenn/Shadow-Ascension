# Mobs (enemigos)

Cada tipo de enemigo en su propia carpeta:

- **bringer/** — Bringer of Death (spritesheet). Ataca al jugador y se genera en el juego.
- **slime/** — Slime. Pon aquí `slime.png` (sprite del slime). Si no existe, se usa un placeholder verde. El slime también ataca y se genera junto al bringer.

El juego genera enemigos de forma aleatoria entre los que tengan textura cargada. Añade nuevas carpetas (ej. `mobs/ghost/`) y registra el tipo en `game.js` en `MOB_TYPES` para más enemigos.
