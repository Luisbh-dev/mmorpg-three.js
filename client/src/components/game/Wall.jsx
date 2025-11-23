import React, { useMemo } from 'react';
import * as THREE from 'three';

const Wall = ({ position, rotation, length = 10, height = 4, thickness = 1 }) => {
  
  const segments = useMemo(() => {
    const parts = [];
    // Main Wall
    parts.push(
      <mesh key="main" position={[0, height/2, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, height, thickness]} />
        <meshStandardMaterial color="#555" roughness={0.9} />
      </mesh>
    );

    // Battlements (Almenas)
    const battlementCount = Math.floor(length / 1.5);
    for (let i = 0; i < battlementCount; i++) {
      parts.push(
        <mesh key={`bat-${i}`} position={[(i * 1.5) - length/2 + 0.75, height + 0.5, 0]} castShadow>
          <boxGeometry args={[0.8, 1, thickness]} />
          <meshStandardMaterial color="#555" roughness={0.9} />
        </mesh>
      );
    }
    
    return parts;
  }, [length, height, thickness]);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {segments}
    </group>
  );
};

export default Wall;
