import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard, Environment, PointerLockControls, Sky, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';
import useGameStore from '../stores/useGameStore';
import { useKeyboard } from '../hooks/useKeyboard';
import Terrain from './game/Terrain';
import CharacterModel from './game/CharacterModel';
import Mob from './game/Mob';
import Item from './game/Item';
import NPC from './game/NPC';
import Settlement from './game/Settlement';
import Wall from './game/Wall';
import { FACTION_META, LANDMARKS, MAP_RADIUS, ROADS, WAR_ZONE_RADIUS, WORLD_BOUNDARY, getFactionMeta, getLandmarkColor } from '../lib/gameData';

const MOVEMENT_SPEED = 0.3;
const BOUNDARY = WORLD_BOUNDARY;
const INNER_WALL_THICKNESS = 1.1;
const RADIAL_ANGLES = [Math.PI / 4, Math.PI, (7 * Math.PI) / 4];

const WALLS = [];
const numSegments = 16;
const angleStep = (Math.PI * 2) / numSegments;
const gateSize = 0.2;

for (let i = 0; i < numSegments; i += 1) {
  const angle = i * angleStep;
  const isGate =
    Math.abs(angle - 0) < gateSize ||
    Math.abs(angle - Math.PI / 2) < gateSize ||
    Math.abs(angle - Math.PI) < gateSize ||
    Math.abs(angle - (3 * Math.PI) / 2) < gateSize;

  if (!isGate) {
    const x = Math.sin(angle) * WAR_ZONE_RADIUS;
    const z = Math.cos(angle) * WAR_ZONE_RADIUS;
    const length = (2 * WAR_ZONE_RADIUS * Math.sin(angleStep / 2)) + 2;
    WALLS.push({ position: [x, 0, z], rotation: angle, length });
  }
}

RADIAL_ANGLES.forEach((angle) => {
  const radialLength = MAP_RADIUS - WAR_ZONE_RADIUS;
  const radialCenterDistance = WAR_ZONE_RADIUS + (radialLength / 2);
  const x = Math.sin(angle) * radialCenterDistance;
  const z = Math.cos(angle) * radialCenterDistance;

  WALLS.push({
    position: [x, 0, z],
    rotation: angle + (Math.PI / 2),
    length: radialLength
  });
});

const HealthBillboard = ({ hp, maxHp, name, tone = '#ffffff' }) => {
  const safeRatio = Math.max(0, Math.min(1, hp / Math.max(maxHp, 1)));

  return (
    <Billboard position={[0, 2.7, 0]}>
      <Text
        fontSize={0.28}
        color={tone}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {name}
      </Text>
      <group position={[0, -0.34, 0]}>
        <mesh>
          <planeGeometry args={[1.25, 0.15]} />
          <meshBasicMaterial color="#191919" />
        </mesh>
        <mesh position={[-(1.25 - (1.25 * safeRatio)) / 2, 0, 0.01]}>
          <planeGeometry args={[1.25 * safeRatio, 0.1]} />
          <meshBasicMaterial color={safeRatio > 0.35 ? '#6df58b' : '#ff6b6b'} />
        </mesh>
      </group>
    </Billboard>
  );
};

const Tree = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.2, 0.38, 2.4, 8]} />
      <meshStandardMaterial color="#694731" roughness={1} />
    </mesh>
    <mesh position={[0, 3.1, 0]} castShadow>
      <coneGeometry args={[1.4, 3.2, 8]} />
      <meshStandardMaterial color="#2d8747" roughness={1} />
    </mesh>
  </group>
);

const CrystalCluster = ({ position, color }) => (
  <group position={position}>
    {[[-0.4, 0.65, 0], [0, 1.05, 0.2], [0.5, 0.75, -0.2]].map((offset, index) => (
      <mesh key={index} position={offset} castShadow>
        <octahedronGeometry args={[0.45 + (index * 0.08), 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} roughness={0.15} metalness={0.5} />
      </mesh>
    ))}
  </group>
);

const Landmark = ({ landmark }) => {
  const isSettlement = ['capital', 'city', 'town', 'village', 'outpost'].includes(landmark.type);
  if (isSettlement) {
    return <Settlement landmark={landmark} />;
  }

  const meta = getFactionMeta(landmark.faction);
  const color = getLandmarkColor(landmark);

  if (landmark.type === 'capital') {
    return (
      <group position={landmark.position}>
        <mesh receiveShadow castShadow>
          <cylinderGeometry args={[4.4, 5.2, 1.4, 24]} />
          <meshStandardMaterial color="#52473c" roughness={0.9} />
        </mesh>
        <mesh position={[0, 3.2, 0]} castShadow>
          <cylinderGeometry args={[1.2, 1.8, 5.4, 12]} />
          <meshStandardMaterial color="#bdb2a2" roughness={0.7} />
        </mesh>
        <mesh position={[0, 6.8, 0]} castShadow>
          <octahedronGeometry args={[1.5, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} roughness={0.2} />
        </mesh>
        <pointLight position={[0, 6.2, 0]} intensity={10} color={meta.glow} distance={20} />
      </group>
    );
  }

  if (landmark.type === 'city') {
    return (
      <group position={landmark.position}>
        <mesh receiveShadow castShadow>
          <cylinderGeometry args={[5.6, 6.2, 1.2, 28]} />
          <meshStandardMaterial color="#4b4038" roughness={0.95} />
        </mesh>
        <mesh position={[0, 2.8, 0]} castShadow>
          <cylinderGeometry args={[2.1, 2.8, 4.8, 14]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        <mesh position={[-3.1, 1.4, 0.2]} rotation={[0, 0.1, 0.06]} castShadow>
          <boxGeometry args={[1.4, 2.2, 1.2]} />
          <meshStandardMaterial color="#7f6d5f" roughness={0.95} />
        </mesh>
        <mesh position={[3.0, 1.5, -0.4]} rotation={[0, -0.12, -0.04]} castShadow>
          <boxGeometry args={[1.5, 2.4, 1.15]} />
          <meshStandardMaterial color="#6d5b4c" roughness={0.95} />
        </mesh>
        <mesh position={[0, 5.5, 0]} castShadow>
          <octahedronGeometry args={[1.1, 0]} />
          <meshStandardMaterial color={meta.glow} emissive={meta.glow} emissiveIntensity={0.9} roughness={0.18} />
        </mesh>
        <pointLight position={[0, 5.2, 0]} intensity={9} color={meta.glow} distance={18} />
      </group>
    );
  }

  if (landmark.type === 'town') {
    return (
      <group position={landmark.position}>
        <mesh receiveShadow castShadow>
          <cylinderGeometry args={[3.4, 3.9, 1, 20]} />
          <meshStandardMaterial color="#4f4237" roughness={0.98} />
        </mesh>
        <mesh position={[-1.9, 1.2, 0.35]} rotation={[0, 0.08, 0.1]} castShadow>
          <boxGeometry args={[1.05, 1.7, 0.95]} />
          <meshStandardMaterial color="#846b57" roughness={0.95} />
        </mesh>
        <mesh position={[1.8, 1.15, -0.25]} rotation={[0, -0.05, -0.08]} castShadow>
          <boxGeometry args={[1.1, 1.6, 0.9]} />
          <meshStandardMaterial color="#8c755d" roughness={0.95} />
        </mesh>
        <mesh position={[0, 2.7, 0]} castShadow>
          <cylinderGeometry args={[0.8, 1.2, 3.0, 10]} />
          <meshStandardMaterial color={color} roughness={0.72} />
        </mesh>
        <mesh position={[0, 4.5, 0]} castShadow>
          <octahedronGeometry args={[0.7, 0]} />
          <meshStandardMaterial color={meta.glow} emissive={meta.glow} emissiveIntensity={0.75} roughness={0.2} />
        </mesh>
        <pointLight position={[0, 4.3, 0]} intensity={6} color={meta.glow} distance={14} />
      </group>
    );
  }

  if (landmark.type === 'village') {
    return (
      <group position={landmark.position}>
        <mesh receiveShadow castShadow>
          <cylinderGeometry args={[2.6, 3.0, 0.9, 16]} />
          <meshStandardMaterial color="#564539" roughness={1} />
        </mesh>
        <mesh position={[-1.45, 0.95, 0.25]} rotation={[0, 0.18, 0.12]} castShadow>
          <coneGeometry args={[0.7, 1.3, 6]} />
          <meshStandardMaterial color="#7d6048" roughness={1} />
        </mesh>
        <mesh position={[1.25, 0.9, -0.15]} rotation={[0, -0.12, -0.1]} castShadow>
          <coneGeometry args={[0.65, 1.2, 6]} />
          <meshStandardMaterial color="#8b7358" roughness={1} />
        </mesh>
        <mesh position={[0, 1.7, 0]} castShadow>
          <boxGeometry args={[0.65, 0.65, 0.65]} />
          <meshStandardMaterial color={meta.glow} emissive={meta.glow} emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0.9, 0.95, 0.55]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1.4]} />
          <meshStandardMaterial color="#9c7450" />
        </mesh>
        <mesh position={[-0.9, 1.0, -0.55]} castShadow>
          <sphereGeometry args={[0.35, 10, 10]} />
          <meshStandardMaterial color="#5fa35a" />
        </mesh>
      </group>
    );
  }

  if (landmark.type === 'outpost') {
    return (
      <group position={landmark.position}>
        <mesh receiveShadow castShadow>
          <cylinderGeometry args={[2.4, 2.9, 1, 18]} />
          <meshStandardMaterial color="#3f342e" roughness={1} />
        </mesh>
        <mesh position={[0, 2.4, 0]} castShadow>
          <cylinderGeometry args={[0.7, 1.0, 4.2, 10]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        <mesh position={[0, 4.8, 0]} castShadow>
          <boxGeometry args={[1.4, 0.5, 1.4]} />
          <meshStandardMaterial color="#6c5540" roughness={0.95} />
        </mesh>
        <mesh position={[0, 5.5, 0]} castShadow>
          <octahedronGeometry args={[0.55, 0]} />
          <meshStandardMaterial color={meta.glow} emissive={meta.glow} emissiveIntensity={0.8} />
        </mesh>
        <pointLight position={[0, 5.1, 0]} intensity={4.5} color={meta.glow} distance={12} />
      </group>
    );
  }

  if (landmark.type === 'fortress') {
    return (
      <group position={landmark.position}>
        <mesh receiveShadow castShadow>
          <cylinderGeometry args={[5.8, 6.3, 1.8, 28]} />
          <meshStandardMaterial color="#433832" roughness={0.95} />
        </mesh>
        <mesh position={[0, 2.8, 0]} castShadow>
          <ringGeometry args={[4.5, 5.6, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 4.4, 0]} castShadow>
          <boxGeometry args={[2.6, 5.2, 2.6]} />
          <meshStandardMaterial color={color} roughness={0.55} />
        </mesh>
        <mesh position={[0, 7.8, 0]} castShadow>
          <octahedronGeometry args={[1.25, 0]} />
          <meshStandardMaterial color={meta.glow} emissive={meta.glow} emissiveIntensity={1.1} roughness={0.15} />
        </mesh>
        <pointLight position={[0, 7.2, 0]} intensity={12} color={meta.glow} distance={24} />
      </group>
    );
  }

  if (landmark.type === 'arena') {
    return (
      <group position={landmark.position}>
        <mesh receiveShadow castShadow>
          <cylinderGeometry args={[6.2, 6.8, 1.3, 36]} />
          <meshStandardMaterial color="#4a3f35" roughness={0.95} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} receiveShadow>
          <torusGeometry args={[4.6, 0.24, 14, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 3.4, 0]} castShadow>
          <boxGeometry args={[2.2, 4.2, 2.2]} />
          <meshStandardMaterial color={color} roughness={0.55} />
        </mesh>
        <mesh position={[0, 6.1, 0]} castShadow>
          <octahedronGeometry args={[1.2, 0]} />
          <meshStandardMaterial color={meta.glow} emissive={meta.glow} emissiveIntensity={1} />
        </mesh>
        <pointLight position={[0, 5.5, 0]} intensity={12} color={meta.glow} distance={24} />
      </group>
    );
  }

  if (landmark.type === 'gate') {
    return (
      <group position={landmark.position}>
        <mesh position={[0, 2.1, 0]} castShadow>
          <boxGeometry args={[1.4, 4.2, 0.7]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        <mesh position={[0, 4.75, 0]} castShadow>
          <boxGeometry args={[4.6, 0.55, 1.1]} />
          <meshStandardMaterial color="#5a4635" roughness={0.9} />
        </mesh>
        <mesh position={[0, 2.25, 0]} castShadow>
          <torusGeometry args={[1.7, 0.12, 12, 20, Math.PI]} />
          <meshStandardMaterial color={meta.glow} emissive={meta.glow} emissiveIntensity={0.7} />
        </mesh>
        <pointLight position={[0, 4.2, 0]} intensity={4} color={meta.glow} distance={16} />
      </group>
    );
  }

  return (
    <group position={landmark.position}>
      <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.4, 2.8, 1.8, 14]} />
        <meshStandardMaterial color="#4e3f35" roughness={1} />
      </mesh>
      <mesh position={[-1.7, 0.8, 0.4]} rotation={[0, 0, 0.3]} castShadow>
        <boxGeometry args={[0.6, 1.4, 0.55]} />
        <meshStandardMaterial color="#7a6358" roughness={0.95} />
      </mesh>
      <mesh position={[1.2, 1.2, -0.3]} rotation={[0.15, 0.1, -0.2]} castShadow>
        <boxGeometry args={[0.8, 1.1, 0.65]} />
        <meshStandardMaterial color="#89745f" roughness={0.95} />
      </mesh>
      <pointLight position={[0, 3.1, 0]} intensity={2.5} color={meta.glow} distance={10} />
    </group>
  );
};

const FloatingMotes = () => {
  const motes = useMemo(() => {
    return Array.from({ length: 60 }, (_, index) => ({
      position: [
        (Math.random() - 0.5) * 260,
        1 + Math.random() * 10,
        (Math.random() - 0.5) * 260
      ],
      speed: 0.12 + (index % 5) * 0.02,
      phase: Math.random() * Math.PI * 2
    }));
  }, []);

  return (
    <group>
      {motes.map((mote, index) => (
        <mesh key={index} position={mote.position}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={index % 3 === 0 ? '#ffffff' : '#ffe8ab'} transparent opacity={0.65} />
        </mesh>
      ))}
    </group>
  );
};

const AncientRoad = ({ points, color = '#8d7a62' }) => {
  const lineRef = useRef();

  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))), [points]);
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 64, 0.7, 8, false), [curve]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh ref={lineRef} geometry={geometry} receiveShadow position={[0, 0.02, 0]}>
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
};

const roadColors = {
  sun: '#aa9466',
  shadow: '#6f6574',
  nature: '#6b8f63'
};

const ControlPointBeacon = ({ point }) => {
  const factionMeta = point.owner ? getFactionMeta(point.owner) : { color: '#d7d4cb', glow: '#ffffff', label: 'Neutral' };
  const progressRatio = Math.max(0, Math.min(1, point.progress / 100));
  const ringColor = point.contestingFaction ? getFactionMeta(point.contestingFaction).color : factionMeta.color;

  return (
    <group position={point.position}>
      <mesh receiveShadow castShadow>
        <cylinderGeometry args={[3.8, 4.2, 1, 24]} />
        <meshStandardMaterial color="#463a31" roughness={1} />
      </mesh>
      <mesh position={[0, 2.8, 0]} castShadow>
        <cylinderGeometry args={[0.8, 1.2, 4.5, 10]} />
        <meshStandardMaterial color="#bcb3a4" roughness={0.6} />
      </mesh>
      <mesh position={[0, 5.8, 0]} castShadow>
        <octahedronGeometry args={[1.05, 0]} />
        <meshStandardMaterial color={ringColor} emissive={ringColor} emissiveIntensity={0.85} roughness={0.2} metalness={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} receiveShadow>
        <ringGeometry args={[4.6, 5.35, 48, 1, 0, Math.PI * 2 * Math.max(0.08, progressRatio)]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 5.3, 0]} intensity={12} color={ringColor} distance={24} />
      <Billboard position={[0, 7.5, 0]}>
        <group>
          <Text fontSize={0.42} color="#f7f3ec" outlineWidth={0.025} outlineColor="#000000">
            {point.name}
          </Text>
          <Text position={[0, -0.45, 0]} fontSize={0.24} color={ringColor} outlineWidth={0.02} outlineColor="#000000">
            {point.owner ? `Control: ${factionMeta.shortLabel}` : point.contestingFaction ? `Capturando: ${getFactionMeta(point.contestingFaction).shortLabel}` : 'Neutral'}
          </Text>
        </group>
      </Billboard>
    </group>
  );
};

const Player = ({ id, position, rotation, faction, isMe, name, stats, lastAttack, charClass }) => {
  const ref = useRef();
  const maxHp = stats?.maxHp || 100;
  const hp = stats?.hp || 100;
  const isAttacking = lastAttack && (Date.now() - lastAttack < 300);

  useFrame(() => {
    if (!ref.current) return;

    ref.current.position.lerp(new THREE.Vector3(...position), 0.2);

    if (rotation) {
      let targetRot = rotation[1];
      const currentRot = ref.current.rotation.y;
      while (targetRot - ref.current.rotation.y > Math.PI) targetRot -= Math.PI * 2;
      while (targetRot - ref.current.rotation.y < -Math.PI) targetRot += Math.PI * 2;
      ref.current.rotation.y += (targetRot - currentRot) * 0.2;
    }
  });

  if (isMe) return null;

  return (
    <group ref={ref} position={position}>
      <CharacterModel
        faction={faction}
        isMe={false}
        charClass={charClass}
        isAttacking={isAttacking}
      />
      <HealthBillboard hp={hp} maxHp={maxHp} name={name || 'Unknown'} tone={getFactionMeta(faction).color} />
    </group>
  );
};

const PlayerController = () => {
  const { moveForward, moveBackward, moveLeft, moveRight } = useKeyboard();
  const myId = useGameStore((state) => state.myId);
  const players = useGameStore((state) => state.players);
  const movePlayer = useGameStore((state) => state.movePlayer);
  const isMapOpen = useGameStore((state) => state.isMapOpen);
  const isInventoryOpen = useGameStore((state) => state.isInventoryOpen);
  const isSystemMenuOpen = useGameStore((state) => state.isSystemMenuOpen);
  const activeDialog = useGameStore((state) => state.activeDialog);
  const { camera } = useThree();
  const velocityY = useRef(0);
  const isJumping = useRef(false);
  const pointerLockWasActive = useRef(false);

  useEffect(() => {
    const shouldIgnoreInput = (event) => {
      const target = event.target;
      if (!target) return false;

      if (target.closest?.('[data-ui-root="true"]')) return true;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return true;
      return false;
    };

    const handleKeyDown = (event) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const state = useGameStore.getState();
      if (state.isMapOpen || state.isInventoryOpen || state.isSystemMenuOpen || state.activeDialog) return;

      if (event.code === 'Space' && !isJumping.current) {
        velocityY.current = 0.3;
        isJumping.current = true;
      }

      if (event.code === 'KeyQ') {
        state.castSkill(2);
      }

      if (event.code === 'KeyE') {
        const localPlayer = state.players[state.myId];
        if (!localPlayer) return;

        const myPosition = localPlayer.position;
        const nearestNpc = Object.values(state.npcs).find((npc) => {
          const dx = myPosition[0] - npc.position[0];
          const dz = myPosition[2] - npc.position[2];
          return Math.sqrt((dx * dx) + (dz * dz)) < 4;
        });

        if (nearestNpc) {
          state.talkToNPC(nearestNpc.id);
          return;
        }

        const nearestItem = Object.values(state.items).find((item) => {
          const dx = myPosition[0] - item.position[0];
          const dz = myPosition[2] - item.position[2];
          return Math.sqrt((dx * dx) + (dz * dz)) < 3;
        });

        if (nearestItem) {
          state.pickupItem(nearestItem.id);
        }
      }
    };

    const handlePointerDown = (event) => {
      if (shouldIgnoreInput(event)) return;
      const state = useGameStore.getState();
      if (event.button !== 0) return;
      if (state.isMapOpen || state.isInventoryOpen || state.isSystemMenuOpen || state.activeDialog) return;
      if (!document.pointerLockElement) return;
      event.preventDefault();
      state.attack();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, []);

  useEffect(() => {
    const currentPlayer = players[myId];
    if (!currentPlayer) return;

    const targetPosition = new THREE.Vector3(
      currentPlayer.position[0],
      currentPlayer.position[1] + 1.6,
      currentPlayer.position[2]
    );

    if (camera.position.distanceTo(targetPosition) > 18) {
      camera.position.set(currentPlayer.position[0], currentPlayer.position[1] + 1.6, currentPlayer.position[2]);
    }
  }, [camera, myId, players]);

  useEffect(() => {
    if (isMapOpen || isInventoryOpen || isSystemMenuOpen || activeDialog) {
      document.exitPointerLock?.();
    }
  }, [activeDialog, isInventoryOpen, isMapOpen, isSystemMenuOpen]);

  useEffect(() => {
    const handlePointerLockChange = () => {
      const state = useGameStore.getState();
      if (document.pointerLockElement) {
        pointerLockWasActive.current = true;
        return;
      }

      if (pointerLockWasActive.current && state.authStage === 'game' && !state.isMapOpen && !state.isInventoryOpen && !state.activeDialog) {
        useGameStore.setState({ isSystemMenuOpen: true });
      }
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => document.removeEventListener('pointerlockchange', handlePointerLockChange);
  }, []);

  useFrame(() => {
    const state = useGameStore.getState();
    const player = state.players[state.myId];
    if (!player) return;

    const isLocked = document.pointerLockElement !== null;
    if (!isLocked && (state.isMapOpen || state.isInventoryOpen || state.isSystemMenuOpen || state.activeDialog)) return;

    const playerOrigin = new THREE.Vector3(
      player.position[0],
      player.position[1] + 1.6,
      player.position[2]
    );

    if (camera.position.distanceTo(playerOrigin) > 1.25) {
      camera.position.copy(playerOrigin);
    }

    const frontVector = new THREE.Vector3(0, 0, 0);
    const sideVector = new THREE.Vector3(0, 0, 0);

    if (moveForward) frontVector.z -= 1;
    if (moveBackward) frontVector.z += 1;
    if (moveLeft) sideVector.x += 1;
    if (moveRight) sideVector.x -= 1;

    const direction = new THREE.Vector3()
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(MOVEMENT_SPEED)
      .applyEuler(camera.rotation);

    velocityY.current -= 0.015;

    const currentPosition = camera.position.clone();
    const proposedX = currentPosition.x + direction.x;
    const proposedZ = currentPosition.z + direction.z;

    const nextPosition = new THREE.Vector3(
      Math.max(-BOUNDARY, Math.min(BOUNDARY, proposedX)),
      currentPosition.y + velocityY.current,
      Math.max(-BOUNDARY, Math.min(BOUNDARY, proposedZ))
    );

    if (nextPosition.y < 1.6) {
      nextPosition.y = 1.6;
      velocityY.current = 0;
      isJumping.current = false;
    }

    camera.position.copy(nextPosition);

    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    movePlayer([nextPosition.x, nextPosition.y - 0.6, nextPosition.z], [0, euler.y, 0]);
  });

  if (isMapOpen || isInventoryOpen || isSystemMenuOpen || activeDialog) {
    return null;
  }

  return <PointerLockControls />;
};

const World = () => {
  const players = useGameStore((state) => state.players);
  const mobs = useGameStore((state) => state.mobs);
  const items = useGameStore((state) => state.items);
  const npcs = useGameStore((state) => state.npcs);
  const myId = useGameStore((state) => state.myId);
  const controlPoints = useGameStore((state) => state.controlPoints);

  const forest = useMemo(() => {
    return Array.from({ length: 160 }, (_, index) => {
      const angle = index * 0.47;
      const radius = 138 + ((index % 18) * 7);
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle * 1.2) * radius;
      const skipWarZone = Math.sqrt((x * x) + (z * z)) < WAR_ZONE_RADIUS + 14;
      const skipRoads = Math.abs(x) < 20 && z < -70;
      if (skipWarZone || skipRoads) return null;
      return [x, 0, z];
    }).filter(Boolean);
  }, []);

  const crystals = useMemo(() => ([
    { position: [0, 1, -248], color: FACTION_META.sun.color },
    { position: [-248, 1, 134], color: FACTION_META.shadow.color },
    { position: [248, 1, 134], color: FACTION_META.nature.color },
    { position: [0, 1, 0], color: FACTION_META.system.color }
  ]), []);

  return (
    <>
      <color attach="background" args={['#a8d4ff']} />
      <fog attach="fog" args={['#dce9f6', 85, 270]} />

      <PlayerController />

      <ambientLight intensity={0.65} />
      <hemisphereLight intensity={0.75} color="#fff7db" groundColor="#304531" />
      <directionalLight
        position={[80, 130, 30]}
        intensity={2.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={260}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
      />

      <Sky sunPosition={[100, 35, -15]} turbidity={8} rayleigh={1.7} mieCoefficient={0.008} mieDirectionalG={0.84} />
      <Stars radius={180} depth={50} count={2500} factor={4} saturation={0} fade speed={0.6} />

      <Terrain />

      <FloatingMotes />

      {ROADS.map((road) => (
        <AncientRoad
          key={road.id}
          points={road.points.map(([x, z], index) => [x, 0.04 + (index * 0.01), z])}
          color={roadColors[road.faction] || '#8d7a62'}
        />
      ))}

      {LANDMARKS.map((landmark) => (
        <Landmark key={landmark.id} landmark={landmark} />
      ))}

      {crystals.map((crystal, index) => (
        <CrystalCluster key={index} position={crystal.position} color={crystal.color} />
      ))}

      {forest.map((position, index) => (
        <Tree key={index} position={position} scale={1 + ((index % 4) * 0.12)} />
      ))}

      {WALLS.map((wall, index) => (
        <Wall key={index} position={wall.position} rotation={wall.rotation} length={wall.length} />
      ))}

      {Object.values(controlPoints).map((point) => (
        <ControlPointBeacon key={point.id} point={point} />
      ))}

      {Object.entries(npcs).map(([id, npc]) => (
        <NPC
          key={id}
          id={id}
          name={npc.name}
          position={npc.position}
          faction={npc.faction}
          type={npc.type}
          role={npc.role}
          questId={npc.questId}
        />
      ))}

      {Object.entries(mobs).map(([id, mob]) => (
        <Mob
          key={id}
          id={id}
          position={mob.position}
          rotation={mob.rotation}
          type={mob.type}
          name={mob.name}
          hp={mob.hp}
          maxHp={mob.maxHp}
          role={mob.role}
          size={mob.size}
          elite={mob.elite}
          glow={mob.glow}
        />
      ))}

      {Object.entries(items).map(([id, item]) => (
        <Item
          key={id}
          id={id}
          itemCode={item.itemCode}
          itemType={item.itemType}
          position={item.position}
          name={item.name}
          color={item.color}
        />
      ))}

      {Object.entries(players).map(([id, player]) => (
        <Player
          key={id}
          id={id}
          position={player.position || [0, 1, 0]}
          rotation={player.rotation}
          faction={player.faction}
          isMe={id === myId}
          name={player.name}
          stats={player.stats}
          lastAttack={player.lastAttack}
          charClass={player.charClass}
        />
      ))}

      <Environment preset="park" />
    </>
  );
};

export default World;
