import { create } from 'zustand'
import { io } from 'socket.io-client'

const useGameStore = create((set, get) => ({
  socket: null,
  isConnected: false,
  players: {},
  mobs: {},
  items: {}, // Dropped items
  npcs: {},
  myId: null,
  myCharacter: null, // Stores local player info after join
  messages: [],
  isMapOpen: false,
  isInventoryOpen: false,
  isSystemMenuOpen: false,
  activeDialog: null, // { npcId, text, options }

  // Auth State
  user: null,
  userCharacters: [],
  authStage: 'login', // login, char_select, create, game

  connect: () => {
    const socket = io('http://localhost:3001');
    
    socket.on('connect', () => {
      set({ isConnected: true, socket, myId: socket.id });
      console.log('Connected to server:', socket.id);
    });

    socket.on('disconnect', () => {
      set({ 
        isConnected: false, socket: null, 
        myCharacter: null, messages: [], mobs: {}, items: {},
        authStage: 'login', user: null
      });
      console.log('Disconnected');
    });

    socket.on('players:update', (players) => {
      set((state) => {
        const newState = { players };
        if (state.myId && players[state.myId]) {
           newState.myCharacter = { ...state.myCharacter, ...players[state.myId] };
        }
        return newState;
      });
    });

    socket.on('items:update', (items) => {
      set({ items });
    });

    socket.on('mobs:update', (mobs) => {
      set({ mobs });
    });

    socket.on('npcs:update', (npcs) => {
      set({ npcs });
    });

    socket.on('dialog:open', (dialogData) => {
      set({ activeDialog: dialogData });
      // Delay exit lock to ensure state propagates and prevent SystemMenu from opening
      setTimeout(() => {
        if (document.pointerLockElement) document.exitPointerLock();
      }, 10);
    });

    socket.on('mob:damage', ({ mobId, newHp }) => {
      set((state) => {
        const mobs = { ...state.mobs };
        if (mobs[mobId]) {
          mobs[mobId].hp = newHp;
        }
        return { mobs };
      });
    });

    socket.on('player:exp', ({ id, xp, maxXp, level }) => {
      set((state) => {
        const players = { ...state.players };
        if (players[id]) {
          players[id].stats.xp = xp;
          players[id].stats.maxXp = maxXp;
          players[id].stats.level = level;
        }
        if (state.myId === id) {
           return { players, myCharacter: { ...state.myCharacter, stats: { ...state.myCharacter.stats, xp, maxXp, level } } };
        }
        return { players };
      });
    });

    socket.on('player:levelup', ({ id, level, stats }) => {
       set((state) => {
        const players = { ...state.players };
        if (players[id]) {
          players[id].stats = stats;
        }
        const name = players[id]?.name || 'Unknown';
        const msg = { id: Date.now(), playerName: 'SYSTEM', text: `${name} reached Level ${level}!`, faction: 'system' };
        
        if (state.myId === id) {
           audioManager.playSFX('levelUp');
           return { players, messages: [...state.messages, msg], myCharacter: { ...state.myCharacter, stats } };
        }
        return { players, messages: [...state.messages, msg] };
      });
    });

    socket.on('player:joined', (character) => {
      // We handle this via char selection now, but update store anyway
      if (get().authStage === 'game') {
         set({ myCharacter: character });
      }
    });

    socket.on('chat:message', (message) => {
      set((state) => ({ messages: [...state.messages, message].slice(-50) }));
    });

    socket.on('player:damage', ({ targetId, attackerId, damage, newHp }) => {
      set((state) => {
        const players = { ...state.players };
        if (players[targetId]) {
          players[targetId].stats.hp = newHp;
        }
        return { players };
      });
    });

    socket.on('player:respawn', ({ id, position, hp }) => {
      set((state) => {
        const players = { ...state.players };
        if (players[id]) {
          players[id].position = position;
          players[id].stats.hp = hp;
        }
        return { players };
      });
    });

    socket.on('player:attacked', ({ id }) => {
      set((state) => {
        const players = { ...state.players };
        if (players[id]) {
          players[id].lastAttack = Date.now();
          if (id === state.myId) audioManager.playSFX('attack'); // Play attack sound
        }
        return { players };
      });
    });
  },

  attack: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('player:attack');
      // Optimistic sound? Better wait for server ack or event?
      // player:attacked event handles it for everyone.
    }
  },

  sendMessage: (text) => {
    const { socket } = get();
    if (socket) {
      socket.emit('chat:message', text);
    }
  },

  login: (username, password) => {
    const { socket } = get();
    if (!socket) return Promise.resolve({ success: false, error: 'No connection to server' });
    
    return new Promise((resolve) => {
      socket.emit('auth:login', { username, password }, (response) => {
        if (response.success) {
          set({ 
            user: { id: response.userId, username }, 
            userCharacters: response.characters,
            authStage: 'char_select' 
          });
          // Start music on login success (interaction surely happened)
          audioManager.playBGM('bgm_main');
        }
        resolve(response);
      });
    });
  },

  register: (username, password) => {
    const { socket } = get();
    if (!socket) return Promise.resolve({ success: false, error: 'No connection to server' });

    return new Promise((resolve) => {
      socket.emit('auth:register', { username, password }, (response) => {
        resolve(response);
      });
    });
  },

  createCharacter: (data) => {
    const { socket, user } = get();
    if (!socket) return Promise.resolve({ success: false, error: 'No connection' });

    return new Promise((resolve) => {
      socket.emit('character:create', { ...data, userId: user.id }, (response) => {
        if (response.success && response.character) {
           // Add new char to local list
           set(state => ({
             userCharacters: [...state.userCharacters, response.character],
             // Don't switch authStage here, component will do it or we can do it here
           }));
        }
        resolve(response);
      });
    });
  },

  selectCharacter: (characterId) => {
    const { socket } = get();
    if (!socket) return Promise.resolve({ success: false, error: 'No connection' });

    return new Promise((resolve) => {
      socket.emit('character:select', { characterId }, (response) => {
        if (response.success) {
          set({ authStage: 'game' });
        }
        resolve(response);
      });
    });
  },

  deleteCharacter: (characterId) => {
    const { socket, user } = get();
    if (!socket) return Promise.resolve({ success: false, error: 'No connection' });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve({ success: false, error: 'Server timeout' }), 5000);
      
      socket.emit('character:delete', { characterId, userId: user.id }, (response) => {
        clearTimeout(timeout);
        if (response.success) {
          set(state => ({
            userCharacters: state.userCharacters.filter(c => c.id !== characterId)
          }));
        }
        resolve(response);
      });
    });
  },

  joinGame: (name, faction, charClass) => {
    const { socket } = get();
    if (!socket) return Promise.resolve({ success: false, error: 'No connection to server' });
    if (socket) {
      socket.emit('player:join', { name, faction, charClass });
    }
  },

  toggleMap: () => {
    set((state) => ({ isMapOpen: !state.isMapOpen }));
  },

  toggleInventory: () => {
    set((state) => ({ isInventoryOpen: !state.isInventoryOpen }));
  },

  toggleSystemMenu: () => {
    set((state) => ({ isSystemMenuOpen: !state.isSystemMenuOpen }));
  },

  talkToNPC: (npcId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('player:talk', npcId);
    }
  },

  closeDialog: () => {
    set({ activeDialog: null });
  },

  acceptQuest: (questId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('quest:accept', questId);
    }
  },

  completeQuest: (questId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('quest:complete', questId);
    }
  },

  pickupItem: (itemId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('player:pickup', itemId);
    }
  },

  useItem: (index) => {
    const { socket } = get();
    if (socket) {
      socket.emit('player:useItem', index);
    }
  },

  castSkill: (slot) => {
    const { socket } = get();
    if (socket) {
      socket.emit('player:skill', slot);
    }
  },

  movePlayer: (position, rotation) => {
    const { socket, myId, players } = get();
    if (socket && myId) {
      // Optimistic update
      const newPlayers = { ...players };
      if (newPlayers[myId]) {
        newPlayers[myId].position = position;
        if (rotation) newPlayers[myId].rotation = rotation;
        set({ players: newPlayers });
      }
      
      socket.emit('player:move', { position, rotation });
    }
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) socket.disconnect();
  }
}))

export default useGameStore;
