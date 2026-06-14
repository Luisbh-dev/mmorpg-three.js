import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

// Shared Kenney GLB kit paths + loader. Imported by Settlement, CentralStructures
// and InstancedScatter so we only declare and preload each asset once.

const ROOT = '/assets/kenney';

export const PATHS = {
  castle: {
    gate: `${ROOT}/castle-kit/gate.glb`,
    wall: `${ROOT}/castle-kit/wall.glb`,
    wallCorner: `${ROOT}/castle-kit/wall-corner.glb`,
    wallHalf: `${ROOT}/castle-kit/wall-half.glb`,
    wallPillar: `${ROOT}/castle-kit/wall-pillar.glb`,
    towerBase: `${ROOT}/castle-kit/tower-square-base.glb`,
    towerMid: `${ROOT}/castle-kit/tower-square-mid.glb`,
    towerTop: `${ROOT}/castle-kit/tower-square-top.glb`,
    towerPeak: `${ROOT}/castle-kit/tower-top.glb`,
    banner: `${ROOT}/castle-kit/flag-banner-long.glb`,
    ground: `${ROOT}/castle-kit/ground-hills.glb`,
    treeSmall: `${ROOT}/castle-kit/tree-small.glb`,
    treeLarge: `${ROOT}/castle-kit/tree-large.glb`,
    rockSmall: `${ROOT}/castle-kit/rocks-small.glb`,
    rockLarge: `${ROOT}/castle-kit/rocks-large.glb`
  },
  buildings: {
    block: `${ROOT}/modular-buildings/building-block.glb`,
    corner: `${ROOT}/modular-buildings/building-corner.glb`,
    door: `${ROOT}/modular-buildings/building-door.glb`,
    window: `${ROOT}/modular-buildings/building-window.glb`,
    windows: `${ROOT}/modular-buildings/building-windows.glb`,
    sampleHouseA: `${ROOT}/modular-buildings/building-sample-house-a.glb`,
    sampleHouseB: `${ROOT}/modular-buildings/building-sample-house-b.glb`,
    sampleHouseC: `${ROOT}/modular-buildings/building-sample-house-c.glb`,
    sampleTowerA: `${ROOT}/modular-buildings/building-sample-tower-a.glb`,
    sampleTowerB: `${ROOT}/modular-buildings/building-sample-tower-b.glb`,
    roofGable: `${ROOT}/modular-buildings/roof-gable.glb`,
    roofSlanted: `${ROOT}/modular-buildings/roof-slanted.glb`
  },
  roads: {
    straight: `${ROOT}/city-kit-roads/road-straight.glb`,
    curve: `${ROOT}/city-kit-roads/road-curve.glb`,
    crossroad: `${ROOT}/city-kit-roads/road-crossroad.glb`,
    intersection: `${ROOT}/city-kit-roads/road-intersection.glb`,
    end: `${ROOT}/city-kit-roads/road-end.glb`,
    split: `${ROOT}/city-kit-roads/road-split.glb`,
    square: `${ROOT}/city-kit-roads/road-square.glb`,
    bend: `${ROOT}/city-kit-roads/road-bend.glb`,
    side: `${ROOT}/city-kit-roads/road-side.glb`,
    sideEntry: `${ROOT}/city-kit-roads/road-side-entry.glb`,
    sideExit: `${ROOT}/city-kit-roads/road-side-exit.glb`,
    light: `${ROOT}/city-kit-roads/light-square.glb`,
    sign: `${ROOT}/city-kit-roads/sign-highway-wide.glb`
  }
};

export function AssetModel({ path, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  const { scene } = useGLTF(path);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} position={position} rotation={rotation} scale={scale} />;
}

Object.values(PATHS).forEach((group) => {
  Object.values(group).forEach((path) => useGLTF.preload(path));
});
