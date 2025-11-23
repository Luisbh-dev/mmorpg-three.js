import React, { useEffect, useRef } from 'react';
import useGameStore from '../../stores/useGameStore';

const WorldMap = () => {
  const { players, mobs, myId, isMapOpen, toggleMap } = useGameStore();
  const canvasRef = useRef(null);

  const MAP_SIZE = 200; // Radius of the game world
  const CANVAS_SIZE = 600; // Size of the map on screen

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

      if (e.code === 'KeyM') {
        toggleMap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleMap]);

  useEffect(() => {
    if (!isMapOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    // Scale world coord (200) to canvas coord (300) -> 1.5
    const scale = (canvas.width / 2) / MAP_SIZE; 

    // 1. Draw Background Areas
    // We need to replicate the logic from Terrain.jsx roughly
    
    // Fill background (Ocean/Void)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Loop pixels roughly? No, let's draw shapes.
    
    // Draw World Circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, MAP_SIZE * scale, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#666';
    ctx.stroke();

    // Function to map world to canvas
    const toCanvas = (x, z) => ({
      x: centerX + x * scale,
      y: centerY + z * scale
    });

    // -- ZONES --
    
    // War Zone (Center)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 60 * scale, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.fill();
    ctx.strokeStyle = '#aa0000';
    ctx.stroke();
    
    // Sun Faction (North: Z < -50, X between -150 and 150)
    // In 2D canvas Y is Z. So Y < -50 (up)
    // Wait, canvas Y grows down. World Z grows South (positive).
    // World North is -Z. 
    // So North is Canvas Up (Negative Y relative to center). Correct.
    
    // Sun Zone Poly
    ctx.beginPath();
    // Approximate shape: Trapezoid or Arc sector
    // Let's just draw a big rect for simplicity clipped by circle in mind, or just label it
    // Rect: x: -150 to 150, z: -200 to -50
    const sunP1 = toCanvas(-150, -200);
    const sunP2 = toCanvas(150, -50);
    ctx.fillStyle = 'rgba(255, 215, 0, 0.2)'; // Gold
    ctx.fillRect(sunP1.x, sunP1.y, sunP2.x - sunP1.x, sunP2.y - sunP1.y);

    // Shadow Faction (South West: X < -50, Z > 50)
    const shadowP1 = toCanvas(-200, 50);
    const shadowP2 = toCanvas(-50, 200);
    ctx.fillStyle = 'rgba(75, 0, 130, 0.2)'; // Indigo
    ctx.fillRect(shadowP1.x, shadowP1.y, shadowP2.x - shadowP1.x, shadowP2.y - shadowP1.y);

    // Nature Faction (South East: X > 50, Z > 50)
    const natureP1 = toCanvas(50, 50);
    const natureP2 = toCanvas(200, 200);
    ctx.fillStyle = 'rgba(34, 139, 34, 0.2)'; // Forest Green
    ctx.fillRect(natureP1.x, natureP1.y, natureP2.x - natureP1.x, natureP2.y - natureP1.y);


    // -- LABELS --
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    
    ctx.fillText('ZONA DE GUERRA', centerX, centerY);
    
    const sunPos = toCanvas(0, -120);
    ctx.fillStyle = '#FFD700';
    ctx.fillText('TIERRAS DEL SOL', sunPos.x, sunPos.y);

    const shadowPos = toCanvas(-120, 120);
    ctx.fillStyle = '#d8b0ff';
    ctx.fillText('PACTO DE SOMBRA', shadowPos.x, shadowPos.y);

    const naturePos = toCanvas(120, 120);
    ctx.fillStyle = '#7CFC00';
    ctx.fillText('BOSQUE ANCESTRAL', naturePos.x, naturePos.y);

    // -- ENTITIES --
    
    // Mobs
    if (mobs) {
      Object.values(mobs).forEach(m => {
        const pos = toCanvas(m.position[0], m.position[2]);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff4444';
        ctx.fill();
      });
    }

    // Players
    Object.values(players).forEach(p => {
      const pos = toCanvas(p.position[0], p.position[2]);
      
      // Direction cone?
      // ctx.beginPath();
      // ctx.moveTo(pos.x, pos.y);
      // ctx.arc(pos.x, pos.y, 10, ... )
      
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 5, 0, 2 * Math.PI);
      
      if (p.id === myId) {
        ctx.fillStyle = '#00ffff';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Flash effect for me
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 10, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(0, 255, 255, ${Math.abs(Math.sin(Date.now() / 200))})`;
        ctx.stroke();
      } else {
        if (p.faction === 'sun') ctx.fillStyle = '#FFD700';
        else if (p.faction === 'shadow') ctx.fillStyle = '#4B0082';
        else if (p.faction === 'nature') ctx.fillStyle = '#228B22';
        else ctx.fillStyle = 'red';
      }
      ctx.fill();
    });

  }, [isMapOpen, players, mobs, myId]);

  if (!isMapOpen) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 50
    }}>
      <div style={{ position: 'relative' }}>
        <h2 style={{ color: 'white', textAlign: 'center', position: 'absolute', top: -40, width: '100%' }}>
          MAPA DEL MUNDO (M para cerrar)
        </h2>
        <canvas 
          ref={canvasRef} 
          width={CANVAS_SIZE} 
          height={CANVAS_SIZE} 
          style={{ border: '2px solid #555', borderRadius: '50%', background: '#111' }}
        />
      </div>
    </div>
  );
};

export default WorldMap;
