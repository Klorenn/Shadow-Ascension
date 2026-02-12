/**
 * VFXSystem — Applies upgrade VFX using Three.js (aura, trail, clone, screen effect, distortion).
 * Integrate in game loop: call applyUpgradeVFX when an upgrade is applied; update trails/clones each frame.
 */

import * as THREE from 'three'
import type { Upgrade } from './UpgradeTypes.js'

type MeshLike = THREE.Mesh
type SceneLike = THREE.Scene
type RendererLike = THREE.WebGLRenderer

export class VFXSystem {
  private cloneMesh: MeshLike | null = null
  private trailLines: THREE.Line[] = []
  private screenOverlay: MeshLike | null = null
  private distortionUniforms: { uTime: { value: number }; uIntensity: { value: number } } | null = null

  /** Aura: emissive-style glow around player (MeshBasicMaterial with color + transparent). */
  applyAura(playerMesh: MeshLike, color: string, intensity: number): void {
    const hex = parseInt(color.replace('#', ''), 16)
    const existing = playerMesh.userData.aura as MeshLike | undefined
    if (existing) {
      playerMesh.remove(existing)
      existing.geometry.dispose()
      ;(existing.material as THREE.Material).dispose()
    }
    const r = 1.5
    const geo = new THREE.RingGeometry(r, r + 0.4 + intensity * 0.3, 32)
    const mat = new THREE.MeshBasicMaterial({
      color: hex,
      transparent: true,
      opacity: 0.15 + intensity * 0.2,
      side: THREE.DoubleSide,
      depthWrite: false
    })
    const ring = new THREE.Mesh(geo, mat)
    ring.position.z = -0.1
    ring.rotation.x = -Math.PI / 2
    playerMesh.add(ring)
    playerMesh.userData.aura = ring
  }

  /** Trail: line trail behind projectile (store ref for game loop to update). */
  applyTrail(_projectileMesh: MeshLike, color: string): THREE.Line {
    const hex = parseInt(color.replace('#', ''), 16)
    const points: THREE.Vector3[] = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0)
    ]
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const mat = new THREE.LineBasicMaterial({
      color: hex,
      transparent: true,
      opacity: 0.6,
      linewidth: 2
    })
    const line = new THREE.Line(geo, mat)
    line.frustumCulled = false
    line.userData.points = points
    this.trailLines.push(line)
    return line
  }

  /** Clone: semi-transparent copy of player mesh in scene. */
  applyClone(scene: SceneLike, playerMesh: MeshLike): MeshLike {
    if (this.cloneMesh) {
      scene.remove(this.cloneMesh)
      this.cloneMesh.geometry.dispose()
      ;(this.cloneMesh.material as THREE.Material).dispose()
    }
    const pm = playerMesh as MeshLike
    const geo = pm.geometry.clone()
    const srcMat = pm.material
    const map = srcMat && (srcMat as THREE.MeshBasicMaterial).map ? (srcMat as THREE.MeshBasicMaterial).map : null
    const mat = new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    })
    const clone = new THREE.Mesh(geo, mat)
    clone.scale.copy(pm.scale)
    this.cloneMesh = clone
    scene.add(clone)
    return clone
  }

  /** Screen effect: simple fullscreen quad with vignette/color overlay (no full post-processing). */
  applyScreenEffect(_renderer: RendererLike, color: string, intensity: number): void {
    if (this.screenOverlay) return
    const geo = new THREE.PlaneGeometry(2, 2)
    const hex = parseInt(color.replace('#', ''), 16)
    const mat = new THREE.MeshBasicMaterial({
      color: hex,
      transparent: true,
      opacity: intensity * 0.15,
      depthWrite: false,
      depthTest: false
    })
    const quad = new THREE.Mesh(geo, mat)
    quad.frustumCulled = false
    quad.renderOrder = 9999
    this.screenOverlay = quad
  }

  /** Distortion: simple uniform-based effect (pulsing scale or offset). */
  applyDistortion(playerMesh: MeshLike, intensity: number): void {
    this.distortionUniforms = {
      uTime: { value: 0 },
      uIntensity: { value: intensity }
    }
    playerMesh.userData.distortionUniforms = this.distortionUniforms
  }

  /**
   * Apply VFX for an upgrade. Call when player picks an upgrade.
   * Game loop: call update(deltaTime) to advance trails and distortion time.
   */
  applyUpgradeVFX(
    upgrade: Upgrade,
    playerMesh: MeshLike,
    scene: SceneLike,
    renderer: RendererLike
  ): void {
    const { vfx } = upgrade
    switch (vfx.type) {
      case 'AURA':
        this.applyAura(playerMesh, vfx.color, vfx.intensity)
        break
      case 'CLONE':
        this.applyClone(scene, playerMesh)
        break
      case 'SCREEN_EFFECT':
        this.applyScreenEffect(renderer, vfx.color, vfx.intensity)
        break
      case 'DISTORTION':
        this.applyDistortion(playerMesh, vfx.intensity)
        break
      case 'TRAIL':
      case 'PROJECTILE_MOD':
      case 'NONE':
      default:
        break
    }
  }

  /** Call each frame to update distortion time and clone position (if any). */
  update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    if (this.distortionUniforms) {
      this.distortionUniforms.uTime.value += deltaTime
    }
    if (this.cloneMesh && playerPosition) {
      this.cloneMesh.position.copy(playerPosition)
      this.cloneMesh.position.x -= 0.8
      this.cloneMesh.position.y -= 0.3
    }
  }

  getCloneMesh(): THREE.Mesh | null {
    return this.cloneMesh
  }

  getScreenOverlay(): THREE.Mesh | null {
    return this.screenOverlay
  }

  getTrailLines(): THREE.Line[] {
    return this.trailLines
  }

  dispose(): void {
    if (this.cloneMesh) {
      this.cloneMesh.geometry.dispose()
      ;(this.cloneMesh.material as THREE.Material).dispose()
      this.cloneMesh = null
    }
    if (this.screenOverlay) {
      this.screenOverlay.geometry.dispose()
      ;(this.screenOverlay.material as THREE.Material).dispose()
      this.screenOverlay = null
    }
    this.trailLines.forEach((line) => {
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
    })
    this.trailLines = []
    this.distortionUniforms = null
  }
}
