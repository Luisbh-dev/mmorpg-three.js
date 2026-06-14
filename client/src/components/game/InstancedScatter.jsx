import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { getTerrainHeight } from '../../lib/terrain';
import { isBlocked } from '../../lib/colliders';
import { LANDMARKS, ROADS, WAR_ZONE_RADIUS, WORLD_BOUNDARY, getRealmAt } from '../../lib/gameData';

const SETTLEMENT_TYPES = new Set(['capital', 'city', 'town', 'village', 'outpost']);
const SETTLEMENT_CLEAR = 30;
const ROAD_CLEAR = 7;
const CANDIDATES = 6000;
const BIOME_DENSITY = { nature: 0.85, sun: 0.45, shadow: 0.5, frontier: 0.4, war: 0 };

// Kenney Nature Kit (CC0) — colour-baked GLBs (no external texture). Base scale
// chosen from each model's measured height so trees stand ~5-6u tall.
const NK = '/assets/kenney/nature-kit';
const TYPES = {
  oak: { url: `${NK}/tree_oak.glb`, s: 5.0 },
  detailed: { url: `${NK}/tree_detailed.glb`, s: 4.6 },
  fat: { url: `${NK}/tree_fat.glb`, s: 4.6 },
  defaultTree: { url: `${NK}/tree_default.glb`, s: 5.0 },
  oakDark: { url: `${NK}/tree_oak_dark.glb`, s: 5.0 },
  thinDark: { url: `${NK}/tree_thin_dark.glb`, s: 4.4 },
  defaultDark: { url: `${NK}/tree_default_dark.glb`, s: 4.8 },
  detailedDark: { url: `${NK}/tree_detailed_dark.glb`, s: 4.6 },
  palm: { url: `${NK}/tree_palmShort.glb`, s: 5.5 },
  palmTall: { url: `${NK}/tree_palmTall.glb`, s: 4.5 },
  pine: { url: `${NK}/tree_pineRoundC.glb`, s: 4.2 },
  pineTall: { url: `${NK}/tree_pineTallB.glb`, s: 4.0 },
  simple: { url: `${NK}/tree_simple.glb`, s: 4.6 },
  thin: { url: `${NK}/tree_thin.glb`, s: 4.4 },
  cactusT: { url: `${NK}/cactus_tall.glb`, s: 4.6 },
  cactusS: { url: `${NK}/cactus_short.glb`, s: 4.0 },
  bushL: { url: `${NK}/plant_bushLarge.glb`, s: 5.0 },
  bushS: { url: `${NK}/plant_bushSmall.glb`, s: 4.0 },
  mushroom: { url: `${NK}/mushroom_redGroup.glb`, s: 3.4 },
  mushroomTan: { url: `${NK}/mushroom_tanGroup.glb`, s: 3.4 },
  flowerR: { url: `${NK}/flower_redA.glb`, s: 4.2 },
  flowerY: { url: `${NK}/flower_yellowA.glb`, s: 4.2 },
  flowerP: { url: `${NK}/flower_purpleA.glb`, s: 4.2 },
  grass: { url: `${NK}/grass_large.glb`, s: 4.0 },
  log: { url: `${NK}/log.glb`, s: 4.0 },
  rockLA: { url: `${NK}/rock_largeA.glb`, s: 3.6 },
  rockLB: { url: `${NK}/rock_largeB.glb`, s: 3.6 },
  rockLC: { url: `${NK}/rock_largeC.glb`, s: 3.6 },
  rockSA: { url: `${NK}/rock_smallA.glb`, s: 4.0 },
  rockSB: { url: `${NK}/rock_smallB.glb`, s: 4.0 }
};

// Weighted flora/rock palette per realm so each biome reads distinctly.
const PALETTE = {
  nature: [['oak', 4], ['detailed', 4], ['fat', 3], ['defaultTree', 2], ['bushL', 3], ['bushS', 2], ['mushroom', 2], ['flowerR', 1], ['flowerY', 1], ['flowerP', 1], ['grass', 3], ['rockSA', 1]],
  sun: [['palm', 2], ['palmTall', 1], ['cactusT', 3], ['cactusS', 3], ['rockLB', 2], ['rockSA', 2], ['grass', 1], ['simple', 1]],
  shadow: [['oakDark', 3], ['thinDark', 4], ['defaultDark', 3], ['detailedDark', 2], ['log', 2], ['mushroomTan', 1], ['rockLC', 2], ['rockSB', 1]],
  frontier: [['pine', 2], ['pineTall', 1], ['simple', 2], ['thin', 1], ['bushS', 2], ['rockSB', 2], ['rockLA', 1], ['grass', 1]]
};

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pickWeighted(palette, rng) {
  let total = 0;
  for (let i = 0; i < palette.length; i += 1) total += palette[i][1];
  let r = rng() * total;
  for (let i = 0; i < palette.length; i += 1) {
    r -= palette[i][1];
    if (r <= 0) return palette[i][0];
  }
  return palette[0][0];
}

function distToSegment(px, pz, x1, z1, x2, z2) {
  const vx = x2 - x1;
  const vz = z2 - z1;
  const lenSq = (vx * vx) + (vz * vz);
  let t = lenSq < 1e-6 ? 0 : (((px - x1) * vx) + ((pz - z1) * vz)) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + (vx * t)), pz - (z1 + (vz * t)));
}

function nearRoad(x, z) {
  for (let r = 0; r < ROADS.length; r += 1) {
    const pts = ROADS[r].points;
    for (let i = 0; i < pts.length - 1; i += 1) {
      if (distToSegment(x, z, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) < ROAD_CLEAR) return true;
    }
  }
  return false;
}

const CELL = 220; // scatter is bucketed into cells so far chunks can be culled
const cellKey = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;

// Returns { [cellKey]: { center:[x,z], byUrl: { [url]: [transforms] } } } so we can
// render only the cells near the player (streaming) instead of the whole map.
function generateScatter() {
  const rng = makeRng(0x5eed);
  const settlements = LANDMARKS.filter((l) => SETTLEMENT_TYPES.has(l.type));
  const cells = {};

  for (let i = 0; i < CANDIDATES; i += 1) {
    const x = (rng() * 2 - 1) * WORLD_BOUNDARY;
    const z = (rng() * 2 - 1) * WORLD_BOUNDARY;
    const d = Math.hypot(x, z);
    if (d > WORLD_BOUNDARY - 5 || d < WAR_ZONE_RADIUS + 16) continue;
    if (isBlocked(x, z, 2)) continue;
    if (nearRoad(x, z)) continue;

    let nearSettlement = false;
    for (let s = 0; s < settlements.length; s += 1) {
      const sp = settlements[s].position;
      if (Math.hypot(x - sp[0], z - sp[2]) < SETTLEMENT_CLEAR) { nearSettlement = true; break; }
    }
    if (nearSettlement) continue;

    const zone = getRealmAt(x, z);
    const palette = PALETTE[zone];
    if (!palette) continue;
    if (rng() > (BIOME_DENSITY[zone] ?? 0.5)) continue;

    const typeKey = pickWeighted(palette, rng);
    const type = TYPES[typeKey];
    if (!type) continue;
    const rotY = rng() * Math.PI * 2;
    const scale = type.s * (0.82 + (rng() * 0.5));
    const y = getTerrainHeight(x, z);

    const key = cellKey(x, z);
    let cell = cells[key];
    if (!cell) { cell = cells[key] = { cx: (Math.floor(x / CELL) + 0.5) * CELL, cz: (Math.floor(z / CELL) + 0.5) * CELL, byUrl: {} }; }
    if (!cell.byUrl[type.url]) cell.byUrl[type.url] = [];
    cell.byUrl[type.url].push({ x, y, z, rotY, scale });
  }

  return cells;
}

function InstancedSubmesh({ geometry, material, local, transforms }) {
  const ref = useRef();

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const result = new THREE.Matrix4();
    const instance = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const euler = new THREE.Euler();

    transforms.forEach((t, idx) => {
      euler.set(0, t.rotY, 0);
      quat.setFromEuler(euler);
      pos.set(t.x, t.y, t.z);
      scl.set(t.scale, t.scale, t.scale);
      instance.compose(pos, quat, scl);
      result.multiplyMatrices(instance, local);
      mesh.setMatrixAt(idx, result);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [geometry, material, local, transforms]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, transforms.length]}
      castShadow={false}
      receiveShadow={false}
      frustumCulled={false}
    />
  );
}

function InstancedGLB({ url, transforms }) {
  const { scene } = useGLTF(url);

  const submeshes = useMemo(() => {
    const result = [];
    scene.updateMatrixWorld(true);
    scene.traverse((node) => {
      if (node.isMesh && node.geometry) {
        result.push({ geometry: node.geometry, material: node.material, matrix: node.matrixWorld.clone() });
      }
    });
    return result;
  }, [scene]);

  if (!transforms.length) return null;

  return submeshes.map((sm, i) => (
    <InstancedSubmesh key={i} geometry={sm.geometry} material={sm.material} local={sm.matrix} transforms={transforms} />
  ));
}

const SCATTER_DIST = 460; // only render flora cells within this radius of the player

const InstancedScatter = ({ center = [0, 0, 0] }) => {
  const cells = useMemo(() => generateScatter(), []);

  // Only the cells near the player render; keyed by cell so unchanged cells are
  // not rebuilt as the player moves (streaming in/out at the edges).
  const visible = useMemo(() => {
    const cx = center[0];
    const cz = center[2];
    const lim = (SCATTER_DIST + CELL) * (SCATTER_DIST + CELL);
    return Object.entries(cells).filter(([, cell]) => {
      const dx = cell.cx - cx;
      const dz = cell.cz - cz;
      return (dx * dx + dz * dz) < lim;
    });
  }, [cells, center]);

  return (
    <group>
      {visible.map(([key, cell]) => (
        Object.entries(cell.byUrl).map(([url, transforms]) => (
          <InstancedGLB key={`${key}|${url}`} url={url} transforms={transforms} />
        ))
      ))}
    </group>
  );
};

// Preload every model we scatter.
Object.values(TYPES).forEach((t) => useGLTF.preload(t.url));

export default InstancedScatter;
