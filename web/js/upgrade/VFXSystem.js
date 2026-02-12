/**
 * VFXSystem — Applies upgrade VFX using Three.js (aura, trail, clone, screen effect, distortion).
 * Integrate in game loop: call applyUpgradeVFX when an upgrade is applied; update trails/clones each frame.
 */
import * as THREE from 'three';
export class VFXSystem {
    cloneMesh = null;
    trailLines = [];
    screenOverlay = null;
    distortionUniforms = null;
    /** Aura: emissive-style glow around player (MeshBasicMaterial with color + transparent). */
    applyAura(playerMesh, color, intensity) {
        const hex = parseInt(color.replace('#', ''), 16);
        const existing = playerMesh.userData.aura;
        if (existing) {
            playerMesh.remove(existing);
            existing.geometry.dispose();
            existing.material.dispose();
        }
        const r = 1.5;
        const geo = new THREE.RingGeometry(r, r + 0.4 + intensity * 0.3, 32);
        const mat = new THREE.MeshBasicMaterial({
            color: hex,
            transparent: true,
            opacity: 0.15 + intensity * 0.2,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const ring = new THREE.Mesh(geo, mat);
        ring.position.z = -0.1;
        ring.rotation.x = -Math.PI / 2;
        playerMesh.add(ring);
        playerMesh.userData.aura = ring;
    }
    /** Trail: line trail behind projectile (store ref for game loop to update). */
    applyTrail(_projectileMesh, color) {
        const hex = parseInt(color.replace('#', ''), 16);
        const points = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0)
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({
            color: hex,
            transparent: true,
            opacity: 0.6,
            linewidth: 2
        });
        const line = new THREE.Line(geo, mat);
        line.frustumCulled = false;
        line.userData.points = points;
        this.trailLines.push(line);
        return line;
    }
    /** Clone: semi-transparent copy of player mesh in scene. */
    applyClone(scene, playerMesh) {
        if (this.cloneMesh) {
            scene.remove(this.cloneMesh);
            this.cloneMesh.geometry.dispose();
            this.cloneMesh.material.dispose();
        }
        const pm = playerMesh;
        const geo = pm.geometry.clone();
        const srcMat = pm.material;
        const map = srcMat && srcMat.map ? srcMat.map : null;
        const mat = new THREE.MeshBasicMaterial({
            map,
            transparent: true,
            opacity: 0.35,
            depthWrite: false
        });
        const clone = new THREE.Mesh(geo, mat);
        clone.scale.copy(pm.scale);
        this.cloneMesh = clone;
        scene.add(clone);
        return clone;
    }
    /** Screen effect: simple fullscreen quad with vignette/color overlay (no full post-processing). */
    applyScreenEffect(_renderer, color, intensity) {
        if (this.screenOverlay)
            return;
        const geo = new THREE.PlaneGeometry(2, 2);
        const hex = parseInt(color.replace('#', ''), 16);
        const mat = new THREE.MeshBasicMaterial({
            color: hex,
            transparent: true,
            opacity: intensity * 0.15,
            depthWrite: false,
            depthTest: false
        });
        const quad = new THREE.Mesh(geo, mat);
        quad.frustumCulled = false;
        quad.renderOrder = 9999;
        this.screenOverlay = quad;
    }
    /** Distortion: simple uniform-based effect (pulsing scale or offset). */
    applyDistortion(playerMesh, intensity) {
        this.distortionUniforms = {
            uTime: { value: 0 },
            uIntensity: { value: intensity }
        };
        playerMesh.userData.distortionUniforms = this.distortionUniforms;
    }
    /**
     * Apply VFX for an upgrade. Call when player picks an upgrade.
     * Game loop: call update(deltaTime) to advance trails and distortion time.
     */
    applyUpgradeVFX(upgrade, playerMesh, scene, renderer) {
        const { vfx } = upgrade;
        switch (vfx.type) {
            case 'AURA':
                this.applyAura(playerMesh, vfx.color, vfx.intensity);
                break;
            case 'CLONE':
                this.applyClone(scene, playerMesh);
                break;
            case 'SCREEN_EFFECT':
                this.applyScreenEffect(renderer, vfx.color, vfx.intensity);
                break;
            case 'DISTORTION':
                this.applyDistortion(playerMesh, vfx.intensity);
                break;
            case 'TRAIL':
            case 'PROJECTILE_MOD':
            case 'NONE':
            default:
                break;
        }
    }
    /** Call each frame to update distortion time and clone position (if any). */
    update(deltaTime, playerPosition) {
        if (this.distortionUniforms) {
            this.distortionUniforms.uTime.value += deltaTime;
        }
        if (this.cloneMesh && playerPosition) {
            this.cloneMesh.position.copy(playerPosition);
            this.cloneMesh.position.x -= 0.8;
            this.cloneMesh.position.y -= 0.3;
        }
    }
    getCloneMesh() {
        return this.cloneMesh;
    }
    getScreenOverlay() {
        return this.screenOverlay;
    }
    getTrailLines() {
        return this.trailLines;
    }
    dispose() {
        if (this.cloneMesh) {
            this.cloneMesh.geometry.dispose();
            this.cloneMesh.material.dispose();
            this.cloneMesh = null;
        }
        if (this.screenOverlay) {
            this.screenOverlay.geometry.dispose();
            this.screenOverlay.material.dispose();
            this.screenOverlay = null;
        }
        this.trailLines.forEach((line) => {
            line.geometry.dispose();
            line.material.dispose();
        });
        this.trailLines = [];
        this.distortionUniforms = null;
    }
}
