import React, { useEffect } from 'react';
import useGameStore from '../../stores/useGameStore';

const SystemMenu = () => {
  const isSystemMenuOpen = useGameStore((state) => state.isSystemMenuOpen);
  const toggleSystemMenu = useGameStore((state) => state.toggleSystemMenu);
  const setAuthStage = useGameStore((state) => state.setAuthStage);
  const disconnect = useGameStore((state) => state.disconnect);
  const authStage = useGameStore((state) => state.authStage);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === 'Escape' && authStage === 'game') {
        toggleSystemMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authStage, toggleSystemMenu]);

  if (!isSystemMenuOpen) return null;

  const handleChangeCharacter = () => {
    useGameStore.setState({
      authStage: 'char_select',
      myCharacter: null,
      isSystemMenuOpen: false,
      isMapOpen: false,
      isInventoryOpen: false,
      activeDialog: null
    });
  };

  const handleLogout = () => {
    setAuthStage('login');
    disconnect();
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(4,7,10,0.82)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100
    }}>
      <div style={{
        width: 360,
        maxWidth: '92vw',
        padding: 28,
        borderRadius: 24,
        background: 'linear-gradient(180deg, rgba(15,19,24,0.98), rgba(9,11,15,0.95))',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 28px 60px rgba(0,0,0,0.42)',
        color: '#eef4fb',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: 8 }}>Menu del Sistema</div>
        <div style={{ color: '#a9b8c6', fontSize: '0.92rem', marginBottom: 22 }}>
          Pausa tactica. Decide tu siguiente movimiento.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <MenuButton onClick={handleChangeCharacter}>Cambiar Personaje</MenuButton>
          <MenuButton onClick={handleLogout}>Cerrar Sesion</MenuButton>
          <MenuButton onClick={toggleSystemMenu} secondary>Volver al Juego</MenuButton>
        </div>
      </div>
    </div>
  );
};

const MenuButton = ({ children, onClick, secondary = false }) => (
  <button
    onClick={onClick}
    style={{
      padding: '14px 18px',
      borderRadius: 14,
      border: `1px solid ${secondary ? 'rgba(255,255,255,0.14)' : 'rgba(244,201,93,0.45)'}`,
      background: secondary ? 'rgba(255,255,255,0.04)' : 'linear-gradient(180deg, rgba(244,201,93,0.22), rgba(244,201,93,0.08))',
      color: secondary ? '#eef4fb' : '#ffe29e',
      fontSize: '0.95rem',
      fontWeight: 700,
      cursor: 'pointer'
    }}
  >
    {children}
  </button>
);

export default SystemMenu;
