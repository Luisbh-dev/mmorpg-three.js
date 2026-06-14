import React, { useState, useEffect, useRef } from 'react';
import useGameStore from '../stores/useGameStore';
import { UI } from '../lib/uiTheme';

const FACTION_COLORS = {
  'sun': '#f4c95d',
  'shadow': '#b3a5ff',
  'nature': '#7ad88f',
  'system': UI.goldBright
};

const Chat = () => {
  const [text, setText] = useState('');
  const { messages, sendMessage } = useGameStore();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Enter' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      sendMessage(text);
      setText('');
      inputRef.current?.blur(); 
    }
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '18px',
      left: '18px',
      width: '360px',
      height: '230px',
      display: 'flex',
      flexDirection: 'column',
      pointerEvents: 'none',
      fontFamily: UI.fontBody,
      zIndex: 80
    }}>
      <div style={{
        flex: 1,
        background: 'linear-gradient(to top, rgba(12,10,8,0.85), rgba(12,10,8,0.25))',
        borderRadius: '6px 6px 0 0',
        border: '1px solid rgba(197,160,89,0.22)',
        borderBottom: 'none',
        padding: '12px',
        overflowY: 'auto',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        scrollbarWidth: 'thin',
        scrollbarColor: '#6e5a32 transparent',
        maskImage: 'linear-gradient(to bottom, transparent, black 12%)'
      }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ fontSize: '0.86rem', color: UI.ink, textShadow: '0 1px 2px #000', lineHeight: '1.35' }}>
            <span style={{ color: FACTION_COLORS[msg.faction] || UI.inkDim, fontWeight: 700, marginRight: '7px' }}>
              {msg.faction === 'system' ? '❖ Sistema' : `${msg.playerName}`}
            </span>
            <span style={{ color: msg.faction === 'system' ? UI.goldBright : '#f0ead9' }}>
              {msg.text}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ pointerEvents: 'auto', width: '100%', display: 'flex' }}>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pulsa [Enter] para hablar…"
          style={{
            flex: 1,
            padding: '10px 13px',
            background: 'rgba(8,7,5,0.92)',
            border: '1px solid rgba(197,160,89,0.25)',
            color: UI.ink,
            borderRadius: '0 0 6px 6px',
            outline: 'none',
            fontFamily: UI.fontBody,
            fontSize: '0.88rem',
            boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.5)'
          }}
          onFocus={(e) => { e.target.style.borderColor = UI.gold; e.target.style.background = 'rgba(14,11,8,1)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(197,160,89,0.25)'; e.target.style.background = 'rgba(8,7,5,0.92)'; }}
        />
      </form>
    </div>
  );
};

export default Chat;
