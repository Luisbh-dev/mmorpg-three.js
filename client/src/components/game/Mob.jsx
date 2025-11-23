import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';

const HealthBar = ({ hp, maxHp }) => {
  return (
    <Billboard position={[0, 2.5, 0]}>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[1.2, 0.15]} />
        <meshBasicMaterial color="#333" />
      </mesh>
      <mesh position={[-(1.2 - (1.2 * (hp / maxHp))) / 2, 0, 0.01]}>
        <planeGeometry args={[1.2 * (hp / maxHp), 0.1]} />
        <meshBasicMaterial color="red" />
      </mesh>
    </Billboard>
  );
};

const MobModel = ({ type, isDamaged }) => {
  const color = type === 'wolf' ? '#8d6e63' : 
                type === 'skeleton' ? '#eeeeee' : 
                type === 'bandit' ? '#3e2723' : '#5d4037';

  const scale = type === 'guardian' ? 1.5 : 1;

  return (
    <group scale={[scale, scale, scale]}>
       {/* Simple flashing red on damage */}
      <mesh position={[0, 1, 0]} castShadow>
        {type === 'wolf' ? (
           <boxGeometry args={[0.6, 0.6, 1.2]} />
        ) : (
           <boxGeometry args={[0.6, 1.6, 0.4]} />
        )}
        <meshStandardMaterial 
           color={isDamaged ? 'red' : color} 
           emissive={isDamaged ? 'red' : 'black'}
           emissiveIntensity={isDamaged ? 0.5 : 0}
        />
      </mesh>
      {/* Eyes */}
      <mesh position={[0, 1.4, 0.21]}>
         <boxGeometry args={[0.4, 0.1, 0.1]} />
         <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
};

const Mob = ({ id, position, rotation, type, name, hp, maxHp }) => {
  const ref = useRef();
  const [isDamaged, setIsDamaged] = useState(false);
  const prevHp = useRef(hp);

  // Detect damage for flash animation
  if (hp < prevHp.current) {
    setIsDamaged(true);
    setTimeout(() => setIsDamaged(false), 200);
  }
  prevHp.current = hp;

  useFrame(() => {
    if (ref.current) {
      ref.current.position.lerp(new THREE.Vector3(...position), 0.1);
      // Lerp rotation strictly (avoid spinning 360 when crossing PI/-PI boundary if simplistic)
      // For now direct set is safer or quaternion slerp.
      // ref.current.rotation.y = rotation; 
      
      // Let's try smooth rotation
      // Minimal rotation logic:
      let targetRot = rotation;
      let currentRot = ref.current.rotation.y;
      
      // Normalize angles
      while (targetRot - currentRot > Math.PI) targetRot -= Math.PI * 2;
      while (targetRot - currentRot < -Math.PI) targetRot += Math.PI * 2;

      ref.current.rotation.y += (targetRot - currentRot) * 0.1;
    }
  });

  return (
    <group ref={ref} position={position}>
      <MobModel type={type} isDamaged={isDamaged} />
      <Text
        position={[0, 2.2, 0]}
        fontSize={0.3}
        color="orange"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {name} [Lvl 1]
      </Text>
      <HealthBar hp={hp} maxHp={maxHp} />
    </group>
  );
};

export default Mob;
