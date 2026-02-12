# Assets — estructura (web)

Estos archivos son la **copia** que usa el juego web. La **fuente** está en la raíz del repo: **`assets/`**.

Para actualizar después de cambiar sprites, mapas u orbes en `assets/`, ejecuta:

```bash
npm run sync-assets
```

Estructura (en `web/assets/` y en `assets/`):

- **mobs/** — Enemigos: `mobs/bringer/Bringer-of-Death-SpritSheet.png`, `mobs/slime/slime.png`. Ver `mobs/README.md`. En `assets/` el slime se genera desde `mobs/slime/PNG/Slime1/With_shadow/Slime1_Idle_with_shadow.png` → `slime.png`.
- **level-up/** — Orbes: red-orb.png, green-orb.png, blue-orb.png.
- **map/** — Fondos: **ZONA1.png** … **ZONA5.png** y grass.png (el juego usa zona 0→ZONA1, 1→ZONA2, etc.).
- **player/** — Sprites del jugador: `Vampires1_Idle_with_shadow.png`, `Vampires1_Walk_with_shadow.png`, etc. (y opcionalmente Vampires2, Vampires3).

Rutas en código: el juego carga desde `assets/` relativo a la carpeta web (es decir, `web/assets/`).
