import React from 'react';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { getFactionMeta } from '../../lib/gameData';
import { AssetModel, PATHS } from './kenneyAssets';

function SettlementLabel({ title, subtitle, themeLabel, accent }) {
  return (
    <Billboard position={[0, 10.5, 0]}>
      <group>
        <Text fontSize={0.78} color="#f8f4ea" outlineWidth={0.03} outlineColor="#000000">
          {title}
        </Text>
        <Text position={[0, -0.62, 0]} fontSize={0.28} color={accent} outlineWidth={0.02} outlineColor="#000000">
          {subtitle}
        </Text>
        {themeLabel ? (
          <Text position={[0, -1.0, 0]} fontSize={0.24} color="#cdbfa4" outlineWidth={0.015} outlineColor="#000000">
            {themeLabel}
          </Text>
        ) : null}
      </group>
    </Billboard>
  );
}

// A distinct focal monument per city theme (built from primitives so it adds
// silhouette + colour identity without loading extra art).
function SignatureStructure({ kind, accent }) {
  const glow = (c, i = 1) => <meshStandardMaterial color={c} emissive={c} emissiveIntensity={i} roughness={0.3} metalness={0.4} />;
  switch (kind) {
    case 'forge_anvil':
      return (
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.6, 0]} castShadow><boxGeometry args={[2.4, 1.2, 1.4]} /><meshStandardMaterial color="#2b2b30" roughness={0.6} metalness={0.6} /></mesh>
          <mesh position={[0, 1.5, 0]}><boxGeometry args={[2.8, 0.5, 1.0]} /><meshStandardMaterial color="#3a3a40" metalness={0.7} roughness={0.4} /></mesh>
          <mesh position={[0, 2.1, 0]}><sphereGeometry args={[0.4, 16, 16]} />{glow('#ff7a2c', 1.6)}</mesh>
        </group>
      );
    case 'arcane_obelisk':
      return (
        <group position={[0, 0, 0]}>
          <mesh position={[0, 3, 0]} castShadow><cylinderGeometry args={[0.5, 0.9, 6, 4]} /><meshStandardMaterial color="#2c2540" roughness={0.5} /></mesh>
          <mesh position={[0, 6.6, 0]}><octahedronGeometry args={[0.8, 0]} />{glow(accent, 1.4)}</mesh>
        </group>
      );
    case 'throne_banners':
      return (
        <group position={[0, 0, 0]}>
          {[-2.2, 2.2].map((x, i) => (
            <group key={i} position={[x, 0, 0]}>
              <mesh position={[0, 2.5, 0]} castShadow><cylinderGeometry args={[0.12, 0.12, 5]} /><meshStandardMaterial color="#5a4a2c" /></mesh>
              <mesh position={[0, 4, 0]}><planeGeometry args={[1.2, 2]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.3} side={THREE.DoubleSide} /></mesh>
            </group>
          ))}
        </group>
      );
    case 'temple_spire':
      return (
        <group position={[0, 0, 0]}>
          <mesh position={[0, 2.4, 0]} castShadow><coneGeometry args={[1.4, 4.8, 8]} /><meshStandardMaterial color="#d8d2c2" roughness={0.7} /></mesh>
          <mesh position={[0, 5.2, 0]}><sphereGeometry args={[0.45, 16, 16]} />{glow(accent, 1.2)}</mesh>
        </group>
      );
    case 'watch_brazier':
      return (
        <group position={[0, 0, 0]}>
          <mesh position={[0, 1.4, 0]} castShadow><cylinderGeometry args={[0.45, 0.6, 2.8, 8]} /><meshStandardMaterial color="#4a423a" /></mesh>
          <mesh position={[0, 3, 0]}><sphereGeometry args={[0.5, 14, 14]} />{glow('#ff8a3a', 1.6)}</mesh>
        </group>
      );
    case 'granary':
      return (
        <group position={[0, 0, 0]}>
          {[-1.6, 0, 1.6].map((x, i) => (
            <mesh key={i} position={[x, 1.6, 0]} castShadow><cylinderGeometry args={[0.7, 0.8, 3.2, 10]} /><meshStandardMaterial color="#b89a5c" roughness={0.85} /></mesh>
          ))}
        </group>
      );
    case 'hunters_totem':
      return (
        <group position={[0, 0, 0]}>
          <mesh position={[0, 2, 0]} castShadow><cylinderGeometry args={[0.4, 0.5, 4, 6]} /><meshStandardMaterial color="#6b4a2c" roughness={0.9} /></mesh>
          <mesh position={[0, 4.3, 0]}><coneGeometry args={[0.9, 1.2, 6]} /><meshStandardMaterial color="#3f7d45" /></mesh>
        </group>
      );
    case 'market_stalls':
      return (
        <group position={[0, 0, 0]}>
          {[[-2, 0], [2, 0], [0, 2]].map(([x, z], i) => (
            <group key={i} position={[x, 0, z]}>
              <mesh position={[0, 1.6, 0]}><boxGeometry args={[1.6, 0.2, 1.6]} /><meshStandardMaterial color={i % 2 ? '#9a3b3b' : '#d8b24a'} /></mesh>
              {[[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].map(([px, pz], j) => (
                <mesh key={j} position={[px, 0.8, pz]}><cylinderGeometry args={[0.06, 0.06, 1.6]} /><meshStandardMaterial color="#6b5436" /></mesh>
              ))}
            </group>
          ))}
        </group>
      );
    default:
      return null;
  }
}

function SettlementFoundation({ landmark, accent }) {
  return (
    <>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[landmark.type === 'capital' ? 16 : landmark.type === 'city' ? 14 : 11, 42]} />
        <meshStandardMaterial color="#7c6a55" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[landmark.type === 'capital' ? 9.5 : 8.5, landmark.type === 'capital' ? 15.6 : landmark.type === 'city' ? 13.6 : 10.6, 42]} />
        <meshBasicMaterial color={accent} transparent opacity={0.12} side={THREE.DoubleSide} />
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

    </>
  );
}

function renderCity(landmark, accent, glow) {
  return (
    <>
      <SettlementFoundation landmark={landmark} accent={accent} />
      <AssetModel path={PATHS.roads.square} position={[0, 0.11, 0]} scale={4.3} />
      <AssetModel path={PATHS.roads.crossroad} position={[0, 0.11, 0]} scale={3.5} />
      <AssetModel path={PATHS.roads.intersection} position={[0, 0.11, 0]} scale={3.1} />
      <AssetModel path={PATHS.roads.sideEntry} position={[0, 0.11, -20]} scale={2} />
      <AssetModel path={PATHS.roads.sideExit} position={[0, 0.11, 20]} rotation={[0, Math.PI, 0]} scale={2} />
      <AssetModel path={PATHS.roads.sideEntry} position={[-20, 0.11, 0]} rotation={[0, Math.PI / 2, 0]} scale={1.9} />
      <AssetModel path={PATHS.roads.sideExit} position={[20, 0.11, 0]} rotation={[0, -Math.PI / 2, 0]} scale={1.9} />

      <AssetModel path={PATHS.buildings.block} position={[-18, 0, -14]} scale={2.3} />
      <AssetModel path={PATHS.buildings.corner} position={[18, 0, -14]} rotation={[0, Math.PI / 2, 0]} scale={2.3} />
      <AssetModel path={PATHS.buildings.door} position={[-18, 0, 16]} scale={2.1} />
      <AssetModel path={PATHS.buildings.window} position={[18, 0, 16]} scale={2.1} />
      <AssetModel path={PATHS.buildings.windows} position={[0, 0, -22]} rotation={[0, Math.PI / 2, 0]} scale={2} />
      <AssetModel path={PATHS.buildings.sampleHouseA} position={[-24, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={1.9} />
      <AssetModel path={PATHS.buildings.sampleHouseB} position={[24, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={1.9} />
      <AssetModel path={PATHS.buildings.sampleHouseC} position={[0, 0, 24]} rotation={[0, Math.PI, 0]} scale={1.9} />
      <AssetModel path={PATHS.buildings.sampleTowerA} position={[0, 0, -26]} scale={2} />
      <AssetModel path={PATHS.buildings.sampleTowerB} position={[-10, 0, 18]} scale={1.8} />
      <AssetModel path={PATHS.buildings.roofGable} position={[-20, 0, 22]} scale={2.2} />
      <AssetModel path={PATHS.buildings.roofSlanted} position={[20, 0, 22]} rotation={[0, Math.PI / 2, 0]} scale={2.2} />
      <AssetModel path={PATHS.roads.light} position={[-8, 0, -8]} scale={1.2} />
      <AssetModel path={PATHS.roads.light} position={[8, 0, 8]} scale={1.2} />

      {/* Outer ring of homes + lamps + greenery so the city reads as lived-in */}
      <AssetModel path={PATHS.buildings.sampleHouseA} position={[-30, 0, -22]} rotation={[0, 0.5, 0]} scale={1.7} />
      <AssetModel path={PATHS.buildings.sampleHouseC} position={[30, 0, -22]} rotation={[0, -0.5, 0]} scale={1.7} />
      <AssetModel path={PATHS.buildings.sampleHouseB} position={[-30, 0, 22]} rotation={[0, 2.4, 0]} scale={1.7} />
      <AssetModel path={PATHS.buildings.block} position={[30, 0, 22]} rotation={[0, -2.4, 0]} scale={1.9} />
      <AssetModel path={PATHS.buildings.windows} position={[-32, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={1.9} />
      <AssetModel path={PATHS.buildings.door} position={[32, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={1.9} />
      <AssetModel path={PATHS.roads.light} position={[-16, 0, 16]} scale={1.2} />
      <AssetModel path={PATHS.roads.light} position={[16, 0, -16]} scale={1.2} />
      <AssetModel path={PATHS.castle.treeLarge} position={[-34, 0, -30]} scale={2.2} />
      <AssetModel path={PATHS.castle.treeSmall} position={[34, 0, 30]} scale={1.9} />
      <AssetModel path={PATHS.castle.banner} position={[0, 0, 0]} scale={1.6} />

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
      <AssetModel path={PATHS.buildings.roofGable} position={[-10, 0, 12]} scale={1.45} />
      <AssetModel path={PATHS.buildings.roofSlanted} position={[10, 0, 12]} rotation={[0, Math.PI / 2, 0]} scale={1.45} />
      <AssetModel path={PATHS.roads.light} position={[0, 0, 0]} scale={1} />
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
      {landmark.signature ? <SignatureStructure kind={landmark.signature} accent={landmark.bannerTint || accent} /> : null}
      <SettlementLabel title={landmark.name} subtitle={landmark.shortName} themeLabel={landmark.themeLabel} accent={accent} />
    </group>
  );
};

export default Settlement;
