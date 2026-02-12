/**
 * VFXSystem — Applies upgrade VFX using Three.js (aura, trail, clone, screen effect, distortion).
 * Integrate in game loop: call applyUpgradeVFX when an upgrade is applied; update trails/clones each frame.
 */
import * as THREE from 'three';
import type { Upgrade } from './UpgradeTypes.js';
type MeshLike = THREE.Mesh;
type SceneLike = THREE.Scene;
type RendererLike = THREE.WebGLRenderer;
export declare class VFXSystem {
    private cloneMesh;
    private trailLines;
    private screenOverlay;
    private distortionUniforms;
    /** Aura: emissive-style glow around player (MeshBasicMaterial with color + transparent). */
    applyAura(playerMesh: MeshLike, color: string, intensity: number): void;
    /** Trail: line trail behind projectile (store ref for game loop to update). */
    applyTrail(_projectileMesh: MeshLike, color: string): THREE.Line;
    /** Clone: semi-transparent copy of player mesh in scene. */
    applyClone(scene: SceneLike, playerMesh: MeshLike): MeshLike;
    /** Screen effect: simple fullscreen quad with vignette/color overlay (no full post-processing). */
    applyScreenEffect(_renderer: RendererLike, color: string, intensity: number): void;
    /** Distortion: simple uniform-based effect (pulsing scale or offset). */
    applyDistortion(playerMesh: MeshLike, intensity: number): void;
    /**
     * Apply VFX for an upgrade. Call when player picks an upgrade.
     * Game loop: call update(deltaTime) to advance trails and distortion time.
     */
    applyUpgradeVFX(upgrade: Upgrade, playerMesh: MeshLike, scene: SceneLike, renderer: RendererLike): void;
    /** Call each frame to update distortion time and clone position (if any). */
    update(deltaTime: number, playerPosition?: THREE.Vector3): void;
    getCloneMesh(): THREE.Mesh | null;
    getScreenOverlay(): THREE.Mesh | null;
    getTrailLines(): THREE.Line[];
    dispose(): void;
}
export {};
//# sourceMappingURL=VFXSystem.d.ts.map