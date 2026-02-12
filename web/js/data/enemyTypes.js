/**
 * Enemy type definitions. Only slime and alien for now.
 * Extensible: add new entries for future mobs.
 */

export const ENEMY_TYPE_IDS = {
  SLIME: 'slime',
  ALIEN: 'alien',
};

/** Base stats per type. Difficulty multipliers applied by EnemyManager. */
export const ENEMY_TYPES = {
  [ENEMY_TYPE_IDS.SLIME]: {
    id: ENEMY_TYPE_IDS.SLIME,
    texKey: 'slime',
    hp: 8,
    speed: 0.1,
    damage: 1,
    xpDrop: 5,
    attackRange: 1.2,
    attackCooldown: 1.2,
    // Un poco más pequeño que el jugador (PLAYER_SIZE = 12)
    scale: 9,
    animated: false,
  },
  [ENEMY_TYPE_IDS.ALIEN]: {
    id: ENEMY_TYPE_IDS.ALIEN,
    texKey: 'alienIdle',
    hp: 12,
    speed: 0.18,
    damage: 1,
    xpDrop: 8,
    attackRange: 1.2,
    attackCooldown: 1.2,
    // Alien ligeramente más grande que el slime, pero aún menor que el jugador
    scale: 10,
    animated: true,
  },
};

export function getEnemyType(id) {
  return ENEMY_TYPES[id] || ENEMY_TYPES[ENEMY_TYPE_IDS.SLIME];
}

export function getAllEnemyTypeIds() {
  return Object.keys(ENEMY_TYPES);
}
