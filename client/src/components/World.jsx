import React, { useEffect, useRef, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text, PerspectiveCamera, Environment, Billboard, PointerLockControls } from '@react-three/drei'
import useGameStore from '../stores/useGameStore'
import { useKeyboard } from '../hooks/useKeyboard'
import Terrain from './game/Terrain'
import CharacterModel from './game/CharacterModel'
import Mob from './game/Mob'
import Item from './game/Item'
import NPC from './game/NPC'
import Wall from './game/Wall'
import * as THREE from 'three'

const MOVEMENT_SPEED = 0.3;
const MAP_SIZE = 200; 
const BOUNDARY = 195;
const WAR_ZONE_RADIUS = 60;

// Walls configuration
const WALLS = [];
const numSegments = 16;
const angleStep = (Math.PI * 2) / numSegments;
const gapSize = 0.2; // Radian gap for gates

for (let i = 0; i < numSegments; i++) {
  const angle = i * angleStep;
  
  // Skip gates at N, S, E, W (approx 0, PI/2, PI, 3PI/2)
  // 0 is South (Z+), PI is North (Z-), PI/2 is West (X+), 3PI/2 is East (X-)
  // Let's create gaps
  const isGate = 
    Math.abs(angle - 0) < gapSize || 
    Math.abs(angle - Math.PI/2) < gapSize || 
    Math.abs(angle - Math.PI) < gapSize || 
    Math.abs(angle - 3*Math.PI/2) < gapSize;

  if (!isGate) {
    const x = Math.sin(angle) * WAR_ZONE_RADIUS;
    const z = Math.cos(angle) * WAR_ZONE_RADIUS;
    const rot = angle;
    // Wall length based on chord
    const length = 2 * WAR_ZONE_RADIUS * Math.sin(angleStep/2) + 2; 
    WALLS.push({ position: [x, 0, z], rotation: rot, length });
  }
}

// Radial Walls (Separating Factions)
// Angles: 45 (NE), 180 (S), 315 (NW)
const RADIAL_ANGLES = [Math.PI/4, Math.PI, 7*Math.PI/4];
const MAP_RADIUS = 200;
const INNER_RADIUS = 60;
const RADIAL_LENGTH = MAP_RADIUS - INNER_RADIUS;
const RADIAL_CENTER_DIST = INNER_RADIUS + (RADIAL_LENGTH / 2);

RADIAL_ANGLES.forEach(angle => {
  const x = Math.sin(angle) * RADIAL_CENTER_DIST;
  const z = Math.cos(angle) * RADIAL_CENTER_DIST;
  // Wall rotation needs to be perpendicular to radius? No, aligned with radius.
  // Box geometry is length on X axis?
  // My Wall component uses X for length.
  // So rotation should be angle + PI/2? No, if I want it pointing out.
  // If rot is 0, box is along X.
  // If angle is 0 (South, Z+), I want wall along Z. So rot 90.
  // So rot = angle + PI/2?
  // Test: Angle 0 (Z+). Wall along Z. Rot 90. Correct.
  // Test: Angle 90 (X+). Wall along X. Rot 0 (or 180).
  // So Rot = Angle + PI/2.
  
  WALLS.push({ 
    position: [x, 0, z], 
    rotation: angle + Math.PI/2, 
    length: RADIAL_LENGTH,
    isRadial: true, // marker for collision logic
    angle: angle
  });
});

const HealthBar = ({ hp, maxHp }) => {
  return (
    <Billboard position={[0, 2.8, 0]}>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[1.2, 0.15]} />
        <meshBasicMaterial color="#333" />
      </mesh>
      <mesh position={[-(1.2 - (1.2 * (hp / maxHp))) / 2, 0, 0.01]}>
        <planeGeometry args={[1.2 * (hp / maxHp), 0.1]} />
        <meshBasicMaterial color={hp > maxHp * 0.3 ? "#00ff00" : "#ff0000"} />
      </mesh>
    </Billboard>
  )
}

const Tree = ({ position }) => {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.2, 0.4, 2]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <coneGeometry args={[1.5, 3, 8]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
    </group>
  )
}

const Player = ({ id, position, rotation, faction, isMe, name, stats, lastAttack, charClass }) => {
  const ref = useRef()
  const maxHp = stats?.maxHp || 100;
  const hp = stats?.hp || 100;
  const isAttacking = lastAttack && Date.now() - lastAttack < 300;

  useFrame(() => {
    if (ref.current) {
      const targetPos = new THREE.Vector3(...position);
      
      if (isAttacking) {
         // Visual lunge
      }

      ref.current.position.lerp(targetPos, 0.2);
      
      // Rotation interpolation (Y axis)
      if (rotation) {
        // Simple lerp for Y rotation
        let targetRot = rotation[1]; // Assuming [x, y, z]
        let currentRot = ref.current.rotation.y;
        // Normalize
        while (targetRot - currentRot > Math.PI) targetRot -= Math.PI * 2;
        while (targetRot - currentRot < -Math.PI) targetRot += Math.PI * 2;
        
        ref.current.rotation.y += (targetRot - currentRot) * 0.2;
      }
    }
  })

  // Don't render own body in FPS mode
  if (isMe) return null; 

  return (
    <group ref={ref} position={position}>
      <CharacterModel 
        faction={faction} 
        isMe={isMe} 
        charClass={charClass}
        isAttacking={isAttacking}
      />
      {/* Name and HP Billboard always facing camera */}
      <Billboard position={[0, 2.5, 0]}>
        <Text
          position={[0, 0, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {name || 'Unknown'}
        </Text>
        <group position={[0, -0.3, 0]}>
           {/* Reuse HealthBar geometry manually to avoid nested Billboard issue if any */}
           <mesh position={[0, 0, 0]}>
            <planeGeometry args={[1.2, 0.15]} />
            <meshBasicMaterial color="#333" />
          </mesh>
          <mesh position={[-(1.2 - (1.2 * (hp / maxHp))) / 2, 0, 0.01]}>
            <planeGeometry args={[1.2 * (hp / maxHp), 0.1]} />
            <meshBasicMaterial color={hp > maxHp * 0.3 ? "#00ff00" : "#ff0000"} />
          </mesh>
        </group>
      </Billboard>
    </group>
  )
}

const PlayerController = () => {
  const { moveForward, moveBackward, moveLeft, moveRight } = useKeyboard();
  // Get actions from store but use getState in listeners to avoid re-binding
  const { myId, players, movePlayer, castSkill } = useGameStore();
  // We only need reactive state for render or useFrame, but for event listeners refs/getState is better
  const { camera } = useThree();
  
  const [lastAttack, setLastAttack] = useState(0);
  const velocityY = useRef(0);
  const isJumping = useRef(false);
  const GRAVITY = 0.015;
  const JUMP_FORCE = 0.3;
  
  // Event Listeners with minimal deps
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      const state = useGameStore.getState();
      const { isMapOpen, isInventoryOpen, isSystemMenuOpen, activeDialog } = state;

      if (isMapOpen || isInventoryOpen || isSystemMenuOpen || activeDialog) return;

      // Jump
      if (e.code === 'Space') {
        if (!isJumping.current) {
          velocityY.current = JUMP_FORCE;
          isJumping.current = true;
        }
      }
      // Skill 2 (Q)
      if (e.code === 'KeyQ') {
        state.castSkill(2);
      }
      // Interact (Pickup / Talk)
      if (e.code === 'KeyE') {
        const { myId, players, items, npcs, pickupItem, talkToNPC } = state;
        if (!myId || !players[myId]) return;
        const myPos = players[myId].position;
        
        // 1. Check NPCs
        let closestNPC = null;
        let minNPCDist = 4;
        if (npcs) {
          Object.values(npcs).forEach(npc => {
            const dx = myPos[0] - npc.position[0];
            const dz = myPos[2] - npc.position[2];
            const dist = Math.sqrt(dx*dx + dz*dz);
            if (dist < minNPCDist) {
              minNPCDist = dist;
              closestNPC = npc;
            }
          });
        }

        if (closestNPC) {
          talkToNPC(closestNPC.id);
          return; 
        }

        // 2. Check Items
        let closestItem = null;
        let minDist = 3;

        if (items) {
          Object.values(items).forEach(item => {
            const dx = myPos[0] - item.position[0];
            const dz = myPos[2] - item.position[2];
            const dist = Math.sqrt(dx*dx + dz*dz);
            
            if (dist < minDist) {
              minDist = dist;
              closestItem = item;
            }
          });
        }

        if (closestItem) {
          pickupItem(closestItem.id);
        }
      }
    };

    const handleMouseDown = (e) => {
      const state = useGameStore.getState();
      const { isMapOpen, isInventoryOpen, isSystemMenuOpen, activeDialog, attack } = state;
      
      if (e.button === 0 && !isMapOpen && !isInventoryOpen && !isSystemMenuOpen && !activeDialog) { 
        const now = Date.now();
        // Simple local cooldown check or rely on state
        attack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []); // Empty deps = stable listeners!
  
  // Set initial camera
  useEffect(() => {
    if (myId && players[myId]) {
       const pos = players[myId].position;
       // Only set if at 0,0,0 (default) or very far?
       // To avoid snapping on every re-mount if store updates.
       // Let's trust useFrame will update it, but initial pos is needed.
       if (camera.position.lengthSq() < 1) {
          camera.position.set(pos[0], pos[1] + 1.6, pos[2]);
       }
    }
  }, [myId]); 

  useFrame(() => {
    const state = useGameStore.getState();
    const { isMapOpen, isInventoryOpen, isSystemMenuOpen, activeDialog } = state;
    const isLocked = document.pointerLockElement !== null;

    if (!myId || !players[myId]) return;
    // If not locked and UI open, skip. If locked, allow.
    if (!isLocked && (isMapOpen || isInventoryOpen || isSystemMenuOpen || activeDialog)) return;

    const frontVector = new THREE.Vector3(0, 0, 0);
    const sideVector = new THREE.Vector3(0, 0, 0);
    const direction = new THREE.Vector3(0, 0, 0);

    if (moveForward) frontVector.z -= 1;
    if (moveBackward) frontVector.z += 1;
    if (moveLeft) sideVector.x += 1; // Fixed inversion: Left is +X in this calculation context (front-side)
    if (moveRight) sideVector.x -= 1; // Fixed inversion

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(MOVEMENT_SPEED)
      .applyEuler(camera.rotation);

    velocityY.current -= GRAVITY;

    const currentPos = camera.position.clone();
    let proposedX = currentPos.x + direction.x;
    let proposedZ = currentPos.z; 
    
    const checkCollision = (x, z) => {
        const d = Math.sqrt(x*x + z*z);
        // Central Wall
        if (d > WAR_ZONE_RADIUS - 1 && d < WAR_ZONE_RADIUS + 1) {
            let angle = Math.atan2(x, z);
            if (angle < 0) angle += Math.PI * 2;
            const isGate = 
                Math.abs(angle - 0) < 0.25 || 
                Math.abs(angle - Math.PI*2) < 0.25 || 
                Math.abs(angle - Math.PI/2) < 0.25 || 
                Math.abs(angle - Math.PI) < 0.25 || 
                Math.abs(angle - 3*Math.PI/2) < 0.25;
            if (!isGate) return true;
        }
        // Radial Walls - NEW ANGLES
        if (d > WAR_ZONE_RADIUS) {
            let angle = Math.atan2(x, z);
            if (angle < 0) angle += Math.PI * 2;
            const threshold = 0.04;
            const checkWall = (wa) => {
                let diff = Math.abs(angle - wa);
                if (diff > Math.PI) diff = Math.PI * 2 - diff;
                return diff < threshold;
            };
            // 0, 2PI/3, 4PI/3
            if (checkWall(0) || checkWall(2*Math.PI/3) || checkWall(4*Math.PI/3)) return true;
        }
        return false;
    };

    if (checkCollision(proposedX, proposedZ)) {
        proposedX = currentPos.x; 
    }
    proposedZ = currentPos.z + direction.z;
    if (checkCollision(proposedX, proposedZ)) {
        proposedZ = currentPos.z; 
    }

    const finalPos = new THREE.Vector3(proposedX, currentPos.y, proposedZ);
    finalPos.y += velocityY.current;

    if (finalPos.y < 1.6) {
      finalPos.y = 1.6;
      velocityY.current = 0;
      isJumping.current = false;
    }

    if (finalPos.x > BOUNDARY) finalPos.x = BOUNDARY;
    if (finalPos.x < -BOUNDARY) finalPos.x = -BOUNDARY;
    if (finalPos.z > BOUNDARY) finalPos.z = BOUNDARY;
    if (finalPos.z < -BOUNDARY) finalPos.z = -BOUNDARY;

    camera.position.copy(finalPos);

    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    movePlayer([finalPos.x, finalPos.y - 0.6, finalPos.z], [0, euler.y, 0]); 
  });

  // Unlock pointer if UI is open
  useEffect(() => {
    if (isMapOpen || isInventoryOpen) {
      document.exitPointerLock();
    }
  }, [isMapOpen, isInventoryOpen]);

  // Handle Pointer Lock Change to toggle System Menu on ESC
  useEffect(() => {
    const handlePointerLockChange = () => {
      if (!document.pointerLockElement) {
        // Check if we are unlocking because of UI or because of ESC
        const { isMapOpen, isInventoryOpen, isSystemMenuOpen, activeDialog } = useGameStore.getState();
        
        // If no UI is open and we lost lock, assume ESC was pressed -> Open System Menu
        // Also check activeDialog
        if (!isMapOpen && !isInventoryOpen && !isSystemMenuOpen && !activeDialog) {
           useGameStore.setState({ isSystemMenuOpen: true });
        }
      }
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => document.removeEventListener('pointerlockchange', handlePointerLockChange);
  }, []);

  if (isMapOpen || isInventoryOpen) return null; // Don't capture pointer

  return <PointerLockControls />;
}

const World = () => {
  const { players, mobs, items, npcs, myId } = useGameStore()
  
  const trees = useMemo(() => {
    return new Array(100).fill(0).map(() => [
      (Math.random() - 0.5) * 380,
      0,
      (Math.random() - 0.5) * 380
    ])
  }, [])

  return (
    <>
      <PlayerController />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <directionalLight position={[-5, 5, 5]} castShadow />
      
      {/* Floor */}
      <Terrain />

      {/* Environment */}
      {trees.map((pos, i) => <Tree key={i} position={pos} />)}

      {/* Walls */}
      {WALLS.map((w, i) => (
        <Wall key={i} position={w.position} rotation={w.rotation} length={w.length} />
      ))}

      {/* NPCs */}
      {Object.entries(npcs).map(([id, npc]) => (
        <NPC 
          key={id}
          id={id}
          name={npc.name}
          position={npc.position}
          faction={npc.faction}
          type={npc.type}
          questId={npc.questId}
        />
      ))}

      {/* Mobs */}
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
        />
      ))}

      {/* Items */}
      {Object.entries(items).map(([id, item]) => (
        <Item 
          key={id}
          id={id}
          type={item.type}
          position={item.position}
          name={item.name}
          color={item.color}
        />
      ))}

      {/* Players */}
      {Object.entries(players).map(([id, player]) => (
        <Player 
          key={id} 
          id={id} 
          position={player.position || [0, 1, 0]} 
          faction={player.faction}
          isMe={id === myId}
          name={player.name}
          stats={player.stats}
          lastAttack={player.lastAttack}
          charClass={player.charClass}
        />
      ))}
      
      <Environment preset="sunset" />
    </>
  )
}

export default World
