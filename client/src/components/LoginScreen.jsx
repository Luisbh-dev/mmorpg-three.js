import React, { useState } from 'react';
import useGameStore from '../stores/useGameStore';

const LoginScreen = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useGameStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);
    
    try {
      if (isRegistering) {
        const res = await register(username, password);
        if (res.success) {
          setSuccessMsg('¡Cuenta creada! Entrando al reino...');
          // Small delay to read message
          setTimeout(async () => {
             const loginRes = await login(username, password);
             if (!loginRes.success) {
               setError(loginRes.error);
               setIsLoading(false);
             }
          }, 1000);
        } else {
          setError(res.error);
          setIsLoading(false);
        }
      } else {
        const res = await login(username, password);
        if (!res.success) {
          setError(res.error);
          setIsLoading(false);
        }
        // If success, component unmounts automatically due to authStage change
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      background: 'radial-gradient(circle, #1a0b00 0%, #000000 100%)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      fontFamily: '"Cinzel", serif', color: '#e0e0e0',
      overflow: 'hidden'
    }}>
      {/* Background Texture / Overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        backgroundImage: 'url("https://www.transparenttextures.com/patterns/dark-leather.png")',
        opacity: 0.5, pointerEvents: 'none'
      }} />
      
      {/* Particles / Atmosphere (Simple CSS dots) */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: Math.random() * 100 + '%',
          left: Math.random() * 100 + '%',
          width: Math.random() * 3 + 'px',
          height: Math.random() * 3 + 'px',
          background: '#ffaa00',
          opacity: Math.random() * 0.5,
          boxShadow: '0 0 10px #ffaa00',
          animation: `float ${5 + Math.random() * 10}s infinite linear`
        }} />
      ))}

      <div style={{
        position: 'relative',
        width: '400px',
        padding: '60px 40px',
        background: 'rgba(20, 20, 20, 0.95)',
        border: '1px solid #444',
        borderRadius: '4px',
        boxShadow: '0 0 50px rgba(0,0,0,0.8), inset 0 0 100px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>
        {/* Ornate Border Corners (CSS shapes) */}
        <div style={{ position: 'absolute', top: -2, left: -2, width: 20, height: 20, borderTop: '2px solid #c5a059', borderLeft: '2px solid #c5a059' }} />
        <div style={{ position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderTop: '2px solid #c5a059', borderRight: '2px solid #c5a059' }} />
        <div style={{ position: 'absolute', bottom: -2, left: -2, width: 20, height: 20, borderBottom: '2px solid #c5a059', borderLeft: '2px solid #c5a059' }} />
        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderBottom: '2px solid #c5a059', borderRight: '2px solid #c5a059' }} />

        <h1 style={{ 
          margin: '0 0 10px 0', 
          fontSize: '2.5rem', 
          color: '#c5a059', 
          textTransform: 'uppercase', 
          letterSpacing: '4px',
          textShadow: '0 2px 4px rgba(0,0,0,0.8)' 
        }}>
          Aethelgard
        </h1>
        <div style={{ width: '100px', height: '2px', background: 'linear-gradient(90deg, transparent, #c5a059, transparent)', marginBottom: '40px' }} />

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nombre de Usuario"
              style={{ 
                width: '100%', padding: '15px', 
                background: 'rgba(0,0,0,0.3)', 
                border: '1px solid #555', 
                color: '#fff', 
                fontFamily: 'inherit', fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#c5a059'}
              onBlur={(e) => e.target.style.borderColor = '#555'}
            />
          </div>
          
          <div style={{ position: 'relative' }}>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              style={{ 
                width: '100%', padding: '15px', 
                background: 'rgba(0,0,0,0.3)', 
                border: '1px solid #555', 
                color: '#fff', 
                fontFamily: 'inherit', fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#c5a059'}
              onBlur={(e) => e.target.style.borderColor = '#555'}
            />
          </div>

          {error && (
            <div style={{ 
              color: '#ff6b6b', fontSize: '0.9rem', textAlign: 'center', 
              background: 'rgba(255,0,0,0.1)', padding: '10px', border: '1px solid #ff6b6b' 
            }}>
              {error}
            </div>
          )}

          {successMsg && (
            <div style={{ 
              color: '#4CAF50', fontSize: '0.9rem', textAlign: 'center', 
              background: 'rgba(76,175,80,0.1)', padding: '10px', border: '1px solid #4CAF50' 
            }}>
              {successMsg}
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '10px',
              padding: '18px',
              background: isLoading ? '#333' : 'linear-gradient(to bottom, #2a2a2a, #111)',
              border: '1px solid #c5a059',
              color: isLoading ? '#666' : '#c5a059',
              fontFamily: 'inherit',
              fontSize: '1.1rem',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              cursor: isLoading ? 'wait' : 'pointer',
              transition: 'all 0.3s',
              boxShadow: isLoading ? 'none' : '0 4px 10px rgba(0,0,0,0.5)'
            }}
            onMouseOver={(e) => {
              if (!isLoading) {
                e.target.style.background = '#c5a059';
                e.target.style.color = '#000';
                e.target.style.boxShadow = '0 0 20px #c5a059';
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading) {
                e.target.style.background = 'linear-gradient(to bottom, #2a2a2a, #111)';
                e.target.style.color = '#c5a059';
                e.target.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';
              }
            }}
          >
            {isLoading ? 'Procesando...' : (isRegistering ? 'Registrar Cuenta' : 'Entrar al Reino')}
          </button>
        </form>

        <div style={{ marginTop: '30px', fontSize: '0.9rem', color: '#888' }}>
          <span 
            onClick={() => { setError(''); setIsRegistering(!isRegistering); }}
            style={{ 
              cursor: 'pointer', 
              borderBottom: '1px dotted #888',
              transition: 'color 0.3s'
            }}
            onMouseOver={(e) => e.target.style.color = '#c5a059'}
            onMouseOut={(e) => e.target.style.color = '#888'}
          >
            {isRegistering ? 'Volver al Inicio de Sesión' : 'Crear una Nueva Cuenta'}
          </span>
        </div>
      </div>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
        @keyframes float {
          0% { transform: translateY(0px); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-100px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default LoginScreen;
