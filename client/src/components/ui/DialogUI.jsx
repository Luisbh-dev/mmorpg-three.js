import React from 'react';
import useGameStore from '../../stores/useGameStore';

const DialogUI = () => {
  const { activeDialog, closeDialog, acceptQuest, completeQuest } = useGameStore();

  if (!activeDialog) return null;

  const handleOption = (option) => {
    if (option.action === 'close') {
      closeDialog();
    } else if (option.action === 'accept_quest') {
      acceptQuest(option.questId);
      // Close dialog immediately
      closeDialog();
    } else if (option.action === 'complete_quest') {
      completeQuest(option.questId);
      closeDialog();
    }
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '150px', // Above HUD
      left: '50%',
      transform: 'translateX(-50%)',
      width: '600px',
      background: 'rgba(15, 15, 15, 0.95)',
      border: '2px solid #c5a059',
      borderRadius: '4px',
      padding: '20px',
      boxShadow: '0 0 50px rgba(0,0,0,0.8)',
      fontFamily: '"Cinzel", serif',
      color: '#e0e0e0',
      zIndex: 70
    }}>
      <h2 style={{ 
        margin: '0 0 10px 0', 
        color: '#c5a059', 
        borderBottom: '1px solid #555', 
        paddingBottom: '5px',
        textTransform: 'uppercase'
      }}>
        {activeDialog.npcName}
      </h2>
      
      <div style={{ 
        fontSize: '1.1rem', 
        lineHeight: '1.6', 
        marginBottom: '20px', 
        minHeight: '80px',
        fontFamily: '"Segoe UI", sans-serif'
      }}>
        {activeDialog.text.split('\n').map((line, i) => (
          <p key={i} style={{ margin: '0 0 10px 0' }}>{line}</p>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        {activeDialog.options && activeDialog.options.map((opt, i) => (
          <button 
            key={i}
            onClick={() => handleOption(opt)}
            style={{
              padding: '10px 20px',
              background: opt.action === 'accept_quest' ? 'linear-gradient(to bottom, #2a2a2a, #111)' : 'transparent',
              border: '1px solid #c5a059',
              color: '#c5a059',
              fontFamily: 'inherit',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => {
               e.target.style.background = '#c5a059';
               e.target.style.color = '#000';
            }}
            onMouseOut={e => {
               e.target.style.background = opt.action === 'accept_quest' ? 'linear-gradient(to bottom, #2a2a2a, #111)' : 'transparent';
               e.target.style.color = '#c5a059';
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DialogUI;
