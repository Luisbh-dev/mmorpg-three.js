import React, { useEffect } from 'react';
import useGameStore from '../../stores/useGameStore';

const Inventory = () => {
  const isInventoryOpen = useGameStore((state) => state.isInventoryOpen);
  const toggleInventory = useGameStore((state) => state.toggleInventory);
  const myCharacter = useGameStore((state) => state.myCharacter);
  const useItem = useGameStore((state) => state.useItem);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (event.code === 'KeyI') toggleInventory();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleInventory]);

  if (!isInventoryOpen || !myCharacter) return null;

  const items = myCharacter.inventory || [];

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(5,8,12,0.78)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 60
    }}>
      <div style={{
        width: 560,
        maxWidth: '92vw',
        padding: 24,
        borderRadius: 24,
        background: 'linear-gradient(180deg, rgba(15,19,24,0.98), rgba(9,11,15,0.95))',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 28px 60px rgba(0,0,0,0.42)',
        color: '#edf2f7'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>Inventario</div>
            <div style={{ color: '#a8b7c6', fontSize: '0.9rem' }}>Doble click para consumir objetos</div>
          </div>
          <button
            onClick={toggleInventory}
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: '#edf2f7',
              borderRadius: 12,
              width: 40,
              height: 40,
              cursor: 'pointer'
            }}
          >
            X
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: 12,
          padding: 14,
          borderRadius: 18,
          background: 'rgba(255,255,255,0.03)'
        }}>
          {Array.from({ length: 20 }).map((_, index) => {
            const item = items[index];
            const isGold = item?.itemCode === 'gold' || item?.itemType === 'currency';
            return (
              <div
                key={index}
                onDoubleClick={() => item && useItem(index)}
                title={item ? item.name : ''}
                style={{
                  aspectRatio: '1 / 1',
                  borderRadius: 16,
                  border: `1px solid ${item ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
                  background: item ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  cursor: item ? 'pointer' : 'default'
                }}
              >
                {item && (
                  <>
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: isGold ? '50%' : 12,
                      background: item.color || (isGold ? '#ffd66b' : '#ff6b6b'),
                      boxShadow: `0 0 18px ${item.color || (isGold ? '#ffd66b' : '#ff6b6b')}55`
                    }} />
                    <div style={{
                      position: 'absolute',
                      left: 8,
                      right: 8,
                      bottom: 8,
                      textAlign: 'center',
                      fontSize: '0.66rem',
                      color: '#e8eef5'
                    }}>
                      {item.name}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, color: '#c0cbd6' }}>
          <span>Objetos: {items.length} / 20</span>
          <span>Oro: <strong style={{ color: '#ffd66b' }}>{myCharacter.gold || 0}</strong></span>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
