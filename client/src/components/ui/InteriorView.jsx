import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import useGameStore from '../../stores/useGameStore';
import { UI } from '../../lib/uiTheme';

const KIND = {
  smith:       { title: 'Herrería',    accent: '#ff8a3a', wall: '#3a322a', primary: { label: 'Ver tienda', action: 'shop' } },
  apothecary:  { title: 'Botica',      accent: '#7be3a3', wall: '#2c382f', primary: { label: 'Ver tienda', action: 'shop' } },
  arcanist:    { title: 'Arcanorium',  accent: '#c79bff', wall: '#2e2940', primary: { label: 'Ver tienda', action: 'shop' } },
  provisioner: { title: 'Mercado',     accent: '#e7d28a', wall: '#3a3324', primary: { label: 'Ver tienda', action: 'shop' } },
  tavern:      { title: 'Taberna',     accent: '#ffb863', wall: '#3a2c1e', primary: { label: 'Descansar', action: 'rest' } },
  temple:      { title: 'Templo',      accent: '#9ff0c0', wall: '#32383a', primary: { label: 'Hablar', action: 'talk' } },
  townhall:    { title: 'Ayuntamiento', accent: '#ffd36b', wall: '#3a3326', primary: { label: 'Misiones', action: 'talk' } },
  barracks:    { title: 'Cuartel',     accent: '#bcd0ff', wall: '#2c3038', primary: { label: 'Especializarse', action: 'talk' } }
};

// A glowing emissive helper material.
const Emissive = ({ color, i = 1 }) => <meshStandardMaterial color={color} emissive={color} emissiveIntensity={i} roughness={0.3} metalness={0.3} />;

function Vendor({ accent }) {
  return (
    <group position={[0, 0, -1.6]}>
      <mesh position={[0, 1.0, 0]} castShadow><boxGeometry args={[0.8, 1.6, 0.5]} /><meshStandardMaterial color="#52453a" roughness={0.9} /></mesh>
      <mesh position={[0, 1.95, 0]} castShadow><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color="#e4c3a0" roughness={0.85} /></mesh>
      <mesh position={[0, 2.32, 0]}><sphereGeometry args={[0.12, 12, 12]} /><Emissive color={accent} i={0.7} /></mesh>
    </group>
  );
}

function Centerpiece({ kind, accent }) {
  switch (kind) {
    case 'smith':
      return (
        <group>
          <mesh position={[0, 0.5, -0.4]} castShadow><boxGeometry args={[1.6, 1, 0.9]} /><meshStandardMaterial color="#2b2b30" metalness={0.6} roughness={0.5} /></mesh>
          <mesh position={[1.8, 0.7, -1]} ><boxGeometry args={[1.2, 1.4, 1]} /><meshStandardMaterial color="#1c1c20" /></mesh>
          <mesh position={[1.8, 0.9, -0.6]}><sphereGeometry args={[0.35, 14, 14]} /><Emissive color="#ff7a2c" i={1.8} /></mesh>
          <pointLight position={[1.8, 1.2, -0.4]} intensity={8} color="#ff7a2c" distance={9} />
          {[-2, -1.4, -0.8].map((y, i) => <mesh key={i} position={[-2.4, 1.4 + i * 0.5, -2.4]} rotation={[0, 0.4, 0]}><boxGeometry args={[0.08, 1.0, 0.08]} /><meshStandardMaterial color="#9aa0ab" metalness={0.8} roughness={0.3} /></mesh>)}
        </group>
      );
    case 'tavern':
      return (
        <group>
          <mesh position={[0, 0.6, -0.5]} castShadow><boxGeometry args={[3, 1.2, 0.8]} /><meshStandardMaterial color="#5a3f24" roughness={0.8} /></mesh>
          {[-2.6, 2.6].map((x, i) => <mesh key={i} position={[x, 0.6, 1.5]}><cylinderGeometry args={[0.5, 0.5, 1.2, 12]} /><meshStandardMaterial color="#6b4a2c" /></mesh>)}
          <mesh position={[2.6, 1.1, -2.4]}><boxGeometry args={[1.6, 1, 0.4]} /><meshStandardMaterial color="#2a2018" /></mesh>
          <mesh position={[2.6, 0.9, -2.2]}><sphereGeometry args={[0.4, 14, 14]} /><Emissive color="#ff8a3a" i={1.6} /></mesh>
          <pointLight position={[2.6, 1.2, -2]} intensity={7} color="#ff8a3a" distance={10} />
        </group>
      );
    case 'temple':
      return (
        <group>
          <mesh position={[0, 0.7, -1]} castShadow><boxGeometry args={[1.8, 1.4, 1]} /><meshStandardMaterial color="#d8d2c2" roughness={0.7} /></mesh>
          <mesh position={[0, 1.8, -1]}><octahedronGeometry args={[0.5, 0]} /><Emissive color={accent} i={1.3} /></mesh>
          {[-2.2, 2.2].map((x, i) => <mesh key={i} position={[x, 1.6, -2.4]}><cylinderGeometry args={[0.4, 0.4, 3.2, 12]} /><meshStandardMaterial color="#c9c2b0" /></mesh>)}
          <pointLight position={[0, 2, -1]} intensity={6} color={accent} distance={10} />
        </group>
      );
    case 'arcanist':
      return (
        <group>
          <mesh position={[0, 0.6, -0.6]} castShadow><cylinderGeometry args={[0.7, 0.9, 1.2, 8]} /><meshStandardMaterial color="#2c2540" /></mesh>
          <mesh position={[0, 1.9, -0.6]}><octahedronGeometry args={[0.55, 0]} /><Emissive color={accent} i={1.5} /></mesh>
          <pointLight position={[0, 1.9, -0.6]} intensity={8} color={accent} distance={11} />
        </group>
      );
    case 'apothecary':
    case 'provisioner':
      return (
        <group>
          <mesh position={[0, 0.6, -0.5]} castShadow><boxGeometry args={[2.6, 1.2, 0.7]} /><meshStandardMaterial color="#4a3a28" roughness={0.85} /></mesh>
          {[-1.6, -0.9, -0.2, 0.5, 1.2].map((x, i) => (
            <mesh key={i} position={[x, 1.45, -0.5]}><cylinderGeometry args={[0.12, 0.12, 0.4, 8]} /><Emissive color={['#e84b4b', '#7be3a3', '#5aa9ff', '#ffb05a', '#c79bff'][i % 5]} i={0.8} /></mesh>
          ))}
          <pointLight position={[0, 1.8, 0]} intensity={4} color={accent} distance={9} />
        </group>
      );
    default:
      return (
        <group>
          <mesh position={[0, 0.6, -0.5]} castShadow><boxGeometry args={[2.4, 1.2, 0.8]} /><meshStandardMaterial color="#4a3f2c" /></mesh>
          {[-2, 2].map((x, i) => <mesh key={i} position={[x, 2.2, -2.4]}><planeGeometry args={[1, 1.8]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.3} side={2} /></mesh>)}
          <pointLight position={[0, 2.4, 0]} intensity={4} color={accent} distance={10} />
        </group>
      );
  }
}

function Room({ kind, accent, wall }) {
  return (
    <group>
      <ambientLight intensity={0.35} />
      <hemisphereLight intensity={0.3} color="#fff2d6" groundColor="#1a140c" />
      <pointLight position={[0, 4, 3]} intensity={6} color="#ffe7b8" distance={18} castShadow />
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[12, 10]} /><meshStandardMaterial color="#6b5a42" roughness={1} /></mesh>
      {/* back + side walls */}
      <mesh position={[0, 3, -4.2]} receiveShadow><planeGeometry args={[12, 6]} /><meshStandardMaterial color={wall} roughness={1} /></mesh>
      <mesh position={[-6, 3, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow><planeGeometry args={[10, 6]} /><meshStandardMaterial color={wall} roughness={1} /></mesh>
      <mesh position={[6, 3, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow><planeGeometry args={[10, 6]} /><meshStandardMaterial color={wall} roughness={1} /></mesh>
      {/* ceiling beams */}
      {[-3, 0, 3].map((x, i) => <mesh key={i} position={[x, 5.8, -1]}><boxGeometry args={[0.3, 0.3, 9]} /><meshStandardMaterial color="#3a2f20" /></mesh>)}
      <Centerpiece kind={kind} accent={accent} />
      <Vendor accent={accent} />
    </group>
  );
}

const InteriorView = () => {
  const interior = useGameStore((s) => s.activeInterior);
  const exitBuilding = useGameStore((s) => s.exitBuilding);
  const openShop = useGameStore((s) => s.openShop);
  const rest = useGameStore((s) => s.rest);
  const talkToNPC = useGameStore((s) => s.talkToNPC);
  const isShopOpen = useGameStore((s) => s.isShopOpen);
  const activeDialog = useGameStore((s) => s.activeDialog);

  const meta = useMemo(() => (interior ? (KIND[interior.kind] || KIND.townhall) : null), [interior]);
  if (!interior || !meta) return null;

  const doPrimary = () => {
    if (meta.primary.action === 'shop') openShop(interior.npcId);
    else if (meta.primary.action === 'rest') rest();
    else talkToNPC(interior.npcId);
  };

  // Hide the room chrome while a shop/dialog panel is layered on top.
  const overlayBusy = isShopOpen || Boolean(activeDialog);

  return (
    <div data-ui-root="true" style={{ position: 'absolute', inset: 0, zIndex: 55, background: '#06040a' }}>
      <Canvas shadows camera={{ position: [0, 3.2, 7.5], fov: 50 }}>
        <Room kind={interior.kind} accent={meta.accent} wall={meta.wall} />
        <Billboard position={[0, 4.4, -1]}>
          <Text fontSize={0.6} color="#f8f4ea" anchorX="center" outlineWidth={0.03} outlineColor="#000">{interior.npcName}</Text>
        </Billboard>
      </Canvas>

      {!overlayBusy && (
        <>
          <div style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <div style={{ fontFamily: UI.fontTitle, fontWeight: 700, fontSize: '1.5rem', color: meta.accent, letterSpacing: '0.08em', textShadow: '0 2px 8px #000' }}>{meta.title}</div>
            {interior.themeLabel ? <div style={{ fontFamily: UI.fontBody, color: UI.inkDim, fontSize: '0.9rem' }}>{interior.themeLabel}</div> : null}
          </div>

          <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 14, pointerEvents: 'auto' }}>
            <button onClick={doPrimary} style={btn(true, meta.accent)}>{meta.primary.label}</button>
            <button onClick={() => talkToNPC(interior.npcId)} style={btn(false, meta.accent)}>Hablar</button>
            <button onClick={exitBuilding} style={btn(false, meta.accent)}>Salir</button>
          </div>
        </>
      )}
    </div>
  );
};

function btn(primary, accent) {
  return {
    padding: '11px 26px',
    background: primary ? `linear-gradient(180deg, ${UI.goldBright}, ${UI.goldDim})` : 'rgba(0,0,0,0.45)',
    border: `1px solid ${UI.gold}`,
    color: primary ? '#1a140c' : UI.goldBright,
    fontFamily: UI.fontTitle, fontWeight: 700, fontSize: '0.95rem',
    borderRadius: 6, cursor: 'pointer'
  };
}

export default InteriorView;
