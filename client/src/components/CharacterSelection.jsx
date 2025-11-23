import React, { useState } from 'react';
import useGameStore from '../stores/useGameStore';

const CharacterSelection = () => {
  const { userCharacters, selectCharacter, deleteCharacter, authStage, user } = useGameStore();
  const setAuthStage = (stage) => useGameStore.setState({ authStage: stage });
  const [isLoading, setIsLoading] = useState(false);

  if (authStage !== 'char_select') return null;

  const handleSelect = async (charId) => {
    setIsLoading(true);
    const res = await selectCharacter(charId);
    if (!res.success) {
      alert('Error al cargar personaje: ' + res.error);
      setIsLoading(false);
    }
  };

  const handleDelete = async (e, charId, charName) => {
    e.stopPropagation();
    if (window.confirm(`¿Estás seguro de que quieres eliminar a ${charName}? Esta acción no se puede deshacer.`)) {
      setIsLoading(true);
      try {
        const res = await deleteCharacter(charId);
        if (!res.success) {
          alert('Error al eliminar: ' + (res.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Error de conexión');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      background: 'radial-gradient(circle, #1a0b00 0%, #000000 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Cinzel", serif', color: '#e0e0e0',
      overflow: 'hidden'
    }}>
      {/* Background Texture */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        backgroundImage: 'url("https://www.transparenttextures.com/patterns/dark-leather.png")',
        opacity: 0.5, pointerEvents: 'none'
      }} />

      <h1 style={{ 
        fontSize: '2.5rem', color: '#c5a059', textTransform: 'uppercase', 
        letterSpacing: '4px', textShadow: '0 2px 10px rgba(0,0,0,0.8)',
        marginBottom: '10px', zIndex: 2
      }}>
        Héroes de {user?.username}
      </h1>
      <div style={{ width: '200px', height: '2px', background: 'linear-gradient(90deg, transparent, #c5a059, transparent)', marginBottom: '50px', zIndex: 2 }} />

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '1000px', zIndex: 2 }}>
        {userCharacters.map(char => (
          <div key={char.id} 
            onClick={() => !isLoading && handleSelect(char.id)}
            style={{
              width: '240px', height: '350px',
              background: 'linear-gradient(to bottom, #222, #111)',
              border: '1px solid #444',
              borderRadius: '8px',
              cursor: isLoading ? 'wait' : 'pointer',
              position: 'relative',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '20px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
              overflow: 'hidden'
            }}
            onMouseOver={e => {
              if(!isLoading) {
                e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
                e.currentTarget.style.boxShadow = `0 20px 40px rgba(0,0,0,0.6), 0 0 20px ${char.faction === 'sun' ? '#FFD700' : char.faction === 'shadow' ? '#4B0082' : '#228B22'}40`;
                e.currentTarget.style.borderColor = '#c5a059';
              }
            }}
            onMouseOut={e => {
              if(!isLoading) {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
                e.currentTarget.style.borderColor = '#444';
              }
            }}
          >
            {/* Faction Background Glow */}
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '150px',
              background: `linear-gradient(to bottom, ${char.faction === 'sun' ? '#FFD700' : char.faction === 'shadow' ? '#4B0082' : '#228B22'}20, transparent)`,
              pointerEvents: 'none'
            }} />

            {/* Delete Button */}
            <div 
              onClick={(e) => handleDelete(e, char.id, char.name)}
              style={{
                position: 'absolute', top: 10, right: 10, 
                padding: '5px 10px', borderRadius: '4px',
                background: 'rgba(50,0,0,0.8)', border: '1px solid #800',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                color: '#ffaaaa', fontSize: '0.7rem', cursor: 'pointer',
                zIndex: 5, transition: 'all 0.2s',
                fontWeight: 'bold', textTransform: 'uppercase'
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = '#ff0000';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.borderColor = '#ff0000';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(50,0,0,0.8)';
                e.currentTarget.style.color = '#ffaaaa';
                e.currentTarget.style.borderColor = '#800';
              }}
              title="Eliminar este personaje permanentemente"
            >
              BORRAR
            </div>

            <div style={{ 
              fontSize: '4rem', marginBottom: '20px', marginTop: '20px',
              filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))'
            }}>
              {char.faction === 'sun' ? '☀️' : char.faction === 'shadow' ? '🌑' : '🌿'}
            </div>
            
            <h2 style={{ margin: '0 0 5px 0', color: '#c5a059', fontSize: '1.5rem' }}>{char.name}</h2>
            <div style={{ color: '#aaa', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{char.class}</div>
            
            <div style={{ 
              marginTop: 'auto', width: '100%', 
              padding: '10px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              border: '1px solid #333'
            }}>
              <span style={{ color: '#888', fontSize: '0.8rem' }}>NIVEL</span>
              <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.2rem' }}>{char.level}</span>
            </div>

            <div style={{ 
              marginTop: '10px', fontSize: '0.8rem', color: '#666', 
              textTransform: 'uppercase', letterSpacing: '1px' 
            }}>
              {char.faction === 'sun' ? 'Orden del Sol' : char.faction === 'shadow' ? 'Pacto Sombra' : 'Alianza Natural'}
            </div>
          </div>
        ))}

        {/* Create New Slot */}
        {userCharacters.length < 3 && (
          <div 
            onClick={() => !isLoading && setAuthStage('create')}
            style={{
              width: '240px', height: '350px',
              background: 'rgba(255,255,255,0.02)',
              border: '2px dashed #444', borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              color: '#666',
              transition: 'all 0.3s'
            }}
            onMouseOver={e => {
              if(!isLoading) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = '#c5a059';
                e.currentTarget.style.color = '#c5a059';
              }
            }}
            onMouseOut={e => {
              if(!isLoading) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.borderColor = '#444';
                e.currentTarget.style.color = '#666';
              }
            }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '10px', fontWeight: '300' }}>+</div>
            <div style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9rem' }}>Crear Nuevo</div>
          </div>
        )}
      </div>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
      `}</style>
    </div>
  );
};

export default CharacterSelection;
