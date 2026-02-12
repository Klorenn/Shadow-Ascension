/**
 * All upgrade definitions: stats + VFX. Apply via UpgradeManager; VFX via VFXSystem.
 */
import { modifyStatPercent, modifyStatFlat } from './PlayerStats.js';
function createUpgrade(id, name, description, type, rarity, vfx, apply) {
    return { id, name, description, type, rarity, vfx, apply };
}
export const CRIMSON_FURY = createUpgrade('crimson_fury', 'Crimson Fury', '+15% damage', 'BUFF', 'COMMON', { type: 'AURA', color: '#cc2222', intensity: 0.6, loop: true }, (p) => modifyStatPercent(p, 'damage', 0.15));
export const VOID_HELMET = createUpgrade('void_helmet', 'Void Helmet', '+20% defense, -10% move speed', 'HYBRID', 'COMMON', { type: 'AURA', color: '#8844cc', intensity: 0.5, loop: true }, (p) => {
    modifyStatPercent(p, 'defense', 0.2);
    modifyStatPercent(p, 'moveSpeed', -0.1);
});
export const ECLIPSE_DAGGER = createUpgrade('eclipse_dagger', 'Eclipse Dagger', '+1 projectile count', 'BUFF', 'RARE', { type: 'TRAIL', color: '#330011', intensity: 0.8, loop: false }, (p) => modifyStatFlat(p, 'projectileCount', 1));
export const SOLAR_CORRUPTION = createUpgrade('solar_corruption', 'Solar Corruption', '+25% damage, health drain', 'HYBRID', 'CORRUPTED', { type: 'DISTORTION', color: '#ffaa00', intensity: 0.7, loop: true }, (p) => {
    modifyStatPercent(p, 'damage', 0.25);
    p.hasHealthDrain = true;
});
export const BROKEN_BLADE = createUpgrade('broken_blade', 'Broken Blade', 'Attacks can fail', 'DEBUFF', 'CORRUPTED', { type: 'PROJECTILE_MOD', color: '#888888', intensity: 0.5, loop: true, shaderModifier: 'glitch' }, (p) => {
    p.attacksCanFail = true;
});
export const DARK_KNIGHT_PROTOCOL = createUpgrade('dark_knight_protocol', 'Dark Knight Protocol', 'Damage boost when above 70% HP', 'BUFF', 'RARE', { type: 'AURA', color: '#223355', intensity: 0.4, loop: true }, (p) => {
    modifyStatPercent(p, 'damage', 0.2);
});
export const BAT_WINGS = createUpgrade('bat_wings', 'Bat Wings', '+35% move speed, -15% defense', 'HYBRID', 'RARE', { type: 'TRAIL', color: '#aaccff', intensity: 0.5, loop: true }, (p) => {
    modifyStatPercent(p, 'moveSpeed', 0.35);
    modifyStatPercent(p, 'defense', -0.15);
});
export const BLOOD_HARVEST = createUpgrade('blood_harvest', 'Blood Harvest', '+2 life steal', 'BUFF', 'RARE', { type: 'SCREEN_EFFECT', color: '#880000', intensity: 0.3, loop: false }, (p) => modifyStatFlat(p, 'lifeSteal', 2));
export const ABYSS_VISION = createUpgrade('abyss_vision', 'Abyss Vision', '-40% vision radius, +45% damage', 'HYBRID', 'CORRUPTED', { type: 'SCREEN_EFFECT', color: '#110011', intensity: 0.6, loop: true }, (p) => {
    modifyStatPercent(p, 'visionRadius', -0.4);
    modifyStatPercent(p, 'damage', 0.45);
});
export const SHADOW_CLONE = createUpgrade('shadow_clone', 'Shadow Clone', 'Spawn a clone', 'BUFF', 'LEGENDARY', { type: 'CLONE', color: '#444466', intensity: 0.5, loop: false }, (p) => {
    p.hasClone = true;
});
export const STELLAR_PRECISION = createUpgrade('stellar_precision', 'Stellar Precision', '+15% crit chance, +1.5 crit multiplier', 'BUFF', 'RARE', { type: 'PROJECTILE_MOD', color: '#ffffff', intensity: 0.8, loop: false }, (p) => {
    modifyStatPercent(p, 'critChance', 0.15);
    modifyStatFlat(p, 'critMultiplier', 1.5);
});
export const GRAVITY_CURSE = createUpgrade('gravity_curse', 'Gravity Curse', '-25% move speed, +40% defense', 'HYBRID', 'COMMON', { type: 'DISTORTION', color: '#222244', intensity: 0.3, loop: true }, (p) => {
    modifyStatPercent(p, 'moveSpeed', -0.25);
    modifyStatPercent(p, 'defense', 0.4);
});
export const ALL_UPGRADES = [
    CRIMSON_FURY,
    VOID_HELMET,
    ECLIPSE_DAGGER,
    SOLAR_CORRUPTION,
    BROKEN_BLADE,
    DARK_KNIGHT_PROTOCOL,
    BAT_WINGS,
    BLOOD_HARVEST,
    ABYSS_VISION,
    SHADOW_CLONE,
    STELLAR_PRECISION,
    GRAVITY_CURSE
];
