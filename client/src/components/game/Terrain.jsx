import React, { useMemo } from 'react';
import * as THREE from 'three';
import { MAP_RADIUS, getLandmarkColor, getRealmAt } from '../../lib/gameData';
import { getTerrainHeight, getNearestSettlement } from '../../lib/terrain';

const REALM_COLOR = {
  war: '#7c6b56',
  sun: '#d8c46e',      // warm golden plains
  shadow: '#473a5c',   // dark violet ash
  nature: '#3c7a42',   // lush green
  frontier: '#8c895c'  // dry tan no-man's-land
};
const REALM_COLOR2 = {
  war: '#5d5040',
  sun: '#bd9c44',
  shadow: '#2b2440',
  nature: '#2b5a30',
  frontier: '#6d6a42'
};

const Terrain = () => {
  const { geometry, material } = useMemo(() => {
    const size = MAP_RADIUS * 2;
    const segments = 300;
    const meshGeometry = new THREE.PlaneGeometry(size, size, segments, segments);
    const positions = meshGeometry.attributes.position;
    const colors = [];
    const tmp = new THREE.Color();

    for (let index = 0; index < positions.count; index += 1) {
      const lx = positions.getX(index);
      const ly = positions.getY(index);
      const worldX = lx;
      const worldZ = -ly; // mesh is rotated -90deg about X: world Z = -local Y

      const height = getTerrainHeight(worldX, worldZ);
      const realm = getRealmAt(worldX, worldZ);
      const color = tmp.set(REALM_COLOR[realm] || REALM_COLOR.frontier).clone();

      // Patchy variation between the realm's two tones for a non-flat look.
      const v = (Math.sin(worldX * 0.045) * Math.cos(worldZ * 0.05) + Math.sin((worldX + worldZ) * 0.02)) * 0.5 + 0.5;
      color.lerp(new THREE.Color(REALM_COLOR2[realm] || REALM_COLOR2.frontier), Math.max(0, Math.min(1, v)) * 0.55);

      const nearest = getNearestSettlement(worldX, worldZ);
      if (nearest && nearest.distance < 56) {
        const blend = 1 - (nearest.distance / 56);
        // Settlement pad reads as packed dirt/road.
        color.lerp(new THREE.Color('#8a7558'), blend * 0.5);
      }

      const dist = Math.sqrt((worldX * worldX) + (worldZ * worldZ));
      if (dist > MAP_RADIUS * 0.72) color.lerp(new THREE.Color('#8b8267'), 0.16);

      positions.setZ(index, height);
      colors.push(color.r, color.g, color.b);
    }

    meshGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    meshGeometry.computeVertexNormals();

    return {
      geometry: meshGeometry,
      material: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0.02 })
    };
  }, []);

  return (
    <mesh geometry={geometry} material={material} rotation={[-Math.PI / 2, 0, 0]} receiveShadow />
  );
};

export default Terrain;
