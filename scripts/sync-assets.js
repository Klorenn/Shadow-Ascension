#!/usr/bin/env node
/**
 * Sincroniza assets desde la raíz del repo (assets/) a web/assets/
 * para que el juego web use los sprites, mapas y orbes migrados.
 *
 * Uso: node scripts/sync-assets.js   (o npm run sync-assets)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets');
const DST = path.join(ROOT, 'web', 'assets');

function mkdirp(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copy(src, dst) {
  if (!fs.existsSync(src)) {
    console.warn('No existe:', src);
    return;
  }
  mkdirp(path.dirname(dst));
  fs.copyFileSync(src, dst);
  console.log('OK', path.relative(ROOT, dst));
}

// Map: ZONA1–ZONA5, grass
const mapFiles = ['grass.png', 'ZONA1.png', 'ZONA2.png', 'ZONA3.png', 'ZONA4.png', 'ZONA5.png'];
mapFiles.forEach((name) => copy(path.join(SRC, 'map', name), path.join(DST, 'map', name)));

// Player: Vampires* _with_shadow.png (solo los que existan en assets/player)
const anims = ['Attack', 'Death', 'Hurt', 'Idle', 'Run', 'Walk'];
for (const v of [1, 2, 3]) {
  for (const anim of anims) {
    const name = `Vampires${v}_${anim}_with_shadow.png`;
    const src = path.join(SRC, 'player', name);
    if (fs.existsSync(src)) copy(src, path.join(DST, 'player', name));
  }
}

// Level-up orbs
['red-orb.png', 'green-orb.png', 'blue-orb.png'].forEach((name) =>
  copy(path.join(SRC, 'level-up', name), path.join(DST, 'level-up', name))
);

// Bringer: assets/mobs/Bringer-of-Death-SpritSheet.png → web/assets/mobs/bringer/
copy(
  path.join(SRC, 'mobs', 'Bringer-of-Death-SpritSheet.png'),
  path.join(DST, 'mobs', 'bringer', 'Bringer-of-Death-SpritSheet.png')
);

// Slime: usar Idle con sombra como sprite en juego
const slimeSrc = path.join(SRC, 'mobs', 'slime', 'PNG', 'Slime1', 'With_shadow', 'Slime1_Idle_with_shadow.png');
copy(slimeSrc, path.join(DST, 'mobs', 'slime', 'slime.png'));

// Alien: LPC spritesheets para AnimatedSprite (idle, walk, hurt/death)
const alienStandard = path.join(SRC, 'mobs', 'alien', 'standard');
if (fs.existsSync(alienStandard)) {
  ['idle.png', 'walk.png', 'hurt.png'].forEach((name) =>
    copy(path.join(alienStandard, name), path.join(DST, 'mobs', 'alien', 'standard', name))
  );
}

// Effects: copiar primera frame de cada categoría para Skill/VFX (opcional para sprites)
const effectsPng = path.join(SRC, 'effects', 'PNG');
if (fs.existsSync(effectsPng)) {
  const categories = ['Explosion', 'Circle_explosion', 'Explosion_blue_circle', 'Explosion_gas', 'Explosion_gas_circle', 'Explosion_two_colors', 'Fire', 'Lightning', 'Nuclear_explosion', 'Smoke'];
  categories.forEach((cat) => {
    const srcDir = path.join(effectsPng, cat);
    const dstDir = path.join(DST, 'effects', cat);
    if (fs.existsSync(srcDir)) {
      const first = cat === 'Fire' ? 'Fire1.png' : cat + '1.png';
      const src = path.join(srcDir, first);
      if (fs.existsSync(src)) copy(src, path.join(dstDir, first));
    }
  });
}

console.log('Sync terminado.');
