import React, { useState, useEffect, useRef } from 'react';
import useGameStore from '../stores/useGameStore';

const FACTION_COLORS = {
  'sun': '#FFD700',
  'shadow': '#9370DB',
  'nature': '#32CD32',
  'system': '#00CED1'
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
      bottom: '20px',
      left: '20px',
      width: '400px',
      height: '300px',
      display: 'flex',
      flexDirection: 'column',
      pointerEvents: 'none',
      fontFamily: '"Cinzel", serif',
      zIndex: 80
    }}>
      <div style={{
        flex: 1,
        background: 'linear-gradient(to top, rgba(10,10,10,0.95), rgba(10,10,10,0.5))',
        borderRadius: '4px 4px 0 0',
        border: '1px solid rgba(85, 85, 85, 0.5)',
        borderBottom: 'none',
        padding: '15px',
        overflowY: 'auto',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        scrollbarWidth: 'thin',
        scrollbarColor: '#c5a059 #222',
        maskImage: 'linear-gradient(to bottom, transparent, black 10%)'
      }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ fontSize: '0.95rem', color: '#ddd', textShadow: '1px 1px 2px black', lineHeight: '1.4' }}>
            <span style={{ color: FACTION_COLORS[msg.faction] || '#aaa', fontWeight: 'bold', marginRight: '8px' }}>
              {msg.faction === 'system' ? '❖ SISTEMA' : `[${msg.playerName}]`} 
            </span>
            <span style={{ fontFamily: '"Segoe UI", sans-serif', color: msg.faction === 'system' ? '#00CED1' : '#fff' }}>
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
          placeholder="Presiona [Enter] para hablar..."
          style={{
            flex: 1,
            padding: '12px 15px',
            background: 'rgba(5, 5, 5, 0.95)',
            border: '1px solid #555',
            borderTop: '1px solid rgba(85,85,85,0.3)',
            color: '#e0e0e0',
            borderRadius: '0 0 4px 4px',
            outline: 'none',
            fontFamily: '"Segoe UI", sans-serif',
            fontSize: '0.95rem',
            transition: 'all 0.2s',
            boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.5)'
          }}
          onFocus={(e) => { e.target.style.borderColor = '#c5a059'; e.target.style.background = 'rgba(10,10,10,1)'; }}
          onBlur={(e) => { e.target.style.borderColor = '#555'; e.target.style.background = 'rgba(5,5,5,0.95)'; }}
        />
      </form>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #222; }
        ::-webkit-scrollbar-thumb { background: #c5a059; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #e0b060; }
      `}</style>
    </div>
  );
};

export default Chat;
