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
    return false;
  }
  mkdirp(path.dirname(dst));
  fs.copyFileSync(src, dst);
  console.log('OK', path.relative(ROOT, dst));
  return true;
}

// ────────────────────────────────────────────────────────────────
// Map: ZONA1–ZONA5, grass
// ────────────────────────────────────────────────────────────────
const mapFiles = ['grass.png', 'ZONA1.png', 'ZONA2.png', 'ZONA3.png', 'ZONA4.png', 'ZONA5.png'];
mapFiles.forEach((name) => copy(path.join(SRC, 'map', name), path.join(DST, 'map', name)));

// ────────────────────────────────────────────────────────────────
// Player: Vampires* _with_shadow.png
// Source: assets/craftpix/vampire_4dir/ (only variant 1 exists as PNGs)
// Destination: web/assets/player/
// ────────────────────────────────────────────────────────────────
const anims = ['Attack', 'Death', 'Hurt', 'Idle', 'Run', 'Walk'];
const playerSrcDirs = [
  path.join(SRC, 'player'),                        // if assets/player/ exists
  path.join(SRC, 'craftpix', 'vampire_4dir'),       // actual location in repo
];

for (const v of [1, 2, 3]) {
  for (const anim of anims) {
    const name = `Vampires${v}_${anim}_with_shadow.png`;
    let copied = false;
    for (const srcDir of playerSrcDirs) {
      const src = path.join(srcDir, name);
      if (fs.existsSync(src)) {
        copy(src, path.join(DST, 'player', name));
        copied = true;
        break;
      }
    }
    // If only variant 1 exists, copy it as variant 2 and 3 so all 3 buttons work
    if (!copied && v > 1) {
      const fallbackName = `Vampires1_${anim}_with_shadow.png`;
      for (const srcDir of playerSrcDirs) {
        const src = path.join(srcDir, fallbackName);
        if (fs.existsSync(src)) {
          copy(src, path.join(DST, 'player', name));
          break;
        }
      }
    }
  }
}

// ────────────────────────────────────────────────────────────────
// Level-up orbs
// ────────────────────────────────────────────────────────────────
['red-orb.png', 'green-orb.png', 'blue-orb.png'].forEach((name) => {
  const src = path.join(SRC, 'level-up', name);
  if (fs.existsSync(src)) {
    copy(src, path.join(DST, 'level-up', name));
  } else {
    // red-orb may not exist; create a symlink or copy green as fallback
    console.warn('Missing orb:', name, '- will use fallback in game code');
  }
});

// ────────────────────────────────────────────────────────────────
// Bringer: assets/mobs/Bringer-of-Death-SpritSheet.png
// ────────────────────────────────────────────────────────────────
copy(
  path.join(SRC, 'mobs', 'Bringer-of-Death-SpritSheet.png'),
  path.join(DST, 'mobs', 'bringer', 'Bringer-of-Death-SpritSheet.png')
);

// ────────────────────────────────────────────────────────────────
// Slime: Full animation spritesheets (Idle, Walk, Run, Attack, Hurt, Death)
// Source: assets/mobs/slime/PNG/Slime1/With_shadow/Slime1_{Anim}_with_shadow.png
// Destination: web/assets/mobs/slime/{Anim}.png
// ────────────────────────────────────────────────────────────────
const slimeAnims = ['Idle', 'Walk', 'Run', 'Attack', 'Hurt', 'Death'];
const slimeSrcBase = path.join(SRC, 'mobs', 'slime', 'PNG', 'Slime1', 'With_shadow');

for (const anim of slimeAnims) {
  const srcName = `Slime1_${anim}_with_shadow.png`;
  const src = path.join(slimeSrcBase, srcName);
  copy(src, path.join(DST, 'mobs', 'slime', anim + '.png'));
}

// Also keep the legacy slime.png (Idle) for backward compat
copy(
  path.join(slimeSrcBase, 'Slime1_Idle_with_shadow.png'),
  path.join(DST, 'mobs', 'slime', 'slime.png')
);

// ────────────────────────────────────────────────────────────────
// Alien: LPC spritesheets (idle, walk, hurt, run, slash for attack)
// ────────────────────────────────────────────────────────────────
const alienStandard = path.join(SRC, 'mobs', 'alien', 'standard');
if (fs.existsSync(alienStandard)) {
  ['idle.png', 'walk.png', 'hurt.png', 'run.png'].forEach((name) =>
    copy(path.join(alienStandard, name), path.join(DST, 'mobs', 'alien', 'standard', name))
  );
}

// Alien attack: custom slash sprite
const alienCustom = path.join(SRC, 'mobs', 'alien', 'custom');
if (fs.existsSync(alienCustom)) {
  ['slash_128.png', 'backslash_128.png', 'halfslash_128.png'].forEach((name) =>
    copy(path.join(alienCustom, name), path.join(DST, 'mobs', 'alien', 'custom', name))
  );
}

// ────────────────────────────────────────────────────────────────
// Effects: copy all frames for each category (for animated effects)
// ────────────────────────────────────────────────────────────────
const effectCategories = [
  'Circle_explosion', 'Explosion', 'Explosion_blue_circle', 'Explosion_blue_oval',
  'Explosion_gas', 'Explosion_gas_circle', 'Explosion_two_colors',
  'Fire', 'Lightning', 'Nuclear_explosion', 'Smoke'
];

effectCategories.forEach((cat) => {
  const srcDir = path.join(SRC, 'effects', cat);
  const dstDir = path.join(DST, 'effects', cat);
  if (fs.existsSync(srcDir)) {
    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.png'));
    files.forEach(f => copy(path.join(srcDir, f), path.join(dstDir, f)));
  }
});

console.log('\nSync terminado.');
