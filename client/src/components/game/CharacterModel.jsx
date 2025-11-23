import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

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
               <meshStandardMaterial color={type === 'Necromancer' ? 'purple' : 'cyan'} emissive={0.5} />
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

const CharacterModel = ({ faction, isMe, charClass, isAttacking }) => {
  const group = useRef();
  
  // Load Cleric
  const { scene: clericScene, animations: clericAnimations } = useGLTF('/assets/models/cleric.glb');
  const { actions: clericActions } = useAnimations(clericAnimations, group);

  // Load Paladin
  const { scene: paladinScene, animations: paladinAnimations } = useGLTF('/assets/models/paladin/scene.gltf');
  const { actions: paladinActions } = useAnimations(paladinAnimations, group);

  const isRanged = ['Cleric', 'Necromancer', 'Druid', 'Hunter'].includes(charClass);

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
        <primitive object={clericScene} position={[0, 0.8, 0]} />
        {isAttacking && <Projectile type={charClass} />}
      </group>
    );
  }

  if (charClass === 'Paladin') {
    return (
      <group ref={group} dispose={null}> 
        {/* Scale model independently from weapon */}
        <primitive object={paladinScene} scale={0.01} position={[0, -1, 0]} />
        
        {/* Weapon attached manually, standard scale */}
        <group position={[-0.6, 1.2, 0.4]} rotation={[Math.PI/2, 0, 0]} scale={1.2}>
           <Weapon type="Paladin" isAttacking={isAttacking} />
        </group>
      </group>
    );
  }

  const FACTION_COLORS = {
    'sun': '#FFD700',
    'shadow': '#4B0082',
    'nature': '#228B22'
  };
  
  const color = isMe ? '#0088ff' : (FACTION_COLORS[faction] || 'red');

  return (
    <group>
      {/* Body */}
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 1.2, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 1.9, 0]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#ffccaa" /> {/* Skin toneish */}
      </mesh>

      {/* Weapon */}
      <Weapon type={charClass} isAttacking={isAttacking} />
      
      {/* Ranged Projectile */}
      {isRanged && isAttacking && <Projectile type={charClass} />}
    </group>
  );
};

useGLTF.preload('/assets/models/cleric.glb');
useGLTF.preload('/assets/models/paladin/scene.gltf');

export default CharacterModel;
