import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';

const Item = ({ id, type, position, name, color }) => {
  const ref = useRef();

  useFrame((state) => {
    if (ref.current) {
      // Bobbing animation
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      // Rotating animation
      ref.current.rotation.y += 0.02;
    }
  });

  return (
    <group ref={ref} position={position}>
      {type === 'gold' ? (
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />
          <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
        </mesh>
      ) : (
        <group>
           {/* Potion Bottle */}
           <mesh position={[0, 0, 0]}>
             <sphereGeometry args={[0.15]} />
             <meshStandardMaterial color={color} transparent opacity={0.8} />
           </mesh>
           <mesh position={[0, 0.2, 0]}>
             <cylinderGeometry args={[0.05, 0.08, 0.1]} />
             <meshStandardMaterial color="white" transparent opacity={0.5} />
           </mesh>
        </group>
      )}
      
      <Billboard position={[0, 0.5, 0]}>
        <Text
          fontSize={0.2}
          color={type === 'gold' ? 'yellow' : 'white'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {name} (E)
        </Text>
      </Billboard>
    </group>
  );
};

export default Item;
