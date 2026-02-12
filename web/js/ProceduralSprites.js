/**
 * ProceduralSprites — canvas-based pixel-art sprite generators.
 * Used as fallback when PNG assets are missing (e.g. sandbox without binary files).
 * Each function returns an HTMLCanvasElement that Three.js can use as a texture source.
 */

// ── Helpers ──────────────────────────────────────────────────────
function createCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function fillPixel(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * size, y * size, size, size);
}

// Draw a simple filled circle on a canvas context
function drawCircle(ctx, cx, cy, r, color) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// ── Player: 4-direction spritesheet ──────────────────────────────
// Idle: 4 cols x 4 rows (256x256), Walk: 6 cols x 4 rows (384x256)
// Each cell is 64x64. Rows: 0=down(front), 1=up(back), 2=left, 3=right

function drawVampireFrame(ctx, col, row, cellW, cellH, frameOffset) {
  const ox = col * cellW;
  const oy = row * cellH;
  const cx = ox + cellW / 2;
  const cy = oy + cellH / 2;
  const p = 4; // pixel unit

  // Body
  ctx.fillStyle = '#2a1a3a';
  ctx.fillRect(cx - 3 * p, cy - 6 * p, 6 * p, 10 * p);

  // Cape (dark)
  ctx.fillStyle = '#1a0a2a';
  ctx.fillRect(cx - 4 * p, cy - 4 * p, 8 * p, 8 * p);

  // Head
  ctx.fillStyle = '#d4b896';
  ctx.fillRect(cx - 2 * p, cy - 8 * p, 4 * p, 4 * p);

  // Eyes based on direction
  ctx.fillStyle = '#ff3333';
  if (row === 0) { // front
    ctx.fillRect(cx - 1 * p, cy - 7 * p, p, p);
    ctx.fillRect(cx + 0 * p, cy - 7 * p, p, p);
  } else if (row === 1) { // back - no eyes
    ctx.fillStyle = '#1a0a2a';
    ctx.fillRect(cx - 2 * p, cy - 8 * p, 4 * p, 2 * p);
  } else if (row === 2) { // left
    ctx.fillRect(cx - 2 * p, cy - 7 * p, p, p);
  } else { // right
    ctx.fillRect(cx + 1 * p, cy - 7 * p, p, p);
  }

  // Legs - slight animation offset
  ctx.fillStyle = '#1a1a2a';
  const legOff = Math.sin(frameOffset * 0.8) * p;
  ctx.fillRect(cx - 2 * p, cy + 4 * p + legOff, 2 * p, 3 * p);
  ctx.fillRect(cx, cy + 4 * p - legOff, 2 * p, 3 * p);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, oy + cellH - 4 * p, 4 * p, 1.5 * p, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function generatePlayerIdle() {
  const cols = 4, rows = 4, cellW = 64, cellH = 64;
  const c = createCanvas(cols * cellW, rows * cellH);
  const ctx = c.getContext('2d');
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      drawVampireFrame(ctx, col, row, cellW, cellH, col * 0.3);
    }
  }
  return c;
}

export function generatePlayerWalk() {
  const cols = 6, rows = 4, cellW = 64, cellH = 64;
  const c = createCanvas(cols * cellW, rows * cellH);
  const ctx = c.getContext('2d');
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      drawVampireFrame(ctx, col, row, cellW, cellH, col * 1.2);
    }
  }
  return c;
}

// ── Slime spritesheet (64px cells) ──────────────────────────────
function drawSlimeFrame(ctx, col, row, cellW, cellH, anim, frame) {
  const ox = col * cellW;
  const oy = row * cellH;
  const cx = ox + cellW / 2;
  const cy = oy + cellH / 2;
  const p = 3;

  // Per-frame phase for pronounced animation
  const phase = (frame / 4) * Math.PI * 2;

  // Shadow (size pulses with body)
  const shadowW = 5 * p + Math.sin(phase) * 0.5 * p;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, oy + cellH - 3 * p, shadowW, 1.5 * p, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body squash/stretch - pronounced per-frame variation
  let bw = 6 * p, bh = 5 * p;
  let bodyY = cy;
  if (anim === 'idle') {
    // Gentle breathing / pulsing
    const pulse = Math.sin(phase) * 1.2 * p;
    bw = 6 * p + pulse * 0.4;
    bh = 5 * p - pulse * 0.3;
    bodyY = cy - pulse * 0.2;
  } else if (anim === 'walk') {
    // Bouncy hop cycle
    const bounce = Math.sin(phase) * 2.5 * p;
    bodyY = cy + bounce;
    bw = 6 * p - Math.abs(bounce) * 0.3;
    bh = 5 * p + Math.abs(bounce) * 0.3;
  } else if (anim === 'run') {
    // Faster, more extreme bounce
    const bounce = Math.sin(phase * 1.5) * 3 * p;
    bodyY = cy + bounce;
    bw = 5.5 * p - Math.abs(bounce) * 0.4;
    bh = 5.5 * p + Math.abs(bounce) * 0.4;
  } else if (anim === 'attack') {
    // Squash down then spring forward
    const t = frame / 3; // 0..1 across 4 frames
    bw = 6 * p + t * 3 * p;
    bh = 5 * p - t * 2 * p;
    bodyY = cy + t * 2 * p;
  } else if (anim === 'hurt') {
    // Flatten and shake
    bw = 7 * p;
    bh = 3.5 * p;
    bodyY = cy + 2 * p;
    const shake = (frame % 2 === 0 ? 1 : -1) * p;
    ctx.translate(shake, 0);
  } else if (anim === 'death') {
    // Progressively flatten and fade
    const t = frame / 3;
    bw = 6 * p + t * 3 * p;
    bh = 5 * p * (1 - t * 0.7);
    bodyY = cy + t * 4 * p;
    ctx.globalAlpha = 1 - t * 0.5;
  }

  // Main body (green blob)
  ctx.fillStyle = '#44cc44';
  ctx.beginPath();
  ctx.ellipse(cx, bodyY, bw / 2, bh / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Darker underside
  ctx.fillStyle = '#33aa33';
  ctx.beginPath();
  ctx.ellipse(cx, bodyY + bh * 0.15, bw / 2.2, bh / 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = '#66ee66';
  ctx.beginPath();
  ctx.ellipse(cx - p, bodyY - p * 1.2, bw / 4.5, bh / 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (not on death)
  if (anim !== 'death') {
    ctx.fillStyle = '#111';
    ctx.fillRect(cx - 2 * p, bodyY - 1.5 * p, 1.5 * p, 1.5 * p);
    ctx.fillRect(cx + 0.5 * p, bodyY - 1.5 * p, 1.5 * p, 1.5 * p);
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - 1.5 * p, bodyY - 1 * p, p * 0.7, p * 0.7);
    ctx.fillRect(cx + 1 * p, bodyY - 1 * p, p * 0.7, p * 0.7);
  } else {
    // Death X eyes
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 2.5 * p, bodyY - 2 * p);
    ctx.lineTo(cx - 0.5 * p, bodyY);
    ctx.moveTo(cx - 0.5 * p, bodyY - 2 * p);
    ctx.lineTo(cx - 2.5 * p, bodyY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 0.5 * p, bodyY - 2 * p);
    ctx.lineTo(cx + 2.5 * p, bodyY);
    ctx.moveTo(cx + 2.5 * p, bodyY - 2 * p);
    ctx.lineTo(cx + 0.5 * p, bodyY);
    ctx.stroke();
  }

  // Reset transforms
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function generateSlimeSheet(anim, numFrames) {
  // Single row, numFrames columns, each 64x64
  const cols = numFrames;
  const rows = 1;
  const cellW = 64, cellH = 64;
  const c = createCanvas(cols * cellW, rows * cellH);
  const ctx = c.getContext('2d');
  for (let col = 0; col < cols; col++) {
    drawSlimeFrame(ctx, col, 0, cellW, cellH, anim, col);
  }
  return c;
}

export function generateSlimeIdle() { return generateSlimeSheet('idle', 4); }
export function generateSlimeWalk() { return generateSlimeSheet('walk', 6); }
export function generateSlimeRun() { return generateSlimeSheet('run', 6); }
export function generateSlimeAttack() { return generateSlimeSheet('attack', 4); }
export function generateSlimeHurt() { return generateSlimeSheet('hurt', 3); }
export function generateSlimeDeath() { return generateSlimeSheet('death', 4); }

// ── Alien spritesheet (LPC-style 64x64, 9 cols x 4 rows) ───────
function drawAlienFrame(ctx, col, row, cellW, cellH, anim, frame) {
  const ox = col * cellW;
  const oy = row * cellH;
  const cx = ox + cellW / 2;
  const cy = oy + cellH / 2;
  const p = 3;

  // Per-frame phase for smooth animation cycles
  const totalFrames = anim === 'idle' ? 9 : (anim === 'walk' ? 9 : 6);
  const phase = (frame / totalFrames) * Math.PI * 2;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, oy + cellH - 2 * p, 4 * p, p, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body bob for walking
  let bodyOff = 0;
  if (anim === 'walk') bodyOff = Math.sin(phase) * 1.5 * p;
  else if (anim === 'idle') bodyOff = Math.sin(phase) * 0.5 * p;

  // Body (grey-blue humanoid)
  ctx.fillStyle = '#556688';
  ctx.fillRect(cx - 2.5 * p, cy - 4 * p + bodyOff, 5 * p, 8 * p);

  // Head (big, alien)
  ctx.fillStyle = '#778899';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 6 * p + bodyOff, 3 * p, 3 * p, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (big, black, alien)
  ctx.fillStyle = '#112233';
  ctx.beginPath();
  ctx.ellipse(cx - 1.2 * p, cy - 6.5 * p + bodyOff, 1.2 * p, 1.5 * p, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 1.2 * p, cy - 6.5 * p + bodyOff, 1.2 * p, 1.5 * p, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Eye glow - pulses in idle
  const glowSize = anim === 'idle' ? 0.5 + Math.sin(phase * 2) * 0.15 : 0.5;
  ctx.fillStyle = anim === 'hurt' ? '#ff4444' : '#44ffaa';
  ctx.beginPath();
  ctx.ellipse(cx - 1.2 * p, cy - 6.5 * p + bodyOff, glowSize * p, (glowSize + 0.1) * p, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 1.2 * p, cy - 6.5 * p + bodyOff, glowSize * p, (glowSize + 0.1) * p, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs - pronounced walk cycle
  const legSwing = anim === 'walk' ? Math.sin(phase) * 2.5 * p
    : anim === 'idle' ? Math.sin(phase) * 0.3 * p : 0;
  ctx.fillStyle = '#445566';
  ctx.fillRect(cx - 2 * p, cy + 4 * p + legSwing + bodyOff, 1.5 * p, 3 * p);
  ctx.fillRect(cx + 0.5 * p, cy + 4 * p - legSwing + bodyOff, 1.5 * p, 3 * p);

  // Arms
  ctx.fillStyle = '#556688';
  if (anim === 'attack') {
    // Arms thrust forward progressively
    const t = frame / 5; // 0..1 across 6 frames
    const reach = t * 3 * p;
    ctx.fillRect(cx - 4 * p - reach, cy - 2 * p + bodyOff, 2 * p, 2 * p);
    ctx.fillRect(cx + 2 * p + reach, cy - 2 * p + bodyOff, 2 * p, 2 * p);
  } else if (anim === 'hurt') {
    // Arms flung back
    ctx.fillRect(cx - 4.5 * p, cy + bodyOff, 1.5 * p, 3 * p);
    ctx.fillRect(cx + 3 * p, cy + bodyOff, 1.5 * p, 3 * p);
  } else {
    // Normal arm swing synced with legs
    const armSwing = anim === 'walk' ? Math.sin(phase + Math.PI) * 1.5 * p : 0;
    ctx.fillRect(cx - 3.5 * p, cy - 1 * p + armSwing + bodyOff, 1.5 * p, 4 * p);
    ctx.fillRect(cx + 2 * p, cy - 1 * p - armSwing + bodyOff, 1.5 * p, 4 * p);
  }

  // Hurt flash tint
  if (anim === 'hurt') {
    ctx.fillStyle = 'rgba(255,50,50,0.25)';
    ctx.fillRect(ox, oy, cellW, cellH);
  }
}

function generateAlienSheet(anim, cols, rows) {
  const cellW = 64, cellH = 64;
  const c = createCanvas(cols * cellW, rows * cellH);
  const ctx = c.getContext('2d');
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      drawAlienFrame(ctx, col, row, cellW, cellH, anim, col);
    }
  }
  return c;
}

export function generateAlienIdle() { return generateAlienSheet('idle', 9, 4); }
export function generateAlienWalk() { return generateAlienSheet('walk', 9, 4); }
export function generateAlienHurt() { return generateAlienSheet('hurt', 6, 4); }
export function generateAlienAttack() { return generateAlienSheet('attack', 6, 4); }

// ── Boss (Bringer of Death): single large spritesheet ────────────
export function generateBossSheet() {
  // 8 cols x 1 row, 140x93 each frame
  const fw = 140, fh = 93, cols = 8;
  const c = createCanvas(cols * fw, fh);
  const ctx = c.getContext('2d');
  for (let col = 0; col < cols; col++) {
    const ox = col * fw;
    const cx = ox + fw / 2;
    const cy = fh / 2;
    const p = 4;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, fh - 3 * p, 8 * p, 2 * p, 0, 0, Math.PI * 2);
    ctx.fill();

    // Large dark body
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(cx - 6 * p, cy - 6 * p, 12 * p, 12 * p);

    // Cape / wings
    ctx.fillStyle = '#0a0a1a';
    ctx.beginPath();
    ctx.moveTo(cx - 8 * p, cy - 2 * p);
    ctx.lineTo(cx - 12 * p, cy + 8 * p);
    ctx.lineTo(cx - 4 * p, cy + 4 * p);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 8 * p, cy - 2 * p);
    ctx.lineTo(cx + 12 * p, cy + 8 * p);
    ctx.lineTo(cx + 4 * p, cy + 4 * p);
    ctx.fill();

    // Head
    ctx.fillStyle = '#2a2a3a';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8 * p, 4 * p, 3.5 * p, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glowing eyes
    ctx.fillStyle = '#ff2200';
    ctx.beginPath();
    ctx.ellipse(cx - 1.5 * p, cy - 8.5 * p, 1 * p, 0.8 * p, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 1.5 * p, cy - 8.5 * p, 1 * p, 0.8 * p, 0, 0, Math.PI * 2);
    ctx.fill();

    // Weapon (scythe)
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 3;
    const waveOff = Math.sin(col * 0.8) * 2 * p;
    ctx.beginPath();
    ctx.moveTo(cx + 8 * p, cy - 6 * p + waveOff);
    ctx.lineTo(cx + 10 * p, cy + 6 * p + waveOff);
    ctx.stroke();
    ctx.strokeStyle = '#aaa';
    ctx.beginPath();
    ctx.arc(cx + 9 * p, cy - 7 * p + waveOff, 3 * p, Math.PI * 0.8, Math.PI * 1.5);
    ctx.stroke();
  }
  return c;
}

// ── Orbs ─────────────────────────────────────────────────────────
function generateOrbCanvas(color, glowColor, size) {
  const s = size || 32;
  const c = createCanvas(s, s);
  const ctx = c.getContext('2d');
  const cx = s / 2, cy = s / 2, r = s * 0.35;

  // Glow
  const grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.5);
  grad.addColorStop(0, glowColor);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);

  // Orb body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(cx - r * 0.25, cy - r * 0.3, r * 0.3, 0, Math.PI * 2);
  ctx.fill();

  return c;
}

export function generateRedOrb() { return generateOrbCanvas('#cc3333', 'rgba(255,50,50,0.3)', 32); }
export function generateGreenOrb() { return generateOrbCanvas('#33cc33', 'rgba(50,255,50,0.3)', 32); }
export function generateBlueOrb() { return generateOrbCanvas('#3366ff', 'rgba(50,100,255,0.3)', 32); }

// ── Ground / Zone textures ───────────────────────────────────────
function generateGroundCanvas(baseColor, accentColor, label) {
  const s = 256;
  const c = createCanvas(s, s);
  const ctx = c.getContext('2d');

  // Base
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, s, s);

  // Noise dots
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const r = 1 + Math.random() * 2;
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.15 + Math.random() * 0.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  return c;
}

export function generateGrass() { return generateGroundCanvas('#2a4a2a', '#3a6a3a'); }

export function generateZone(index) {
  const zones = [
    { base: '#2a4a2a', accent: '#3a6a3a' }, // green forest
    { base: '#3a3a2a', accent: '#5a5a3a' }, // dead plains
    { base: '#2a2a3a', accent: '#3a3a5a' }, // dark valley
    { base: '#3a2a2a', accent: '#5a3a3a' }, // crimson wastes
    { base: '#1a1a2a', accent: '#2a2a4a' }, // void
  ];
  const z = zones[Math.min(index, zones.length - 1)];
  return generateGroundCanvas(z.base, z.accent);
}
