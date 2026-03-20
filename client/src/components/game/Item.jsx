import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';

const Item = ({ itemCode, itemType, position, name, color }) => {
  const ref = useRef();
  const isGold = itemCode === 'gold' || itemType === 'currency';

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + (Math.sin(state.clock.elapsedTime * 2.2) * 0.14);
    ref.current.rotation.y += 0.018;
  });

  return (
    <group ref={ref} position={position}>
      {isGold ? (
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 0.08, 20]} />
          <meshStandardMaterial color={color || '#ffd95c'} metalness={0.85} roughness={0.2} />
        </mesh>
      ) : (
        <group>
          <mesh castShadow>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial color={color || '#ff6f61'} transparent opacity={0.86} emissive={color || '#ff6f61'} emissiveIntensity={0.35} />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.05, 0.08, 0.11, 10]} />
            <meshStandardMaterial color="#d8e7f2" transparent opacity={0.75} />
          </mesh>
        </group>
      )}

      <Billboard position={[0, 0.58, 0]}>
        <Text
          fontSize={0.2}
          color={isGold ? '#ffd95c' : '#ffffff'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {`${name} (E)`}
        </Text>
      </Billboard>
    </group>
  );
};

export default Item;
