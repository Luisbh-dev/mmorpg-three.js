import React, { useEffect, useRef } from 'react';
import useGameStore from '../../stores/useGameStore';
import { LANDMARKS, MAP_RADIUS, WAR_ZONE_RADIUS, getFactionMeta, getLandmarkColor } from '../../lib/gameData';

const Minimap = () => {
  const players = useGameStore((state) => state.players);
  const mobs = useGameStore((state) => state.mobs);
  const npcs = useGameStore((state) => state.npcs);
  const myId = useGameStore((state) => state.myId);
  const controlPoints = useGameStore((state) => state.controlPoints);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 8;
    const scale = radius / MAP_RADIUS;
    const toCanvas = (x, z) => ({
      x: center + (x * scale),
      y: center + (z * scale)
    });

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.clip();

    const gradient = ctx.createRadialGradient(center, center, 20, center, center, radius);
    gradient.addColorStop(0, '#e2dcc3');
    gradient.addColorStop(1, '#8f8267');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    ctx.beginPath();
    ctx.arc(center, center, WAR_ZONE_RADIUS * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(164, 103, 83, 0.35)';
    ctx.fill();

    ctx.strokeStyle = '#2e2a24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(center, center, WAR_ZONE_RADIUS * scale, 0, Math.PI * 2);
    ctx.stroke();

    Object.values(controlPoints).forEach((point) => {
      const ownerMeta = point.owner ? getFactionMeta(point.owner) : null;
      const position = toCanvas(point.position[0], point.position[2]);
      ctx.beginPath();
      ctx.arc(position.x, position.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = ownerMeta?.color || '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#1b1916';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    LANDMARKS.forEach((landmark) => {
      const position = toCanvas(landmark.position[0], landmark.position[2]);
      const markerRadius = landmark.type === 'capital' ? 5 : landmark.type === 'city' ? 4.4 : landmark.type === 'town' ? 3.8 : landmark.type === 'village' ? 3.2 : 3.6;
      ctx.beginPath();
      ctx.arc(position.x, position.y, markerRadius, 0, Math.PI * 2);
      ctx.fillStyle = getLandmarkColor(landmark);
      ctx.fill();
      ctx.strokeStyle = '#19130f';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    Object.values(mobs).forEach((mob) => {
      const position = toCanvas(mob.position[0], mob.position[2]);
      ctx.beginPath();
      ctx.arc(position.x, position.y, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = '#bf3d3d';
      ctx.fill();
    });

    Object.values(npcs).forEach((npc) => {
      const position = toCanvas(npc.position[0], npc.position[2]);
      ctx.beginPath();
      ctx.arc(position.x, position.y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#f4d36d';
      ctx.fill();
    });

    Object.values(players).forEach((player) => {
      const position = toCanvas(player.position[0], player.position[2]);
      if (player.id === myId) {
        ctx.save();
        ctx.translate(position.x, position.y);
        ctx.rotate(-(player.rotation?.[1] || 0));
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(5, 6);
        ctx.lineTo(0, 3);
        ctx.lineTo(-5, 6);
        ctx.closePath();
        ctx.fillStyle = '#4ce2ff';
        ctx.fill();
        ctx.strokeStyle = '#062733';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(position.x, position.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = getFactionMeta(player.faction).color;
        ctx.fill();
      }
    });

    ctx.restore();

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#3f3528';
    ctx.stroke();

    ctx.fillStyle = '#2e2417';
    ctx.font = 'bold 12px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('N', center, 15);
    ctx.fillText('S', center, size - 10);
    ctx.fillText('O', 14, center + 4);
    ctx.fillText('E', size - 14, center + 4);
  }, [controlPoints, mobs, myId, npcs, players]);

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      right: 20,
      width: 200,
      height: 200,
      pointerEvents: 'none',
      filter: 'drop-shadow(0 18px 28px rgba(0,0,0,0.35))'
    }}>
      <canvas ref={canvasRef} width={200} height={200} />
    </div>
  );
};

export default Minimap;
