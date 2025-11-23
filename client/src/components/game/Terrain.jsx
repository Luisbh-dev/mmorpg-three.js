import React, { useMemo } from 'react';
import * as THREE from 'three';

const Terrain = () => {
  const { geometry, materials } = useMemo(() => {
    const size = 400;
    const segments = 128;
    const geom = new THREE.PlaneGeometry(size, size, segments, segments);
    
    // Modify vertices for height and colors
    const colors = [];
    const posAttribute = geom.attributes.position;
    const count = posAttribute.count;

    for (let i = 0; i < count; i++) {
      const x = posAttribute.getX(i);
      const y = posAttribute.getY(i); // Y is Z in world coords (plane is rotated)
      
      // Zones Logic (World Coords approximation)
      // Sun: North (y > 50)
      // Shadow: South-West (x < -50, y < -50)
      // Nature: South-East (x > 50, y < -50)
      // Center: Radius 60
      
      let color = new THREE.Color(0x55aa55); // Base/Default
      let height = 0;

      const dist = Math.sqrt(x*x + y*y);

      if (dist < 60) {
        // War Zone
        color.setHex(0x666666);
        height = Math.random() * 0.2;
      } else if (y > 50 && Math.abs(x) < 150) {
        // Sun Faction (North)
        color.setHex(0xddcc77); // Gold/Sand
        height = Math.random() * 0.5 + 1;
      } else if (x < -50 && y < -50) {
        // Shadow Faction (South West)
        color.setHex(0x2b1d38);
        height = Math.random() * 0.8;
      } else if (x > 50 && y < -50) {
        // Nature Faction (South East)
        color.setHex(0x1a4a1a);
        height = Math.random() * 1.5;
      } else {
        // No mans land / borders
        color.setHex(0x558855);
        height = Math.random() * 0.5;
      }

      // Apply height
      posAttribute.setZ(i, height);
      colors.push(color.r, color.g, color.b);
    }

    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ 
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.1
    });

    return { geometry: geom, materials: mat };
  }, []);

  return (
    <mesh 
      geometry={geometry} 
      material={materials} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, 0, 0]} 
      receiveShadow 
    />
  );
};

export default Terrain;
