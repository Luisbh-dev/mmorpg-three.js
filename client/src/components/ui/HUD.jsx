import React from 'react';
import useGameStore from '../../stores/useGameStore';

const HUD = () => {
  const { myCharacter, players, myId } = useGameStore();
  
  if (!myCharacter || !players[myId]) return null;
  
  const myStats = players[myId].stats;
  const myGold = players[myId].gold || 0;
  const cooldowns = players[myId].cooldowns || {};
  const quests = players[myId].quests || {};

  const getCooldownOverlay = (slot, cooldownTime) => {
    const lastUsed = cooldowns[slot] || 0;
    const remaining = Math.max(0, cooldownTime - (Date.now() - lastUsed));
    
    if (remaining <= 0) return null;

    const percent = (remaining / cooldownTime) * 100;
    return (
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, width: '100%', 
        height: `${percent}%`,
        background: 'rgba(0, 0, 0, 0.8)',
        transition: 'height 0.1s linear',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        color: '#fff', fontSize: '0.9rem', fontWeight: 'bold',
        textShadow: '0 0 5px black'
      }}>
        {(remaining / 1000).toFixed(1)}
      </div>
    );
  };

  const SKILL_INFO = {
    'Paladin': { name: 'Escudo', cooldown: 5000 },
    'Cleric': { name: 'Curar', cooldown: 8000 },
    'Rogue': { name: 'Dash', cooldown: 4000 },
    'Druid': { name: 'HoT', cooldown: 6000 },
    'Hunter': { name: 'Disparo', cooldown: 3000 },
    'Necromancer': { name: 'Drenar', cooldown: 5000 }
  };
  
  const classSkill = SKILL_INFO[myCharacter.charClass] || { name: 'Skill', cooldown: 5000 };

  const getQuestTitle = (id) => {
    if (id === 'quest_wolf') return 'Amenaza de Lobos';
    if (id === 'quest_skeleton') return 'Huesos Inquietos';
    if (id === 'quest_bandit') return 'Bandidos en el Camino';
    return 'Misión Desconocida';
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      fontFamily: '"Cinzel", serif',
      color: '#e0e0e0'
    }}>
      {/* Crosshair */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: '20px', height: '20px',
        transform: 'translate(-50%, -50%)',
        opacity: 0.8
      }}>
        <div style={{ position: 'absolute', top: 9, left: 0, width: 20, height: 2, background: 'white', boxShadow: '0 0 5px black' }} />
        <div style={{ position: 'absolute', top: 0, left: 9, width: 2, height: 20, background: 'white', boxShadow: '0 0 5px black' }} />
      </div>

      {/* Character Info Frame */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        width: '280px',
        background: 'rgba(10, 10, 10, 0.85)',
        border: '2px solid #555',
        borderRadius: '4px',
        padding: '15px',
        boxShadow: '0 0 20px rgba(0,0,0,0.8)',
        borderImage: 'linear-gradient(to bottom, #c5a059, #555) 1'
      }}>
        {/* Ornate header decoration */}
        <div style={{ width: '100%', height: '2px', background: 'linear-gradient(90deg, transparent, #c5a059, transparent)', marginBottom: '10px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#c5a059', textTransform: 'uppercase' }}>
            {myCharacter.name}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
            Lvl {myStats.level || 1}
          </div>
        </div>
        
        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '10px', fontStyle: 'italic' }}>
          {myCharacter.charClass} • {myCharacter.faction === 'sun' ? 'Orden del Sol' : myCharacter.faction === 'shadow' ? 'Pacto Sombra' : 'Alianza Natural'}
        </div>

        {/* HP Bar Frame */}
        <div style={{ position: 'relative', height: '20px', background: '#111', border: '1px solid #333', marginBottom: '8px' }}>
          <div style={{
            width: `${(myStats.hp / myStats.maxHp) * 100}%`,
            background: 'linear-gradient(to right, #8b0000, #ff0000)',
            height: '100%',
            transition: 'width 0.2s ease-out',
            boxShadow: '0 0 10px #ff0000 inset'
          }} />
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            fontSize: '0.7rem', textShadow: '1px 1px 2px black', zIndex: 2
          }}>
            {Math.max(0, myStats.hp)} / {myStats.maxHp} HP
          </div>
        </div>

        {/* XP Bar Frame */}
        <div style={{ position: 'relative', height: '8px', background: '#111', border: '1px solid #333' }}>
          <div style={{
            width: `${(myStats.xp / (myStats.maxXp || 100)) * 100}%`,
            background: 'linear-gradient(to right, #4a148c, #9c27b0)',
            height: '100%',
            transition: 'width 0.5s'
          }} />
        </div>
        
        {/* Gold */}
        <div style={{ 
          marginTop: '12px', 
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px',
          color: '#FFD700', textShadow: '0 0 5px rgba(255, 215, 0, 0.5)'
        }}>
          <span style={{ fontSize: '1.1rem' }}>{myGold}</span>
          <div style={{ width: '16px', height: '16px', background: '#FFD700', borderRadius: '50%', border: '2px solid #B8860B', boxShadow: 'inset -2px -2px 5px rgba(0,0,0,0.5)' }} />
        </div>
      </div>

      {/* Quest Tracker (Right Side) */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '240px', // Left of minimap
        width: '250px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {Object.entries(quests).filter(([_, q]) => !q.completed).map(([id, quest]) => (
          <div key={id} style={{
            background: 'rgba(0, 0, 0, 0.6)',
            borderLeft: '2px solid #c5a059',
            padding: '10px',
            color: '#ddd'
          }}>
            <div style={{ color: '#c5a059', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '5px' }}>
              {getQuestTitle(id)}
            </div>
            <div style={{ fontSize: '0.8rem' }}>
              Progreso: {quest.progress} / 3
            </div>
          </div>
        ))}
      </div>

      {/* Skill Bar (Bottom Center) */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        padding: '10px 20px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
        alignItems: 'flex-end'
      }}>
        {/* Slot 1: Attack */}
        <SkillSlot slot="1" icon="⚔️" />

        {/* Slot 2: Class Skill (Q) */}
        <SkillSlot slot="Q" name={classSkill.name} overlay={getCooldownOverlay(2, classSkill.cooldown)} isSpecial />

        {/* Other Slots */}
        {[3, 4, 5].map((slot) => (
          <SkillSlot key={slot} slot={slot} />
        ))}
      </div>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
      `}</style>
    </div>
  );
};

const SkillSlot = ({ slot, icon, name, overlay, isSpecial }) => (
  <div style={{
    width: '60px', height: '60px',
    background: 'rgba(20, 20, 20, 0.9)',
    border: isSpecial ? '2px solid #9370DB' : '2px solid #555',
    borderRadius: '4px',
    position: 'relative',
    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
    boxShadow: isSpecial ? '0 0 15px rgba(147, 112, 219, 0.3)' : '0 0 5px rgba(0,0,0,0.5)',
    overflow: 'hidden'
  }}>
    <span style={{ 
      position: 'absolute', top: '2px', left: '4px', 
      fontSize: '0.7rem', color: '#aaa', fontWeight: 'bold' 
    }}>{slot}</span>
    
    {icon && <span style={{ fontSize: '1.8rem', filter: 'drop-shadow(0 0 5px black)' }}>{icon}</span>}
    {name && <span style={{ fontSize: '0.7rem', textAlign: 'center', color: isSpecial ? '#e0e0e0' : '#aaa', padding: '0 2px' }}>{name}</span>}
    
    {overlay}
  </div>
);

export default HUD;
