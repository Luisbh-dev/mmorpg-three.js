import React, { useEffect } from 'react';
import useGameStore from '../../stores/useGameStore';

const Inventory = () => {
  const { isInventoryOpen, toggleInventory, myCharacter, useItem } = useGameStore();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      
      if (e.code === 'KeyI') {
        toggleInventory();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleInventory]);

  if (!isInventoryOpen || !myCharacter) return null;

  const items = myCharacter.inventory || [];
  const slots = 20; // Fixed slots for now

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 60,
      fontFamily: '"Cinzel", serif',
      color: '#e0e0e0'
    }}>
      <div style={{
        width: '450px',
        background: 'rgba(15, 15, 15, 0.95)',
        border: '2px solid #555',
        borderRadius: '4px',
        padding: '20px',
        boxShadow: '0 0 50px rgba(0,0,0,0.8)',
        borderImage: 'linear-gradient(to bottom, #c5a059, #555) 1',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: '#c5a059', textTransform: 'uppercase', letterSpacing: '2px' }}>Inventario</h2>
          <button 
            onClick={toggleInventory} 
            style={{ 
              background: 'none', border: 'none', color: '#aaa', 
              cursor: 'pointer', fontSize: '1.5rem', fontWeight: 'bold',
              transition: 'color 0.2s'
            }}
            onMouseOver={e => e.target.style.color = '#fff'}
            onMouseOut={e => e.target.style.color = '#aaa'}
          >
            ✕
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '10px',
          padding: '10px',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '4px',
          border: '1px solid #333'
        }}>
          {Array.from({ length: slots }).map((_, i) => {
            const item = items[i];
            return (
              <div key={i} 
                onDoubleClick={() => item && useItem(i)}
                style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(to bottom, #2a2a2a, #1a1a1a)',
                  border: '1px solid #444',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                  cursor: item ? 'pointer' : 'default',
                  userSelect: 'none',
                  boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
                  transition: 'border-color 0.2s'
                }} 
                title={item ? `${item.name} (Doble click para usar)` : ''}
                onMouseOver={e => item && (e.currentTarget.style.borderColor = '#c5a059')}
                onMouseOut={e => e.currentTarget.style.borderColor = '#444'}
              >
                {item && (
                  <>
                    <div style={{ 
                      width: '40px', height: '40px', 
                      background: item.color || 'white', 
                      borderRadius: '50%',
                      border: '2px solid #111',
                      boxShadow: '0 0 5px black'
                    }} />
                    <span style={{ 
                      position: 'absolute', bottom: 2, right: 2, 
                      fontSize: '10px', background: 'rgba(0,0,0,0.8)', 
                      padding: '1px 4px', borderRadius: '2px', border: '1px solid #333'
                    }}>
                      1
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
        
        <div style={{ 
          marginTop: '20px', fontSize: '1.1rem', color: '#aaa', textAlign: 'right',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px'
        }}>
          <span style={{ fontSize: '0.9rem' }}>ORO:</span> 
          <span style={{ color: '#FFD700', fontWeight: 'bold' }}>{myCharacter.gold || 0}</span> 
          <div style={{ width: '16px', height: '16px', background: '#FFD700', borderRadius: '50%', border: '2px solid #B8860B' }} />
        </div>
      </div>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
      `}</style>
    </div>
  );
};

export default Inventory;
