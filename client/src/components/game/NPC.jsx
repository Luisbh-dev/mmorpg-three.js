import React from 'react';
import { Billboard, Text } from '@react-three/drei';

const roleMeta = {
  commander: { accent: '#ffd36b', robe: '#51462c', label: 'Comandante' },
  merchant: { accent: '#f1b75f', robe: '#59443a', label: 'Mercader' },
  trainer: { accent: '#7fb6ff', robe: '#3c4357', label: 'Maestro' },
  healer: { accent: '#6df58b', robe: '#365346', label: 'Sanador' },
  innkeeper: { accent: '#ffb863', robe: '#5a3f26', label: 'Tabernero' },
  guard: { accent: '#c2d2ff', robe: '#303643', label: 'Guardia' },
  citizen: { accent: '#cab9a2', robe: '#51483e', label: 'Vecino' },
  story: { accent: '#ffd86b', robe: '#4a3d22', label: 'Heraldo' }
};

const factionTone = {
  sun: { robe: '#746332', cloth: '#d8bc64', skin: '#f2cda4' },
  shadow: { robe: '#2e2541', cloth: '#8a7dff', skin: '#e1c0bb' },
  nature: { robe: '#2f5338', cloth: '#57c777', skin: '#e2cfab' }
};

const NPC = ({ name, position, faction, type, role, questId }) => {
  const tone = factionTone[faction] || factionTone.sun;
  const npcRole = role || type || 'citizen';
  const meta = roleMeta[npcRole] || roleMeta.citizen;
  const robeColor = meta.robe || tone.robe;
  const accentColor = meta.accent || tone.cloth;

  return (
    <group position={position}>
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[0.84, 1.7, 0.58]} />
        <meshStandardMaterial color={robeColor} roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.95, 0]} castShadow>
        <boxGeometry args={[0.56, 0.56, 0.56]} />
        <meshStandardMaterial color={tone.skin} roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.34, 0]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.55} />
      </mesh>

      <mesh position={[0.48, 1.08, 0.34]} rotation={[0, 0, 0.15]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.9]} />
        <meshStandardMaterial color="#8b6b4e" />
      </mesh>
      <mesh position={[-0.48, 1.05, 0.28]} rotation={[0, 0, -0.22]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.8]} />
        <meshStandardMaterial color="#8b6b4e" />
      </mesh>

      {npcRole === 'guard' && (
        <>
          <mesh position={[0.72, 1.05, 0.14]} rotation={[0, 0, 0.4]} castShadow>
            <boxGeometry args={[0.12, 1.85, 0.12]} />
            <meshStandardMaterial color="#d9e3f4" roughness={0.7} />
          </mesh>
          <mesh position={[-0.72, 1.06, 0.18]} castShadow>
            <cylinderGeometry args={[0.22, 0.28, 0.58, 8]} />
            <meshStandardMaterial color="#576073" roughness={0.65} />
          </mesh>
        </>
      )}

      {npcRole === 'merchant' && (
        <mesh position={[0.66, 0.82, 0.34]} rotation={[0, 0, 0.15]} castShadow>
          <boxGeometry args={[0.34, 0.34, 0.22]} />
          <meshStandardMaterial color="#7b5c3f" roughness={0.95} />
        </mesh>
      )}

      {npcRole === 'trainer' && (
        <mesh position={[0.66, 1.05, 0.35]} rotation={[0, 0, 0.1]} castShadow>
          <boxGeometry args={[0.12, 1.65, 0.12]} />
          <meshStandardMaterial color="#c7d9ff" roughness={0.55} />
        </mesh>
      )}

      {npcRole === 'healer' && (
        <mesh position={[0, 2.65, 0]}>
          <torusGeometry args={[0.32, 0.06, 8, 20]} />
          <meshStandardMaterial color="#6df58b" emissive="#6df58b" emissiveIntensity={0.8} />
        </mesh>
      )}

      {npcRole === 'merchant' && (
        <mesh position={[-0.68, 0.9, 0.28]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 1.0]} />
          <meshStandardMaterial color="#f1d16a" emissive="#f1d16a" emissiveIntensity={0.5} />
        </mesh>
      )}

      {npcRole === 'commander' && (
        <mesh position={[0, 3.0, 0]}>
          <torusGeometry args={[0.38, 0.06, 8, 20]} />
          <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.85} />
        </mesh>
      )}

      {type === 'quest_giver' && (
        <Billboard position={[0, 3.45, 0]}>
          <Text fontSize={0.95} color={accentColor} outlineWidth={0.05} outlineColor="black">
            !
          </Text>
        </Billboard>
      )}

      {type === 'story_giver' && (
        <Billboard position={[0, 3.5, 0]}>
          <Text fontSize={1.0} color="#ffd86b" outlineWidth={0.05} outlineColor="black">
            ★
          </Text>
        </Billboard>
      )}

      <Billboard position={[0, 2.92, 0]}>
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
          color={accentColor}
          anchorX="center"
          anchorY="middle"
        >
          {meta.label}
        </Text>
      </Billboard>

      {questId && (
        <Billboard position={[0, 1.25, 0]}>
          <Text fontSize={0.18} color="#f4e3bf" outlineWidth={0.015} outlineColor="black">
            Mision
          </Text>
        </Billboard>
      )}
    </group>
  );
};

export default NPC;
