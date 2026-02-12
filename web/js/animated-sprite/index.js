/**
 * AnimatedSprite system: LPC-style spritesheet animation for Three.js.
 * - AnimatedSprite: base class (texture offset/repeat, 4 directions, multiple animations).
 * - AlienEnemy: enemy that extends AnimatedSprite, moves toward player, walk/idle/death.
 */
export { AnimatedSprite } from './AnimatedSprite.js';
export { AlienEnemy, ALIEN_ANIM_CONFIG } from './AlienEnemy.js';
