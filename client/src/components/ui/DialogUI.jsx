import React from 'react';
import useGameStore from '../../stores/useGameStore';
import { UI } from '../../lib/uiTheme';

const DialogUI = () => {
  const { activeDialog, closeDialog, acceptQuest, completeQuest, openShop, rest, chooseSubclass } = useGameStore();

  if (!activeDialog) return null;

  const handleOption = (option) => {
    if (option.action === 'open_shop') {
      openShop(option.merchantId);
      closeDialog();
      return;
    }
    if (option.action === 'rest') {
      rest();
      closeDialog();
      return;
    }
    if (option.action === 'choose_subclass') {
      chooseSubclass(option.subKey, option.respec);
      closeDialog();
      return;
    }
    if (option.action === 'accept_quest') acceptQuest(option.questId);
    else if (option.action === 'complete_quest') completeQuest(option.questId);
    closeDialog();
  };

  const isPrimary = (opt) => opt.action === 'accept_quest' || opt.action === 'complete_quest' || opt.action === 'open_shop' || opt.action === 'rest' || opt.action === 'choose_subclass';

  return (
    <div data-ui-root="true" style={{
      position: 'absolute', bottom: 150, left: '50%', transform: 'translateX(-50%)',
      width: 600, maxWidth: '92vw', ...UI.panel, borderRadius: 10, padding: 22,
      fontFamily: UI.fontBody, color: UI.ink, zIndex: 70, pointerEvents: 'auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ color: UI.goldBright, fontSize: '1.2rem' }}>❖</span>
        <h2 style={{
          margin: 0, color: UI.goldBright, fontFamily: UI.fontTitle, fontWeight: 700,
          fontSize: '1.15rem', letterSpacing: '0.04em', textTransform: 'uppercase'
        }}>{activeDialog.npcName}</h2>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${UI.gold}66, transparent)` }} />
      </div>

      <div style={{ fontSize: '1rem', lineHeight: 1.6, marginBottom: 20, minHeight: 64, color: '#f0ead9' }}>
        {activeDialog.text.split('\n').map((line, i) => (
          <p key={i} style={{ margin: '0 0 8px 0' }}>{line}</p>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        {activeDialog.options && activeDialog.options.map((opt, i) => {
          const primary = isPrimary(opt);
          return (
            <button
              key={i}
              onClick={() => handleOption(opt)}
              style={{
                padding: '9px 20px',
                background: primary ? `linear-gradient(180deg, ${UI.goldBright}, ${UI.goldDim})` : 'rgba(0,0,0,0.35)',
                border: `1px solid ${UI.gold}`,
                color: primary ? '#1a140c' : UI.goldBright,
                fontFamily: UI.fontTitle, fontWeight: 700, fontSize: '0.9rem',
                borderRadius: 5, cursor: 'pointer', transition: 'all 0.15s'
              }}
              onMouseOver={(e) => { if (!primary) { e.currentTarget.style.background = UI.gold; e.currentTarget.style.color = '#1a140c'; } }}
              onMouseOut={(e) => { if (!primary) { e.currentTarget.style.background = 'rgba(0,0,0,0.35)'; e.currentTarget.style.color = UI.goldBright; } }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DialogUI;
