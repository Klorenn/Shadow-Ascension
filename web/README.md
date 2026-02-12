# The Purge — Web

Versión navegador del juego (Vampire Survivors style) con Three.js.

## Dependencias

- **Runtime:** Three.js se sirve en local desde `web/lib/three/three.module.js`. Tras `npm install`, el script `postinstall` copia `node_modules/three/build/three.module.js` a esa ruta. El juego usa ese build vía import map en `index.html`.
- **Opcional — tu build de three.js-master:** Si quieres usar tu copia de [three.js-master](https://github.com/mrdoob/three.js) (p. ej. de `Downloads/three.js-master`), sustituye el contenido de `web/lib/three/` por el de la carpeta `build/` de ese repo (al menos `three.module.js`).
- **Desarrollo:** Servidor estático con `npx serve . -p 3000`. Ejecutar `npm install` una vez para instalar `three` y rellenar `web/lib/three/`.

## Cómo ejecutar

Desde la raíz del proyecto: `npm start`. Abre `http://localhost:3000/web/`.

## Sistema de mejoras (upgrades)

Código fuente en **`web/ts/upgrade-system/`** (TypeScript). Compilar con `npm run build:upgrades`; salida en **`web/js/upgrade/`**. Incluye: PlayerStats, UpgradeManager (raridad ponderada), VFXSystem (aura, trail, clone, pantalla, distorsión) y 12 mejoras (Crimson Fury, Void Helmet, Eclipse Dagger, etc.). Ver `web/ts/upgrade-system/README.md` para integrar en el game loop.

## Estructura de assets

Ver `web/assets/README.md`. Resumen: **mobs/** (enemigos), **level-up/** (orbes), **map/** (zonas, grass), **player/** (variantes vampiro). Añade ahí nuevos sprites o zonas.

## Variantes del vampiro (beta)

En el menú se puede elegir Vampire 1, 2 o 3 antes de pulsar Jugar. Los assets están en `web/assets/player/` (Vampires1/2/3_*_with_shadow.png).
