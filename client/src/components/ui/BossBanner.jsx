import React from 'react';
import useGameStore from '../../stores/useGameStore';
import { UI } from '../../lib/uiTheme';

const BossBanner = () => {
  const boss = useGameStore((s) => s.boss);
  const mobs = useGameStore((s) => s.mobs);
  if (!boss) return null;

  const live = mobs[boss.id];
  const hp = live ? live.hp : boss.hp;
  const maxHp = (live ? live.maxHp : boss.maxHp) || 1;
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));

  return (
    <div style={{
      position: 'absolute', top: 78, left: '50%', transform: 'translateX(-50%)',
      width: 420, maxWidth: '80vw', ...UI.panel, borderColor: `${UI.bad}88`,
      padding: '8px 16px', textAlign: 'center', pointerEvents: 'none', fontFamily: UI.fontBody, zIndex: 40
    }}>
      <div style={{ fontFamily: UI.fontTitle, fontWeight: 800, color: '#ff7a3c', letterSpacing: '0.06em', fontSize: '1rem', textShadow: '0 0 12px #ff7a3c55' }}>
        ☠ {boss.name}
      </div>
      <div style={{
        position: 'relative', height: 16, marginTop: 5, borderRadius: 4, overflow: 'hidden',
        background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0,0,0,0.7)'
      }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #7a1f1f, #ff5a3c)', transition: 'width 0.2s' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#fff', textShadow: '0 1px 2px #000' }}>
          {Math.max(0, Math.round(hp))} / {maxHp}
        </div>
      </div>
    </div>
  );
};

export default BossBanner;
