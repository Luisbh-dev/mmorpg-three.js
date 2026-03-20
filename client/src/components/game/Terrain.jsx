import React, { useMemo } from 'react';
import * as THREE from 'three';
import { WAR_ZONE_RADIUS } from '../../lib/gameData';

function ridgeNoise(x, y) {
  const base = Math.sin(x * 0.024) * 1.9 + Math.cos(y * 0.021) * 1.6;
  const detail = Math.sin((x + y) * 0.06) * 0.7 + Math.cos((x - y) * 0.08) * 0.45;
  const turbulence = Math.sin((x * 0.1) + (y * 0.07)) * 0.25;
  return base + detail + turbulence;
}

const Terrain = () => {
  const { geometry, material } = useMemo(() => {
    const size = 420;
    const segments = 180;
    const meshGeometry = new THREE.PlaneGeometry(size, size, segments, segments);
    const positions = meshGeometry.attributes.position;
    const colors = [];

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const y = positions.getY(index);
      const distance = Math.sqrt((x * x) + (y * y));

      const sunZone = y < -55 && Math.abs(x) < 150;
      const shadowZone = x < -45 && y > 40;
      const natureZone = x > 45 && y > 40;
      const warZone = distance < WAR_ZONE_RADIUS;
      const roadAxis = Math.abs(x) < 10 && y < -15;
      const shadowPath = Math.abs((y + (x * 0.72)) - 42) < 6;
      const naturePath = Math.abs((y - (x * 0.72)) - 42) < 6;
      const riverCut = Math.abs(y + (x * 0.12)) < 6 && x > -160 && x < 165;

      let height = ridgeNoise(x, y) * 0.22;
      const color = new THREE.Color('#6f8c58');

      if (warZone) {
        height = ridgeNoise(x, y) * 0.08 + 0.18;
        color.set('#8a7b69');
      } else if (sunZone) {
        height += 1.35 + Math.max(0, Math.sin(x * 0.04) * 0.35);
        color.set('#c9b86d');
      } else if (shadowZone) {
        height += 0.65 + Math.max(0, Math.cos((x + y) * 0.05) * 0.6);
        color.set('#534363');
      } else if (natureZone) {
        height += 1.55 + Math.max(0, Math.cos(x * 0.05) * 0.65);
        color.set('#406f48');
      } else {
        height += 0.45;
        color.set('#6d8660');
      }

      if (roadAxis || shadowPath || naturePath) {
        height -= 0.36;
        color.lerp(new THREE.Color('#a98e6b'), 0.7);
      }

      if (riverCut) {
        height -= 0.7;
        color.lerp(new THREE.Color('#5d87a6'), 0.85);
      }

      if (distance > 160) {
        height += 0.2;
        color.lerp(new THREE.Color('#8b8267'), 0.15);
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
