import { MAP_RADIUS, POINTS_OF_INTEREST, WAR_ZONE_RADIUS, WORLD_BOUNDARY } from './gameData';

// --- Static world geometry shared by rendering (World.jsx) and collision ---

const NUM_SEGMENTS = 28;
const ANGLE_STEP = (Math.PI * 2) / NUM_SEGMENTS;
const GATE_SIZE = 0.18;

// The war-zone ring wall with 4 cardinal gate gaps. Generated once; World.jsx
// imports this to render <Wall>. (No radial walls — the open world is freely
// roamable; only the central PvP ring is gated.)
export const WALLS = [];

for (let i = 0; i < NUM_SEGMENTS; i += 1) {
  const angle = i * ANGLE_STEP;
  const isGate =
    Math.abs(angle - 0) < GATE_SIZE ||
    Math.abs(angle - Math.PI / 2) < GATE_SIZE ||
    Math.abs(angle - Math.PI) < GATE_SIZE ||
    Math.abs(angle - (3 * Math.PI) / 2) < GATE_SIZE;

  if (!isGate) {
    const x = Math.sin(angle) * WAR_ZONE_RADIUS;
    const z = Math.cos(angle) * WAR_ZONE_RADIUS;
    const length = (2 * WAR_ZONE_RADIUS * Math.sin(ANGLE_STEP / 2)) + 1.5;
    WALLS.push({ position: [x, 0, z], rotation: angle, length });
  }
}

// --- Collider registry ---

const PLAYER_R = 0.6;
const WALL_R = 1.1; // half wall thickness + a little margin

// Circle colliders: only points of interest. Settlements stay enterable (town
// NPCs live inside them) and the central fortress/arena are NOT blocked because
// the control-point beacons sit on top of them and must be stood on to capture.
const CIRCLES = POINTS_OF_INTEREST.map((poi) => ({
  x: poi.position[0],
  z: poi.position[2],
  r: poi.radius || 4
}));

// Segment (capsule) colliders derived from the wall pieces. A wall is a box of
// `length` along its local X axis, rotated `rotation` about Y, centered at
// `position`. Local +X maps to world (cos(rot), -sin(rot)).
const SEGMENTS = WALLS.map((wall) => {
  const half = wall.length / 2;
  const dirX = Math.cos(wall.rotation);
  const dirZ = -Math.sin(wall.rotation);
  return {
    x1: wall.position[0] - (dirX * half),
    z1: wall.position[2] - (dirZ * half),
    x2: wall.position[0] + (dirX * half),
    z2: wall.position[2] + (dirZ * half),
    r: WALL_R
  };
});

function closestPointOnSegment(px, pz, seg) {
  const vx = seg.x2 - seg.x1;
  const vz = seg.z2 - seg.z1;
  const lenSq = (vx * vx) + (vz * vz);
  if (lenSq < 1e-6) return { x: seg.x1, z: seg.z1 };
  let t = (((px - seg.x1) * vx) + ((pz - seg.z1) * vz)) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: seg.x1 + (vx * t), z: seg.z1 + (vz * t) };
}

function pushOutOfColliders(px, pz) {
  let nx = px;
  let nz = pz;

  for (let i = 0; i < CIRCLES.length; i += 1) {
    const c = CIRCLES[i];
    const ox = nx - c.x;
    const oz = nz - c.z;
    const dist = Math.hypot(ox, oz);
    const minDist = c.r + PLAYER_R;
    if (dist < minDist && dist > 1e-4) {
      const push = minDist - dist;
      nx += (ox / dist) * push;
      nz += (oz / dist) * push;
    }
  }

  for (let i = 0; i < SEGMENTS.length; i += 1) {
    const s = SEGMENTS[i];
    const cp = closestPointOnSegment(nx, nz, s);
    const ox = nx - cp.x;
    const oz = nz - cp.z;
    const dist = Math.hypot(ox, oz);
    const minDist = s.r + PLAYER_R;
    if (dist < minDist && dist > 1e-4) {
      const push = minDist - dist;
      nx += (ox / dist) * push;
      nz += (oz / dist) * push;
    }
  }

  return { x: nx, z: nz };
}

// Apply a move (dx, dz) from (x, z) and resolve collisions by sliding (push out
// along the penetration normal, which preserves tangential motion).
export function resolveMove(x, z, dx, dz) {
  let nx = x + dx;
  let nz = z + dz;

  // Circular world boundary.
  const maxR = WORLD_BOUNDARY - PLAYER_R;
  const d = Math.hypot(nx, nz);
  if (d > maxR && d > 1e-4) {
    const s = maxR / d;
    nx *= s;
    nz *= s;
  }

  // Two passes so corners (circle + segment overlap) settle cleanly.
  ({ x: nx, z: nz } = pushOutOfColliders(nx, nz));
  ({ x: nx, z: nz } = pushOutOfColliders(nx, nz));

  return { x: nx, z: nz };
}

// Whether a world point is inside (or within `margin` of) any collider. Used by
// scatter generation so trees/rocks don't spawn on top of walls or set-pieces.
export function isBlocked(x, z, margin = 0) {
  for (let i = 0; i < CIRCLES.length; i += 1) {
    const c = CIRCLES[i];
    if (Math.hypot(x - c.x, z - c.z) < c.r + margin) return true;
  }
  for (let i = 0; i < SEGMENTS.length; i += 1) {
    const s = SEGMENTS[i];
    const cp = closestPointOnSegment(x, z, s);
    if (Math.hypot(x - cp.x, z - cp.z) < s.r + margin) return true;
  }
  return false;
}
