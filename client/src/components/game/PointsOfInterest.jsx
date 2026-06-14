import React from 'react';
import { Billboard, Text } from '@react-three/drei';
import { AssetModel, PATHS } from './kenneyAssets';
import { POINTS_OF_INTEREST, getFactionMeta } from '../../lib/gameData';
import { getTerrainHeight } from '../../lib/terrain';

const castle = PATHS.castle;
const buildings = PATHS.buildings;

function Campfire() {
  return (
    <group position={[0, 0.4, 0]}>
      <mesh>
        <coneGeometry args={[0.35, 0.7, 8]} />
        <meshStandardMaterial color="#ff8a3c" emissive="#ff6a1a" emissiveIntensity={1.6} />
      </mesh>
      <pointLight position={[0, 0.6, 0]} intensity={5} color="#ff8a3c" distance={9} />
    </group>
  );
}

function renderCamp() {
  return (
    <>
      <AssetModel path={buildings.block} position={[-2.4, 0, -1.6]} rotation={[0, 0.5, 0]} scale={1.4} />
      <AssetModel path={castle.wallHalf} position={[2.2, 0, 1.4]} rotation={[0, -0.6, 0]} scale={1.2} />
      <AssetModel path={castle.rockSmall} position={[2, 0, -2.2]} scale={1.4} />
      <AssetModel path={castle.banner} position={[-2.4, 2.2, -1.6]} scale={1.2} />
      <Campfire />
    </>
  );
}

function renderShrine(glow) {
  return (
    <>
      <AssetModel path={castle.towerBase} position={[0, 0, 0]} scale={1.4} />
      <AssetModel path={castle.wallPillar} position={[-1.8, 0, 1.2]} scale={1.1} />
      <AssetModel path={castle.wallPillar} position={[1.8, 0, 1.2]} scale={1.1} />
      <mesh position={[0, 3.4, 0]}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.2} roughness={0.15} />
      </mesh>
      <pointLight position={[0, 3.4, 0]} intensity={5} color={glow} distance={14} />
    </>
  );
}

function renderRuins(glow) {
  return (
    <>
      <AssetModel path={castle.wallCorner} position={[-1.4, 0, -1.4]} scale={1.5} />
      <AssetModel path={castle.wallHalf} position={[1.6, 0, -0.6]} rotation={[0, 0.5, 0]} scale={1.3} />
      <AssetModel path={castle.rockLarge} position={[1.4, 0, 1.8]} scale={1.9} />
      <AssetModel path={castle.rockSmall} position={[-1.8, 0, 1.6]} scale={1.5} />
      <AssetModel path={castle.treeSmall} position={[2.6, 0, -2.4]} scale={1.4} />
      <pointLight position={[0, 2.6, 0]} intensity={2.4} color={glow} distance={12} />
    </>
  );
}

const PointsOfInterest = ({ center = [0, 0, 0] }) => (
  <group>
    {POINTS_OF_INTEREST.filter((poi) => {
      const dx = poi.position[0] - center[0];
      const dz = poi.position[2] - center[2];
      return (dx * dx + dz * dz) < (420 * 420);
    }).map((poi) => {
      const meta = getFactionMeta(poi.faction);
      const y = getTerrainHeight(poi.position[0], poi.position[2]);
      return (
        <group key={poi.id} position={[poi.position[0], y, poi.position[2]]}>
          {poi.type === 'camp' && renderCamp()}
          {poi.type === 'shrine' && renderShrine(meta.glow)}
          {poi.type === 'ruins' && renderRuins(meta.glow)}
          <Billboard position={[0, 5.2, 0]}>
            <Text fontSize={0.42} color="#f4ead2" outlineWidth={0.022} outlineColor="#000000">
              {poi.name}
            </Text>
          </Billboard>
        </group>
      );
    })}
  </group>
);

export default PointsOfInterest;
