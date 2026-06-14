import React from 'react';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { getFactionMeta } from '../../lib/gameData';
import { AssetModel, PATHS } from './kenneyAssets';

const castle = PATHS.castle;
const buildings = PATHS.buildings;
const roads = PATHS.roads;

function StructureLabel({ title, accent }) {
  return (
    <Billboard position={[0, 9.5, 0]}>
      <Text fontSize={0.62} color="#f8f4ea" outlineWidth={0.03} outlineColor="#000000">
        {title}
      </Text>
    </Billboard>
  );
}

function StoneFoundation({ radius, accent }) {
  return (
    <>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[radius, 40]} />
        <meshStandardMaterial color="#6f6358" roughness={1} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[radius - 1.4, radius, 40]} />
        <meshBasicMaterial color={accent} transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

function CornerTower({ position, scale = 1.7 }) {
  const [x, , z] = position;
  return (
    <group>
      <AssetModel path={castle.towerBase} position={[x, 0, z]} scale={scale} />
      <AssetModel path={castle.towerMid} position={[x, 2.0 * scale, z]} scale={scale * 0.92} />
      <AssetModel path={castle.towerTop} position={[x, 4.2 * scale, z]} scale={scale * 0.82} />
      <AssetModel path={castle.towerPeak} position={[x, 5.4 * scale, z]} scale={scale * 0.9} />
    </group>
  );
}

function renderFortress(landmark, meta) {
  const r = 6.5;
  return (
    <group position={landmark.position}>
      <StoneFoundation radius={r + 3} accent={meta.color} />
      <CornerTower position={[-r, 0, -r]} />
      <CornerTower position={[r, 0, -r]} />
      <CornerTower position={[-r, 0, r]} />
      <CornerTower position={[r, 0, r]} />

      <AssetModel path={castle.wall} position={[0, 0, -r]} scale={1.7} />
      <AssetModel path={castle.wall} position={[0, 0, r]} rotation={[0, Math.PI, 0]} scale={1.7} />
      <AssetModel path={castle.wall} position={[-r, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={1.7} />
      <AssetModel path={castle.gate} position={[r + 0.4, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={2.1} />

      <AssetModel path={buildings.sampleTowerA} position={[0, 0, 0]} scale={2.6} />

      <AssetModel path={castle.banner} position={[-r, 4.6, -r]} scale={1.5} />
      <AssetModel path={castle.banner} position={[r, 4.6, -r]} rotation={[0, Math.PI, 0]} scale={1.5} />
      <AssetModel path={castle.banner} position={[-r, 4.6, r]} scale={1.5} />
      <AssetModel path={castle.banner} position={[r, 4.6, r]} rotation={[0, Math.PI, 0]} scale={1.5} />

      <pointLight position={[0, 9, 0]} intensity={11} color={meta.glow} distance={30} />
      <StructureLabel title={landmark.name} accent={meta.color} />
    </group>
  );
}

function renderArena(landmark, meta) {
  const r = 7;
  const pieces = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * Math.PI * 2;
    return {
      x: Math.sin(angle) * r,
      z: Math.cos(angle) * r,
      rot: angle + Math.PI / 2
    };
  });

  return (
    <group position={landmark.position}>
      <StoneFoundation radius={r + 2.5} accent={meta.color} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]} receiveShadow>
        <torusGeometry args={[r - 1.2, 0.26, 16, 40]} />
        <meshBasicMaterial color={meta.color} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {pieces.map((p, i) => (
        <AssetModel key={i} path={i % 3 === 0 ? castle.towerBase : castle.wallPillar} position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]} scale={1.5} />
      ))}

      <AssetModel path={roads.square} position={[0, 0.14, 0]} scale={3.2} />
      <AssetModel path={buildings.sampleTowerB} position={[0, 0, 0]} scale={1.8} />

      <pointLight position={[0, 7, 0]} intensity={11} color={meta.glow} distance={28} />
      <StructureLabel title={landmark.name} accent={meta.color} />
    </group>
  );
}

function renderGate(landmark, meta) {
  return (
    <group position={landmark.position}>
      <AssetModel path={castle.gate} position={[0, 0, 0]} scale={2.6} />
      <AssetModel path={castle.wallPillar} position={[-2.6, 0, 0]} scale={1.6} />
      <AssetModel path={castle.wallPillar} position={[2.6, 0, 0]} scale={1.6} />
      <AssetModel path={castle.banner} position={[-2.6, 3.4, 0]} scale={1.3} />
      <AssetModel path={castle.banner} position={[2.6, 3.4, 0]} rotation={[0, Math.PI, 0]} scale={1.3} />
      <pointLight position={[0, 4.5, 0]} intensity={5} color={meta.glow} distance={18} />
      <StructureLabel title={landmark.name} accent={meta.color} />
    </group>
  );
}

function renderRuins(landmark, meta) {
  return (
    <group position={landmark.position}>
      <StoneFoundation radius={6} accent={meta.color} />
      <AssetModel path={castle.wallCorner} position={[-1.5, 0, -1.5]} scale={1.6} />
      <AssetModel path={castle.wallHalf} position={[2, 0, -1]} rotation={[0, 0.4, 0]} scale={1.4} />
      <AssetModel path={castle.rockLarge} position={[1.5, 0, 2]} scale={2} />
      <AssetModel path={castle.rockSmall} position={[-2, 0, 2]} scale={1.7} />
      <AssetModel path={castle.wallPillar} position={[0, 0, 0]} scale={1.3} />
      <pointLight position={[0, 3.5, 0]} intensity={3} color={meta.glow} distance={14} />
      <StructureLabel title={landmark.name} accent={meta.color} />
    </group>
  );
}

export function renderCentralStructure(landmark) {
  const meta = getFactionMeta(landmark.faction);

  if (landmark.type === 'fortress') return renderFortress(landmark, meta);
  if (landmark.type === 'arena') return renderArena(landmark, meta);
  if (landmark.type === 'gate') return renderGate(landmark, meta);
  return renderRuins(landmark, meta);
}

export default renderCentralStructure;
