import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const Projectile = ({ type }) => {
  const ref = useRef();
  const [active, setActive] = useState(true);
  
  useFrame((state, delta) => {
    if (ref.current && active) {
      ref.current.position.z -= 10 * delta; // Move forward
      if (ref.current.position.z < -10) setActive(false); // Despawn after distance
    }
  });

  if (!active) return null;

  const color = type === 'Necromancer' ? 'purple' : type === 'Hunter' ? 'white' : 'gold';

  return (
    <mesh ref={ref} position={[0, 1, 0.5]}>
      <sphereGeometry args={[0.1]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
    </mesh>
  );
};

const Weapon = ({ type, isAttacking }) => {
  const group = useRef();
  const isRanged = ['Cleric', 'Necromancer', 'Druid', 'Hunter'].includes(type);

  useFrame(() => {
    if (group.current) {
      // Attack animation specific to weapon
      if (isAttacking) {
        if (isRanged) {
           // Thrust forward/up for casting
           group.current.position.z = 0.8; 
           group.current.rotation.x = -Math.PI / 4;
        } else {
           // Swing
           group.current.rotation.x = -Math.PI / 2; 
        }
      } else {
        // Return to idle
        if (isRanged) {
           group.current.position.z = 0.5;
           group.current.rotation.x = 0;
        } else {
           group.current.rotation.x = 0;
        }
      }
    }
  });

  const renderWeaponGeometry = () => {
    switch (type) {
      case 'Paladin': // Sword + Shield (Shield not implemented yet in this simple view)
      case 'Rogue':   // Dagger
        return (
          <mesh position={[0.6, 0.5, 0.5]} rotation={[Math.PI/4, 0, 0]}>
             <boxGeometry args={[0.1, 1.2, 0.1]} />
             <meshStandardMaterial color={type === 'Paladin' ? 'silver' : '#333'} />
          </mesh>
        );
      case 'Cleric':
      case 'Druid':
      case 'Necromancer': // Staff
        return (
          <mesh position={[0.6, 0.5, 0.5]}>
             <cylinderGeometry args={[0.05, 0.05, 1.8]} />
             <meshStandardMaterial color="#8B4513" />
             {/* Gem on top */}
             <mesh position={[0, 0.9, 0]}>
               <dodecahedronGeometry args={[0.15]} />
               <meshStandardMaterial
                 color={type === 'Necromancer' ? 'purple' : 'cyan'}
                 emissive={type === 'Necromancer' ? 'purple' : 'cyan'}
                 emissiveIntensity={0.6}
               />
             </mesh>
          </mesh>
        );
      case 'Hunter': // Bow-ish (visual representation simplified)
        return (
          <group position={[0.6, 0.5, 0.5]} rotation={[0, 0, Math.PI/2]}>
             <mesh>
               <torusGeometry args={[0.4, 0.05, 8, 16, Math.PI]} />
               <meshStandardMaterial color="#5C4033" />
             </mesh>
             <mesh position={[0, -0.4, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.8]} />
                <meshStandardMaterial color="white" />
             </mesh>
          </group>
        );
      default:
        return null;
    }
  };

  return (
    <group ref={group}>
      {renderWeaponGeometry()}
    </group>
  );
};

const ClassAccent = ({ color, radius = 1.2 }) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
      <ringGeometry args={[radius, radius + 0.1, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} />
    </mesh>
    <pointLight position={[0, 1.7, 0]} intensity={1.4} color={color} distance={6} />
  </group>
);

const RogueAvatar = () => (
  <group>
    <mesh position={[0, 1.05, 0]} castShadow>
      <boxGeometry args={[0.72, 1.28, 0.48]} />
      <meshStandardMaterial color="#3c3136" roughness={0.95} />
    </mesh>
    <mesh position={[0, 1.7, -0.02]} castShadow>
      <boxGeometry args={[0.68, 0.5, 0.52]} />
      <meshStandardMaterial color="#181214" roughness={1} />
    </mesh>
    <mesh position={[0, 1.95, 0.02]} rotation={[0, 0, Math.PI * 0.02]} castShadow>
      <boxGeometry args={[0.56, 0.5, 0.58]} />
      <meshStandardMaterial color="#21181c" roughness={1} />
    </mesh>
    <mesh position={[-0.42, 1.02, 0.38]} rotation={[0, 0, 0.2]} castShadow>
      <boxGeometry args={[0.08, 0.84, 0.08]} />
      <meshStandardMaterial color="#271e23" />
    </mesh>
    <mesh position={[0.42, 1.02, 0.38]} rotation={[0, 0, -0.2]} castShadow>
      <boxGeometry args={[0.08, 0.84, 0.08]} />
      <meshStandardMaterial color="#271e23" />
    </mesh>
    <mesh position={[-0.62, 1.0, 0.55]} rotation={[0, 0, 0.65]} castShadow>
      <boxGeometry args={[0.08, 1.1, 0.08]} />
      <meshStandardMaterial color="#c0c5d3" />
    </mesh>
    <mesh position={[0.62, 1.0, 0.55]} rotation={[0, 0, -0.65]} castShadow>
      <boxGeometry args={[0.08, 1.1, 0.08]} />
      <meshStandardMaterial color="#c0c5d3" />
    </mesh>
    <mesh position={[0, 0.45, -0.08]} rotation={[0, 0, 0.12]} castShadow>
      <boxGeometry args={[0.56, 0.12, 0.4]} />
      <meshStandardMaterial color="#54404a" />
    </mesh>
  </group>
);

const DruidAvatar = () => (
  <group>
    <mesh position={[0, 1.0, 0]} castShadow>
      <boxGeometry args={[0.8, 1.2, 0.52]} />
      <meshStandardMaterial color="#3d5f33" roughness={0.92} />
    </mesh>
    <mesh position={[0, 1.65, 0]} castShadow>
      <boxGeometry args={[0.56, 0.52, 0.54]} />
      <meshStandardMaterial color="#4d6b47" roughness={0.9} />
    </mesh>
    <mesh position={[0, 1.9, 0]} castShadow>
      <sphereGeometry args={[0.26, 12, 12]} />
      <meshStandardMaterial color="#e0c39e" />
    </mesh>
    <mesh position={[0.55, 1.02, 0.45]} rotation={[0, 0, -0.15]} castShadow>
      <cylinderGeometry args={[0.05, 0.05, 1.8]} />
      <meshStandardMaterial color="#8b5a3c" />
    </mesh>
    <mesh position={[0.55, 1.88, 0.45]}>
      <torusGeometry args={[0.18, 0.06, 8, 16]} />
      <meshStandardMaterial color="#8dcf7b" emissive="#8dcf7b" emissiveIntensity={0.75} />
    </mesh>
    <mesh position={[-0.55, 1.15, 0.05]} rotation={[0, 0, 0.3]} castShadow>
      <boxGeometry args={[0.08, 0.82, 0.08]} />
      <meshStandardMaterial color="#2f241b" />
    </mesh>
    <mesh position={[-0.55, 1.78, 0.05]}>
      <sphereGeometry args={[0.15, 12, 12]} />
      <meshStandardMaterial color="#8dcf7b" emissive="#8dcf7b" emissiveIntensity={0.5} />
    </mesh>
  </group>
);

const HunterAvatar = () => (
  <group>
    <mesh position={[0, 1.0, 0]} castShadow>
      <boxGeometry args={[0.76, 1.18, 0.5]} />
      <meshStandardMaterial color="#5d4a34" roughness={0.95} />
    </mesh>
    <mesh position={[0, 1.68, 0]} castShadow>
      <boxGeometry args={[0.56, 0.48, 0.5]} />
      <meshStandardMaterial color="#2c2a21" roughness={0.95} />
    </mesh>
    <mesh position={[0, 1.9, 0]} castShadow>
      <boxGeometry args={[0.42, 0.42, 0.42]} />
      <meshStandardMaterial color="#dcbf9d" />
    </mesh>
    <mesh position={[0.58, 1.1, 0.45]} rotation={[0, 0, 1.57]} castShadow>
      <torusGeometry args={[0.45, 0.05, 8, 20, Math.PI]} />
      <meshStandardMaterial color="#7d5a3a" />
    </mesh>
    <mesh position={[0.65, 1.1, 0.45]}>
      <cylinderGeometry args={[0.02, 0.02, 0.95]} />
      <meshStandardMaterial color="#faf5ec" />
    </mesh>
    <mesh position={[-0.55, 1.1, 0.3]} rotation={[0, 0, -0.12]} castShadow>
      <boxGeometry args={[0.1, 0.9, 0.1]} />
      <meshStandardMaterial color="#4f3d31" />
    </mesh>
    <mesh position={[-0.55, 1.82, 0.28]}>
      <boxGeometry args={[0.18, 0.7, 0.28]} />
      <meshStandardMaterial color="#5f4c3d" />
    </mesh>
  </group>
);

const NecromancerAvatar = () => (
  <group>
    <mesh position={[0, 1.03, 0]} castShadow>
      <boxGeometry args={[0.78, 1.28, 0.52]} />
      <meshStandardMaterial color="#2f243f" roughness={0.96} />
    </mesh>
    <mesh position={[0, 1.72, 0]} castShadow>
      <boxGeometry args={[0.62, 0.5, 0.5]} />
      <meshStandardMaterial color="#120d17" roughness={0.95} />
    </mesh>
    <mesh position={[0, 1.96, 0]} castShadow>
      <boxGeometry args={[0.48, 0.48, 0.48]} />
      <meshStandardMaterial color="#caa78a" />
    </mesh>
    <mesh position={[0.55, 1.1, 0.46]} rotation={[0, 0, -0.06]} castShadow>
      <cylinderGeometry args={[0.05, 0.05, 1.95]} />
      <meshStandardMaterial color="#5f3c2e" />
    </mesh>
    <mesh position={[0.55, 2.02, 0.46]}>
      <dodecahedronGeometry args={[0.16, 0]} />
      <meshStandardMaterial color="#8a7dff" emissive="#8a7dff" emissiveIntensity={1} />
    </mesh>
    <mesh position={[-0.5, 1.0, 0.26]} rotation={[0, 0, 0.18]} castShadow>
      <boxGeometry args={[0.1, 0.92, 0.1]} />
      <meshStandardMaterial color="#1d1524" />
    </mesh>
    <mesh position={[-0.08, 2.15, 0.18]}>
      <sphereGeometry args={[0.14, 12, 12]} />
      <meshStandardMaterial color="#8a7dff" emissive="#8a7dff" emissiveIntensity={0.7} transparent opacity={0.7} />
    </mesh>
  </group>
);

const GenericAvatar = ({ faction, charClass }) => {
  const factionColors = {
    sun: '#f4c95d',
    shadow: '#8a7dff',
    nature: '#57c777'
  };
  const baseColor = factionColors[faction] || '#d9d9d9';

  return (
    <group>
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.84, 1.18, 0.52]} />
        <meshStandardMaterial color={baseColor} />
      </mesh>
      <mesh position={[0, 1.88, 0]} castShadow>
        <boxGeometry args={[0.46, 0.46, 0.46]} />
        <meshStandardMaterial color="#ffcfb0" />
      </mesh>
      <mesh position={[0, 2.25, 0]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={baseColor} emissive={baseColor} emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0.58, 1.1, 0.4]} rotation={[0, 0, 1.57]} castShadow>
        <boxGeometry args={[0.12, 1.05, 0.12]} />
        <meshStandardMaterial color="#8b6b4e" />
      </mesh>
      <mesh position={[-0.58, 1.1, 0.4]} rotation={[0, 0, -1.57]} castShadow>
        <boxGeometry args={[0.12, 1.05, 0.12]} />
        <meshStandardMaterial color="#8b6b4e" />
      </mesh>
    </group>
  );
};

const CharacterModel = ({ faction, isMe, charClass, isAttacking }) => {
  const group = useRef();
  
  // Load Cleric
  const { scene: clericScene, animations: clericAnimations } = useGLTF('/assets/models/cleric.glb');
  const clericModel = useMemo(() => cloneSkinned(clericScene), [clericScene]);
  const { actions: clericActions } = useAnimations(clericAnimations, group);

  // Load Paladin
  const { scene: paladinScene, animations: paladinAnimations } = useGLTF('/assets/models/paladin/scene.gltf');
  const paladinModel = useMemo(() => cloneSkinned(paladinScene), [paladinScene]);
  const { actions: paladinActions } = useAnimations(paladinAnimations, group);

  const isRanged = ['Cleric', 'Necromancer', 'Druid', 'Hunter'].includes(charClass);
  const normalizedClass = (charClass || '').toLowerCase();

  useEffect(() => {
    if (charClass === 'Cleric' && clericActions) {
      // Play idle logic
    }
    if (charClass === 'Paladin' && paladinActions) {
       // Play idle logic if names known e.g. 'Idle', 'Animation', etc.
       // Usually first animation is safe bet if specific name unknown
       const actionNames = Object.keys(paladinActions);
       if (actionNames.length > 0) {
         paladinActions[actionNames[0]].play(); // Play first anim
       }
    }
  }, [charClass, isAttacking, clericActions, paladinActions]);

  if (charClass === 'Cleric') {
    return (
      <group ref={group} dispose={null} scale={1.2}>
        <primitive object={clericModel} position={[0, 0.8, 0]} />
        {isAttacking && <Projectile type={charClass} />}
      </group>
    );
  }

  if (charClass === 'Paladin') {
    return (
      <group ref={group} dispose={null}> 
        {/* Scale model independently from weapon */}
        <primitive object={paladinModel} scale={0.01} position={[0, -1, 0]} />
        
        {/* Weapon attached manually, standard scale */}
        <group position={[-0.6, 1.2, 0.4]} rotation={[Math.PI/2, 0, 0]} scale={1.2}>
           <Weapon type="Paladin" isAttacking={isAttacking} />
        </group>
      </group>
    );
  }

  const fallbackClass = normalizedClass === 'rogue'
    ? <RogueAvatar />
    : normalizedClass === 'druid'
      ? <DruidAvatar />
      : normalizedClass === 'hunter'
        ? <HunterAvatar />
        : normalizedClass === 'necromancer'
          ? <NecromancerAvatar />
          : <GenericAvatar faction={faction} charClass={charClass} />;

  return (
    <group ref={group} dispose={null}>
      <ClassAccent color={isMe ? '#4ce2ff' : (faction === 'shadow' ? '#8a7dff' : faction === 'nature' ? '#57c777' : '#f4c95d')} />
      {fallbackClass}
      <Weapon type={charClass} isAttacking={isAttacking} />
      {isRanged && isAttacking && <Projectile type={charClass} />}
    </group>
  );
};

useGLTF.preload('/assets/models/cleric.glb');
useGLTF.preload('/assets/models/paladin/scene.gltf');

export default CharacterModel;
