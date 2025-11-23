import React, { useEffect } from 'react';
import useGameStore from '../../stores/useGameStore';

const SystemMenu = () => {
  const { isSystemMenuOpen, toggleSystemMenu, setAuthStage, disconnect, authStage } = useGameStore();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Escape' && authStage === 'game') {
        toggleSystemMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSystemMenu, authStage]);

  if (!isSystemMenuOpen) return null;

  const handleLogout = () => {
    disconnect(); // or specific logout logic
    // Store handles disconnect by resetting authStage to 'login' usually, 
    // but let's be explicit if needed or rely on socket disconnect event handling in store.
    // Current disconnect implementation in store resets state.
    window.location.reload(); // Simple way to ensure clean state for now
  };

  const handleChangeCharacter = () => {
    toggleSystemMenu();
    useGameStore.setState({ authStage: 'char_select', myCharacter: null });
  };

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 100, fontFamily: '"Cinzel", serif', color: '#c5a059'
    }}>
      <div style={{
        width: '300px',
        background: '#1a1a1a',
        border: '2px solid #555',
        padding: '40px',
        display: 'flex', flexDirection: 'column', gap: '20px',
        boxShadow: '0 0 50px rgba(0,0,0,0.9)',
        borderImage: 'linear-gradient(to bottom, #c5a059, #555) 1',
        textAlign: 'center'
      }}>
        <h2 style={{ margin: '0 0 20px 0', textTransform: 'uppercase', letterSpacing: '2px' }}>Menú del Sistema</h2>
        
        <MenuButton onClick={handleChangeCharacter}>Cambiar Personaje</MenuButton>
        <MenuButton onClick={handleLogout}>Cerrar Sesión</MenuButton>
        <div style={{ height: '20px' }} />
        <MenuButton onClick={toggleSystemMenu} secondary>Volver al Juego</MenuButton>
      </div>
    </div>
  );
};

const MenuButton = ({ children, onClick, secondary }) => (
  <button
    onClick={onClick}
    style={{
      padding: '15px',
      background: secondary ? 'transparent' : 'linear-gradient(to bottom, #2a2a2a, #111)',
      border: secondary ? '1px solid #555' : '1px solid #c5a059',
      color: secondary ? '#aaa' : '#c5a059',
      fontFamily: 'inherit',
      fontSize: '1rem',
      textTransform: 'uppercase',
      cursor: 'pointer',
      transition: 'all 0.2s'
    }}
    onMouseOver={e => {
      if(!secondary) {
        e.target.style.background = '#c5a059';
        e.target.style.color = '#000';
      } else {
        e.target.style.borderColor = '#aaa';
        e.target.style.color = '#fff';
      }
    }}
    onMouseOut={e => {
      if(!secondary) {
        e.target.style.background = 'linear-gradient(to bottom, #2a2a2a, #111)';
        e.target.style.color = '#c5a059';
      } else {
        e.target.style.borderColor = '#555';
        e.target.style.color = '#aaa';
      }
    }}
  >
    {children}
  </button>
);

export default SystemMenu;
