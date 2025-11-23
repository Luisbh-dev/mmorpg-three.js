import React, { useEffect, useRef } from 'react';
import useGameStore from '../../stores/useGameStore';

const Minimap = () => {
  const { players, mobs, npcs, myId } = useGameStore();
  const canvasRef = useRef(null);

  const MAP_SIZE = 200; // World Radius
  const MINIMAP_RADIUS = 100; // Canvas pixel radius

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear and Clip to Circle
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.beginPath();
    ctx.arc(100, 100, 98, 0, 2 * Math.PI);
    ctx.clip();

    // Background (Parchment style)
    ctx.fillStyle = '#e3d2b4';
    ctx.fillRect(0, 0, 200, 200);
    
    // Draw World Zones (Background colors)
    // We simulate the zones logic from Terrain roughly
    const toMap = (x, z) => ({
      x: 100 + (x / MAP_SIZE) * 100,
      y: 100 + (z / MAP_SIZE) * 100
    });

    // War Zone (Center)
    ctx.beginPath();
    ctx.arc(100, 100, (60 / MAP_SIZE) * 100, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.fill();

    // --- Draw Walls ---
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // Inner Ring (approx)
    ctx.beginPath();
    ctx.arc(100, 100, (60 / MAP_SIZE) * 100, 0, 2 * Math.PI);
    ctx.stroke();

    // Radial Walls (Angles: 45, 180, 315)
    // 45 deg = PI/4.
    // Draw line from Inner Radius to Edge
    const drawRadial = (angle) => {
        const start = 60 / MAP_SIZE * 100;
        const end = 100; // Edge
        
        // Map coordinate system: X right, Y down (Z in 3D)
        // 3D X,Z -> Canvas X,Y.
        // Angle 0 in 3D is Z+ (South). In Canvas Y+ is down. Matches.
        // Angle PI/2 is X+ (West). In Canvas X+ is right. Matches.
        
        // However, Math.sin/cos logic:
        // x = sin(a), y = cos(a).
        
        const x1 = 100 + Math.sin(angle) * start;
        const y1 = 100 + Math.cos(angle) * start;
        const x2 = 100 + Math.sin(angle) * end;
        const y2 = 100 + Math.cos(angle) * end;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    };

    drawRadial(Math.PI/4);     // NE
    drawRadial(Math.PI);       // S
    drawRadial(7*Math.PI/4);   // NW

    // --- Entities ---

    // Mobs
    if (mobs) {
      ctx.fillStyle = '#d32f2f';
      Object.values(mobs).forEach(m => {
        const p = toMap(m.position[0], m.position[2]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // NPCs
    if (npcs) {
      ctx.fillStyle = '#FFD700';
      Object.values(npcs).forEach(n => {
        const p = toMap(n.position[0], n.position[2]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
        ctx.fill();
        // Quest marker
        if (n.type === 'quest_giver') {
            ctx.strokeStyle = '#8B8000';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
      });
    }

    // Players
    Object.values(players).forEach(p => {
      const pos = toMap(p.position[0], p.position[2]);
      
      if (p.id === myId) {
        // Draw Arrow for me
        ctx.save();
        ctx.translate(pos.x, pos.y);
        // Rotation. player.rotation[1] is Yaw.
        ctx.rotate(-p.rotation[1]); // Canvas rotation might be inverse to 3D logic check
        
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(4, 4);
        ctx.lineTo(0, 2);
        ctx.lineTo(-4, 4);
        ctx.closePath();
        ctx.fillStyle = '#00FFFF';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      } else {
        // Dots for others
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, 2 * Math.PI);
        if (p.faction === 'sun') ctx.fillStyle = '#FFD700';
        else if (p.faction === 'shadow') ctx.fillStyle = '#4B0082';
        else if (p.faction === 'nature') ctx.fillStyle = '#228B22';
        else ctx.fillStyle = '#fff';
        ctx.fill();
      }
    });

    ctx.restore(); // Restore clip

    // Border Ring (drawn on top)
    ctx.beginPath();
    ctx.arc(100, 100, 98, 0, 2 * Math.PI);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#5c4d3c'; // Bronze/Wood
    ctx.stroke();
    
    // Compass Letters
    ctx.font = 'bold 12px Cinzel';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', 100, 12);
    ctx.fillText('S', 100, 188);
    ctx.fillText('O', 12, 100);
    ctx.fillText('E', 188, 100);

  }, [players, mobs, npcs, myId]);

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      width: '200px',
      height: '200px',
      pointerEvents: 'none',
      filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.5))'
    }}>
      <canvas 
        ref={canvasRef} 
        width={200} 
        height={200} 
      />
    </div>
  );
};

export default Minimap;
