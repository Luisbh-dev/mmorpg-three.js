import { create } from 'zustand';
import { io } from 'socket.io-client';
import audioManager from '../systems/AudioManager';

const MAX_MESSAGES = 80;
const MAX_NOTIFICATIONS = 5;
const BASIC_ATTACK_COOLDOWN_MS = 500;

const baseSessionState = {
  players: {},
  mobs: {},
  items: {},
  npcs: {},
  myCharacter: null,
  messages: [],
  notifications: [],
  lastCombatAction: null,
  controlPoints: {},
  questDefinitions: {},
  skillBook: {},
  basicAttackReadyAt: 0,
  isMapOpen: false,
  isInventoryOpen: false,
  isSystemMenuOpen: false,
  activeDialog: null,
  authStage: 'login',
  user: null,
  userCharacters: []
};

const useGameStore = create((set, get) => ({
  socket: null,
  isConnected: false,
  myId: null,
  ...baseSessionState,

  pushNotification: (message, tone = 'info') => {
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          message,
          tone
        }
      ].slice(-MAX_NOTIFICATIONS)
    }));
  },

  dismissNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id)
    }));
  },

  setAuthStage: (authStage) => {
    set({ authStage });
  },

  closeAllPanels: () => {
    set({
      isMapOpen: false,
      isInventoryOpen: false,
      isSystemMenuOpen: false,
      activeDialog: null
    });
  },

  connect: () => {
    if (get().socket) return;

    const socket = io('http://localhost:3001');

    socket.on('connect', () => {
      set({ isConnected: true, socket, myId: socket.id });
    });

    socket.on('disconnect', () => {
      audioManager.stopBGM();
      set({
        socket: null,
        isConnected: false,
        myId: null,
        ...baseSessionState
      });
    });

    socket.on('world:state', ({ controlPoints = {}, quests = {}, skills = {} }) => {
      set({
        controlPoints,
        questDefinitions: quests,
        skillBook: skills
      });
    });

    socket.on('controlPoints:update', (controlPoints) => {
      set({ controlPoints });
    });

    socket.on('players:update', (players) => {
      set((state) => {
        const myCharacter = state.myId && players[state.myId]
          ? { ...state.myCharacter, ...players[state.myId] }
          : state.myCharacter;

        return {
          players,
          myCharacter
        };
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
      set({
        activeDialog: dialogData,
        isMapOpen: false,
        isInventoryOpen: false,
        isSystemMenuOpen: false
      });

      setTimeout(() => {
        if (document.pointerLockElement) document.exitPointerLock();
      }, 10);
    });

    socket.on('mob:damage', ({ mobId, newHp }) => {
      set((state) => {
        const mobs = { ...state.mobs };
        if (mobs[mobId]) {
          mobs[mobId] = { ...mobs[mobId], hp: newHp };
        }
        return { mobs };
      });
    });

    socket.on('player:exp', ({ id, xp, maxXp, level }) => {
      set((state) => {
        const players = { ...state.players };
        if (players[id]) {
          players[id] = {
            ...players[id],
            stats: { ...players[id].stats, xp, maxXp, level }
          };
        }

        const myCharacter = state.myId === id && state.myCharacter
          ? {
              ...state.myCharacter,
              stats: { ...state.myCharacter.stats, xp, maxXp, level }
            }
          : state.myCharacter;

        return { players, myCharacter };
      });
    });

    socket.on('player:levelup', ({ id, level, stats }) => {
      set((state) => {
        const players = { ...state.players };
        if (players[id]) {
          players[id] = { ...players[id], stats };
        }

        const notifications = [...state.notifications];
        if (state.myId === id) {
          audioManager.playSFX('levelUp');
          notifications.push({
            id: `${Date.now()}-levelup`,
            message: `Nivel ${level}. Tus atributos han mejorado.`,
            tone: 'success'
          });
        }

        const name = players[id]?.name || 'Unknown';
        return {
          players,
          myCharacter: state.myId === id && state.myCharacter
            ? { ...state.myCharacter, stats }
            : state.myCharacter,
          messages: [
            ...state.messages,
            {
              id: Date.now(),
              playerName: 'SYSTEM',
              text: `${name} reached Level ${level}!`,
              faction: 'system'
            }
          ].slice(-MAX_MESSAGES),
          notifications: notifications.slice(-MAX_NOTIFICATIONS)
        };
      });
    });

    socket.on('player:joined', (character) => {
      if (get().authStage === 'game') {
        set({ myCharacter: character });
      }
    });

    socket.on('chat:message', (message) => {
      set((state) => ({
        messages: [...state.messages, message].slice(-MAX_MESSAGES)
      }));
    });

    socket.on('player:damage', ({ targetId, newHp, damage }) => {
      set((state) => {
        const players = { ...state.players };
        if (players[targetId]) {
          players[targetId] = {
            ...players[targetId],
            stats: { ...players[targetId].stats, hp: newHp }
          };
        }

        const notifications = state.myId === targetId
          ? [
              ...state.notifications,
              {
                id: `${Date.now()}-damage`,
                message: `Has recibido ${damage} de dano.`,
                tone: 'danger'
              }
            ].slice(-MAX_NOTIFICATIONS)
          : state.notifications;

        return {
          players,
          notifications,
          myCharacter: state.myId === targetId && state.myCharacter
            ? {
                ...state.myCharacter,
                stats: { ...state.myCharacter.stats, hp: newHp }
              }
            : state.myCharacter
        };
      });
    });

    socket.on('player:respawn', ({ id, position, hp }) => {
      set((state) => {
        const players = { ...state.players };
        if (players[id]) {
          players[id] = {
            ...players[id],
            position,
            stats: { ...players[id].stats, hp }
          };
        }

        const notifications = state.myId === id
          ? [
              ...state.notifications,
              {
                id: `${Date.now()}-respawn`,
                message: 'Has resucitado en tu campamento.',
                tone: 'warning'
              }
            ].slice(-MAX_NOTIFICATIONS)
          : state.notifications;

        return {
          players,
          notifications,
          myCharacter: state.myId === id && state.myCharacter
            ? {
                ...state.myCharacter,
                position,
                stats: { ...state.myCharacter.stats, hp }
              }
            : state.myCharacter
        };
      });
    });

    socket.on('player:attacked', ({ id }) => {
      set((state) => {
        const players = { ...state.players };
        if (players[id]) {
          players[id] = { ...players[id], lastAttack: Date.now() };
        }

        if (id === state.myId) {
          audioManager.playSFX('attack');
        }

        return { players };
      });
    });

    socket.on('player:skillUsed', ({ id, skill }) => {
      if (id !== get().myId) return;
      get().pushNotification(`Has usado ${skill}.`, 'info');
    });
  },

  attack: () => {
    const { socket } = get();
    if (!socket) return;

    const now = Date.now();
    const { basicAttackReadyAt = 0 } = get();
    if (now < basicAttackReadyAt) return;

    set({
      basicAttackReadyAt: now + BASIC_ATTACK_COOLDOWN_MS,
      lastCombatAction: {
        id: now,
        type: 'attack',
        duration: BASIC_ATTACK_COOLDOWN_MS
      }
    });

    socket.emit('player:attack');
  },

  sendMessage: (text) => {
    const { socket } = get();
    if (socket && text.trim()) {
      socket.emit('chat:message', text.trim());
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
    if (!socket || !user) return Promise.resolve({ success: false, error: 'No connection' });

    return new Promise((resolve) => {
      socket.emit('character:create', { ...data, userId: user.id }, (response) => {
        if (response.success && response.character) {
          set((state) => ({
            userCharacters: [...state.userCharacters, response.character]
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
          set({
            authStage: 'game',
            isMapOpen: false,
            isInventoryOpen: false,
            isSystemMenuOpen: false,
            activeDialog: null
          });
        }
        resolve(response);
      });
    });
  },

  deleteCharacter: (characterId) => {
    const { socket, user } = get();
    if (!socket || !user) return Promise.resolve({ success: false, error: 'No connection' });

    return new Promise((resolve) => {
      socket.emit('character:delete', { characterId, userId: user.id }, (response) => {
        if (response.success) {
          set((state) => ({
            userCharacters: state.userCharacters.filter((character) => character.id !== characterId)
          }));
        }
        resolve(response);
      });
    });
  },

  toggleMap: () => {
    set((state) => ({
      isMapOpen: !state.isMapOpen,
      isInventoryOpen: false,
      isSystemMenuOpen: false
    }));
  },

  toggleInventory: () => {
    set((state) => ({
      isInventoryOpen: !state.isInventoryOpen,
      isMapOpen: false,
      isSystemMenuOpen: false
    }));
  },

  toggleSystemMenu: () => {
    set((state) => ({
      isSystemMenuOpen: !state.isSystemMenuOpen,
      isMapOpen: false,
      isInventoryOpen: false
    }));
  },

  talkToNPC: (npcId) => {
    const { socket } = get();
    if (socket) socket.emit('player:talk', npcId);
  },

  closeDialog: () => {
    set({ activeDialog: null });
  },

  acceptQuest: (questId) => {
    const { socket } = get();
    if (socket) socket.emit('quest:accept', questId);
  },

  completeQuest: (questId) => {
    const { socket } = get();
    if (socket) socket.emit('quest:complete', questId);
  },

  pickupItem: (itemId) => {
    const { socket } = get();
    if (socket) socket.emit('player:pickup', itemId);
  },

  useItem: (index) => {
    const { socket } = get();
    if (socket) socket.emit('player:useItem', index);
  },

  castSkill: (slot) => {
    const { socket } = get();
    if (socket) socket.emit('player:skill', slot);
  },

  movePlayer: (position, rotation) => {
    const { socket, myId, players } = get();
    if (!socket || !myId) return;

    if (players[myId]) {
      set((state) => ({
        players: {
          ...state.players,
          [myId]: {
            ...state.players[myId],
            position,
            rotation: rotation || state.players[myId].rotation
          }
        }
      }));
    }

    socket.emit('player:move', { position, rotation });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) socket.disconnect();
  }
}));

export default useGameStore;
