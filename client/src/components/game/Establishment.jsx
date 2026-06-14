import React from 'react';
import { Billboard, Text } from '@react-three/drei';
import { AssetModel, PATHS } from './kenneyAssets';

// Maps the establishment template's `model` key to an actual Kenney building GLB.
const MODEL_PATH = {
  block: PATHS.buildings.block,
  towerA: PATHS.buildings.sampleTowerA,
  towerB: PATHS.buildings.sampleTowerB,
  houseA: PATHS.buildings.sampleHouseA,
  houseB: PATHS.buildings.sampleHouseB,
  houseC: PATHS.buildings.sampleHouseC
};

// Per-kind sign colour + service tagline shown under the building name.
const KIND_META = {
  townhall:    { tint: '#ffd36b', tag: 'Misiones' },
  smith:       { tint: '#e0b58a', tag: 'Armas y armadura' },
  apothecary:  { tint: '#7be3a3', tag: 'Pociones' },
  tavern:      { tint: '#ffb863', tag: 'Descansar' },
  temple:      { tint: '#9ff0c0', tag: 'Santuario' },
  barracks:    { tint: '#bcd0ff', tag: 'Entrenamiento' },
  arcanist:    { tint: '#c79bff', tag: 'Reliquias' },
  provisioner: { tint: '#e7d28a', tag: 'Suministros' }
};

const Establishment = ({ est }) => {
  const meta = KIND_META[est.kind] || KIND_META.townhall;
  const path = MODEL_PATH[est.model] || PATHS.buildings.block;

  return (
    <group position={est.position}>
      {/* Building faces the plaza centre. */}
      <group rotation={[0, est.facing, 0]}>
        <AssetModel path={path} scale={2.2} />
      </group>

      {/* Floating service beacon (emissive only — no per-building point light, which
          would explode forward-rendering cost across ~100 establishments). */}
      <mesh position={[0, 4.7, 0]}>
        <octahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color={meta.tint} emissive={meta.tint} emissiveIntensity={1.6} roughness={0.2} metalness={0.4} />
      </mesh>

      <Billboard position={[0, 6.0, 0]}>
        <Text fontSize={0.62} color="#f8f4ea" anchorX="center" anchorY="middle" outlineWidth={0.035} outlineColor="#000000">
          {est.name}
        </Text>
        <Text position={[0, -0.64, 0]} fontSize={0.32} color={meta.tint} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
          {meta.tag}
        </Text>
        <Text position={[0, -1.14, 0]} fontSize={0.28} color="#ffe9b0" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
          [E] Interactuar
        </Text>
      </Billboard>
    </group>
  );
};

export default Establishment;
