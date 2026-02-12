/**
 * The Purge — Web (Three.js)
 *
 * Dependencias de runtime:
 * - Three.js: cargado vía import map en index.html (unpkg.com/three@0.160.0).
 *   Si se pasa a build con npm, instalar "three" y apuntar el import al paquete local.
 * - Servidor de desarrollo: "npx serve . -p 3000" (package.json). Sin deps extra.
 */

import * as THREE from 'three';
import { EffectManager, AutoAttack, XPOrbPool, rollOrbTier, scaleOrbXP, ORB_TIER_CONFIG, getRandomUpgrades, applyUpgrade, xpToNextLevel as xpToNextLevelFormula, DifficultyManager } from './gameplay/index.js';
import { SKILL_IDS, createSkillEffect } from './effects/index.js';
import { Player } from './entities/index.js';
import { MeleeWeapon, ProjectileWeapon } from './weapons/index.js';
import { XPSystem, XP, EnemyManager, SpawnSystem, EnemyAISystem, WeaponManager, PLAYER } from './systems/index.js';
import { AlienAnimationSystem } from './systems/AlienAnimationSystem.js';
import { SlimeAnimationSystem } from './systems/SlimeAnimationSystem.js';
import { getEnemyType } from './data/index.js';
import {
  generatePlayerIdle, generatePlayerWalk,
  generateSlimeIdle, generateSlimeWalk, generateSlimeRun,
  generateSlimeAttack, generateSlimeHurt, generateSlimeDeath,
  generateAlienIdle, generateAlienWalk, generateAlienHurt, generateAlienAttack,
  generateBossSheet,
  generateRedOrb, generateGreenOrb, generateBlueOrb,
  generateGrass, generateZone,
} from './ProceduralSprites.js';

// --- Constants
const PLAYER_SPEED = 0.35;
const PLAYER_SPEED_BUFF = 0.5;
const ENEMY_SPEED = 0.12;
const ENEMY_ATTACK_RANGE = 1.2;
const SPAWN_DISTANCE = 25;
const SPAWN_INTERVAL_MS = 2000;
const ORB_PICKUP_RANGE = 2.5;
const WEAPON_RANGE = 3;
const WEAPON_COOLDOWN_MS = 600;
// Plano del suelo: 320x320 unidades (centrado 0,0). Sin límites artificiales; colisión por imagen.
const GROUND_SIZE = 320;
// Ruta base de assets: when served from /web/ use relative "assets",
// otherwise (root /) use "web/assets".
function getAssetBase() {
  const path = window.location.pathname;
  if (path.indexOf('/web/') >= 0 || path.endsWith('/web')) return 'assets';
  return 'web/assets';
}
const ASSET_BASE = getAssetBase();

function assetUrl(p) {
  return ASSET_BASE + '/' + p.replace(/^\//, '');
}
// Zonas: índice 0..4 → ZONA1.png .. ZONA5.png (assets/map migrados)
function zoneImageUrl(zoneIndex) {
  const n = Math.max(1, Math.min(5, zoneIndex + 1));
  return assetUrl('map/ZONA' + n + '.png');
}

// --- State
let scene, camera, renderer;
let playerMesh, playerPos, playerVel;
let groundPlane = null;
let currentZoneIndex = -1;
let textures = {};
let health = 3, maxHealth = 3, energy = 0, power = 0, level = 1;
let currentXP = 0;
let xpToNextLevel = 20;
let xpBarDisplay = 0;
let absorbEffectTime = 0;
let levelUpFlashTime = 0;
let totalKills = 0;
let speedBuffUntil = 0;
let elapsedTime = 0;
let gameOver = false;
let levelUpPaused = false;
let chosenUpgradeIds = new Set();
let playerStats = { damageUpgrade: 1, attackSpeedUpgrade: 0, radiusUpgrade: 0, moveSpeedUpgrade: 0 };
let magnetFullScreenUntil = 0;
let levelUpSlowMotionUntil = 0;
let rareDropShakeUntil = 0;
let rareDropFlashUntil = 0;
let playerHitCooldownUntil = 0;  // timestamp (seconds) until player can be hit again
let playerHitShakeUntil = 0;     // screen shake timer on player hit
let playerKnockbackVel = { x: 0, y: 0 };  // knockback velocity applied to player
let currentRound = 1;
let roundTimer = 0;  // seconds elapsed in current round
const ROUND_DURATION = 60;  // seconds per round
const CONTACT_RADIUS = 3.5; // distance at which enemies deal contact damage
let enemies = [];
let orbs = [];
let keys = {};
let lastWeaponTime = 0;
let lastSpawnTime = 0;
let playerAnimTime = 0;
let playerDirRow = 1;
let effectManager, autoAttack, xpOrbPool, difficultyManager;
let alienAnimationSystem, slimeAnimationSystem;
let playerEntity, weaponManager, xpSystem;
let enemyManager, spawnSystem, enemyAISystem;
let _enemyGeos, _enemyMats;

// Sprites 64x64: Idle 256x256 = 4 frames x 4 filas. Walk 384x256 = 6 frames x 4 filas.
// En el PNG: fila 0 = abajo(front), fila 1 = arriba(back), fila 2 = izq, fila 3 = der
const DIR_TO_SHEET_ROW = [1, 0, 2, 3]; // [arriba, abajo, izq, der] -> índice fila en el sprite
const PLAYER_IDLE_FRAMES = 4;
const PLAYER_IDLE_ROWS = 4;
const PLAYER_WALK_FRAMES = 6;
const PLAYER_WALK_ROWS = 4;
const PLAYER_ANIM_FPS = 10;
const PLAYER_SIZE = 12; // personaje más grande (antes 6)

function pixelFilter(t) {
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  if (t.encoding !== undefined) t.encoding = THREE.sRGBEncoding;
  else if (t.colorSpace !== undefined) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Create a Three.js texture from an HTMLCanvasElement, applying pixel-art filter. */
function canvasTex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  pixelFilter(t);
  return t;
}

/**
 * Try loading a file texture; on failure, use a procedural canvas fallback.
 * @param {THREE.TextureLoader} loader
 * @param {string} path - url to try loading
 * @param {Function} fallbackFn - () => HTMLCanvasElement
 * @param {Function} [postProcess] - optional transform applied after pixelFilter
 */
function loadOrFallback(loader, path, fallbackFn, postProcess) {
  return loader.loadAsync(path)
    .then(pixelFilter)
    .then(t => postProcess ? postProcess(t) : t)
    .catch(() => {
      const c = fallbackFn();
      const t = canvasTex(c);
      return postProcess ? postProcess(t) : t;
    });
}

// Spritesheet con 4 direcciones: numFrames columnas, numRows filas (64px cada celda)
function playerSpriteSheetUV(t, numFrames, numRows) {
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.repeat.set(1 / numFrames, 1 / numRows);
  t.offset.set(0, 0);
  t.userData.numFrames = numFrames;
  t.userData.numRows = numRows;
  return t;
}

// Primer frame de un spritesheet 64x64 (usa toda la primera celda)
function singleFrameUV64(t) {
  const w = (t.image && t.image.width) ? t.image.width : 64;
  const h = (t.image && t.image.height) ? t.image.height : 64;
  const cols = Math.max(1, Math.floor(w / 64));
  const rows = Math.max(1, Math.floor(h / 64));
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.repeat.set(1 / cols, 1 / rows);
  // Fila superior del spritesheet (recordando que Three usa origen abajo-izquierda)
  t.offset.set(0, 1 - 1 / rows);
  t.userData.sheetCols = cols;
  t.userData.sheetRows = rows;
  t.userData.frameWidth = 64;
  t.userData.frameHeight = 64;
  t.userData.numFrames = cols;
  t.userData.numRows = rows;
  return t;
}

function loadTextures(variant = 1) {
  const loader = new THREE.TextureLoader();
  const v = Math.max(1, Math.min(3, variant));
  const idlePath = `${ASSET_BASE}/player/Vampires${v}_Idle_with_shadow.png`;
  const walkPath = `${ASSET_BASE}/player/Vampires${v}_Walk_with_shadow.png`;

  const playerIdleP = loadOrFallback(loader, idlePath, generatePlayerIdle,
    t => playerSpriteSheetUV(t, PLAYER_IDLE_FRAMES, PLAYER_IDLE_ROWS));
  const playerWalkP = loadOrFallback(loader, walkPath, generatePlayerWalk,
    t => playerSpriteSheetUV(t, PLAYER_WALK_FRAMES, PLAYER_WALK_ROWS));

  const bossP = loadOrFallback(loader,
    `${ASSET_BASE}/mobs/bringer/Bringer-of-Death-SpritSheet.png`,
    generateBossSheet);

  const slimeIdleP = loadOrFallback(loader, `${ASSET_BASE}/mobs/slime/Idle.png`, generateSlimeIdle, singleFrameUV64);
  const slimeWalkP = loadOrFallback(loader, `${ASSET_BASE}/mobs/slime/Walk.png`, generateSlimeWalk, singleFrameUV64);
  const slimeRunP = loadOrFallback(loader, `${ASSET_BASE}/mobs/slime/Run.png`, generateSlimeRun, singleFrameUV64);
  const slimeAttackP = loadOrFallback(loader, `${ASSET_BASE}/mobs/slime/Attack.png`, generateSlimeAttack, singleFrameUV64);
  const slimeHurtP = loadOrFallback(loader, `${ASSET_BASE}/mobs/slime/Hurt.png`, generateSlimeHurt, singleFrameUV64);
  const slimeDeathP = loadOrFallback(loader, `${ASSET_BASE}/mobs/slime/Death.png`, generateSlimeDeath, singleFrameUV64);

  const alienIdleP = loadOrFallback(loader, `${ASSET_BASE}/mobs/alien/standard/idle.png`, generateAlienIdle, singleFrameUV64);
  const alienWalkP = loadOrFallback(loader, `${ASSET_BASE}/mobs/alien/standard/walk.png`, generateAlienWalk, singleFrameUV64);
  const alienHurtP = loadOrFallback(loader, `${ASSET_BASE}/mobs/alien/standard/hurt.png`, generateAlienHurt, singleFrameUV64);
  const alienAttackP = loadOrFallback(loader, `${ASSET_BASE}/mobs/alien/custom/slash_128.png`, generateAlienAttack, singleFrameUV64);

  const redOrbP = loadOrFallback(loader, `${ASSET_BASE}/level-up/red-orb.png`, generateRedOrb);
  const greenOrbP = loadOrFallback(loader, `${ASSET_BASE}/level-up/green-orb.png`, generateGreenOrb);
  const blueOrbP = loadOrFallback(loader, `${ASSET_BASE}/level-up/blue-orb.png`, generateBlueOrb);

  const grassP = loadOrFallback(loader, assetUrl('map/grass.png'), generateGrass);

  const zoneLoads = [0, 1, 2, 3, 4].map(i =>
    loadOrFallback(loader, zoneImageUrl(i), () => generateZone(i))
  );

  return Promise.all([
    playerIdleP, playerWalkP, bossP,
    slimeIdleP, slimeWalkP, slimeRunP, slimeAttackP, slimeHurtP, slimeDeathP,
    redOrbP, greenOrbP, blueOrbP, grassP,
    alienIdleP, alienWalkP, alienHurtP, alienAttackP,
    ...zoneLoads
  ]).then(results => {
    const [playerIdle, playerWalk, enemy,
      slimeIdleTex, slimeWalkTex, slimeRunTex, slimeAttackTex, slimeHurtTex, slimeDeathTex,
      redOrb, greenOrb, blueOrb, grass,
      alienIdleTex, alienWalkTex, alienHurtTex, alienAttackTex,
      ...zones] = results;
    return {
      playerIdle, playerWalk, enemy,
      slime: slimeIdleTex,
      slimeIdle: slimeIdleTex,
      slimeWalk: slimeWalkTex,
      slimeRun: slimeRunTex,
      slimeAttack: slimeAttackTex,
      slimeHurt: slimeHurtTex,
      slimeDeath: slimeDeathTex,
      redOrb, greenOrb, blueOrb, grass, zones,
      alienIdle: alienIdleTex,
      alienWalk: alienWalkTex,
      alienHurt: alienHurtTex,
      alienAttack: alienAttackTex,
    };
  });
}

// Repeticiones del fondo: menos = imagen más grande (zoom), tarda más en recorrer cada tile
const GROUND_REPEAT = 2;

// Zonas por nivel: 0-19 -> zona 0, 20-49 -> 1, 50-59 -> 2, 60-84 -> 3, 85+ -> 4
function getZoneIndex(level) {
  if (level < 20) return 0;
  if (level < 50) return 1;
  if (level < 60) return 2;
  if (level < 85) return 3;
  return 4;
}

function formatTime(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function initThree() {
  const container = document.getElementById('canvas-container');
  const width = container.clientWidth;
  const height = container.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const aspect = width / height;
  const frustum = 40;
  camera = new THREE.OrthographicCamera(
    -frustum * aspect, frustum * aspect,
    frustum, -frustum,
    0.1, 1000
  );
  camera.position.set(0, 0, 50);
  camera.lookAt(0, 0, 0);
  camera.up.set(0, 1, 0);

  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if (renderer.outputEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
  else if (renderer.outputColorSpace !== undefined) renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  playerPos = new THREE.Vector2(0, 0);
  playerVel = new THREE.Vector2(0, 0);

  // Fondos: tus PNG por zona; si zone0 no cargó, usar grass; si no hay ninguno, color sólido
  const zoneTex = (textures.zones && textures.zones[0]) ? textures.zones[0] : null;
  const groundTex = zoneTex || textures.grass || null;
  const groundMat = new THREE.MeshBasicMaterial({
    map: groundTex,
    color: 0xffffff,
    transparent: false,
    side: THREE.DoubleSide
  });
  const maxAniso = (renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === 'function')
    ? renderer.capabilities.getMaxAnisotropy() : 1;
  if (groundMat.map) {
    groundMat.map.wrapS = groundMat.map.wrapT = THREE.RepeatWrapping;
    groundMat.map.repeat.set(GROUND_REPEAT, GROUND_REPEAT);
    groundMat.map.offset.set(0, 0);
    groundMat.map.anisotropy = maxAniso;
    if (groundMat.map.encoding !== undefined) groundMat.map.encoding = THREE.sRGBEncoding;
    else if (groundMat.map.colorSpace !== undefined) groundMat.map.colorSpace = THREE.SRGBColorSpace;
  } else {
    groundMat.color = new THREE.Color(0x252538);
  }
  groundPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
    groundMat
  );
  // Plano en XY (sin rotar) para que la cámara en +Z lo vea de frente; detrás del jugador (z = -1)
  groundPlane.position.set(0, 0, -1);
  groundPlane.name = 'ground';
  scene.add(groundPlane);
  currentZoneIndex = 0;

  // Player: vampire sprite 4 direcciones, tamaño mayor
  const playerMat = new THREE.MeshBasicMaterial({
    map: textures.playerIdle,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true
  });
  playerMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PLAYER_SIZE, PLAYER_SIZE),
    playerMat
  );
  playerMesh.userData.walkTex = textures.playerWalk;
  playerMesh.userData.idleTex = textures.playerIdle;
  scene.add(playerMesh);

  window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    const a = w / h;
    camera.left = -frustum * a;
    camera.right = frustum * a;
    camera.top = frustum;
    camera.bottom = -frustum;
    camera.updateProjectionMatrix();
  });

  window.addEventListener('keydown', e => { keys[e.code] = true; });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
}

function createMeshForEnemyType(typeId) {
  if (!_enemyGeos) {
    _enemyGeos = {
      slime: new THREE.PlaneGeometry(getEnemyType('slime').scale, getEnemyType('slime').scale),
      alien: new THREE.PlaneGeometry(getEnemyType('alien').scale, getEnemyType('alien').scale),
    };
  }
  // Each enemy gets its OWN material with its OWN texture clone so that
  // the animation system can independently set offset/repeat per sprite.
  const baseTex =
    typeId === 'alien'
      ? textures.alienIdle
      : (textures.slimeIdle || textures.slime);
  if (!baseTex) return null;

  const tex = baseTex.clone();
  tex.needsUpdate = true;
  // Carry over userData (numFrames, numRows, frameWidth, etc.) for SpriteAnimator
  tex.userData = { ...(baseTex.userData || {}) };

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true,
  });

  const config = getEnemyType(typeId);
  const geo = _enemyGeos[typeId] || _enemyGeos.slime;
  return new THREE.Mesh(geo, mat);
}

const MAGNET_BASE_RADIUS = 6;
const MAGNET_FULLSCREEN_RADIUS = 35;

function spawnXpOrbAt(x, y, difficultyRaw, xpMult) {
  const tier = rollOrbTier();
  const config = ORB_TIER_CONFIG[tier];
  const value = scaleOrbXP(config.baseXP, difficultyRaw, xpMult);
  const orb = xpOrbPool.spawn(x, y, value, tier);
  if (orb && orb.isRare) {
    rareDropShakeUntil = 0.12;
    rareDropFlashUntil = 0.15;
  }
  return orb;
}

function dropOrbs(x, y) {
  const orbTex = { health: textures.redOrb, power: textures.greenOrb, energy: textures.blueOrb };
  if (Math.random() < 0.2) {
    orbs.push({ type: 'health', pos: new THREE.Vector2(x, y), mesh: createOrbSprite(orbTex.health) });
  }
  for (let i = 0; i < 8; i++) {
    const ox = x + (Math.random() - 0.5) * 2;
    const oy = y + (Math.random() - 0.5) * 2;
    orbs.push({ type: 'power', pos: new THREE.Vector2(ox, oy), mesh: createOrbSprite(orbTex.power) });
  }
  for (let i = 0; i < 2; i++) {
    const ox = x + (Math.random() - 0.5) * 2;
    const oy = y + (Math.random() - 0.5) * 2;
    orbs.push({ type: 'energy', pos: new THREE.Vector2(ox, oy), mesh: createOrbSprite(orbTex.energy) });
  }
}

function checkPlayerEnemyCollisions(dt) {
  if (gameOver) return;
  const now = performance.now() * 0.001;
  if (now < playerHitCooldownUntil) {
    // Apply knockback decay during invulnerability
    playerKnockbackVel.x *= 0.88;
    playerKnockbackVel.y *= 0.88;
    if (Math.abs(playerKnockbackVel.x) < 0.01) playerKnockbackVel.x = 0;
    if (Math.abs(playerKnockbackVel.y) < 0.01) playerKnockbackVel.y = 0;
    playerPos.x += playerKnockbackVel.x * 60 * dt;
    playerPos.y += playerKnockbackVel.y * 60 * dt;
    // Flash red during invulnerability (blink effect)
    const blinkOn = Math.floor(now * 10) % 2 === 0;
    if (playerMesh && playerMesh.material) {
      playerMesh.material.opacity = blinkOn ? 0.4 : 1.0;
    }
    return;
  }
  // Reset opacity after invulnerability ends
  if (playerMesh && playerMesh.material && playerMesh.material.opacity < 1.0) {
    playerMesh.material.opacity = 1.0;
    if (playerMesh.material.color) playerMesh.material.color.setHex(0xffffff);
  }

  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.pos.x - playerPos.x;
    const dy = e.pos.y - playerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < CONTACT_RADIUS) {
      // Determine contact damage based on enemy type
      let contactDmg = e.damage || 5;
      if (e.isBoss) contactDmg = 30;
      else if (e.type === 'alien') contactDmg = 10;
      else if (e.type === 'slime') contactDmg = 5;

      // Apply damage to player
      if (playerEntity) {
        playerEntity.takeDamage(contactDmg);
        health = playerEntity.hp;
        maxHealth = playerEntity.maxHp;
      } else {
        health = Math.max(0, health - contactDmg);
      }

      // Set invulnerability window
      playerHitCooldownUntil = now + (PLAYER.HIT_INVULNERABILITY_MS / 1000);

      // Knockback: push player away from enemy
      const kbStr = PLAYER.KNOCKBACK_STRENGTH;
      const nLen = dist > 0.01 ? dist : 1;
      playerKnockbackVel.x = (-dx / nLen) * kbStr;
      playerKnockbackVel.y = (-dy / nLen) * kbStr;

      // Screen shake on hit
      playerHitShakeUntil = 0.25;

      // Red flash on player mesh
      if (playerMesh && playerMesh.material && playerMesh.material.color) {
        playerMesh.material.color.setHex(0xff3333);
      }

      // Check for death
      if (health <= 0) {
        endGame();
        return;
      }
      break; // Only one hit per frame
    }
  }
}

function createOrbSprite(tex) {
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true
  });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.9),
    mat
  );
  mesh.position.set(0, 0, 0);
  scene.add(mesh);
  return mesh;
}

function hitEnemiesInRange() {
  const now = performance.now() * 0.001;
  if (now - lastWeaponTime < WEAPON_COOLDOWN_MS / 1000) return;
  lastWeaponTime = now;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.dead) continue;
    const dx = e.pos.x - playerPos.x;
    const dy = e.pos.y - playerPos.y;
    if (dx * dx + dy * dy <= WEAPON_RANGE * WEAPON_RANGE) {
      if (e.takeDamage) {
        e.takeDamage(1);
        break;
      }
      e.dead = true;
      scene.remove(e.mesh);
      e.mesh.geometry.dispose();
      e.mesh.material.dispose();
      dropOrbs(e.pos.x, e.pos.y);
      enemies.splice(i, 1);
      break;
    }
  }
}

function updatePlayer(dt) {
  let vx = 0, vy = 0;
  if (keys['KeyW']) vy += 1;
  if (keys['KeyS']) vy -= 1;
  if (keys['KeyA']) vx -= 1;
  if (keys['KeyD']) vx += 1;

  if (vx !== 0 || vy !== 0) {
    const len = Math.sqrt(vx * vx + vy * vy);
    vx /= len;
    vy /= len;
    const baseSpeed = (performance.now() * 0.001 < speedBuffUntil) ? PLAYER_SPEED_BUFF : PLAYER_SPEED;
    const speedMult = 1 + (playerStats.moveSpeedUpgrade ?? 0);
    playerVel.set(vx * baseSpeed * speedMult, vy * baseSpeed * speedMult);
    hitEnemiesInRange();
    // Dirección para la animación: 0=arriba, 1=abajo, 2=izq, 3=der (por ángulo de movimiento)
    const angle = Math.atan2(vy, vx);
    if (angle >= -Math.PI / 4 && angle < Math.PI / 4) playerDirRow = 3;      // derecha
    else if (angle >= Math.PI / 4 && angle < 3 * Math.PI / 4) playerDirRow = 0;  // arriba
    else if (angle >= -3 * Math.PI / 4 && angle < -Math.PI / 4) playerDirRow = 1; // abajo
    else playerDirRow = 2;  // izquierda
    // Walk texture + animación de caminar
    if (playerMesh.material.map !== playerMesh.userData.walkTex) {
      playerMesh.material.map = playerMesh.userData.walkTex;
    }
    // Izquierda y derecha tienen su propia fila en el sprite; no voltear (scale siempre 1)
    playerMesh.scale.x = 1;
  } else {
    playerVel.set(0, 0);
    // Idle cuando parado (mantener última dirección)
    if (playerMesh.material.map !== playerMesh.userData.idleTex) {
      playerMesh.material.map = playerMesh.userData.idleTex;
    }
    playerMesh.scale.x = 1;
  }

  // Avanzar animación: frame según tiempo, fila según dirección (arriba/abajo/izq/der)
  playerAnimTime += dt;
  const map = playerMesh.material.map;
  if (map && map.offset) {
    const numFrames = map.userData.numFrames || PLAYER_IDLE_FRAMES;
    const numRows = map.userData.numRows || PLAYER_IDLE_ROWS;
    const frameIndex = Math.floor(playerAnimTime * PLAYER_ANIM_FPS) % numFrames;
    // Mapear dirección lógica (0=arriba, 1=abajo, 2=izq, 3=der) a fila en el PNG
    const rowIndex = DIR_TO_SHEET_ROW[Math.min(playerDirRow, 3)];
    // Three.js: (0,0) abajo-izq; fila 0 del PNG está arriba -> v alto. offset.y para mostrar esa fila:
    map.offset.x = frameIndex / numFrames;
    map.offset.y = 1 - (rowIndex + 1) / numRows;
  }

  if (keys['Space'] && energy >= 10) {
    energy -= 10;
    speedBuffUntil = performance.now() * 0.001 + 5;
  }

  playerPos.x += playerVel.x * 60 * dt;
  playerPos.y += playerVel.y * 60 * dt;
  playerMesh.position.set(playerPos.x, playerPos.y, 0);
}

function updateEnemies(dt) {
  if (!enemyManager || !enemyAISystem) return;
  for (const e of enemies) e.update(dt);
  // Scale aggression based on enemy count relative to round cap
  const maxForRound = Math.min(200, 10 + (currentRound - 1) * 8);
  enemyAISystem.setAggressionFromCount(enemies.length, maxForRound);
  enemyAISystem.update(dt, enemies);
}

function updateOrbs(dt) {
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    const dx = playerPos.x - o.pos.x;
    const dy = playerPos.y - o.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < ORB_PICKUP_RANGE) {
      if (o.type === 'health') {
        if (playerEntity) playerEntity.hp = Math.min(playerEntity.maxHp, playerEntity.hp + 1);
        health = playerEntity ? playerEntity.hp : Math.min(3, health + 1);
      }
      if (o.type === 'power') {
        power++;
        if (power >= 100) { level++; power -= 100; }
      }
      if (o.type === 'energy') energy = Math.min(10, energy + 1);
      scene.remove(o.mesh);
      o.mesh.geometry.dispose();
      o.mesh.material.dispose();
      orbs.splice(i, 1);
      continue;
    }
    o.mesh.position.set(o.pos.x, o.pos.y, 0);
  }
}

function updateSpawn(now) {
  if (!spawnSystem || !difficultyManager) return;
  const elapsedMinutes = elapsedTime / 60;
  spawnSystem.setRound(currentRound);
  spawnSystem.setSpawnIntervalMultiplier(elapsedMinutes);
  spawnSystem.update(now, elapsedMinutes);
}

function updateHUD() {
  if (playerEntity) {
    health = playerEntity.hp;
    maxHealth = playerEntity.maxHp;
    level = playerEntity.level;
    currentXP = playerEntity.xp;
    xpToNextLevel = playerEntity.xpToNextLevel;
  }
  const hpFill = document.getElementById('hud-hp-fill');
  const xpFill = document.getElementById('hud-xp-fill');
  const levelEl = document.getElementById('hud-level');
  const timeEl = document.getElementById('hud-time');
  const diffEl = document.getElementById('hud-difficulty');
  const eventEl = document.getElementById('hud-event');
  if (hpFill) hpFill.style.width = Math.max(0, (health / maxHealth) * 100) + '%';
  const xpTarget = xpToNextLevel > 0 ? currentXP / xpToNextLevel : 0;
  const xpLerp = 8 * (typeof gameLoop !== 'undefined' && gameLoop.lastDt !== undefined ? gameLoop.lastDt : 1/60);
  xpBarDisplay = xpBarDisplay + (xpTarget - xpBarDisplay) * Math.min(1, xpLerp);
  if (xpFill) xpFill.style.width = Math.max(0, Math.min(100, xpBarDisplay * 100)) + '%';
  const xpBarWrap = document.getElementById('hud-xp-bar');
  if (xpBarWrap) {
    if (levelUpFlashTime > 0) xpBarWrap.classList.add('xp-level-up-flash');
    else xpBarWrap.classList.remove('xp-level-up-flash');
  }
  // HP numbers
  const hpTextEl = document.getElementById('hud-hp-text');
  if (hpTextEl) hpTextEl.textContent = Math.ceil(health) + '/' + Math.ceil(maxHealth);

  // Round display
  const roundEl = document.getElementById('hud-round');
  if (roundEl) roundEl.textContent = 'Round ' + currentRound;

  // Enemies alive
  const enemiesEl = document.getElementById('hud-enemies');
  if (enemiesEl) enemiesEl.textContent = 'Enemies: ' + enemies.filter(e => !e.dead).length;

  if (levelEl) levelEl.textContent = 'Level ' + level;
  if (timeEl) timeEl.textContent = formatTime(elapsedTime);
  if (diffEl && difficultyManager) diffEl.textContent = 'Difficulty ' + difficultyManager.getDifficultyLevel();
  if (eventEl && difficultyManager) {
    const ev = difficultyManager.getActiveEvent();
    eventEl.textContent = ev ? 'Event: ' + ev.name.replace('_', ' ') : '';
  }
  updateWeaponIcons();
  updateBossHealthBar();
}

function updateBossHealthBar() {
  const bar = document.getElementById('boss-health-bar');
  const fill = document.getElementById('boss-hp-fill');
  if (!bar || !fill) return;
  const boss = enemies.find(e => e.isBoss && !e.dead);
  if (boss) {
    bar.style.display = 'block';
    const ratio = boss.getLifeBarRatio ? boss.getLifeBarRatio() : (boss.maxHp > 0 ? boss.hp / boss.maxHp : 0);
    fill.style.width = Math.max(0, Math.min(100, ratio * 100)) + '%';
  } else {
    bar.style.display = 'none';
  }
}

function updateWeaponIcons() {
  const container = document.getElementById('weapon-icons');
  if (!container || !weaponManager) return;
  const weapons = weaponManager.getWeapons();
  while (container.children.length < weapons.length) {
    const box = document.createElement('div');
    box.className = 'weapon-icon';
    box.innerHTML = '<span class="weapon-name"></span><div class="weapon-cooldown"><div class="weapon-cooldown-fill"></div></div>';
    container.appendChild(box);
  }
  while (container.children.length > weapons.length) container.removeChild(container.lastChild);
  const attackSpeedMult = playerEntity ? playerEntity.attackSpeedMultiplier : 1;
  weapons.forEach((w, i) => {
    const box = container.children[i];
    if (!box) return;
    const nameEl = box.querySelector('.weapon-name');
    const fillEl = box.querySelector('.weapon-cooldown-fill');
    if (nameEl) nameEl.textContent = w.name || 'W';
    const effectiveCd = w.getEffectiveCooldown ? w.getEffectiveCooldown(attackSpeedMult) : w.cooldown;
    const pct = effectiveCd > 0 ? Math.max(0, 1 - w.timer / effectiveCd) : 1;
    if (fillEl) fillEl.style.height = (pct * 100) + '%';
  });
}

function updateUI() {
  updateHUD();
  document.getElementById('health').textContent = 'HP: ' + Math.ceil(health) + '/' + Math.ceil(maxHealth);
  document.getElementById('energy').textContent = 'Energy: ' + energy + '/10';
  document.getElementById('power').textContent = 'Power: ' + power + '/100';
  document.getElementById('level').textContent = 'Level: ' + level;
  document.getElementById('time').textContent = 'Time: ' + formatTime(elapsedTime);

  const zoneIndex = getZoneIndex(level);
  if (groundPlane && zoneIndex !== currentZoneIndex && textures.zones && textures.zones[zoneIndex]) {
    currentZoneIndex = zoneIndex;
    groundPlane.material.map = textures.zones[zoneIndex];
    groundPlane.material.map.wrapS = groundPlane.material.map.wrapT = THREE.RepeatWrapping;
    groundPlane.material.map.repeat.set(GROUND_REPEAT, GROUND_REPEAT);
    const maxAniso = (renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === 'function')
      ? renderer.capabilities.getMaxAnisotropy() : 1;
    groundPlane.material.map.anisotropy = maxAniso;
    if (groundPlane.material.map.encoding !== undefined) groundPlane.material.map.encoding = THREE.sRGBEncoding;
    else if (groundPlane.material.map.colorSpace !== undefined) groundPlane.material.map.colorSpace = THREE.SRGBColorSpace;
    groundPlane.material.color.setHex(0xffffff);
  }
}

function showLevelUpChoices() {
  levelUpPaused = true;
  const overlay = document.getElementById('level-up-overlay');
  const container = document.getElementById('upgrade-cards');
  if (!overlay || !container) return;
  const choices = getRandomUpgrades(3, chosenUpgradeIds);
  container.innerHTML = '';
  choices.forEach(upgrade => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'upgrade-card' + (upgrade.id && upgrade.id.includes('cursed') ? ' cursed' : '');
    card.textContent = upgrade.name;
    card.addEventListener('click', () => {
      applyUpgrade(upgrade, playerStats);
      chosenUpgradeIds.add(upgrade.id);
      if (upgrade.magnetFullScreen != null) magnetFullScreenUntil = elapsedTime + (upgrade.magnetFullScreen || 5);
      level++;
      currentXP -= xpToNextLevel;
      if (currentXP < 0) currentXP = 0;
      if (playerEntity) {
        playerEntity.level = level;
        playerEntity.xp = currentXP;
        playerEntity.xpToNextLevel = Math.floor(XP.BASE_XP * playerEntity.level * XP.XP_SCALE);
      }
      xpToNextLevel = playerEntity ? playerEntity.xpToNextLevel : xpToNextLevelFormula(level);
      xpBarDisplay = xpToNextLevel > 0 ? currentXP / xpToNextLevel : 0;
      levelUpFlashTime = 0.5;
      levelUpSlowMotionUntil = 0.3;
      overlay.classList.remove('show');
      levelUpPaused = false;
      if (playerEntity) {
        playerEntity.damageMultiplier = playerStats.damageUpgrade ?? 1;
        playerEntity.attackSpeedMultiplier = 1 + (playerStats.attackSpeedUpgrade ?? 0);
      }
      if (autoAttack) {
        autoAttack.setDamageUpgrade(playerStats.damageUpgrade ?? 1);
        autoAttack.setAttackSpeedMult(1 + (playerStats.attackSpeedUpgrade ?? 0));
        autoAttack.setRadiusUpgrade(1 + (playerStats.radiusUpgrade ?? 0));
      }
    });
    container.appendChild(card);
  });
  overlay.classList.add('show');
}

function endGame() {
  gameOver = true;
  // Reset player visual state
  if (playerMesh && playerMesh.material) {
    playerMesh.material.opacity = 1.0;
    if (playerMesh.material.color) playerMesh.material.color.setHex(0xffffff);
  }
  const ft = document.getElementById('final-time');
  const tk = document.getElementById('total-kills');
  const fr = document.getElementById('final-round');
  if (ft) ft.textContent = 'You Survived: ' + formatTime(elapsedTime);
  if (tk) tk.textContent = 'Total Kills: ' + totalKills;
  if (fr) fr.textContent = 'Reached Round: ' + currentRound;
  document.getElementById('gameover').style.display = 'flex';
  const cursorEl = document.getElementById('cursor-trail');
  if (cursorEl) cursorEl.style.display = 'block';
  document.body.classList.add('menu-open');
}

function gameLoop(time = 0) {
  if (gameOver) return;
  const prev = gameLoop.last ?? time;
  const rawDt = Math.min(0.05, (time - prev) / 1000) || 1/60;
  const timeScale = levelUpSlowMotionUntil > 0 ? 0.25 : 1;
  const dt = rawDt * timeScale;
  gameLoop.last = time;

  elapsedTime += rawDt;

  if (levelUpPaused) {
    updateUI();
    camera.position.set(playerPos.x, playerPos.y, 50);
    camera.lookAt(playerPos.x, playerPos.y, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(gameLoop);
    return;
  }

  if (difficultyManager) {
    difficultyManager.setRound(currentRound);
    difficultyManager.update(dt, elapsedTime, level, totalKills);
  }
  updatePlayer(dt);
  if (enemyManager) enemies = enemyManager.getActive();
  updateEnemies(dt);
  checkPlayerEnemyCollisions(dt);
  updateOrbs(dt);
  // Update round timer
  roundTimer += rawDt;
  if (roundTimer >= ROUND_DURATION) {
    roundTimer -= ROUND_DURATION;
    currentRound++;
  }
  const liveEnemies = enemies.filter(e => !e.dead);
  if (playerEntity) {
    playerEntity.x = playerPos.x;
    playerEntity.y = playerPos.y;
    playerEntity.position = { x: playerPos.x, y: playerPos.y };
    if (weaponManager) weaponManager.update(dt, playerEntity, liveEnemies);
  }
  if (autoAttack) autoAttack.update(dt, liveEnemies);
  if (effectManager) effectManager.update(dt, enemies);
  const magnetRadius = elapsedTime < magnetFullScreenUntil
    ? MAGNET_FULLSCREEN_RADIUS
    : MAGNET_BASE_RADIUS * (1 + (playerStats.magnetRadiusUpgrade ?? 0));
  const playerForOrbs = { x: playerPos.x, y: playerPos.y, magnetRadius };

  if (xpOrbPool) {
    const xpGain = xpOrbPool.update(dt, playerForOrbs);
    if (xpGain > 0) {
      currentXP += xpGain;
      if (playerEntity) {
        playerEntity.xp = currentXP;
        playerEntity.level = level;
        playerEntity.xpToNextLevel = xpToNextLevel;
      }
      absorbEffectTime = 0.2;
    }
    if (currentXP >= xpToNextLevel) showLevelUpChoices();
  }
  if (absorbEffectTime > 0) {
    absorbEffectTime -= rawDt;
    const s = 1 + 0.12 * (absorbEffectTime / 0.2);
    playerMesh.scale.setScalar(Math.min(s, 1.15));
  } else if (playerMesh.scale.x !== 1) {
    playerMesh.scale.setScalar(1);
  }
  if (levelUpFlashTime > 0) levelUpFlashTime -= rawDt;
  if (levelUpSlowMotionUntil > 0) levelUpSlowMotionUntil -= rawDt;
  if (rareDropShakeUntil > 0) rareDropShakeUntil -= rawDt;
  if (rareDropFlashUntil > 0) rareDropFlashUntil -= rawDt;
  if (playerHitShakeUntil > 0) playerHitShakeUntil -= rawDt;
  const hitShakeIntensity = playerHitShakeUntil > 0 ? 0.6 : 0;
  const dropShakeIntensity = rareDropShakeUntil > 0 ? 0.2 : 0;
  const shakeIntensity = Math.max(hitShakeIntensity, dropShakeIntensity);
  const shakeX = shakeIntensity > 0 ? (Math.random() - 0.5) * shakeIntensity : 0;
  const shakeY = shakeIntensity > 0 ? (Math.random() - 0.5) * shakeIntensity : 0;

  // Hit red flash overlay
  const hitFlashEl = document.getElementById('hit-flash');
  if (hitFlashEl) hitFlashEl.style.opacity = String(playerHitShakeUntil > 0 ? Math.min(1, playerHitShakeUntil / 0.15) : 0);

  // Absorb / rare drop flash
  const flashEl = document.getElementById('absorb-flash');
  const flashOpacity = absorbEffectTime > 0 ? 0.35 * (absorbEffectTime / 0.2)
    : rareDropFlashUntil > 0 ? 0.5 * (rareDropFlashUntil / 0.15) : 0;
  if (flashEl) flashEl.style.opacity = String(flashOpacity);

  // Level-up pulse
  const pulseEl = document.getElementById('level-up-pulse');
  if (pulseEl) pulseEl.classList.toggle('active', levelUpFlashTime > 0);

  // Player tint on level-up (only if not in hit invulnerability)
  if (playerMesh.material.color && performance.now() * 0.001 >= playerHitCooldownUntil) {
    playerMesh.material.color.setHex(levelUpFlashTime > 0 ? 0x88aaff : 0xffffff);
  }

  gameLoop.lastDt = dt;
  updateSpawn(time / 1000);
  updateUI();

  camera.position.set(playerPos.x + shakeX, playerPos.y + shakeY, 50);
  camera.lookAt(playerPos.x, playerPos.y, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(gameLoop);
}

function startGame() {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('gameover').style.display = 'none';
  document.getElementById('level-up-overlay').classList.remove('show');
  document.getElementById('ui').style.display = 'flex';
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'flex';
  const cursorEl = document.getElementById('cursor-trail');
  if (cursorEl) cursorEl.style.display = 'none';
  document.body.classList.remove('menu-open');

  xpSystem = new XPSystem();
  playerEntity = new Player({ hp: PLAYER.BASE_HP, maxHp: PLAYER.BASE_HP, xp: 0, level: 1 });
  playerEntity.xpToNextLevel = Math.floor(XP.BASE_XP * 1 * XP.XP_SCALE);
  weaponManager = new WeaponManager();
  weaponManager.addWeapon(new MeleeWeapon({ name: 'Slash', damage: 12, cooldown: 1.0, radius: 3.5 }));
  if (playerEntity) playerEntity.weapons.push(weaponManager.getWeapons()[0]);

  health = playerEntity.hp;
  maxHealth = playerEntity.maxHp;
  energy = 0;
  power = 0;
  level = playerEntity.level;
  currentXP = playerEntity.xp;
  xpToNextLevel = playerEntity.xpToNextLevel;
  xpBarDisplay = 0;
  absorbEffectTime = 0;
  levelUpFlashTime = 0;
  levelUpSlowMotionUntil = 0;
  magnetFullScreenUntil = 0;
  rareDropShakeUntil = 0;
  rareDropFlashUntil = 0;
  playerHitCooldownUntil = 0;
  playerHitShakeUntil = 0;
  playerKnockbackVel = { x: 0, y: 0 };
  currentRound = 1;
  roundTimer = 0;
  totalKills = 0;
  levelUpPaused = false;
  chosenUpgradeIds.clear();
  playerStats = { damageUpgrade: 1, attackSpeedUpgrade: 0, radiusUpgrade: 0, moveSpeedUpgrade: 0 };
  elapsedTime = 0;
  gameOver = false;
  speedBuffUntil = 0;
  lastWeaponTime = 0;
  lastSpawnTime = 0;
  playerAnimTime = 0;
  playerDirRow = 1;
  currentZoneIndex = -1;
  playerPos.set(0, 0);
  playerVel.set(0, 0);
  playerMesh.position.set(0, 0, 0);
  playerMesh.scale.set(1, 1, 1);
  if (playerMesh.material.map) {
    const nr = playerMesh.material.map.userData.numRows || 1;
    playerMesh.material.map.offset.set(0, 1 - 1 / nr);
  }

  if (enemyManager) enemyManager.clear();
  enemies = [];
  for (const o of orbs) {
    scene.remove(o.mesh);
    o.mesh.geometry.dispose();
    o.mesh.material.dispose();
  }
  orbs = [];

  if (effectManager) effectManager.clear();
  else effectManager = new EffectManager(scene);
  if (!autoAttack) {
    const playerRef = { getPosition: () => ({ x: playerPos.x, y: playerPos.y }) };
    autoAttack = new AutoAttack(playerRef, effectManager, {
      cooldown: 1.2,
      skillId: SKILL_IDS.GOLD_EXPLOSION,
      attackSpeedMult: 1,
      damageUpgrade: 1,
      radiusUpgrade: 1,
    });
  }
  autoAttack.setAttackSpeedMult(1 + playerStats.attackSpeedUpgrade);
  autoAttack.setDamageUpgrade(playerStats.damageUpgrade ?? 1);
  autoAttack.setRadiusUpgrade(1 + (playerStats.radiusUpgrade ?? 0));
  if (xpOrbPool) xpOrbPool.clear();
  else {
    xpOrbPool = new XPOrbPool(scene);
    xpOrbPool.setOnCollect(() => { absorbEffectTime = 0.2; });
  }
  if (!difficultyManager) difficultyManager = new DifficultyManager();

  // Sistema de animaciones del alien (usa las texturas ya cargadas)
  function dealDamageFromEnemy(enemy) {
    const dmg = enemy.damage ?? 1;
    if (playerEntity) playerEntity.takeDamage(dmg);
    health = playerEntity ? playerEntity.hp : Math.max(0, health - dmg);
    maxHealth = playerEntity ? playerEntity.maxHp : maxHealth;
    if (health <= 0) endGame();
  }

  alienAnimationSystem = new AlienAnimationSystem({
    textures: {
      idle: textures.alienIdle,
      walk: textures.alienWalk,
      hurt: textures.alienHurt,
      attack: textures.alienAttack,
    },
    frameWidth: 64,
    frameHeight: 64,
    onDealDamage: dealDamageFromEnemy,
  });

  slimeAnimationSystem = new SlimeAnimationSystem({
    textures: {
      idle: textures.slimeIdle,
      walk: textures.slimeWalk,
      run: textures.slimeRun,
      attack: textures.slimeAttack,
      hurt: textures.slimeHurt,
      death: textures.slimeDeath,
    },
    frameWidth: 64,
    frameHeight: 64,
    onDealDamage: dealDamageFromEnemy,
  });

  enemyManager = new EnemyManager({
    scene,
    createMeshForType: createMeshForEnemyType,
    onEnemyDeath(enemy) {
      const difficultyRaw = difficultyManager ? difficultyManager.getDifficultyRaw() : 0;
      const xpMult = Math.max(0.1, (enemy.xpDrop || 5) / 5);
      if (xpOrbPool) spawnXpOrbAt(enemy.pos.x, enemy.pos.y, difficultyRaw, xpMult);
      totalKills++;
      if ((playerStats.magnetAutoCollectChance ?? 0) > 0 && Math.random() < playerStats.magnetAutoCollectChance && xpOrbPool) {
        const autoXp = xpOrbPool.collectOrbsInRadius(enemy.pos.x, enemy.pos.y, 8);
        if (autoXp > 0) { currentXP += autoXp; absorbEffectTime = 0.12; }
      }
      dropOrbs(enemy.pos.x, enemy.pos.y);
    },
    getDifficulty: () => difficultyManager ? difficultyManager.getDifficultyMultipliers() : { hpMultiplier: 1, damageMultiplier: 1, speedMultiplier: 1 },
    alienAnimSystem: alienAnimationSystem,
    slimeAnimSystem: slimeAnimationSystem,
  });
  enemyManager.clear();
  spawnSystem = new SpawnSystem({
    spawn: (typeId, x, y, opts) => enemyManager.spawn(typeId, x, y, opts),
    getPlayerPosition: () => ({ x: playerPos.x, y: playerPos.y }),
    getActiveCount: () => enemyManager.getActiveCount(),
    maxEnemies: difficultyManager ? difficultyManager.getMaxEnemies() : 200,
  });
  enemyAISystem = new EnemyAISystem({
    getPlayerPosition: () => ({ x: playerPos.x, y: playerPos.y }),
    onEnemyAttack(e, player) {
      const dmg = e.damage ?? 1;
      if (playerEntity) playerEntity.takeDamage(dmg);
      health = playerEntity ? playerEntity.hp : Math.max(0, health - dmg);
      maxHealth = playerEntity ? playerEntity.maxHp : maxHealth;
      if (health <= 0) endGame();
    },
    separationRadius: 0.8,
  });
  enemies = [];

  gameLoop.last = undefined;
  requestAnimationFrame(gameLoop);
}

function getSelectedVampireVariant() {
  const btn = document.querySelector('.variant-btn.selected');
  return btn ? parseInt(btn.dataset.variant, 10) : 1;
}

function main() {
  const btnStart = document.getElementById('btn-start');
  const btnRestart = document.getElementById('btn-restart');
  const variantBtns = document.querySelectorAll('.variant-btn');

  variantBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      variantBtns.forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
  if (variantBtns.length > 0) variantBtns[0].classList.add('selected');

  btnStart.addEventListener('click', () => {
    const variant = getSelectedVampireVariant();
    btnStart.disabled = true;
    btnStart.textContent = 'Cargando...';
    loadTextures(variant)
      .then(t => {
        textures = t;
        initThree();
        btnStart.textContent = 'Jugar';
        btnStart.disabled = false;
        startGame();
      })
      .catch(err => {
        console.error('Error loading assets:', err);
        btnStart.textContent = 'Error cargando';
        btnStart.disabled = false;
      });
  });
  btnRestart.addEventListener('click', startGame);

  const btnMenu = document.getElementById('btn-menu');
  if (btnMenu) {
    btnMenu.addEventListener('click', () => {
      document.getElementById('gameover').style.display = 'none';
      document.getElementById('menu').style.display = 'flex';
      const h = document.getElementById('hud');
      if (h) h.style.display = 'none';
    });
  }

  window.gameReady = true;
}

main();
