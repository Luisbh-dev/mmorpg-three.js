import React, { useMemo } from 'react';
import { Billboard, Text, useGLTF } from '@react-three/drei';
import { getFactionMeta } from '../../lib/gameData';

const ROOT = '/assets/kenney';

const PATHS = {
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

function AssetModel({ path, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  const { scene } = useGLTF(path);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  return <primitive object={cloned} position={position} rotation={rotation} scale={scale} />;
}

function SettlementLabel({ title, subtitle, accent }) {
  return (
    <Billboard position={[0, 10.5, 0]}>
      <group>
        <Text fontSize={0.78} color="#f8f4ea" outlineWidth={0.03} outlineColor="#000000">
          {title}
        </Text>
        <Text position={[0, -0.62, 0]} fontSize={0.28} color={accent} outlineWidth={0.02} outlineColor="#000000">
          {subtitle}
        </Text>
      </group>
    </Billboard>
  );
}

function SettlementFoundation({ landmark, accent }) {
  const baseScale = landmark.type === 'capital' ? 12 : landmark.type === 'city' ? 10 : landmark.type === 'town' ? 7.5 : 5.5;
  return (
    <>
      <AssetModel path={PATHS.castle.ground} scale={baseScale} position={[0, 0.1, 0]} />
      <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[landmark.type === 'capital' ? 13 : 10, 36]} />
        <meshStandardMaterial color={accent} transparent opacity={0.08} />
      </mesh>
    </>
  );
}

function renderCapital(landmark, accent, glow) {
  const wallRadius = 14.5;
  const wallHeight = 2.2;
  const wallScale = 1.8;
  const sidePieces = [
    [-11, 0, -wallRadius, 0],
    [11, 0, -wallRadius, 0],
    [-11, 0, wallRadius, Math.PI],
    [11, 0, wallRadius, Math.PI],
    [-wallRadius, 0, -11, Math.PI / 2],
    [-wallRadius, 0, 11, Math.PI / 2],
    [wallRadius, 0, -11, -Math.PI / 2],
    [wallRadius, 0, 11, -Math.PI / 2]
  ];

  return (
    <>
      <SettlementFoundation landmark={landmark} accent={accent} />
      {sidePieces.map(([x, y, z, rot], index) => (
        <AssetModel
          key={`wall-${index}`}
          path={PATHS.castle.wall}
          position={[x, y, z]}
          rotation={[0, rot, 0]}
          scale={wallScale}
        />
      ))}
      <AssetModel path={PATHS.castle.gate} position={[0, 0, -wallRadius - 1.9]} rotation={[0, Math.PI, 0]} scale={2.3} />
      <AssetModel path={PATHS.castle.towerBase} position={[-wallRadius, 0, -wallRadius]} scale={1.9} />
      <AssetModel path={PATHS.castle.towerMid} position={[-wallRadius, 2.2, -wallRadius]} scale={1.7} />
      <AssetModel path={PATHS.castle.towerTop} position={[-wallRadius, 4.8, -wallRadius]} scale={1.5} />
      <AssetModel path={PATHS.castle.towerPeak} position={[-wallRadius, 6.1, -wallRadius]} scale={1.7} />

      <AssetModel path={PATHS.castle.towerBase} position={[wallRadius, 0, -wallRadius]} scale={1.9} />
      <AssetModel path={PATHS.castle.towerMid} position={[wallRadius, 2.2, -wallRadius]} scale={1.7} />
      <AssetModel path={PATHS.castle.towerTop} position={[wallRadius, 4.8, -wallRadius]} scale={1.5} />
      <AssetModel path={PATHS.castle.towerPeak} position={[wallRadius, 6.1, -wallRadius]} scale={1.7} />

      <AssetModel path={PATHS.castle.towerBase} position={[-wallRadius, 0, wallRadius]} scale={1.9} />
      <AssetModel path={PATHS.castle.towerMid} position={[-wallRadius, 2.2, wallRadius]} scale={1.7} />
      <AssetModel path={PATHS.castle.towerTop} position={[-wallRadius, 4.8, wallRadius]} scale={1.5} />
      <AssetModel path={PATHS.castle.towerPeak} position={[-wallRadius, 6.1, wallRadius]} scale={1.7} />

      <AssetModel path={PATHS.castle.towerBase} position={[wallRadius, 0, wallRadius]} scale={1.9} />
      <AssetModel path={PATHS.castle.towerMid} position={[wallRadius, 2.2, wallRadius]} scale={1.7} />
      <AssetModel path={PATHS.castle.towerTop} position={[wallRadius, 4.8, wallRadius]} scale={1.5} />
      <AssetModel path={PATHS.castle.towerPeak} position={[wallRadius, 6.1, wallRadius]} scale={1.7} />

      <AssetModel path={PATHS.roads.square} position={[0, 0.12, 0]} scale={4.4} />
      <AssetModel path={PATHS.roads.straight} position={[0, 0.12, -8]} rotation={[0, 0, 0]} scale={2.7} />
      <AssetModel path={PATHS.roads.straight} position={[0, 0.12, 8]} rotation={[0, 0, Math.PI]} scale={2.7} />
      <AssetModel path={PATHS.roads.crossroad} position={[0, 0.12, 0]} scale={2.4} />

      <AssetModel path={PATHS.buildings.sampleTowerA} position={[-6, 0, -5]} scale={2.2} />
      <AssetModel path={PATHS.buildings.sampleTowerB} position={[6, 0, -5]} scale={2.1} />
      <AssetModel path={PATHS.buildings.sampleHouseA} position={[-7, 0, 5]} rotation={[0, Math.PI / 2, 0]} scale={2} />
      <AssetModel path={PATHS.buildings.sampleHouseB} position={[7, 0, 5]} rotation={[0, -Math.PI / 2, 0]} scale={2} />
      <AssetModel path={PATHS.buildings.sampleHouseC} position={[0, 0, 7.5]} rotation={[0, Math.PI, 0]} scale={2.2} />
      <AssetModel path={PATHS.buildings.sampleHouseA} position={[-2.5, 0, -8.5]} rotation={[0, 0.6, 0]} scale={1.6} />
      <AssetModel path={PATHS.buildings.sampleHouseC} position={[3, 0, -8]} rotation={[0, -0.4, 0]} scale={1.6} />

      <AssetModel path={PATHS.castle.banner} position={[-wallRadius, 6.5, -wallRadius]} rotation={[0, 0, 0]} scale={1.6} />
      <AssetModel path={PATHS.castle.banner} position={[wallRadius, 6.5, -wallRadius]} rotation={[0, Math.PI, 0]} scale={1.6} />
      <AssetModel path={PATHS.castle.banner} position={[-wallRadius, 6.5, wallRadius]} rotation={[0, 0, 0]} scale={1.6} />
      <AssetModel path={PATHS.castle.banner} position={[wallRadius, 6.5, wallRadius]} rotation={[0, Math.PI, 0]} scale={1.6} />

      <AssetModel path={PATHS.castle.treeLarge} position={[-18, 0, 16]} scale={2.4} />
      <AssetModel path={PATHS.castle.treeSmall} position={[18, 0, 16]} scale={2} />
      <AssetModel path={PATHS.castle.rockLarge} position={[-17, 0, -15]} scale={2.4} />
      <AssetModel path={PATHS.castle.rockSmall} position={[16, 0, -16]} scale={2.1} />

      <pointLight position={[0, 8, 0]} intensity={9} color={glow} distance={34} />
    </>
  );
}

function renderCity(landmark, accent, glow) {
  return (
    <>
      <SettlementFoundation landmark={landmark} accent={accent} />
      <AssetModel path={PATHS.roads.crossroad} position={[0, 0.11, 0]} scale={3.1} />
      <AssetModel path={PATHS.roads.intersection} position={[0, 0.11, 0]} scale={2.7} />
      <AssetModel path={PATHS.roads.square} position={[0, 0.11, 0]} scale={3.4} />

      <AssetModel path={PATHS.buildings.block} position={[-10, 0, -6]} scale={2.2} />
      <AssetModel path={PATHS.buildings.corner} position={[10, 0, -6]} rotation={[0, Math.PI / 2, 0]} scale={2.2} />
      <AssetModel path={PATHS.buildings.door} position={[-10, 0, 8]} scale={2} />
      <AssetModel path={PATHS.buildings.window} position={[10, 0, 8]} scale={2} />
      <AssetModel path={PATHS.buildings.windows} position={[0, 0, -14]} rotation={[0, Math.PI / 2, 0]} scale={1.8} />
      <AssetModel path={PATHS.buildings.sampleHouseA} position={[-15, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={1.8} />
      <AssetModel path={PATHS.buildings.sampleHouseB} position={[15, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={1.8} />
      <AssetModel path={PATHS.buildings.sampleHouseC} position={[0, 0, 15]} rotation={[0, Math.PI, 0]} scale={1.8} />
      <AssetModel path={PATHS.buildings.sampleTowerA} position={[0, 0, -18]} scale={1.8} />
      <AssetModel path={PATHS.buildings.sampleTowerB} position={[-5, 0, 12]} scale={1.6} />

      <AssetModel path={PATHS.roads.sideEntry} position={[0, 0.11, -18]} scale={1.8} />
      <AssetModel path={PATHS.roads.sideExit} position={[0, 0.11, 18]} rotation={[0, Math.PI, 0]} scale={1.8} />
      <AssetModel path={PATHS.roads.light} position={[-6, 0, -3]} scale={1.2} />
      <AssetModel path={PATHS.roads.light} position={[6, 0, 3]} scale={1.2} />

      <pointLight position={[0, 7.5, 0]} intensity={7} color={glow} distance={28} />
    </>
  );
}

function renderTown(landmark, accent, glow) {
  return (
    <>
      <SettlementFoundation landmark={landmark} accent={accent} />
      <AssetModel path={PATHS.roads.square} position={[0, 0.11, 0]} scale={2.2} />
      <AssetModel path={PATHS.roads.side} position={[0, 0.11, -6]} scale={1.2} />
      <AssetModel path={PATHS.buildings.sampleHouseA} position={[-6, 0, -2]} scale={1.35} />
      <AssetModel path={PATHS.buildings.sampleHouseB} position={[6, 0, -1]} rotation={[0, Math.PI / 2, 0]} scale={1.35} />
      <AssetModel path={PATHS.buildings.sampleHouseC} position={[0, 0, 7]} rotation={[0, Math.PI, 0]} scale={1.25} />
      <AssetModel path={PATHS.buildings.block} position={[-7, 0, 7]} scale={1.2} />
      <AssetModel path={PATHS.buildings.window} position={[7, 0, 7]} scale={1.1} />
      <AssetModel path={PATHS.roads.light} position={[0, 0, 0]} scale={1} />
      <pointLight position={[0, 5.2, 0]} intensity={5} color={glow} distance={20} />
    </>
  );
}

function renderVillage(landmark, accent, glow) {
  return (
    <>
      <SettlementFoundation landmark={landmark} accent={accent} />
      <AssetModel path={PATHS.roads.end} position={[0, 0.11, 0]} scale={1.2} />
      <AssetModel path={PATHS.buildings.sampleHouseA} position={[-3.6, 0, 0]} scale={1.1} />
      <AssetModel path={PATHS.buildings.sampleHouseB} position={[3.6, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={1.05} />
      <AssetModel path={PATHS.buildings.door} position={[0, 0, 4]} scale={1} />
      <AssetModel path={PATHS.castle.treeSmall} position={[-6, 0, -5]} scale={1.5} />
      <AssetModel path={PATHS.castle.treeSmall} position={[6, 0, -4]} scale={1.4} />
      <pointLight position={[0, 4.5, 0]} intensity={4} color={glow} distance={16} />
    </>
  );
}

function renderOutpost(landmark, accent, glow) {
  return (
    <>
      <SettlementFoundation landmark={landmark} accent={accent} />
      <AssetModel path={PATHS.castle.gate} position={[0, 0, -5]} scale={1.4} />
      <AssetModel path={PATHS.castle.wallHalf} position={[-6, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={1.3} />
      <AssetModel path={PATHS.castle.wallHalf} position={[6, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={1.3} />
      <AssetModel path={PATHS.castle.towerBase} position={[0, 0, 5]} scale={1.3} />
      <AssetModel path={PATHS.castle.towerMid} position={[0, 1.6, 5]} scale={1.2} />
      <AssetModel path={PATHS.castle.towerTop} position={[0, 3.8, 5]} scale={1.1} />
      <AssetModel path={PATHS.roads.end} position={[0, 0.11, -9]} rotation={[0, Math.PI, 0]} scale={1.1} />
      <pointLight position={[0, 6, 0]} intensity={4.5} color={glow} distance={18} />
    </>
  );
}

const Settlement = ({ landmark }) => {
  const meta = getFactionMeta(landmark.faction);
  const accent = meta.color;
  const glow = meta.glow;

  return (
    <group position={landmark.position}>
      {landmark.type === 'capital' && renderCapital(landmark, accent, glow)}
      {landmark.type === 'city' && renderCity(landmark, accent, glow)}
      {landmark.type === 'town' && renderTown(landmark, accent, glow)}
      {landmark.type === 'village' && renderVillage(landmark, accent, glow)}
      {landmark.type === 'outpost' && renderOutpost(landmark, accent, glow)}
      <SettlementLabel title={landmark.name} subtitle={landmark.shortName} accent={accent} />
    </group>
  );
};

useGLTF.preload(PATHS.castle.gate);
useGLTF.preload(PATHS.castle.wall);
useGLTF.preload(PATHS.castle.wallCorner);
useGLTF.preload(PATHS.castle.wallHalf);
useGLTF.preload(PATHS.castle.wallPillar);
useGLTF.preload(PATHS.castle.towerBase);
useGLTF.preload(PATHS.castle.towerMid);
useGLTF.preload(PATHS.castle.towerTop);
useGLTF.preload(PATHS.castle.towerPeak);
useGLTF.preload(PATHS.castle.banner);
useGLTF.preload(PATHS.castle.ground);
useGLTF.preload(PATHS.castle.treeSmall);
useGLTF.preload(PATHS.castle.treeLarge);
useGLTF.preload(PATHS.castle.rockSmall);
useGLTF.preload(PATHS.castle.rockLarge);
useGLTF.preload(PATHS.buildings.sampleHouseA);
useGLTF.preload(PATHS.buildings.sampleHouseB);
useGLTF.preload(PATHS.buildings.sampleHouseC);
useGLTF.preload(PATHS.buildings.sampleTowerA);
useGLTF.preload(PATHS.buildings.sampleTowerB);
useGLTF.preload(PATHS.buildings.block);
useGLTF.preload(PATHS.buildings.corner);
useGLTF.preload(PATHS.buildings.door);
useGLTF.preload(PATHS.buildings.window);
useGLTF.preload(PATHS.buildings.windows);
useGLTF.preload(PATHS.buildings.roofGable);
useGLTF.preload(PATHS.buildings.roofSlanted);
useGLTF.preload(PATHS.roads.crossroad);
useGLTF.preload(PATHS.roads.square);
useGLTF.preload(PATHS.roads.straight);
useGLTF.preload(PATHS.roads.curve);
useGLTF.preload(PATHS.roads.intersection);
useGLTF.preload(PATHS.roads.side);
useGLTF.preload(PATHS.roads.sideEntry);
useGLTF.preload(PATHS.roads.sideExit);
useGLTF.preload(PATHS.roads.end);
useGLTF.preload(PATHS.roads.bend);
useGLTF.preload(PATHS.roads.split);
useGLTF.preload(PATHS.roads.light);
useGLTF.preload(PATHS.roads.sign);

export default Settlement;
