import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text, useAnimations, useFBX } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const HealthBar = ({ hp, maxHp, glow = '#ff9248' }) => {
  const ratio = clamp01(hp / Math.max(maxHp, 1));

  return (
    <Billboard position={[0, 2.45, 0]}>
      <mesh>
        <planeGeometry args={[1.25, 0.15]} />
        <meshBasicMaterial color="#222" />
      </mesh>
      <mesh position={[-(1.25 - (1.25 * ratio)) / 2, 0, 0.01]}>
        <planeGeometry args={[1.25 * ratio, 0.1]} />
        <meshBasicMaterial color={ratio > 0.35 ? glow : '#ff4b4b'} />
      </mesh>
    </Billboard>
  );
};

const EliteAura = ({ glow }) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
      <ringGeometry args={[1.15, 1.8, 48]} />
      <meshBasicMaterial color={glow} transparent opacity={0.45} side={THREE.DoubleSide} />
    </mesh>
    <pointLight position={[0, 1.9, 0]} intensity={4.5} color={glow} distance={14} />
  </group>
);

const ANIMATED_MOBS = {
  skeleton: {
    path: '/assets/quaternius/animated-monsters/Skeleton.fbx',
    height: 2.45,
    rotation: [0, Math.PI, 0],
    clipPriority: ['walk', 'idle', 'run', 'attack']
  },
  specter: {
    path: '/assets/quaternius/animated-monsters/Bat.fbx',
    height: 1.85,
    rotation: [0, Math.PI / 2, 0],
    clipPriority: ['fly', 'idle', 'walk', 'attack']
  },
  wisp: {
    path: '/assets/quaternius/animated-monsters/Bat.fbx',
    height: 1.55,
    rotation: [0, Math.PI / 2, 0],
    clipPriority: ['fly', 'idle', 'walk']
  },
  ogre: {
    path: '/assets/quaternius/animated-monsters/Dragon.fbx',
    height: 3.35,
    rotation: [0, Math.PI, 0],
    clipPriority: ['fly', 'idle', 'walk', 'attack']
  }
};

const normalizeAnimatedModel = (scene, targetHeight) => {
  const cloned = cloneSkinned(scene);
  cloned.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });

  const box = new THREE.Box3().setFromObject(cloned);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  const height = Math.max(size.y, 0.001);
  const scale = targetHeight / height;
  cloned.scale.setScalar(scale);
  cloned.position.set(
    -center.x * scale,
    -box.min.y * scale,
    -center.z * scale
  );

  return cloned;
};

const AnimatedMobAsset = ({ path, targetHeight, rotation = [0, 0, 0], clipPriority = [], tint = null }) => {
  const group = useRef();
  const source = useFBX(path);
  const model = React.useMemo(() => normalizeAnimatedModel(source, targetHeight), [source, targetHeight]);
  const { actions, names } = useAnimations(source.animations, group);

  useEffect(() => {
    const preferred = clipPriority
      .map((candidate) => names.find((name) => name.toLowerCase().includes(candidate)))
      .find(Boolean) || names[0];

    const action = preferred ? actions[preferred] : null;
    if (!action) return undefined;

    action.reset().fadeIn(0.2).play();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.timeScale = 1;

    return () => {
      action.fadeOut(0.15);
    };
  }, [actions, clipPriority, names]);

  useEffect(() => {
    if (!tint) return;

    model.traverse((node) => {
      if (!node.isMesh || !node.material) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        if (material.color) material.color.lerp(new THREE.Color(tint), 0.18);
      });
    });
  }, [model, tint]);

  return (
    <group ref={group} rotation={rotation}>
      <primitive object={model} />
    </group>
  );
};

const WolfBody = ({ tint, pulse }) => (
  <group>
    <mesh position={[0, 0.82, 0]} castShadow>
      <boxGeometry args={[0.85, 0.55, 1.5]} />
      <meshStandardMaterial color={tint} roughness={0.85} />
    </mesh>
    <mesh position={[0, 1.25, 0.56]} castShadow>
      <boxGeometry args={[0.55, 0.45, 0.58]} />
      <meshStandardMaterial color="#72584a" roughness={0.8} />
    </mesh>
    <mesh position={[0, 1.45, 0.98]} castShadow>
      <boxGeometry args={[0.35, 0.2, 0.2]} />
      <meshStandardMaterial color="#1b1715" />
    </mesh>
    {[
      [-0.28, 0.25, 0.45],
      [0.28, 0.25, 0.45],
      [-0.28, 0.25, -0.45],
      [0.28, 0.25, -0.45]
    ].map((pos, index) => (
      <mesh key={index} position={pos} castShadow>
        <boxGeometry args={[0.12, 0.55, 0.12]} />
        <meshStandardMaterial color="#4e403a" />
      </mesh>
    ))}
    <mesh position={[0, 1.0, -0.92]} rotation={[0.3, 0, 0]} castShadow>
      <boxGeometry args={[0.08, 0.55, 0.08]} />
      <meshStandardMaterial color="#3b322f" />
    </mesh>
    <mesh position={[0, 1.08, -1.0]} rotation={[0.6, 0, 0]} castShadow>
      <boxGeometry args={[0.08, 0.45, 0.08]} />
      <meshStandardMaterial color="#5f4d43" />
    </mesh>
  </group>
);

const SpiderBody = ({ tint, pulse }) => (
  <group>
    <mesh position={[0, 0.82, 0.08]} castShadow>
      <sphereGeometry args={[0.45, 18, 18]} />
      <meshStandardMaterial color={tint} roughness={0.9} />
    </mesh>
    <mesh position={[0, 1.05, 0.46]} castShadow>
      <sphereGeometry args={[0.28, 16, 16]} />
      <meshStandardMaterial color="#3f3a2a" roughness={0.85} />
    </mesh>
    {Array.from({ length: 8 }).map((_, index) => {
      const leftSide = index < 4 ? -1 : 1;
      const sideIndex = index % 4;
      const zOffset = [-0.45, -0.15, 0.15, 0.45][sideIndex];
      const bend = [-0.8, -0.35, 0.35, 0.8][sideIndex];
      return (
        <mesh
          key={index}
          position={[leftSide * 0.35, 0.7, zOffset]}
          rotation={[0.2 * sideIndex, leftSide * 0.45, bend]}
          castShadow
        >
          <boxGeometry args={[0.05, 0.95, 0.05]} />
          <meshStandardMaterial color="#26231e" />
        </mesh>
      );
    })}
    <mesh position={[0.14, 1.12, 0.66]}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshStandardMaterial color="#ff6b6b" emissive="#ff6b6b" emissiveIntensity={1.2} />
    </mesh>
    <mesh position={[-0.14, 1.12, 0.66]}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshStandardMaterial color="#ff6b6b" emissive="#ff6b6b" emissiveIntensity={1.2} />
    </mesh>
  </group>
);

const SkeletonBody = ({ tint }) => (
  <group>
    <mesh position={[0, 1.0, 0]} castShadow>
      <boxGeometry args={[0.52, 0.95, 0.3]} />
      <meshStandardMaterial color={tint} roughness={0.55} />
    </mesh>
    <mesh position={[0, 1.58, 0]} castShadow>
      <boxGeometry args={[0.42, 0.42, 0.36]} />
      <meshStandardMaterial color="#efefef" roughness={0.4} />
    </mesh>
    <mesh position={[0, 1.62, 0.15]}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshStandardMaterial color="#74d7ff" emissive="#74d7ff" emissiveIntensity={1.2} />
    </mesh>
    <mesh position={[0, 1.62, 0.15]}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshStandardMaterial color="#74d7ff" emissive="#74d7ff" emissiveIntensity={1.2} />
    </mesh>
    {[
      [-0.25, 0.45, 0.06],
      [0.25, 0.45, 0.06],
      [-0.18, -0.1, 0],
      [0.18, -0.1, 0]
    ].map((pos, index) => (
      <mesh key={index} position={pos} castShadow>
        <boxGeometry args={[0.12, index < 2 ? 0.65 : 0.55, 0.1]} />
        <meshStandardMaterial color="#d9d6d1" roughness={0.45} />
      </mesh>
    ))}
    <mesh position={[0, 0.55, 0]} castShadow>
      <boxGeometry args={[0.12, 0.7, 0.1]} />
      <meshStandardMaterial color="#d9d6d1" roughness={0.45} />
    </mesh>
  </group>
);

const BanditBody = ({ tint }) => (
  <group>
    <mesh position={[0, 1.0, 0]} castShadow>
      <boxGeometry args={[0.72, 1.1, 0.48]} />
      <meshStandardMaterial color={tint} roughness={0.9} />
    </mesh>
    <mesh position={[0, 1.7, 0]} castShadow>
      <boxGeometry args={[0.5, 0.42, 0.46]} />
      <meshStandardMaterial color="#302720" />
    </mesh>
    <mesh position={[0, 1.9, -0.02]} rotation={[0, 0, -0.2]} castShadow>
      <boxGeometry args={[0.48, 0.18, 0.46]} />
      <meshStandardMaterial color="#4c3d34" />
    </mesh>
    <mesh position={[0.34, 1.1, 0.45]} rotation={[0, 0, -0.2]} castShadow>
      <boxGeometry args={[0.1, 0.88, 0.1]} />
      <meshStandardMaterial color="#8c6239" />
    </mesh>
    <mesh position={[-0.34, 1.1, 0.45]} rotation={[0, 0, 0.2]} castShadow>
      <boxGeometry args={[0.1, 0.88, 0.1]} />
      <meshStandardMaterial color="#8c6239" />
    </mesh>
    <mesh position={[0.72, 1.02, 0.28]} rotation={[0.15, 0, 0.7]} castShadow>
      <boxGeometry args={[0.1, 1.15, 0.08]} />
      <meshStandardMaterial color="#d8d8d8" />
    </mesh>
  </group>
);

const OrcBody = ({ tint }) => (
  <group>
    <mesh position={[0, 1.05, 0]} castShadow>
      <boxGeometry args={[0.9, 1.35, 0.55]} />
      <meshStandardMaterial color={tint} roughness={0.92} />
    </mesh>
    <mesh position={[0, 1.92, 0]} castShadow>
      <boxGeometry args={[0.66, 0.62, 0.58]} />
      <meshStandardMaterial color="#7a8d4f" roughness={0.9} />
    </mesh>
    <mesh position={[0.2, 1.94, 0.32]}>
      <boxGeometry args={[0.08, 0.18, 0.08]} />
      <meshStandardMaterial color="#1c120c" />
    </mesh>
    <mesh position={[-0.2, 1.94, 0.32]}>
      <boxGeometry args={[0.08, 0.18, 0.08]} />
      <meshStandardMaterial color="#1c120c" />
    </mesh>
    <mesh position={[-0.56, 1.08, 0.22]} rotation={[0, 0, 0.25]} castShadow>
      <boxGeometry args={[0.14, 0.95, 0.14]} />
      <meshStandardMaterial color="#5f6c37" />
    </mesh>
    <mesh position={[0.56, 1.08, 0.22]} rotation={[0, 0, -0.25]} castShadow>
      <boxGeometry args={[0.14, 0.95, 0.14]} />
      <meshStandardMaterial color="#5f6c37" />
    </mesh>
    <mesh position={[0.78, 1.08, 0.15]} rotation={[0.18, 0.1, 0.4]} castShadow>
      <boxGeometry args={[0.18, 1.15, 0.18]} />
      <meshStandardMaterial color="#7a5b32" />
    </mesh>
  </group>
);

const SpecterBody = ({ glow }) => (
  <group>
    <mesh position={[0, 1.0, 0]} castShadow>
      <icosahedronGeometry args={[0.58, 0]} />
      <meshStandardMaterial color={glow} transparent opacity={0.6} emissive={glow} emissiveIntensity={0.85} roughness={0.2} />
    </mesh>
    <mesh position={[0, 1.5, 0]}>
      <ringGeometry args={[0.25, 0.48, 28]} />
      <meshBasicMaterial color={glow} transparent opacity={0.4} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
      <ringGeometry args={[0.18, 0.48, 28]} />
      <meshBasicMaterial color={glow} transparent opacity={0.25} side={THREE.DoubleSide} />
    </mesh>
  </group>
);

const TreantBody = ({ tint }) => (
  <group>
    <mesh position={[0, 1.1, 0]} castShadow>
      <cylinderGeometry args={[0.6, 0.75, 2.2, 8]} />
      <meshStandardMaterial color={tint} roughness={1} />
    </mesh>
    <mesh position={[0, 2.55, 0]} castShadow>
      <sphereGeometry args={[0.82, 12, 12]} />
      <meshStandardMaterial color="#4a6f37" roughness={0.95} />
    </mesh>
    <mesh position={[0.82, 1.45, 0.02]} rotation={[0, 0, -0.5]} castShadow>
      <cylinderGeometry args={[0.13, 0.22, 1.05, 6]} />
      <meshStandardMaterial color={tint} roughness={1} />
    </mesh>
    <mesh position={[-0.82, 1.45, 0.02]} rotation={[0, 0, 0.5]} castShadow>
      <cylinderGeometry args={[0.13, 0.22, 1.05, 6]} />
      <meshStandardMaterial color={tint} roughness={1} />
    </mesh>
  </group>
);

const GuardianBody = ({ tint }) => (
  <group>
    <mesh position={[0, 1.15, 0]} castShadow>
      <boxGeometry args={[0.96, 1.45, 0.7]} />
      <meshStandardMaterial color={tint} roughness={0.95} />
    </mesh>
    <mesh position={[0, 2.0, 0]} castShadow>
      <octahedronGeometry args={[0.6, 0]} />
      <meshStandardMaterial color="#d8d2c3" roughness={0.8} />
    </mesh>
    <mesh position={[0, 2.2, 0.34]}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial color="#74d7ff" emissive="#74d7ff" emissiveIntensity={1.3} />
    </mesh>
    <mesh position={[0, 1.15, 0.48]}>
      <boxGeometry args={[0.22, 0.22, 0.18]} />
      <meshStandardMaterial color="#74d7ff" emissive="#74d7ff" emissiveIntensity={0.6} />
    </mesh>
  </group>
);

const WispBody = ({ glow }) => (
  <group>
    <mesh position={[0, 1.15, 0]} castShadow>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial color={glow} transparent opacity={0.55} emissive={glow} emissiveIntensity={1} roughness={0.15} />
    </mesh>
    <mesh position={[0, 1.15, 0]}>
      <ringGeometry args={[0.3, 0.72, 36]} />
      <meshBasicMaterial color={glow} transparent opacity={0.28} side={THREE.DoubleSide} />
    </mesh>
  </group>
);

const MobModel = ({ type, role, size, elite, glow, isDamaged, pulse }) => {
  const tintMap = {
    wolf: '#8d6e63',
    spider: '#91a85d',
    treant: '#6b4f35',
    skeleton: '#d8d7d2',
    specter: glow,
    bandit: '#6e4b3a',
    orc: '#60704a',
    guardian: '#b7b1a3',
    wisp: glow,
    ogre: '#8a5a3b'
  };

  const tint = isDamaged ? '#ff7777' : (tintMap[type] || '#7a7365');
  const scale = size || (elite ? 1.25 : 1);
  const animatedMob = ANIMATED_MOBS[type];

  return (
    <group scale={[scale, scale, scale]}>
      {animatedMob ? (
        <AnimatedMobAsset
          key={type}
          path={animatedMob.path}
          targetHeight={animatedMob.height}
          rotation={animatedMob.rotation}
          clipPriority={animatedMob.clipPriority}
          tint={isDamaged ? '#ff8888' : null}
        />
      ) : (
        <>
          {type === 'wolf' && <WolfBody tint={tint} pulse={pulse} />}
          {type === 'spider' && <SpiderBody tint={tint} pulse={pulse} />}
          {type === 'treant' && <TreantBody tint={tint} />}
          {type === 'skeleton' && <SkeletonBody tint={tint} />}
          {(type === 'bandit' || type === 'orc') && <BanditBody tint={tint} />}
          {type === 'specter' && <SpecterBody glow={glow} />}
          {type === 'guardian' && <GuardianBody tint={tint} />}
          {type === 'wisp' && <WispBody glow={glow} />}
          {type === 'ogre' && <OrcBody tint={tint} />}
          {!['wolf', 'spider', 'treant', 'skeleton', 'bandit', 'orc', 'specter', 'guardian', 'wisp', 'ogre'].includes(type) && (
            <mesh position={[0, 1, 0]} castShadow>
              <boxGeometry args={[0.8, 1.2, 0.5]} />
              <meshStandardMaterial color={tint} />
            </mesh>
          )}
        </>
      )}
    </group>
  );
};

const SelectionRing = ({ radius = 1.1 }) => {
  const ref = useRef();
  useFrame((state) => { if (ref.current) ref.current.rotation.z = state.clock.elapsedTime * 1.5; });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
      <ringGeometry args={[radius, radius + 0.16, 40]} />
      <meshBasicMaterial color="#ffd23f" transparent opacity={0.85} side={THREE.DoubleSide} />
    </mesh>
  );
};

const Mob = ({ id, position, rotation, type, name, hp, maxHp, role, size, elite, glow, selected, onSelect }) => {
  const ref = useRef();
  const previousHp = useRef(hp);
  const [isDamaged, setIsDamaged] = useState(false);

  useEffect(() => {
    if (hp < previousHp.current) {
      setIsDamaged(true);
      const timer = setTimeout(() => setIsDamaged(false), 180);
      previousHp.current = hp;
      return () => clearTimeout(timer);
    }

    previousHp.current = hp;
    return undefined;
  }, [hp]);

  useFrame((state) => {
    if (!ref.current) return;

    const bob = Math.sin(state.clock.elapsedTime * (elite ? 3.5 : 2.4)) * (elite ? 0.12 : 0.08);
    ref.current.position.lerp(new THREE.Vector3(...position), 0.11);
    ref.current.position.y = position[1] + bob;

    let targetRotation = rotation;
    const currentRotation = ref.current.rotation.y;
    while (targetRotation - currentRotation > Math.PI) targetRotation -= Math.PI * 2;
    while (targetRotation - currentRotation < -Math.PI) targetRotation += Math.PI * 2;
    ref.current.rotation.y += (targetRotation - currentRotation) * 0.12;
  });

  return (
    <group
      ref={ref}
      position={position}
      onClick={(e) => { e.stopPropagation(); if (onSelect) onSelect(id); }}
      onPointerOver={() => { document.body.style.cursor = 'crosshair'; }}
      onPointerOut={() => { document.body.style.cursor = 'default'; }}
    >
      {selected && <SelectionRing radius={1.0 * (size || 1)} />}
      <MobModel
        type={type}
        role={role}
        size={size}
        elite={elite}
        glow={glow}
        isDamaged={isDamaged}
      />
      {elite && <EliteAura glow={glow || '#ffffff'} />}
      <Billboard position={[0, 2.18, 0]}>
        <Text
          fontSize={0.26}
          color={elite ? glow || '#ffd36b' : '#ffcb74'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {elite ? `Elite ${name}` : name}
        </Text>
      </Billboard>
      <HealthBar hp={hp} maxHp={maxHp} glow={glow || '#ff9248'} />
    </group>
  );
};

useFBX.preload('/assets/quaternius/animated-monsters/Skeleton.fbx');
useFBX.preload('/assets/quaternius/animated-monsters/Bat.fbx');
useFBX.preload('/assets/quaternius/animated-monsters/Dragon.fbx');
useFBX.preload('/assets/quaternius/animated-monsters/Slime.fbx');

export default Mob;
