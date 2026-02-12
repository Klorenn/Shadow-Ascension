/**
 * AnimatedSprite — Reusable LPC-style spritesheet animation for Three.js.
 * Uses a single texture with offset/repeat for frame and direction (no new materials per frame).
 *
 * Directions: 0 = down, 1 = left, 2 = right, 3 = up.
 * Animations: idle, walk, attack, death (configurable).
 */
import * as THREE from 'three';

const DEFAULT_FRAME_WIDTH = 64;
const DEFAULT_FRAME_HEIGHT = 64;

function applyPixelFilter(texture) {
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  if (texture.encoding !== undefined) texture.encoding = THREE.sRGBEncoding;
  else if (texture.colorSpace !== undefined) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * @typedef {Object} AnimationDef
 * @property {number} frameCount
 * @property {number} fps
 * @property {THREE.Texture} [texture] - If omitted, uses the sprite's default texture.
 */

/**
 * @typedef {Object} AnimatedSpriteConfig
 * @property {number} [frameWidth]
 * @property {number} [frameHeight]
 * @property {Object<string, AnimationDef>} animations - e.g. { idle: { frameCount: 4, fps: 8 }, walk: { frameCount: 6, fps: 10 } }
 */

export class AnimatedSprite {
  /**
   * @param {THREE.Texture} texture - Main spritesheet texture (used for all animations unless overridden per animation).
   * @param {AnimatedSpriteConfig} config
   * @param {number} [size=2] - Plane size (width/height in world units).
   */
  constructor(texture, config, size = 2) {
    this._texture = texture;
    applyPixelFilter(this._texture);

    this._frameWidth = config.frameWidth ?? DEFAULT_FRAME_WIDTH;
    this._frameHeight = config.frameHeight ?? DEFAULT_FRAME_HEIGHT;
    this._animations = config.animations || { idle: { frameCount: 4, fps: 8 } };
    this._size = size;

    const totalColumns = Math.floor((this._texture.image?.width ?? 832) / this._frameWidth);
    const totalRows = Math.floor((this._texture.image?.height ?? 256) / this._frameHeight);
    this._totalColumns = totalColumns;
    this._totalRows = Math.max(1, totalRows);

    const mat = new THREE.MeshBasicMaterial({
      map: this._texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
    });
    const geo = new THREE.PlaneGeometry(size, size);
    this._mesh = new THREE.Mesh(geo, mat);

    this._currentAnim = 'idle';
    this._currentDirection = 0;
    this._frameTime = 0;
    this._currentFrame = 0;
    this._animTextures = {}; // name -> texture (if different per animation)
    this._updateUV();
  }

  get mesh() {
    return this._mesh;
  }

  get currentAnimation() {
    return this._currentAnim;
  }

  get currentDirection() {
    return this._currentDirection;
  }

  /**
   * Register an alternative texture for an animation (e.g. walk.png for 'walk').
   * @param {string} name
   * @param {THREE.Texture} texture
   */
  setAnimationTexture(name, texture) {
    applyPixelFilter(texture);
    this._animTextures[name] = texture;
  }

  /**
   * @param {string} name - Animation name (idle, walk, attack, death).
   */
  setAnimation(name) {
    if (this._currentAnim === name) return;
    if (!this._animations[name]) return;
    this._currentAnim = name;
    this._currentFrame = 0;
    this._frameTime = 0;
    const tex = this._animTextures[name] || this._texture;
    if (this._mesh.material.map !== tex) {
      this._mesh.material.map = tex;
      this._totalColumns = Math.floor((tex.image?.width ?? 832) / this._frameWidth);
      this._totalRows = Math.max(1, Math.floor((tex.image?.height ?? 256) / this._frameHeight));
    }
    this._updateUV();
  }

  /**
   * @param {number} direction - 0 = down, 1 = left, 2 = right, 3 = up.
   */
  setDirection(direction) {
    this._currentDirection = Math.max(0, Math.min(3, Math.floor(direction)));
    this._updateUV();
  }

  /**
   * Advance animation by delta seconds. Call every frame.
   * @param {number} delta - Seconds since last frame.
   */
  update(delta) {
    const anim = this._animations[this._currentAnim];
    if (!anim || anim.frameCount <= 0) return;
    this._frameTime += delta;
    const frameDuration = 1 / (anim.fps || 8);
    const loop = anim.loop !== false;
    while (this._frameTime >= frameDuration) {
      this._frameTime -= frameDuration;
      if (loop) {
        this._currentFrame = (this._currentFrame + 1) % anim.frameCount;
      } else {
        if (this._currentFrame < anim.frameCount - 1) this._currentFrame++;
      }
    }
    this._updateUV();
  }

  _updateUV() {
    const map = this._mesh.material.map;
    if (!map) return;
    const anim = this._animations[this._currentAnim];
    const frameCount = anim ? anim.frameCount : 1;
    const totalCols = this._totalColumns;
    const totalRows = this._totalRows;
    const frameIndex = Math.min(this._currentFrame, frameCount - 1);
    const rowIndex = Math.min(this._currentDirection, totalRows - 1);
    map.repeat.set(1 / totalCols, 1 / totalRows);
    map.offset.x = frameIndex / totalCols;
    map.offset.y = 1 - (rowIndex + 1) / totalRows;
  }

  dispose() {
    this._mesh.geometry.dispose();
    this._mesh.material.dispose();
  }
}
