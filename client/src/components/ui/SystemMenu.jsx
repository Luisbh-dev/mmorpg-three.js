import React, { useEffect } from 'react';
import useGameStore from '../../stores/useGameStore';
import { UI } from '../../lib/uiTheme';

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
    <div data-ui-root="true" style={{
      position: 'absolute', inset: 0, background: 'rgba(4,6,9,0.7)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, pointerEvents: 'auto'
    }}>
      <div style={{
        width: 360, maxWidth: '92vw', padding: 28, ...UI.panel, borderRadius: 10,
        color: UI.ink, textAlign: 'center', fontFamily: UI.fontBody
      }}>
        <div style={{ fontFamily: UI.fontTitle, fontWeight: 700, fontSize: '1.4rem', color: UI.goldBright, letterSpacing: '0.06em', marginBottom: 6 }}>Aethelgard</div>
        <div style={{ color: UI.inkDim, fontSize: '0.88rem', marginBottom: 24 }}>Pausa táctica. Decide tu siguiente movimiento.</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <MenuButton onClick={toggleSystemMenu} primary>Volver al Juego</MenuButton>
          <MenuButton onClick={handleChangeCharacter}>Cambiar Personaje</MenuButton>
          <MenuButton onClick={handleLogout}>Cerrar Sesión</MenuButton>
        </div>
      </div>
    </div>
  );
};

const MenuButton = ({ children, onClick, primary = false }) => (
  <button
    onClick={onClick}
    style={{
      padding: '13px 18px', borderRadius: 6,
      border: `1px solid ${UI.gold}`,
      background: primary ? `linear-gradient(180deg, ${UI.goldBright}, ${UI.goldDim})` : 'rgba(0,0,0,0.3)',
      color: primary ? '#1a140c' : UI.goldBright,
      fontFamily: UI.fontTitle, fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
    }}
    onMouseOver={(e) => { if (!primary) { e.currentTarget.style.background = 'rgba(197,160,89,0.18)'; } }}
    onMouseOut={(e) => { if (!primary) { e.currentTarget.style.background = 'rgba(0,0,0,0.3)'; } }}
  >
    {children}
  </button>
);

export default SystemMenu;
