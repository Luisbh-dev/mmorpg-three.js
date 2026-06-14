import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard, Environment, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';
import useGameStore from '../stores/useGameStore';
import Terrain from './game/Terrain';
import CharacterModel from './game/CharacterModel';
import Mob from './game/Mob';
import Item from './game/Item';
import NPC from './game/NPC';
import Settlement from './game/Settlement';
import Wall from './game/Wall';
import InstancedScatter from './game/InstancedScatter';
import PointsOfInterest from './game/PointsOfInterest';
import Establishment from './game/Establishment';
import { renderCentralStructure } from './game/CentralStructures';
import { ESTABLISHMENTS, FACTION_META, LANDMARKS, POINTS_OF_INTEREST, ROADS, getFactionMeta } from '../lib/gameData';
import { getTerrainHeight } from '../lib/terrain';
import { WALLS, resolveMove } from '../lib/colliders';

// Third-person tuning
const MOVE_SPEED = 11; // world units / second
const EMIT_INTERVAL = 0.1; // seconds between network position updates (~10Hz)
const LOOK_SENS = 0.0035;
const PITCH_MIN = 0.12;
const PITCH_MAX = 1.25;
const DIST_MIN = 3.5;
const DIST_MAX = 16;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function smoothAngle(current, target, t) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + (diff * t);
}

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

const FloatingCombatText = ({ data }) => {
  const ref = useRef();
  useFrame(() => {
    if (!ref.current) return;
    const t = (Date.now() - data.born) / 1000;
    ref.current.position.set(data.position[0], data.position[1] + 2 + (t * 1.9), data.position[2]);
  });
  return (
    <group ref={ref} position={[data.position[0], data.position[1] + 2, data.position[2]]}>
      <Billboard>
        <Text fontSize={0.7 * (data.scale || 1)} color={data.color} anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="#1a0d05">
          {data.text}
        </Text>
      </Billboard>
    </group>
  );
};

const CombatTextLayer = () => {
  const floatingTexts = useGameStore((state) => state.floatingTexts);
  return floatingTexts.map((data) => <FloatingCombatText key={data.id} data={data} />);
};

// A quick poof when a mob dies (the server removes the mob immediately).
const DyingMob = ({ data }) => {
  const ref = useRef();
  useFrame(() => {
    if (!ref.current) return;
    const t = (Date.now() - data.born) / 650;
    const k = Math.min(1, t);
    ref.current.scale.setScalar(0.6 + (k * 1.6));
    if (ref.current.material) ref.current.material.opacity = Math.max(0, 0.7 - (k * 0.7));
    ref.current.position.y = data.position[1] + 1 + (k * 0.6);
  });
  return (
    <mesh ref={ref} position={[data.position[0], data.position[1] + 1, data.position[2]]}>
      <sphereGeometry args={[0.5, 12, 12]} />
      <meshBasicMaterial color="#d7c7a0" transparent opacity={0.7} />
    </mesh>
  );
};

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

  return renderCentralStructure(landmark);
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

const Player = ({ id, position, rotation, faction, isMe, name, stats, charClass }) => {
  const ref = useRef();
  const targetVec = useMemo(() => new THREE.Vector3(), []);
  const movingRef = useRef(false);
  const [moving, setMoving] = useState(false);
  const attackStamp = useGameStore((s) => s.attackStamps[id] || 0);
  const attackKind = useGameStore((s) => s.attackKinds[id] || null);
  const maxHp = stats?.maxHp || 100;
  const hp = stats?.hp || 100;
  const isAttacking = attackStamp && (Date.now() - attackStamp < 450);

  useFrame(() => {
    if (!ref.current) return;

    targetVec.set(position[0], position[1], position[2]);
    const dist = ref.current.position.distanceTo(targetVec);
    ref.current.position.lerp(targetVec, 0.2);

    const isMovingNow = dist > 0.08;
    if (isMovingNow !== movingRef.current) {
      movingRef.current = isMovingNow;
      setMoving(isMovingNow);
    }

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
        attackStamp={attackStamp}
        attackKind={attackKind}
        moving={moving}
      />
      <HealthBillboard hp={hp} maxHp={maxHp} name={name || 'Unknown'} tone={getFactionMeta(faction).color} />
    </group>
  );
};

function shouldIgnoreInput(event) {
  const target = event.target;
  if (!target) return false;
  if (target.closest?.('[data-ui-root="true"]')) return true;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return true;
  return false;
}

function panelsOpen(state) {
  return state.isMapOpen || state.isInventoryOpen || state.isSystemMenuOpen || state.isShopOpen || state.isCharSheetOpen || Boolean(state.activeInterior) || Boolean(state.activeDialog);
}

const MOVEMENT_KEYS = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right'
};

const PlayerController = () => {
  const { camera } = useThree();
  const myFaction = useGameStore((state) => (state.myId ? state.players[state.myId]?.faction : null));
  const myClass = useGameStore((state) => (state.myId ? state.players[state.myId]?.charClass : null));
  const myLastAttack = useGameStore((state) => (state.myId ? state.attackStamps[state.myId] : 0));
  const myAttackKind = useGameStore((state) => (state.myId ? state.attackKinds[state.myId] : null));

  const modelRef = useRef();
  const keys = useRef({ forward: false, backward: false, left: false, right: false });
  const posRef = useRef(new THREE.Vector3());
  const yawRef = useRef(0);
  const camYaw = useRef(0);
  const camPitch = useRef(0.42);
  const camDist = useRef(6.5);
  const isOrbiting = useRef(false);
  const inited = useRef(false);
  const emitAccum = useRef(0);
  const lastEmit = useRef({ x: 0, z: 0, yaw: 0 });
  const [isAttacking, setIsAttacking] = useState(false);
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);

  const tmp = useMemo(() => ({
    fwd: new THREE.Vector3(),
    right: new THREE.Vector3(),
    move: new THREE.Vector3(),
    pivot: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    desired: new THREE.Vector3()
  }), []);

  // Local attack animation (re-fires whenever the server confirms our attack)
  useEffect(() => {
    if (!myLastAttack) return undefined;
    setIsAttacking(true);
    const timer = setTimeout(() => setIsAttacking(false), 450);
    return () => clearTimeout(timer);
  }, [myLastAttack]);

  // Keyboard: WASD movement + Q skill + E interact
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const state = useGameStore.getState();

      // Character sheet toggles even while open (must work past the panel guard).
      if (event.code === 'KeyC') { event.preventDefault(); state.toggleCharSheet(); return; }

      if (panelsOpen(state)) return;

      const movementKey = MOVEMENT_KEYS[event.code];
      if (movementKey) {
        event.preventDefault();
        keys.current[movementKey] = true;
      }

      if (event.code === 'Digit1') state.castSkill(1);
      if (event.code === 'Digit2' || event.code === 'KeyQ') state.castSkill(2);
      if (event.code === 'Digit3') state.castSkill(3);
      if (event.code === 'Digit4') state.castSkill(4);

      if (event.code === 'Tab') {
        event.preventDefault();
        const me = state.players[state.myId];
        if (me) {
          const pos = me.position;
          let nearest = null;
          let best = 70 * 70;
          Object.entries(state.mobs).forEach(([id, m]) => {
            const dx = pos[0] - m.position[0];
            const dz = pos[2] - m.position[2];
            const d = (dx * dx) + (dz * dz);
            if (d < best) { best = d; nearest = id; }
          });
          if (nearest) state.setTarget(nearest);
          else state.clearTarget();
        }
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
          // Establishment NPCs are at a building door -> step inside its interior.
          if (nearestNpc.establishment) {
            state.enterBuilding({
              kind: nearestNpc.establishment,
              npcId: nearestNpc.id,
              npcName: nearestNpc.name,
              themeLabel: nearestNpc.themeLabel
            });
          } else {
            state.talkToNPC(nearestNpc.id);
          }
          return;
        }

        // Wilderness shrine within reach -> pray for a blessing.
        const nearShrine = POINTS_OF_INTEREST.some((poi) => {
          if (poi.type !== 'shrine') return false;
          const dx = myPosition[0] - poi.position[0];
          const dz = myPosition[2] - poi.position[2];
          return Math.sqrt((dx * dx) + (dz * dz)) < (poi.radius || 5) + 4;
        });
        if (nearShrine) {
          state.pray();
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

    const handleKeyUp = (event) => {
      const movementKey = MOVEMENT_KEYS[event.code];
      if (movementKey) {
        event.preventDefault();
        keys.current[movementKey] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse: RMB-drag orbits the camera, wheel zooms, LMB attacks (no pointer lock)
  useEffect(() => {
    const onPointerDown = (event) => {
      if (shouldIgnoreInput(event)) return;
      const state = useGameStore.getState();
      if (panelsOpen(state)) return;
      if (event.button === 2) {
        isOrbiting.current = true;
      } else if (event.button === 0) {
        state.attack();
      }
    };

    const onPointerUp = (event) => {
      if (event.button === 2) isOrbiting.current = false;
    };

    const onPointerMove = (event) => {
      if (!isOrbiting.current) return;
      camYaw.current -= event.movementX * LOOK_SENS;
      camPitch.current = clamp(camPitch.current - (event.movementY * LOOK_SENS), PITCH_MIN, PITCH_MAX);
    };

    const onWheel = (event) => {
      if (panelsOpen(useGameStore.getState())) return;
      camDist.current = clamp(camDist.current + (event.deltaY * 0.01), DIST_MIN, DIST_MAX);
    };

    const onContextMenu = (event) => event.preventDefault();

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('contextmenu', onContextMenu);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('contextmenu', onContextMenu);
    };
  }, []);

  useFrame((_, rawDelta) => {
    const state = useGameStore.getState();
    const me = state.myId ? state.players[state.myId] : null;
    if (!me || !me.position) return;
    const delta = Math.min(rawDelta, 0.1);

    if (!inited.current) {
      posRef.current.set(me.position[0], me.position[1] || 0, me.position[2]);
      yawRef.current = (me.rotation && me.rotation[1]) || 0;
      camYaw.current = yawRef.current + Math.PI; // camera sits behind the player's back (model faces +Z)
      lastEmit.current = { x: posRef.current.x, z: posRef.current.z, yaw: yawRef.current };
      inited.current = true;
    }

    // Re-sync on server-driven jumps (respawn, dash, teleport)
    const dxStore = me.position[0] - posRef.current.x;
    const dzStore = me.position[2] - posRef.current.z;
    if (((dxStore * dxStore) + (dzStore * dzStore)) > 12.25) {
      posRef.current.set(me.position[0], me.position[1] || 0, me.position[2]);
    }

    let movingNow = false;
    if (!panelsOpen(state)) {
      const sin = Math.sin(camYaw.current);
      const cos = Math.cos(camYaw.current);
      const fwd = tmp.fwd.set(-sin, 0, -cos);
      const right = tmp.right.set(-fwd.z, 0, fwd.x);
      const move = tmp.move.set(0, 0, 0);
      if (keys.current.forward) move.add(fwd);
      if (keys.current.backward) move.sub(fwd);
      if (keys.current.left) move.sub(right);
      if (keys.current.right) move.add(right);

      if (move.lengthSq() > 0) {
        movingNow = true;
        move.normalize().multiplyScalar(MOVE_SPEED * delta);
        const next = resolveMove(posRef.current.x, posRef.current.z, move.x, move.z);
        posRef.current.x = next.x;
        posRef.current.z = next.z;
        // KayKit models face local +Z, so face the move vector directly.
        yawRef.current = smoothAngle(yawRef.current, Math.atan2(move.x, move.z), 0.25);
      }
    }

    if (movingNow !== movingRef.current) {
      movingRef.current = movingNow;
      setMoving(movingNow);
    }

    posRef.current.y = getTerrainHeight(posRef.current.x, posRef.current.z) + 0.05;

    if (modelRef.current) {
      modelRef.current.position.copy(posRef.current);
      modelRef.current.rotation.y = yawRef.current;
    }

    // Orbit-follow camera
    const pivot = tmp.pivot.copy(posRef.current);
    pivot.y += 1.5;
    const cp = Math.cos(camPitch.current);
    const dir = tmp.dir.set(Math.sin(camYaw.current) * cp, Math.sin(camPitch.current), Math.cos(camYaw.current) * cp);
    const desired = tmp.desired.copy(pivot).addScaledVector(dir, camDist.current);
    const groundY = getTerrainHeight(desired.x, desired.z) + 0.6;
    if (desired.y < groundY) desired.y = groundY;
    // Snap on first frame / big jumps, smooth-follow otherwise.
    if (camera.position.distanceTo(desired) > 30) {
      camera.position.copy(desired);
    } else {
      camera.position.lerp(desired, 0.3);
    }
    camera.lookAt(pivot);

    // Throttled network emit (~10Hz, only when something changed)
    emitAccum.current += delta;
    if (emitAccum.current >= EMIT_INTERVAL) {
      emitAccum.current = 0;
      const ex = posRef.current.x - lastEmit.current.x;
      const ez = posRef.current.z - lastEmit.current.z;
      const eyaw = Math.abs(yawRef.current - lastEmit.current.yaw);
      if (((ex * ex) + (ez * ez)) > 0.0004 || eyaw > 0.01) {
        state.movePlayer(
          [posRef.current.x, posRef.current.y, posRef.current.z],
          [0, yawRef.current, 0]
        );
        lastEmit.current = { x: posRef.current.x, z: posRef.current.z, yaw: yawRef.current };
      }
    }
  });

  return (
    <group ref={modelRef}>
      <CharacterModel faction={myFaction} isMe charClass={myClass} isAttacking={isAttacking} attackStamp={myLastAttack || 0} attackKind={myAttackKind} moving={moving} />
    </group>
  );
};

const DAY_CYCLE = 240; // seconds per full day-night cycle (4 min)

// Day/night: a sun that arcs overhead (rotating shadows), with light, ambient,
// fog and sky colour shifting day -> dusk -> night -> dawn. The shadow-casting
// light also follows the player so shadows stay crisp across the huge map.
const DayNight = () => {
  const { scene } = useThree();
  const sun = useRef();
  const amb = useRef();
  const hemi = useRef();
  const target = useMemo(() => new THREE.Object3D(), []);
  const c = useMemo(() => ({
    dayLight: new THREE.Color('#fff3d6'), nightLight: new THREE.Color('#41538c'), dusk: new THREE.Color('#ff8a48'),
    daySky: new THREE.Color('#a8d4ff'), nightSky: new THREE.Color('#0c1430'), duskSky: new THREE.Color('#e6885a'),
    dayFog: new THREE.Color('#cfe0f0'), nightFog: new THREE.Color('#101736'),
    a: new THREE.Color(), b: new THREE.Color()
  }), []);

  useFrame((state) => {
    const t = (state.clock.elapsedTime / DAY_CYCLE) % 1;
    const az = t * Math.PI * 2;
    const elevation = Math.cos(az); // 1 = noon, -1 = midnight
    const day = THREE.MathUtils.clamp((elevation + 0.15) / 0.5, 0, 1);
    const dusk = THREE.MathUtils.clamp(1 - (Math.abs(elevation) / 0.35), 0, 1);

    const gs = useGameStore.getState();
    const me = gs.myId ? gs.players[gs.myId] : null;
    const pos = me?.position || [0, 0, 0];

    if (sun.current) {
      sun.current.position.set(pos[0] + (Math.cos(az) * 200), 190, pos[2] + (Math.sin(az) * 200));
      target.position.set(pos[0], 0, pos[2]);
      target.updateMatrixWorld();
      sun.current.target = target;
      sun.current.intensity = 0.3 + (2.3 * day);
      sun.current.color.copy(c.nightLight).lerp(c.dayLight, day).lerp(c.dusk, dusk * 0.5);
    }
    if (amb.current) {
      amb.current.intensity = 0.26 + (0.44 * day);
      amb.current.color.copy(c.nightLight).lerp(c.dayLight, day);
    }
    if (hemi.current) hemi.current.intensity = 0.2 + (0.55 * day);

    if (scene.background && scene.background.copy) {
      scene.background.copy(c.nightSky).lerp(c.daySky, day).lerp(c.duskSky, dusk * 0.55);
    }
    if (scene.fog) {
      scene.fog.color.copy(c.nightFog).lerp(c.dayFog, day).lerp(c.dusk, dusk * 0.4);
    }
  });

  return (
    <>
      <primitive object={target} />
      <ambientLight ref={amb} intensity={0.6} />
      <hemisphereLight ref={hemi} intensity={0.6} color="#fff7db" groundColor="#39492f" />
      <directionalLight
        ref={sun}
        intensity={2.3}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={460}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-bias={-0.0004}
      />
    </>
  );
};

const World = () => {
  const players = useGameStore((state) => state.players);
  const mobs = useGameStore((state) => state.mobs);
  const items = useGameStore((state) => state.items);
  const npcs = useGameStore((state) => state.npcs);
  const myId = useGameStore((state) => state.myId);
  const controlPoints = useGameStore((state) => state.controlPoints);
  const selectedTargetId = useGameStore((state) => state.selectedTargetId);
  const dyingMobs = useGameStore((state) => state.dyingMobs);
  const setTarget = useGameStore((state) => state.setTarget);

  const crystals = useMemo(() => ([
    { position: [0, 1, -980], color: FACTION_META.sun.color },
    { position: [-980, 1, 0], color: FACTION_META.shadow.color },
    { position: [980, 1, 0], color: FACTION_META.nature.color },
    { position: [0, 1, 0], color: FACTION_META.system.color }
  ]), []);

  // --- Distance culling: the world is ~2000 units across; only render things
  // near the player so we don't draw 36 cities + 100 establishments + 100 NPCs
  // every frame. Center follows the local player, updated when they move >25u. ---
  const [center, setCenter] = useState([0, 1, 0]);
  useEffect(() => {
    const tick = () => {
      const s = useGameStore.getState();
      const me = s.myId && s.players[s.myId];
      const p = me && me.position;
      if (p) setCenter((prev) => (((prev[0] - p[0]) ** 2 + (prev[2] - p[2]) ** 2) > 625 ? [p[0], 1, p[2]] : prev));
    };
    tick();
    const iv = setInterval(tick, 400);
    return () => clearInterval(iv);
  }, []);
  const within = (pos, r) => {
    if (!pos) return false;
    const dx = pos[0] - center[0];
    const dz = pos[2] - center[2];
    return (dx * dx + dz * dz) < (r * r);
  };

  return (
    <>
      <color attach="background" args={['#a8d4ff']} />
      <fog attach="fog" args={['#cfe0f0', 260, 1450]} />

      <PlayerController />

      <DayNight />

      <Stars radius={1600} depth={120} count={4000} factor={6} saturation={0} fade speed={0.6} />

      <Terrain />

      <FloatingMotes />

      {ROADS.map((road) => (
        <AncientRoad
          key={road.id}
          points={road.points.map(([x, z], index) => [x, 0.04 + (index * 0.01), z])}
          color={roadColors[road.faction] || '#8d7a62'}
        />
      ))}

      {LANDMARKS.filter((l) => within(l.position, 780)).map((landmark) => (
        <Landmark key={landmark.id} landmark={landmark} />
      ))}

      {crystals.map((crystal, index) => (
        <CrystalCluster key={index} position={crystal.position} color={crystal.color} />
      ))}

      <InstancedScatter center={center} />
      <PointsOfInterest center={center} />

      {ESTABLISHMENTS.filter((e) => within(e.position, 320)).map((est) => (
        <Establishment key={est.id} est={est} />
      ))}

      {WALLS.map((wall, index) => (
        <Wall key={index} position={wall.position} rotation={wall.rotation} length={wall.length} />
      ))}

      {Object.values(controlPoints).map((point) => (
        <ControlPointBeacon key={point.id} point={point} />
      ))}

      {Object.entries(npcs).filter(([, npc]) => within(npc.position, 180)).map(([id, npc]) => (
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

      {Object.entries(mobs).filter(([, mob]) => within(mob.position, 340)).map(([id, mob]) => (
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
          selected={id === selectedTargetId}
          onSelect={setTarget}
        />
      ))}

      {Object.values(dyingMobs).map((d) => (
        <DyingMob key={d.id} data={d} />
      ))}

      {Object.entries(items).filter(([, item]) => within(item.position, 170)).map(([id, item]) => (
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
          charClass={player.charClass}
        />
      ))}

      <CombatTextLayer />

      <Environment preset="park" />
    </>
  );
};

export default World;
