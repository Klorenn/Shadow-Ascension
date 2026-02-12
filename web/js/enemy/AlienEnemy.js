/**
 * Alien enemy: low HP, high speed, dash every 4–6s (double speed 0.5s).
 * Fake motion blur via scale stretch; red emissive during dash.
 */
import * as THREE from 'three';
const BASE_SPEED = 0.22;
const DASH_SPEED_MULT = 2;
const DASH_DURATION = 0.5;
const DASH_COOLDOWN_MIN = 4;
const DASH_COOLDOWN_MAX = 6;
const EMISSIVE_NORMAL = 0x331111;
const EMISSIVE_DASH = 0xcc2222;
const EMISSIVE_INTENSITY_NORMAL = 0.05;
const EMISSIVE_INTENSITY_DASH = 0.5;
const STRETCH_DASH = 1.4;
const ALIEN_ANIM_FPS = 10;
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
export function createAlienEnemy(mesh) {
    const cloned = mesh.clone();
    cloned.position.set(0, 0, 0);
    const mat = cloned.material;
    if (mat && 'emissive' in mat && mat.emissive) {
        mat.emissive = new THREE.Color(EMISSIVE_NORMAL);
        mat.emissiveIntensity = EMISSIVE_INTENSITY_NORMAL;
    }
    // Base stats; difficulty scaling modifies these via setDifficulty(healthMult, speedMult) after creation
    let maxHealth = 12;
    let moveSpeed = BASE_SPEED;
    let health = maxHealth;
    let specialBehaviorCooldown = DASH_COOLDOWN_MIN + Math.random() * (DASH_COOLDOWN_MAX - DASH_COOLDOWN_MIN);
    let dashTimeLeft = 0;
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
    const alien = {
        mesh: cloned,
        type: 'alien',
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
            if (dashTimeLeft > 0) {
                dashTimeLeft -= delta;
                if (mat && 'emissive' in mat && mat.emissive) {
                    mat.emissive.setHex(EMISSIVE_DASH);
                    mat.emissiveIntensity = EMISSIVE_INTENSITY_DASH;
                }
                const t = 1 - dashTimeLeft / DASH_DURATION;
                const stretch = 1 + t * (STRETCH_DASH - 1);
                cloned.scale.set(baseScaleX * stretch, baseScaleY / stretch, baseScaleZ);
            }
            else {
                if (mat && 'emissive' in mat && mat.emissive) {
                    mat.emissive.setHex(EMISSIVE_NORMAL);
                    mat.emissiveIntensity = EMISSIVE_INTENSITY_NORMAL;
                }
                cloned.scale.set(baseScaleX, baseScaleY, baseScaleZ);
            }
            const speedMult = dashTimeLeft > 0 ? DASH_SPEED_MULT : 1;
            const currentSpeed = moveSpeed * speedMult;
            if (distToPlayer > 0.1) {
                toPlayer.normalize();
                const nx = toPlayer.x;
                const ny = toPlayer.y;
                pos.x += nx * currentSpeed * 60 * delta;
                pos.y += ny * currentSpeed * 60 * delta;
                const angle = Math.atan2(ny, nx);
                currentDir = angleToDirection(angle);
            }
            if (specialBehaviorCooldown <= 0 && dashTimeLeft <= 0) {
                dashTimeLeft = DASH_DURATION;
                specialBehaviorCooldown = DASH_COOLDOWN_MIN + Math.random() * (DASH_COOLDOWN_MAX - DASH_COOLDOWN_MIN);
            }
            cloned.position.set(pos.x, pos.y, cloned.position.z);
            if (tex && sheetCols > 1 && sheetRows >= 1) {
                animTime += delta;
                const frame = Math.floor(animTime * ALIEN_ANIM_FPS) % sheetCols;
                const row = Math.max(0, Math.min(sheetRows - 1, currentDir));
                tex.repeat.set(1 / sheetCols, 1 / sheetRows);
                tex.offset.x = frame / sheetCols;
                tex.offset.y = 1 - (row + 1) / sheetRows;
            }
        },
        takeDamage(amount) {
            health = Math.max(0, health - amount);
            if (health <= 0)
                alien.onDeath();
        },
        onDeath() {
            if (deathCallback)
                deathCallback();
        }
    };
    alien.setDeathCallback = (fn) => {
        deathCallback = fn;
    };
    alien.setDifficulty = (healthMult, speedMult) => {
        maxHealth *= healthMult;
        health = maxHealth;
        moveSpeed *= speedMult;
    };
    return alien;
}
