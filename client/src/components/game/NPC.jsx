import React from 'react';
import { Text, Billboard } from '@react-three/drei';

const NPC = ({ id, name, position, faction, type, questId }) => {
  const color = faction === 'sun' ? '#f4c95d' : faction === 'shadow' ? '#8a7dff' : '#57c777';
  const robeColor = faction === 'sun' ? '#746332' : faction === 'shadow' ? '#2e2541' : '#2f5338';

  return (
    <group position={position}>
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[0.8, 1.7, 0.55]} />
        <meshStandardMaterial color={robeColor} roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.95, 0]} castShadow>
        <boxGeometry args={[0.54, 0.54, 0.54]} />
        <meshStandardMaterial color="#ffd1b3" />
      </mesh>
      <mesh position={[0, 2.32, 0]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0.48, 1.05, 0.32]} rotation={[0, 0, 0.18]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.9]} />
        <meshStandardMaterial color="#8b6b4e" />
      </mesh>
      <mesh position={[-0.5, 1.0, 0.28]} rotation={[0, 0, -0.22]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.7]} />
        <meshStandardMaterial color="#8b6b4e" />
      </mesh>
      {type === 'quest_giver' && (
        <mesh position={[0, 3.0, 0]}>
          <torusGeometry args={[0.35, 0.05, 8, 20]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.75} />
        </mesh>
      )}
      {type === 'quest_giver' && (
        <Billboard position={[0, 3.45, 0]}>
          <Text
            fontSize={0.95}
            color={color}
            outlineWidth={0.05}
            outlineColor="black"
          >
            !
          </Text>
        </Billboard>
      )}
      <Billboard position={[0, 2.8, 0]}>
        <Text
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="black"
        >
          {name}
        </Text>
        <Text
          position={[0, -0.3, 0]}
          fontSize={0.2}
          color="#c9d3dd"
          anchorX="center"
          anchorY="middle"
        >
          (E) Hablar
        </Text>
      </Billboard>
    </group>
  );
};

export default NPC;
