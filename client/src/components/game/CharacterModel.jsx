import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const ROOT = '/assets/kaykit/characters';
const TARGET_HEIGHT = 1.85;

// Class -> KayKit model + which attack clip + optional tint + ranged flag.
const CLASS_CONFIG = {
  Paladin:    { model: 'Knight',       attack: '1H_Melee_Attack_Slice_Horizontal', tint: null,      ranged: false },
  Rogue:      { model: 'Rogue',        attack: '1H_Melee_Attack_Stab',             tint: null,      ranged: false },
  Hunter:     { model: 'Rogue',        attack: '1H_Ranged_Shoot',                  tint: '#6f9c52', ranged: true },
  Cleric:     { model: 'Mage',         attack: 'Spellcast_Shoot',                  tint: '#f0d68c', ranged: true },
  Druid:      { model: 'Mage',         attack: 'Spellcast_Shoot',                  tint: '#79c06a', ranged: true },
  Necromancer:{ model: 'Rogue_Hooded', attack: 'Spellcast_Shoot',                  tint: '#a98bff', ranged: true }
};
const DEFAULT_CONFIG = { model: 'Knight', attack: '1H_Melee_Attack_Slice_Horizontal', tint: null, ranged: false };

const RANGED = new Set(['Cleric', 'Necromancer', 'Druid', 'Hunter']);
const ATTACK_COLOR = {
  Paladin: '#ffe39a', Cleric: '#a9e9ff', Rogue: '#c9a6ff',
  Necromancer: '#b388ff', Druid: '#9be88a', Hunter: '#fff1b0'
};

const cfgFor = (charClass) => CLASS_CONFIG[charClass] || DEFAULT_CONFIG;
const modelUrl = (charClass) => `${ROOT}/${cfgFor(charClass).model}.glb`;

const WEAPON_KIND = {
  Paladin: 'sword', Rogue: 'dagger', Hunter: 'bow',
  Cleric: 'staff', Druid: 'staff', Necromancer: 'staff'
};

// Procedural weapon attached to the KayKit `handslot.r` bone so it follows the
// hand during attack animations (the bone grip axis is roughly +Y).
function buildWeapon(charClass) {
  const g = new THREE.Group();
  const kind = WEAPON_KIND[charClass] || 'sword';
  const steel = new THREE.MeshStandardMaterial({ color: '#cdd2da', metalness: 0.6, roughness: 0.4 });
  const wood = new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: 0.9 });

  if (kind === 'sword' || kind === 'dagger') {
    const len = kind === 'dagger' ? 0.55 : 1.0;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07, len, 0.02), steel);
    blade.position.y = len / 2 + 0.12;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.1), new THREE.MeshStandardMaterial({ color: '#a8862f', metalness: 0.5, roughness: 0.4 }));
    guard.position.y = 0.12;
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8), wood);
    grip.position.y = 0;
    g.add(blade, guard, grip);
  } else if (kind === 'staff') {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8), wood);
    shaft.position.y = 0.5;
    const color = charClass === 'Necromancer' ? '#b388ff' : charClass === 'Druid' ? '#8de07a' : '#9fe6ff';
    const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4 }));
    gem.position.y = 1.28;
    g.add(shaft, gem);
  } else if (kind === 'bow') {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 16, Math.PI * 1.3), wood);
    bow.rotation.z = Math.PI / 2;
    g.add(bow);
  }
  g.scale.setScalar(1.1);
  return g;
}

function pickClip(names, candidates) {
  const found = pickClipOrNull(names, candidates);
  return found || names[0] || null;
}

// Like pickClip but returns null if no candidate matches (so callers can fall back).
function pickClipOrNull(names, candidates) {
  for (let i = 0; i < candidates.length; i += 1) {
    const exact = names.find((n) => n === candidates[i]);
    if (exact) return exact;
  }
  for (let i = 0; i < candidates.length; i += 1) {
    const found = names.find((n) => n.toLowerCase().includes(candidates[i].toLowerCase()));
    if (found) return found;
  }
  return null;
}

// Per-skill-type animation candidates, chosen by the character's weapon so a
// melee class swings and a caster gestures. Resolved against the model's actual
// clip list at runtime (falls back to the class default attack if none match).
function attackCandidates(kind, charClass) {
  const w = WEAPON_KIND[charClass] || 'sword';
  const melee = w === 'sword' || w === 'dagger';
  switch (kind) {
    case 'aoe':
      return melee
        ? ['2H_Melee_Attack_Spinning', '2H_Melee_Attack_Spin', 'Spin', '1H_Melee_Attack_Slice_Horizontal']
        : ['Spellcast_Long', 'Spellcast_Raise', 'Spellcasting', 'Spellcast_Shoot'];
    case 'projectile':
      return w === 'bow'
        ? ['1H_Ranged_Shoot', '2H_Ranged_Shoot', 'Ranged_Shoot']
        : ['Spellcast_Shoot', 'Spellcasting', 'Spellcast_Raise'];
    case 'heal':
      return ['Spellcast_Raise', 'Spellcast_Long', 'Cheer', 'Spellcasting'];
    case 'buff':
      return ['Cheer', 'Spellcast_Raise', 'Spellcast_Long'];
    case 'dot':
      return ['Spellcast_Long', 'Spellcasting', 'Spellcast_Shoot'];
    case 'drain':
      return ['Spellcast_Shoot', 'Spellcasting', 'Spellcast_Long'];
    case 'dash':
      return ['Dodge_Forward', 'Dodge_Right', 'Dodge_Left', 'Roll', 'Running_A'];
    case 'damage':
      return melee
        ? ['1H_Melee_Attack_Chop', '2H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal']
        : ['Spellcast_Shoot', 'Spellcasting'];
    default:
      return null;
  }
}

const ClassAccent = ({ color, radius = 0.62 }) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
      <ringGeometry args={[radius, radius + 0.12, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
    </mesh>
    <pointLight position={[0, 1.5, 0]} intensity={0.8} color={color} distance={4} />
  </group>
);

const AttackFX = ({ color, ranged }) => {
  const ref = useRef();
  const t = useRef(0);
  useFrame((_, delta) => {
    if (!ref.current) return;
    t.current += delta;
    if (ranged) {
      ref.current.position.z = 0.4 + (t.current * 16);
      const fade = Math.max(0, 1 - (t.current * 2.2));
      ref.current.scale.setScalar((0.2 * fade) + 0.05);
    } else {
      const k = Math.min(1, t.current * 6);
      ref.current.scale.setScalar(0.25 + (k * 1.0));
      if (ref.current.material) ref.current.material.opacity = Math.max(0, 0.85 - k);
    }
  });
  if (ranged) {
    return (
      <mesh ref={ref} position={[0, 1.1, 0.4]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.6} transparent />
      </mesh>
    );
  }
  return (
    <mesh ref={ref} position={[0, 1.2, 0.7]} rotation={[Math.PI / 2.4, 0, 0]}>
      <torusGeometry args={[0.75, 0.12, 10, 20, Math.PI * 1.2]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} side={THREE.DoubleSide} />
    </mesh>
  );
};

const AnimatedCharacter = ({ charClass, moving, attackStamp, attackKind }) => {
  const group = useRef();
  const config = cfgFor(charClass);
  const { scene, animations } = useGLTF(modelUrl(charClass));
  // Latest attack kind, synced to a ref so the (mount-time) useFrame closure reads it fresh.
  const attackKindRef = useRef(attackKind);
  attackKindRef.current = attackKind;

  const model = useMemo(() => {
    const cloned = cloneSkinned(scene);
    cloned.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        node.frustumCulled = false;
        if (config.tint && node.material) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach((m) => { if (m.color) { m.color = m.color.clone().lerp(new THREE.Color(config.tint), 0.35); } });
        }
      }
    });
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = TARGET_HEIGHT / Math.max(size.y, 0.001);
    cloned.scale.setScalar(scale);
    cloned.position.y = -box.min.y * scale;

    // Attach weapon AFTER measuring so it doesn't skew height normalization.
    // Size it in WORLD units by dividing out the bone's accumulated world scale
    // (KayKit rigs can be authored at a non-1 scale, which would otherwise make
    // a bone-local weapon tiny or huge).
    cloned.updateWorldMatrix(true, true);
    const hand = cloned.getObjectByName('handslot.r') || cloned.getObjectByName('hand.r');
    if (hand) {
      const ws = new THREE.Vector3();
      hand.getWorldScale(ws);
      const weapon = buildWeapon(charClass);
      const inv = ws.x > 1e-4 ? 1 / ws.x : 1;
      weapon.scale.multiplyScalar(inv);
      hand.add(weapon);
    }

    return cloned;
  }, [scene, config.tint, charClass]);

  const { actions, names } = useAnimations(animations, group);

  const clips = useMemo(() => ({
    idle: pickClip(names, ['Idle']),
    run: pickClip(names, ['Running_A', 'Running_B', 'Walking_A', 'run', 'walk']),
    attack: pickClip(names, [config.attack, 'Attack', '1H_Melee_Attack_Chop'])
  }), [names, config.attack]);

  const currentRef = useRef(null);
  const attackUntil = useRef(0);
  const lastStamp = useRef(0);
  const attackClipRef = useRef(null); // the specific clip chosen for the current swing/cast

  // The useFrame state machine below is the SOLE animation controller (starting
  // from currentRef=null -> idle). No separate init effect that could stop an
  // in-progress attack clip on re-render.
  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (attackStamp && attackStamp !== lastStamp.current) {
      lastStamp.current = attackStamp;
      // Pick a clip for THIS action: per-skill-type animation, else the class default.
      const kind = attackKindRef.current;
      let clip = (kind && kind !== 'basic') ? pickClipOrNull(names, attackCandidates(kind, charClass) || []) : null;
      if (!clip || !actions[clip]) clip = clips.attack;
      attackClipRef.current = clip;
      if (clip && actions[clip]) {
        const dur = actions[clip].getClip().duration || 0.7;
        attackUntil.current = t + Math.min(dur, 1.2);
      }
    }

    const attacking = t < attackUntil.current && attackClipRef.current && actions[attackClipRef.current];
    let desired;
    if (attacking) desired = attackClipRef.current;
    else if (moving && clips.run) desired = clips.run;
    else desired = clips.idle;

    if (desired && desired !== currentRef.current && actions[desired]) {
      const prev = currentRef.current && actions[currentRef.current];
      const next = actions[desired];
      if (prev) prev.fadeOut(0.15);
      if (attacking && desired === attackClipRef.current) {
        next.reset();
        next.setLoop(THREE.LoopOnce, 1);
        next.clampWhenFinished = true;
        next.timeScale = 1.05;
        next.fadeIn(0.06).play();
      } else {
        next.reset();
        next.setLoop(THREE.LoopRepeat, Infinity);
        next.timeScale = 1;
        next.fadeIn(0.18).play();
      }
      currentRef.current = desired;
    }
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
};

const CharacterModel = ({ faction, isMe, charClass, isAttacking, moving = false, attackStamp = 0, attackKind = null }) => {
  const accentColor = isMe ? '#4ce2ff' : (faction === 'shadow' ? '#8a7dff' : faction === 'nature' ? '#57c777' : '#f4c95d');
  const ranged = RANGED.has(charClass);

  return (
    <group dispose={null}>
      <ClassAccent color={accentColor} />
      <AnimatedCharacter charClass={charClass} moving={moving} attackStamp={attackStamp} attackKind={attackKind} />
      {isAttacking && <AttackFX color={ATTACK_COLOR[charClass] || '#ffe39a'} ranged={ranged} />}
    </group>
  );
};

['Knight', 'Mage', 'Rogue', 'Rogue_Hooded', 'Barbarian'].forEach((m) => useGLTF.preload(`${ROOT}/${m}.glb`));

export default CharacterModel;
