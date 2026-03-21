import React, { useMemo } from 'react';
import * as THREE from 'three';
import { LANDMARKS, MAP_RADIUS, WAR_ZONE_RADIUS, getLandmarkColor } from '../../lib/gameData';

const SETTLEMENT_TYPES = new Set(['capital', 'city', 'town', 'village', 'outpost']);

function ridgeNoise(x, y) {
  const base = Math.sin(x * 0.018) * 1.8 + Math.cos(y * 0.015) * 1.5;
  const detail = Math.sin((x + y) * 0.05) * 0.75 + Math.cos((x - y) * 0.07) * 0.48;
  const turbulence = Math.sin((x * 0.08) + (y * 0.06)) * 0.3;
  return base + detail + turbulence;
}

function getNearestSettlement(x, y) {
  let nearest = null;
  let nearestDistance = Infinity;

  LANDMARKS.forEach((landmark) => {
    if (!SETTLEMENT_TYPES.has(landmark.type)) return;
    const dx = x - landmark.position[0];
    const dz = y - landmark.position[2];
    const distance = Math.sqrt((dx * dx) + (dz * dz));

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = { landmark, distance };
    }
  });

  return nearest;
}

const Terrain = () => {
  const { geometry, material } = useMemo(() => {
    const size = MAP_RADIUS * 2;
    const segments = 220;
    const meshGeometry = new THREE.PlaneGeometry(size, size, segments, segments);
    const positions = meshGeometry.attributes.position;
    const colors = [];

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const y = positions.getY(index);
      const distance = Math.sqrt((x * x) + (y * y));

      const sunZone = y < -110;
      const shadowZone = x < -120 && y > -30;
      const natureZone = x > 120 && y > -30;
      const warZone = distance < WAR_ZONE_RADIUS;
      const riverCut = Math.abs(y + (x * 0.08)) < 7 && x > -180 && x < 180;
      const tradeRoad = Math.abs(y + (x * 0.18)) < 6 && y < -10;
      const eastRoad = Math.abs(y - (x * 0.18)) < 6 && y > -10;

      let height = ridgeNoise(x, y) * 0.24;
      const color = new THREE.Color('#6f8c58');
      const nearestSettlement = getNearestSettlement(x, y);

      if (warZone) {
        height = ridgeNoise(x, y) * 0.07 + 0.16;
        color.set('#8a7b69');
      } else if (sunZone) {
        height += 1.55 + Math.max(0, Math.sin(x * 0.03) * 0.4);
        color.set('#c9b86d');
      } else if (shadowZone) {
        height += 0.82 + Math.max(0, Math.cos((x + y) * 0.04) * 0.55);
        color.set('#534363');
      } else if (natureZone) {
        height += 1.72 + Math.max(0, Math.cos(x * 0.04) * 0.7);
        color.set('#406f48');
      } else {
        height += 0.52;
        color.set('#6d8660');
      }

      if (nearestSettlement && nearestSettlement.distance < 48) {
        const settlementBlend = 1 - (nearestSettlement.distance / 48);
        height = (height * (1 - (settlementBlend * 0.55))) + (settlementBlend * (nearestSettlement.landmark.type === 'capital' ? 0.28 : 0.12));
        color.lerp(new THREE.Color(getLandmarkColor(nearestSettlement.landmark)), settlementBlend * 0.16);
      }

      if (tradeRoad || eastRoad) {
        height -= 0.32;
        color.lerp(new THREE.Color('#a98e6b'), 0.8);
      }

      if (riverCut) {
        height -= 0.68;
        color.lerp(new THREE.Color('#5d87a6'), 0.9);
      }

      if (distance > MAP_RADIUS * 0.56) {
        height += 0.22;
        color.lerp(new THREE.Color('#8b8267'), 0.12);
      }

      positions.setZ(index, height);
      colors.push(color.r, color.g, color.b);
    }

    meshGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    meshGeometry.computeVertexNormals();

    return {
      geometry: meshGeometry,
      material: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.96,
        metalness: 0.02
      })
    };
  }, []);

  return (
    <mesh
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    />
  );
};

export default Terrain;
