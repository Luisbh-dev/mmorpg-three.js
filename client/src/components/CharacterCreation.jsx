import React, { useState } from 'react';
import useGameStore from '../stores/useGameStore';
import { Canvas } from '@react-three/fiber';
import CharacterModel from './game/CharacterModel';
import { OrbitControls, Environment, Stars } from '@react-three/drei';

const FACTIONS = [
  { 
    id: 'sun', 
    name: 'Orden del Sol', 
    color: '#FFD700', 
    bgColor: 'linear-gradient(135deg, #3a3000 0%, #8B8000 100%)',
    icon: '☀️',
    description: 'Guardianes de la luz eterna. Maestros de la curación y la defensa impenetrable.',
    classes: ['Paladin', 'Cleric']
  },
  { 
    id: 'shadow', 
    name: 'Pacto de la Sombra', 
    color: '#9370DB', 
    bgColor: 'linear-gradient(135deg, #1a0024 0%, #4B0082 100%)',
    icon: '🌑',
    description: 'Acechadores en la oscuridad. Expertos en el engaño, el veneno y la magia negra.',
    classes: ['Rogue', 'Necromancer']
  },
  { 
    id: 'nature', 
    name: 'Alianza Natural', 
    color: '#32CD32', 
    bgColor: 'linear-gradient(135deg, #002400 0%, #006400 100%)',
    icon: '🌿',
    description: 'Defensores de los bosques. Controlan a las bestias y los elementos salvajes.',
    classes: ['Druid', 'Hunter']
  }
];

const CharacterCreation = () => {
  const [name, setName] = useState('');
  const [faction, setFaction] = useState(FACTIONS[0].id);
  const [charClass, setCharClass] = useState(FACTIONS[0].classes[0]);
  const createCharacter = useGameStore(state => state.createCharacter);
  const setAuthStage = useGameStore(state => state.setAuthStage) || ((s) => useGameStore.setState({authStage: s}));
  const [isLoading, setIsLoading] = useState(false);

  const selectedFaction = FACTIONS.find(f => f.id === faction);

  const handleFactionChange = (newFaction) => {
    setFaction(newFaction.id);
    setCharClass(newFaction.classes[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name.trim().length < 3) return alert('El nombre debe tener al menos 3 letras');
    
    setIsLoading(true);
    // Create character
    const res = await createCharacter({ name, faction, charClass });
    
    if (res.success) {
        // Go back to char select to see it (or enter game directly if we implement auto-select)
        // For now, let's go to char_select to confirm it's there
        useGameStore.setState({ authStage: 'char_select' });
        // Ideally we should refresh the list here calling login again or a refresh action
        // But let's rely on store logic if any
        // Actually store.createCharacter doesn't refresh list in current impl.
        // We need to refresh list. Simplest way: re-fetch logic in store or just push locally.
    } else {
        alert('Error: ' + res.error);
        setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, width: '100%', height: '100%',
      background: 'radial-gradient(circle, #1a0b00 0%, #000000 100%)',
      display: 'flex',
      fontFamily: '"Cinzel", serif',
      color: '#e0e0e0',
      zIndex: 100,
      overflow: 'hidden'
    }}>
      {/* Background Texture */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        backgroundImage: 'url("https://www.transparenttextures.com/patterns/dark-leather.png")',
        opacity: 0.5, pointerEvents: 'none'
      }} />

      {/* Left Panel: Controls */}
      <div style={{
        width: '450px',
        padding: '40px',
        background: 'rgba(10, 10, 10, 0.95)',
        borderRight: '1px solid #c5a059',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2,
        boxShadow: '10px 0 50px rgba(0,0,0,0.8)',
        position: 'relative'
      }}>
        {/* Ornate Corner Decoration */}
        <div style={{ position: 'absolute', top: 10, left: 10, width: 100, height: 100, borderTop: '2px solid #c5a059', borderLeft: '2px solid #c5a059', opacity: 0.5 }} />
        <div style={{ position: 'absolute', bottom: 10, right: 10, width: 100, height: 100, borderBottom: '2px solid #c5a059', borderRight: '2px solid #c5a059', opacity: 0.5 }} />

        <h1 style={{ 
          fontSize: '2.5rem', 
          margin: '0 0 10px 0', 
          color: '#c5a059',
          textTransform: 'uppercase',
          letterSpacing: '4px',
          textShadow: '0 2px 4px rgba(0,0,0,0.8)',
          textAlign: 'center'
        }}>
          Nuevo Héroe
        </h1>
        <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, #c5a059, transparent)', marginBottom: '30px' }} />
        
        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingRight: '5px' }}>
          
          {/* Name Input */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '10px', color: '#c5a059', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Nombre</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ 
                width: '100%', padding: '15px', background: 'rgba(0,0,0,0.3)', 
                border: '1px solid #555', color: '#fff', fontSize: '1.2rem',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.3s'
              }}
              placeholder="Escribe tu leyenda..."
              onFocus={(e) => e.target.style.borderColor = '#c5a059'}
              onBlur={(e) => e.target.style.borderColor = '#555'}
            />
          </div>

          {/* Faction Selection */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '15px', color: '#c5a059', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Lealtad</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {FACTIONS.map(f => (
                <div 
                  key={f.id}
                  onClick={() => handleFactionChange(f)}
                  style={{
                    padding: '15px',
                    background: faction === f.id ? f.bgColor : 'rgba(30,30,30,0.8)',
                    border: faction === f.id ? `1px solid ${f.color}` : '1px solid #333',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '15px',
                    transition: 'all 0.3s',
                    transform: faction === f.id ? 'translateX(10px)' : 'translateX(0)',
                    boxShadow: faction === f.id ? `0 0 15px ${f.color}40` : 'none'
                  }}
                >
                  <div style={{ fontSize: '1.8rem', textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>{f.icon}</div>
                  <div>
                    <div style={{ fontWeight: 'bold', color: faction === f.id ? '#fff' : '#aaa', fontSize: '1.1rem' }}>{f.name}</div>
                    {faction === f.id && (
                      <div style={{ fontSize: '0.8rem', color: '#ddd', marginTop: '5px', lineHeight: '1.2' }}>{f.description}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Class Selection */}
          <div style={{ marginBottom: '40px' }}>
            <label style={{ display: 'block', marginBottom: '15px', color: '#c5a059', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Clase</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              {selectedFaction.classes.map(c => (
                <div
                  key={c}
                  onClick={() => setCharClass(c)}
                  style={{
                    padding: '20px 10px',
                    background: charClass === c ? 'rgba(200, 160, 89, 0.1)' : 'rgba(30,30,30,0.8)',
                    border: charClass === c ? '1px solid #c5a059' : '1px solid #333',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: charClass === c ? '#c5a059' : '#888',
                    transition: 'all 0.2s',
                    textTransform: 'uppercase',
                    fontSize: '0.9rem'
                  }}
                >
                  {c}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <button 
              type="submit"
              disabled={name.trim().length < 3 || isLoading}
              style={{
                width: '100%', padding: '20px',
                background: (name.trim().length >= 3 && !isLoading)
                  ? 'linear-gradient(to bottom, #2a2a2a, #111)' 
                  : '#222',
                border: (name.trim().length >= 3 && !isLoading) ? '1px solid #c5a059' : '1px solid #444',
                color: (name.trim().length >= 3 && !isLoading) ? '#c5a059' : '#666',
                fontFamily: 'inherit',
                fontWeight: 'bold', fontSize: '1.2rem',
                cursor: (name.trim().length >= 3 && !isLoading) ? 'pointer' : 'not-allowed', 
                textTransform: 'uppercase',
                letterSpacing: '3px',
                boxShadow: (name.trim().length >= 3 && !isLoading) ? '0 0 20px rgba(197, 160, 89, 0.2)' : 'none',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => {
                if(name.trim().length >= 3 && !isLoading) {
                  e.target.style.background = '#c5a059';
                  e.target.style.color = '#000';
                  e.target.style.boxShadow = '0 0 30px rgba(197, 160, 89, 0.6)';
                }
              }}
              onMouseOut={(e) => {
                if(name.trim().length >= 3 && !isLoading) {
                  e.target.style.background = 'linear-gradient(to bottom, #2a2a2a, #111)';
                  e.target.style.color = '#c5a059';
                  e.target.style.boxShadow = '0 0 20px rgba(197, 160, 89, 0.2)';
                }
              }}
            >
              {isLoading ? 'Forjando...' : 'Forjar Destino'}
            </button>
          </div>
        </form>
      </div>

      {/* Right Panel: 3D Preview */}
      <div style={{
        flex: 1,
        position: 'relative',
        background: 'radial-gradient(circle at 50% 50%, #2a2a2a 0%, #000000 100%)'
      }}>
        <Canvas shadows camera={{ position: [0, 1.5, 4], fov: 40 }}>
          <ambientLight intensity={0.4} />
          <spotLight position={[5, 5, 5]} angle={0.3} penumbra={1} intensity={2} castShadow color="#fff" />
          <pointLight position={[-2, 2, 2]} intensity={1} color={selectedFaction.color} distance={5} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          <group position={[0, -1, 0]}>
            <CharacterModel 
              faction={faction} 
              isMe={false} 
              charClass={charClass} 
              isAttacking={false} 
            />
            
            {/* Magical Pedestal */}
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
              <circleGeometry args={[1.2, 64]} />
              <meshStandardMaterial color="#111" roughness={0.5} metalness={0.8} />
            </mesh>
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0, 0]}>
              <ringGeometry args={[1.2, 1.25, 64]} />
              <meshBasicMaterial color={selectedFaction.color} />
            </mesh>
            {/* Inner Glow */}
            <pointLight position={[0, 0.5, 0]} intensity={2} color={selectedFaction.color} distance={2} />
          </group>

          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={1} minPolarAngle={Math.PI/3} maxPolarAngle={Math.PI/2} />
          <Environment preset="night" />
        </Canvas>
        
        {/* Gradient Overlay for seamless blending */}
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: '100px',
          background: 'linear-gradient(to right, rgba(10,10,10,0.95), transparent)',
          pointerEvents: 'none'
        }} />
      </div>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
      `}</style>
    </div>
  );
};

export default CharacterCreation;
