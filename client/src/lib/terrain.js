import { LANDMARKS, MAP_RADIUS, getRealmAt } from './gameData';

// Shared terrain sampling in WORLD coordinates. The mesh (Terrain.jsx) and the
// player movement loop both call getTerrainHeight(worldX, worldZ) so feet always
// match the visible ground. Realm regions come from gameData.getRealmAt so the
// terrain biomes line up exactly with where the faction cities actually are.

const SETTLEMENT_TYPES = new Set(['capital', 'city', 'town', 'village', 'outpost']);

export function ridgeNoise(x, z) {
  const base = Math.sin(x * 0.0125) * 1.8 + Math.cos(z * 0.011) * 1.5;
  const detail = Math.sin((x + z) * 0.035) * 0.7 + Math.cos((x - z) * 0.05) * 0.45;
  const turbulence = Math.sin((x * 0.06) + (z * 0.045)) * 0.3;
  return base + detail + turbulence;
}

export function getNearestSettlement(x, z) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (let i = 0; i < LANDMARKS.length; i += 1) {
    const lm = LANDMARKS[i];
    if (!SETTLEMENT_TYPES.has(lm.type)) continue;
    const dx = x - lm.position[0];
    const dz = z - lm.position[2];
    const distance = Math.sqrt((dx * dx) + (dz * dz));
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = { landmark: lm, distance };
    }
  }
  return nearest;
}

const REALM_BASE = {
  war: (x, z) => (ridgeNoise(x, z) * 0.07) + 0.18,
  sun: (x, z) => (ridgeNoise(x, z) * 0.24) + 1.5 + Math.max(0, Math.sin(x * 0.02) * 0.5),
  shadow: (x, z) => (ridgeNoise(x, z) * 0.24) + 0.85 + Math.max(0, Math.cos((x + z) * 0.03) * 0.6),
  nature: (x, z) => (ridgeNoise(x, z) * 0.24) + 1.7 + Math.max(0, Math.cos(z * 0.025) * 0.7),
  frontier: (x, z) => (ridgeNoise(x, z) * 0.24) + 0.55
};

const SETTLEMENT_PAD = 1.0; // matches the building base (settlement group y = 1)

// Returns the terrain height at a WORLD position (x, z).
export function getTerrainHeight(x, z) {
  const realm = getRealmAt(x, z);
  let height = (REALM_BASE[realm] || REALM_BASE.frontier)(x, z);

  const dist = Math.sqrt((x * x) + (z * z));
  if (dist > MAP_RADIUS * 0.72) height += 0.3; // far rim hills

  // Settlement pad applied LAST so the whole footprint is a level platform at
  // y≈1 (building base) and structures never sink into raised biome terrain.
  const nearest = getNearestSettlement(x, z);
  if (nearest) {
    const r = nearest.landmark.type === 'capital' ? 66
      : nearest.landmark.type === 'city' ? 54
        : nearest.landmark.type === 'town' ? 42 : 32;
    if (nearest.distance < r) {
      const rim = 12;
      if (nearest.distance <= r - rim) return SETTLEMENT_PAD;
      const t = (nearest.distance - (r - rim)) / rim; // 0 at pad edge -> 1 at terrain
      return (SETTLEMENT_PAD * (1 - t)) + (height * t);
    }
  }

  return height;
}
