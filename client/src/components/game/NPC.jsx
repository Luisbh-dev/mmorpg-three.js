import React, { useRef } from 'react';
import { Text, Billboard } from '@react-three/drei';

const NPC = ({ id, name, position, faction, type, questId }) => {
  const color = faction === 'sun' ? '#FFD700' : faction === 'shadow' ? '#9370DB' : '#32CD32';

  return (
    <group position={position}>
      {/* NPC Model (Simple Humanoid) */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.8, 1.8, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#ffccaa" />
      </mesh>

      {/* Quest Marker */}
      {type === 'quest_giver' && (
        <Billboard position={[0, 3.5, 0]}>
          <Text
            fontSize={1}
            color="yellow"
            outlineWidth={0.05}
            outlineColor="black"
          >
            !
          </Text>
        </Billboard>
      )}

      {/* Name Tag */}
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
          color="#aaa"
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
