/**
 * SpriteAnimator — play spritesheet animations with loop / no loop and onComplete.
 * Works with Three.js texture offset/repeat (one texture, multiple frames/rows).
 */
export class SpriteAnimator {
  /**
   * @param {THREE.Texture} texture - texture with offset/repeat (userData: numFrames, numRows)
   * @param {Object} [options]
   * @param {number} options.fps - frames per second (default 10)
   * @param {boolean} options.loop - default true
   */
  constructor(texture, options = {}) {
    this.texture = texture;
    this.fps = options.fps ?? 10;
    this.loop = options.loop !== false;
    this._time = 0;
    this._currentAnim = null;
    this._onComplete = null;
  }

  /**
   * @param {string} animationName - key for animation config
   * @param {Object} config - { frames?, row?, loop?, fps?, frameWidth?, frameHeight? }
   * @param {Function} [onComplete]
   */
  play(animationName, config = {}, onComplete) {
    this._currentAnim = { name: animationName, ...config };
    this._time = 0;
    this._onComplete = onComplete || null;
    if (config.loop !== undefined) this.loop = config.loop;
    if (config.fps != null) this.fps = config.fps;
  }

  update(delta) {
    if (!this.texture || !this._currentAnim) return;
    const anim = this._currentAnim;

    // Infer frame/rows from texture metadata or image size.
    const tex = this.texture;
    const img = tex.image;
    const frameWidth = anim.frameWidth ?? tex.userData?.frameWidth ?? 64;
    const frameHeight = anim.frameHeight ?? tex.userData?.frameHeight ?? 64;

    let numFrames = anim.frames;
    if (!numFrames && img && frameWidth > 0) {
      numFrames = Math.max(1, Math.floor(img.width / frameWidth));
    }
    if (!numFrames) numFrames = tex.userData?.numFrames ?? 1;

    let numRows = tex.userData?.numRows;
    if (!numRows && img && frameHeight > 0) {
      numRows = Math.max(1, Math.floor(img.height / frameHeight));
    }
    if (!numRows) numRows = 1;

    const row = Math.max(0, Math.min(numRows - 1, anim.row ?? 0));

    this._time += delta;
    const frameIndex = Math.floor(this._time * this.fps);
    const finished = !this.loop && frameIndex >= numFrames;
    const wrappedIndex = this.loop ? (frameIndex % numFrames) : Math.min(frameIndex, numFrames - 1);

    tex.repeat.set(1 / numFrames, 1 / numRows);
    tex.offset.x = wrappedIndex / numFrames;
    tex.offset.y = 1 - (row + 1) / numRows;

    if (finished) {
      if (this._onComplete) this._onComplete();
      this._currentAnim = null;
    }
  }

  stop() {
    this._currentAnim = null;
    this._onComplete = null;
  }
}
