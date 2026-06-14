import { create } from 'zustand';
import { io } from 'socket.io-client';
import audioManager from '../systems/AudioManager';

const MAX_MESSAGES = 80;
const MAX_NOTIFICATIONS = 5;
const BASIC_ATTACK_COOLDOWN_MS = 500;

// The character we're playing, remembered across socket reconnects so we can
// transparently re-enter the world without a manual re-select.
let activeCharacterId = null;

const baseSessionState = {
  players: {},
  mobs: {},
  items: {},
  npcs: {},
  myCharacter: null,
  messages: [],
  notifications: [],
  lastCombatAction: null,
  floatingTexts: [],
  attackStamps: {},
  attackKinds: {},
  controlPoints: {},
  questDefinitions: {},
  skillBook: {},
  // Depth-system config (hydrated from world:state; never hardcode balance numbers).
  subclassDefs: {},
  skillUnlocks: { 1: 1, 2: 2, 3: 4, 4: 10 },
  attrPerPoint: {},
  levelCap: 30,
  gearTierReq: {},
  basicAttackReadyAt: 0,
  selectedTargetId: null,
  dyingMobs: {},
  activeShop: null,
  isShopOpen: false,
  isCharSheetOpen: false,
  activeInterior: null,
  boss: null,
  factionBuff: null,
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

  addFloatingText: (position, text, color, scale = 1) => {
    if (!position) return;
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    set((state) => ({
      floatingTexts: [...state.floatingTexts, { id, position: [position[0], position[1], position[2]], text, color, scale, born: Date.now() }].slice(-50)
    }));
    setTimeout(() => {
      set((state) => ({ floatingTexts: state.floatingTexts.filter((f) => f.id !== id) }));
    }, 1000);
  },

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
      isShopOpen: false,
      activeShop: null,
      activeDialog: null
    });
  },

  connect: () => {
    if (get().socket) return;

    const socket = io('http://localhost:3001');
    // Store the socket SYNCHRONOUSLY so a second invocation (React StrictMode
    // double-invokes effects in dev) hits the guard above instead of opening a
    // second socket — otherwise the character is selected on one socket and
    // actions go out on the other (server has no player for it).
    set({ socket });

    socket.on('connect', () => {
      set({ isConnected: true, socket, myId: socket.id });
      // Resume after a dropped connection: re-select the active character so the
      // server re-adds us to the world (otherwise we'd be stuck out-of-world).
      if (activeCharacterId) {
        socket.emit('character:select', { characterId: activeCharacterId }, (res) => {
          if (res?.success) set({ authStage: 'game' });
        });
      }
    });

    socket.on('disconnect', () => {
      audioManager.stopBGM();
      // Keep auth/session so the 'connect' handler can transparently resume;
      // just clear live world entities and mark disconnected.
      set({
        isConnected: false,
        players: {},
        mobs: {},
        items: {},
        npcs: {},
        floatingTexts: [],
        dyingMobs: {}
      });
    });

    socket.on('world:state', ({ controlPoints = {}, quests = {}, skills = {}, boss = null, factionBuff = null, subclasses = {}, skillUnlocks = {}, attrPerPoint = {}, levelCap = 30, gearTierReq = {} }) => {
      set({
        controlPoints,
        questDefinitions: quests,
        skillBook: skills,
        boss,
        factionBuff,
        subclassDefs: subclasses,
        skillUnlocks: (skillUnlocks && Object.keys(skillUnlocks).length) ? skillUnlocks : { 1: 1, 2: 2, 3: 4, 4: 10 },
        attrPerPoint,
        levelCap,
        gearTierReq
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

    socket.on('mob:damage', ({ mobId, newHp, damage, isCrit }) => {
      const mob = get().mobs[mobId];
      if (mob && damage) {
        get().addFloatingText(mob.position, isCrit ? `${damage}!` : `${damage}`, isCrit ? '#ffd23f' : '#ffca8a', isCrit ? 1.6 : 1);
        audioManager.playSFX('hit');
      }
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

    socket.on('player:levelup', ({ id, level, stats, unspentPoints, attributes }) => {
      set((state) => {
        const players = { ...state.players };
        if (players[id]) {
          players[id] = {
            ...players[id],
            stats,
            ...(unspentPoints != null ? { unspentPoints } : {}),
            ...(attributes ? { attributes } : {})
          };
        }

        const notifications = [...state.notifications];
        if (state.myId === id) {
          audioManager.playSFX('levelUp');
          notifications.push({
            id: `${Date.now()}-levelup`,
            message: unspentPoints != null
              ? `¡Nivel ${level}! +1 punto de atributo (C) — ${unspentPoints} sin gastar.`
              : `Nivel ${level}. Tus atributos han mejorado.`,
            tone: 'success'
          });
        }

        const name = players[id]?.name || 'Unknown';
        return {
          players,
          myCharacter: state.myId === id && state.myCharacter
            ? { ...state.myCharacter, stats, ...(unspentPoints != null ? { unspentPoints } : {}), ...(attributes ? { attributes } : {}) }
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

    socket.on('player:attrUpdate', ({ id, attributes, unspentPoints, stats }) => {
      set((state) => {
        const players = { ...state.players };
        if (players[id]) {
          players[id] = { ...players[id], attributes, unspentPoints, ...(stats ? { stats } : {}) };
        }
        return {
          players,
          myCharacter: state.myId === id && state.myCharacter
            ? { ...state.myCharacter, attributes, unspentPoints, ...(stats ? { stats } : {}) }
            : state.myCharacter
        };
      });
    });

    socket.on('subclass:changed', ({ subclass, name }) => {
      get().pushNotification(`Especialización: ${name || subclass}`, 'success');
    });

    socket.on('quest:advanced', ({ completed }) => {
      if (completed) get().pushNotification('Capítulo completado', 'success');
    });

    socket.on('quest:flag', ({ flag }) => {
      if (flag === 'subclassUnlocked') get().pushNotification('¡Especialización desbloqueada! Visita al Maestro de Armas.', 'success');
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

    socket.on('player:damage', ({ targetId, newHp, damage, isCrit }) => {
      const target = get().players[targetId];
      if (target && damage) {
        get().addFloatingText(target.position, isCrit ? `${damage}!` : `${damage}`, targetId === get().myId ? '#ff6b6b' : (isCrit ? '#ffd23f' : '#ffd36b'), isCrit ? 1.5 : 1);
      }
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
      // Stored OUTSIDE the players map (which gets fully replaced by players:update
      // and would otherwise wipe this immediately, killing the attack animation).
      set((state) => ({
        attackStamps: { ...state.attackStamps, [id]: Date.now() },
        attackKinds: { ...state.attackKinds, [id]: 'basic' }
      }));
      if (id === get().myId) audioManager.playSFX('attack');
    });

    socket.on('player:skillUsed', ({ id, skill, type }) => {
      set((state) => ({
        attackStamps: { ...state.attackStamps, [id]: Date.now() },
        attackKinds: { ...state.attackKinds, [id]: type || 'basic' }
      }));
      if (id === get().myId) get().pushNotification(`${skill}`, 'info');
    });

    socket.on('player:targetSet', ({ targetId }) => {
      set({ selectedTargetId: targetId || null });
    });

    socket.on('mob:death', ({ mobId, position, type }) => {
      const id = `${mobId}`;
      set((state) => ({ dyingMobs: { ...state.dyingMobs, [id]: { id, position, type, born: Date.now() } } }));
      setTimeout(() => {
        set((state) => {
          const next = { ...state.dyingMobs };
          delete next[id];
          return { dyingMobs: next };
        });
      }, 650);
      if (get().selectedTargetId === mobId) set({ selectedTargetId: null });
    });

    socket.on('shop:state', (shop) => {
      set({ activeShop: shop, isShopOpen: true, isMapOpen: false, isInventoryOpen: false, isSystemMenuOpen: false, activeDialog: null });
    });

    socket.on('boss:spawn', (boss) => {
      set({ boss });
      get().pushNotification('¡El Coloso de la Forja ha despertado!', 'danger');
    });

    socket.on('boss:defeated', ({ factionBuff }) => {
      set({ boss: null, factionBuff: factionBuff || null });
      get().pushNotification('¡El Coloso de la Forja ha caido!', 'success');
    });

    socket.on('boss:despawn', () => {
      set({ boss: null });
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
          // NOTE: BGM disabled. music_main.ogg is a ~1s stub clip; looping it
          // produced an annoying continuous repeating sound. Re-enable only with
          // a real (long) CC0 music track, ideally behind a settings toggle.
          // audioManager.playBGM('bgm_main');
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
          activeCharacterId = characterId;
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
      isSystemMenuOpen: false,
      isCharSheetOpen: false
    }));
  },

  toggleInventory: () => {
    set((state) => ({
      isInventoryOpen: !state.isInventoryOpen,
      isMapOpen: false,
      isSystemMenuOpen: false,
      isCharSheetOpen: false
    }));
  },

  toggleSystemMenu: () => {
    set((state) => ({
      isSystemMenuOpen: !state.isSystemMenuOpen,
      isMapOpen: false,
      isInventoryOpen: false,
      isCharSheetOpen: false
    }));
  },

  toggleCharSheet: () => {
    set((state) => ({
      isCharSheetOpen: !state.isCharSheetOpen,
      isMapOpen: false,
      isInventoryOpen: false,
      isSystemMenuOpen: false
    }));
  },

  spendAttribute: (attr) => {
    const { socket } = get();
    if (socket) socket.emit('attr:spend', { attr });
  },

  respecAttributes: () => {
    const { socket } = get();
    if (socket) socket.emit('attr:respec');
  },

  chooseSubclass: (subKey, respec = false) => {
    const { socket } = get();
    if (socket) socket.emit('subclass:choose', { subKey, respec });
  },

  enterBuilding: (interior) => {
    set({ activeInterior: interior, isMapOpen: false, isInventoryOpen: false, isSystemMenuOpen: false, isCharSheetOpen: false });
  },

  exitBuilding: () => {
    set({ activeInterior: null, isShopOpen: false, activeShop: null, activeDialog: null });
  },

  talkToNPC: (npcId) => {
    const { socket } = get();
    if (socket) socket.emit('player:talk', npcId);
  },

  closeDialog: () => {
    set({ activeDialog: null });
  },

  rest: () => {
    const { socket } = get();
    if (socket) socket.emit('player:rest');
  },

  pray: () => {
    const { socket } = get();
    if (socket) socket.emit('shrine:pray');
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
    if (socket) { socket.emit('player:pickup', itemId); audioManager.playSFX('pickup'); }
  },

  useItem: (index) => {
    const { socket } = get();
    if (socket) socket.emit('player:useItem', index);
  },

  equipItem: (index) => {
    const { socket } = get();
    if (socket) socket.emit('player:equip', index);
  },

  unequipItem: (slot) => {
    const { socket } = get();
    if (socket) socket.emit('player:unequip', slot);
  },

  buyItem: (itemCode, qty = 1) => {
    const { socket, activeShop } = get();
    if (socket) socket.emit('shop:buy', { itemCode, qty, merchantId: activeShop?.merchantId });
  },

  sellItem: (index) => {
    const { socket, activeShop } = get();
    if (socket) socket.emit('shop:sell', { index, merchantId: activeShop?.merchantId });
  },

  openShop: (npcId) => {
    const { socket } = get();
    if (socket) socket.emit('shop:open', npcId);
  },

  closeShop: () => {
    set({ isShopOpen: false, activeShop: null });
  },

  setTarget: (targetId) => {
    const { socket, selectedTargetId } = get();
    if (selectedTargetId === targetId) return;
    set({ selectedTargetId: targetId });
    if (socket) socket.emit('player:setTarget', targetId);
  },

  clearTarget: () => {
    const { socket } = get();
    set({ selectedTargetId: null });
    if (socket) socket.emit('player:setTarget', null);
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
    activeCharacterId = null; // intentional logout: don't auto-resume
    const { socket } = get();
    if (socket) socket.disconnect();
    // Drop the socket ref so the login screen's connect() can open a fresh one
    // (manual disconnect disables socket.io auto-reconnect).
    set({ socket: null, isConnected: false });
  }
}));

if (typeof window !== 'undefined') window.__game = useGameStore;

export default useGameStore;
