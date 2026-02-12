/**
 * Slime enemy: medium HP, slow, wobble + squash animation, lunge when close.
 * Reuses vectors to avoid per-frame allocations.
 */
import * as THREE from 'three';
const WOBBLE_SPEED = 3;
const SQUASH_AMP = 0.1;
const SQUASH_BASE = 1;
const LUNGE_DISTANCE = 2.5;
const LUNGE_SPEED_MULT = 2.5;
const LUNGE_DURATION = 0.25;
const BASE_SPEED = 0.08;
const EMISSIVE_COLOR = 0x22aa44;
const EMISSIVE_INTENSITY = 0.15;
const SLIME_ANIM_FPS = 8;
const DIR_DOWN = 0;
const DIR_LEFT = 1;
const DIR_RIGHT = 2;
const DIR_UP = 3;

function angleToDirection(angleRad) {
  const a = angleRad;
  if (a >= -Math.PI * 0.25 && a < Math.PI * 0.25) return DIR_RIGHT;
  if (a >= Math.PI * 0.25 && a < Math.PI * 0.75) return DIR_UP;
  if (a >= -Math.PI * 0.75 && a < -Math.PI * 0.25) return DIR_DOWN;
  return DIR_LEFT;
}
export function createSlimeEnemy(mesh) {
    const cloned = mesh.clone();
    cloned.position.set(0, 0, 0);
    const mat = cloned.material;
    if (mat && 'emissive' in mat && mat.emissive) {
        mat.emissive = new THREE.Color(EMISSIVE_COLOR);
        mat.emissiveIntensity = EMISSIVE_INTENSITY;
    }
    // Base stats; difficulty scaling modifies these via setDifficulty(healthMult, speedMult) after creation
    let maxHealth = 30;
    let moveSpeed = BASE_SPEED;
    let health = maxHealth;
    let specialBehaviorCooldown = 0;
    const lungeVec = new THREE.Vector2(0, 0);
    let lungeTimeLeft = 0;
    const toPlayer = new THREE.Vector2(0, 0);
    const pos = new THREE.Vector2(0, 0);
    const tex = (mat && 'map' in mat) ? mat.map : null;
    const sheetCols = (tex && tex.userData && tex.userData.sheetCols) ? tex.userData.sheetCols : 1;
    const sheetRows = (tex && tex.userData && tex.userData.sheetRows) ? tex.userData.sheetRows : 1;
    let animTime = Math.random() * 10;
    let currentDir = DIR_DOWN;
    let deathCallback = null;
    const baseScaleX = cloned.scale.x;
    const baseScaleY = cloned.scale.y;
    const baseScaleZ = cloned.scale.z;
    const slime = {
        mesh: cloned,
        type: 'slime',
        get health() {
            return health;
        },
        set health(v) {
            health = v;
        },
        get maxHealth() {
            return maxHealth;
        },
        set maxHealth(v) {
            maxHealth = v;
        },
        get specialBehaviorCooldown() {
            return specialBehaviorCooldown;
        },
        set specialBehaviorCooldown(v) {
            specialBehaviorCooldown = v;
        },
        update(delta, playerPosition) {
            pos.set(cloned.position.x, cloned.position.y);
            toPlayer.set(playerPosition.x - pos.x, playerPosition.y - pos.y);
            const distToPlayer = toPlayer.length();
            specialBehaviorCooldown -= delta;
            if (lungeTimeLeft > 0) {
                lungeTimeLeft -= delta;
                const t = Math.min(1, (LUNGE_DURATION - lungeTimeLeft) / LUNGE_DURATION);
                const speed = moveSpeed * LUNGE_SPEED_MULT * (1 - t * 0.5);
                pos.x += lungeVec.x * speed * 60 * delta;
                pos.y += lungeVec.y * speed * 60 * delta;
            }
            else {
                if (distToPlayer < LUNGE_DISTANCE && distToPlayer > 0.1 && specialBehaviorCooldown <= 0) {
                    lungeVec.copy(toPlayer).normalize();
                    lungeTimeLeft = LUNGE_DURATION;
                    specialBehaviorCooldown = 1.5;
                }
                else {
                    if (distToPlayer > 0.1) {
                        toPlayer.normalize();
                        const wobble = Math.sin(performance.now() * 0.002) * 0.15;
                        const wx = toPlayer.x + wobble;
                        const wy = toPlayer.y + Math.sin(performance.now() * 0.0017) * 0.15;
                        const len = Math.sqrt(wx * wx + wy * wy) || 1;
                        const nx = wx / len;
                        const ny = wy / len;
                        pos.x += nx * moveSpeed * 60 * delta;
                        pos.y += ny * moveSpeed * 60 * delta;
                        const angle = Math.atan2(ny, nx);
                        currentDir = angleToDirection(angle);
                    }
                }
            }
            cloned.position.set(pos.x, pos.y, cloned.position.z);
            if (tex && sheetCols > 1 && sheetRows >= 1) {
                animTime += delta;
                const frame = Math.floor(animTime * SLIME_ANIM_FPS) % sheetCols;
                const row = Math.max(0, Math.min(sheetRows - 1, currentDir));
                tex.repeat.set(1 / sheetCols, 1 / sheetRows);
                tex.offset.x = frame / sheetCols;
                tex.offset.y = 1 - (row + 1) / sheetRows;
            }
            const squash = SQUASH_BASE + Math.sin(performance.now() * WOBBLE_SPEED * 0.001) * SQUASH_AMP;
            cloned.scale.set(baseScaleX, baseScaleY * squash, baseScaleZ);
        },
        takeDamage(amount) {
            health = Math.max(0, health - amount);
            if (health <= 0)
                slime.onDeath();
        },
        onDeath() {
            if (deathCallback)
                deathCallback();
            // Optional: 20% chance to spawn 2 mini slimes (handled by SpawnSystem when it subscribes to onDeath)
            // if (Math.random() < 0.2) { spawnMiniSlimes(cloned.position); }
        }
    };
    slime.setDeathCallback = (fn) => {
        deathCallback = fn;
    };
    slime.setDifficulty = (healthMult, speedMult) => {
        maxHealth *= healthMult;
        health = maxHealth;
        moveSpeed *= speedMult;
    };
    return slime;
}
