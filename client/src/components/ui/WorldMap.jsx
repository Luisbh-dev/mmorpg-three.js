import React, { useEffect, useRef } from 'react';
import useGameStore from '../../stores/useGameStore';
import { LANDMARKS, MAP_RADIUS, ROADS, WAR_ZONE_RADIUS, getFactionMeta, getLandmarkColor } from '../../lib/gameData';

const WorldMap = () => {
  const players = useGameStore((state) => state.players);
  const mobs = useGameStore((state) => state.mobs);
  const controlPoints = useGameStore((state) => state.controlPoints);
  const isMapOpen = useGameStore((state) => state.isMapOpen);
  const toggleMap = useGameStore((state) => state.toggleMap);
  const myId = useGameStore((state) => state.myId);
  const canvasRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (event.code === 'KeyM') {
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
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = (width / 2) - 20;
    const scale = radius / MAP_RADIUS;
    const toCanvas = (x, z) => ({
      x: centerX + (x * scale),
      y: centerY + (z * scale)
    });

    ctx.clearRect(0, 0, width, height);

    const background = ctx.createRadialGradient(centerX, centerY, 60, centerX, centerY, radius);
    background.addColorStop(0, '#1f2730');
    background.addColorStop(1, '#0b0e12');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#d9ccb4';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#33281d';
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();

    const drawRegion = (points, fillStyle) => {
      ctx.beginPath();
      points.forEach((point, index) => {
        const canvasPoint = toCanvas(point[0], point[1]);
        if (index === 0) ctx.moveTo(canvasPoint.x, canvasPoint.y);
        else ctx.lineTo(canvasPoint.x, canvasPoint.y);
      });
      ctx.closePath();
      ctx.fillStyle = fillStyle;
      ctx.fill();
    };

    drawRegion([[-220, -320], [220, -320], [150, -98], [-150, -98]], 'rgba(244, 201, 93, 0.24)');
    drawRegion([[-320, 20], [-100, 20], [-104, 320], [-320, 320]], 'rgba(138, 125, 255, 0.24)');
    drawRegion([[100, 20], [320, 20], [320, 320], [104, 320]], 'rgba(87, 199, 119, 0.24)');

    ctx.beginPath();
    ctx.arc(centerX, centerY, WAR_ZONE_RADIUS * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(173, 102, 82, 0.35)';
    ctx.fill();
    ctx.strokeStyle = '#7f2e25';
    ctx.stroke();

    ROADS.forEach((road) => {
      const roadColor = road.faction === 'sun' ? '#d7b56d' : road.faction === 'shadow' ? '#9f8bc0' : '#87c97e';
      ctx.beginPath();
      road.points.forEach((point, index) => {
        const canvasPoint = toCanvas(point[0], point[1]);
        if (index === 0) ctx.moveTo(canvasPoint.x, canvasPoint.y);
        else ctx.lineTo(canvasPoint.x, canvasPoint.y);
      });
      ctx.strokeStyle = 'rgba(18, 14, 10, 0.55)';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.strokeStyle = roadColor;
      ctx.lineWidth = 5;
      ctx.stroke();
    });

    ctx.font = 'bold 16px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#372a1d';
    ctx.fillText('Reino del Alba', centerX, centerY - 210);
    ctx.fillText('Dominio Umbrio', centerX - 190, centerY + 180);
    ctx.fillText('Territorio Verde', centerX + 190, centerY + 180);
    ctx.fillText('Zona de Guerra', centerX, centerY + 5);

    LANDMARKS.forEach((landmark) => {
      const position = toCanvas(landmark.position[0], landmark.position[2]);
      const color = getLandmarkColor(landmark);
      const iconSize = landmark.type === 'capital' ? 11 : landmark.type === 'city' ? 9 : landmark.type === 'town' ? 7 : 6;
      ctx.beginPath();
      ctx.moveTo(position.x, position.y - iconSize);
      ctx.lineTo(position.x + iconSize, position.y);
      ctx.lineTo(position.x, position.y + iconSize);
      ctx.lineTo(position.x - iconSize, position.y);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#120f0b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#140f0a';
      ctx.font = 'bold 11px Segoe UI';
      ctx.fillText(landmark.shortName, position.x, position.y - 16);
    });

    Object.values(controlPoints).forEach((point) => {
      const ownerMeta = point.owner ? getFactionMeta(point.owner) : null;
      const position = toCanvas(point.position[0], point.position[2]);
      ctx.beginPath();
      ctx.arc(position.x, position.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = ownerMeta?.color || '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#1b1713';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#120f0b';
      ctx.font = 'bold 12px Segoe UI';
      ctx.fillText(point.name, position.x, position.y - 14);
    });

    Object.values(mobs).forEach((mob) => {
      const position = toCanvas(mob.position[0], mob.position[2]);
      ctx.beginPath();
      ctx.arc(position.x, position.y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#c24141';
      ctx.fill();
    });

    Object.values(players).forEach((player) => {
      const position = toCanvas(player.position[0], player.position[2]);
      ctx.beginPath();
      ctx.arc(position.x, position.y, player.id === myId ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = player.id === myId ? '#4ce2ff' : getFactionMeta(player.faction).color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = player.id === myId ? 2 : 0;
      if (player.id === myId) ctx.stroke();
    });

    ctx.restore();
  }, [controlPoints, isMapOpen, mobs, myId, players]);

  if (!isMapOpen) return null;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(3,6,10,0.86)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 50
    }}>
      <div style={{
        position: 'relative',
        width: 760,
        maxWidth: '90vw',
        padding: 22,
        borderRadius: 24,
        background: 'linear-gradient(180deg, rgba(18,22,28,0.98), rgba(10,13,18,0.95))',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 28px 60px rgba(0,0,0,0.42)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ color: '#f4e3bf', fontSize: '1.3rem', fontWeight: 800 }}>Mapa del Reino</div>
            <div style={{ color: '#a5b2bf', fontSize: '0.92rem' }}>Pulsa M para volver al combate</div>
          </div>
          <button
            onClick={toggleMap}
            style={{
              pointerEvents: 'auto',
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.04)',
              color: '#ecf3fb',
              borderRadius: 12,
              padding: '10px 14px',
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={700}
          height={700}
          style={{
            width: '100%',
            maxHeight: '78vh',
            borderRadius: 24,
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        />
      </div>
    </div>
  );
};

export default WorldMap;
