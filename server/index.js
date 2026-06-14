import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import db from './database.js';
import { FACTION_SPAWNS as DEFAULT_FACTION_SPAWNS, LANDMARKS, MAP_RADIUS, NPCS, POINTS_OF_INTEREST, WAR_ZONE_RADIUS, WORLD_BOUNDARY as WORLD_LIMIT, getRealmAt, getLandmarkById } from '../client/src/lib/gameData.js';
import { ITEM_DEFS, RARITY_COLOR, SHOP_STOCK, SHOP_STOCKS, rollGearDrop, sellValueOf } from './loot.js';

// Normalize the code item catalogue into the ITEMS_DB shape (source of truth).
const CODE_ITEMS = {};
Object.entries(ITEM_DEFS).forEach(([code, def]) => {
  CODE_ITEMS[code] = {
    itemCode: code,
    name: def.name,
    itemType: def.itemType,
    effect: def.effect || null,
    value: def.value || 0,
    color: def.color || RARITY_COLOR[def.rarity] || '#ffffff',
    slot: def.slot || null,
    rarity: def.rarity || 'common',
    stats: def.stats || {},
    price: def.price || 0,
    sellValue: sellValueOf(def)
  };
});

const EQUIP_SLOTS = ['weapon', 'head', 'chest', 'legs', 'trinket'];

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all for dev
    methods: ["GET", "POST"]
  }
});

const players = {};
const WORLD_BOUNDARY = WORLD_LIMIT;
const MOBS_LIMIT = 120;
const BOSS_SPAWN_INTERVAL = 180000; // 3 min
const BOSS_LEASH_MS = 240000;
const BOSS_BUFF_MS = 120000;
let activeBossId = null;
let bossSpawnedAt = 0;
let factionBuff = null; // { faction, expires }
const CONTROL_POINT_RADIUS = 18;
const CONTROL_POINT_CAPTURE_RATE = 14;
const CONTROL_POINT_DAMAGE_BONUS = 0.05;
const BASIC_ATTACK_COOLDOWN_MS = 500;
const AUTOSAVE_INTERVAL = 15000;
const SAFE_LANDMARK_TYPES = new Set(['capital', 'city', 'town', 'village', 'outpost']);

// --- Class resources + 3-skill kits (static config, never persisted) ---
const RESOURCE_DB = {
  Paladin: { type: 'fe', max: 100, regen: 6 },
  Cleric: { type: 'mana', max: 140, regen: 9 },
  Rogue: { type: 'energia', max: 100, regen: 14 },
  Druid: { type: 'mana', max: 120, regen: 8 },
  Hunter: { type: 'foco', max: 100, regen: 10 },
  Necromancer: { type: 'mana', max: 130, regen: 7 }
};
const DEFAULT_RESOURCE = { type: 'mana', max: 100, regen: 8 };

const SKILL_KITS = {
  Paladin: {
    1: { slot: 1, key: '1', name: 'Golpe de Escudo', type: 'damage', cost: 20, cooldown: 3000, value: 26, range: 3 },
    2: { slot: 2, key: '2', name: 'Luz Sagrada', type: 'heal', cost: 30, cooldown: 5000, value: 40 },
    3: { slot: 3, key: '3', name: 'Juicio Divino', type: 'aoe', cost: 55, cooldown: 9000, value: 38, radius: 7 }
  },
  Cleric: {
    1: { slot: 1, key: '1', name: 'Castigo', type: 'projectile', cost: 18, cooldown: 2200, value: 24, range: 13 },
    2: { slot: 2, key: '2', name: 'Gran Curacion', type: 'heal', cost: 55, cooldown: 8000, value: 70 },
    3: { slot: 3, key: '3', name: 'Nova Sagrada', type: 'aoe', cost: 65, cooldown: 10000, value: 34, radius: 8 }
  },
  Rogue: {
    1: { slot: 1, key: '1', name: 'Acuchillar', type: 'damage', cost: 15, cooldown: 1400, value: 22, range: 2.6 },
    2: { slot: 2, key: '2', name: 'Paso Sombrio', type: 'dash', cost: 25, cooldown: 4000, value: 8 },
    3: { slot: 3, key: '3', name: 'Emboscada', type: 'damage', cost: 45, cooldown: 8000, value: 60, range: 3 }
  },
  Druid: {
    1: { slot: 1, key: '1', name: 'Espina', type: 'projectile', cost: 16, cooldown: 1800, value: 21, range: 12 },
    2: { slot: 2, key: '2', name: 'Rejuvenecer', type: 'heal', cost: 35, cooldown: 6000, value: 48 },
    3: { slot: 3, key: '3', name: 'Enredadera Venenosa', type: 'dot', cost: 45, cooldown: 9000, value: 60, range: 12, duration: 5000 }
  },
  Hunter: {
    1: { slot: 1, key: '1', name: 'Disparo Rapido', type: 'projectile', cost: 12, cooldown: 1100, value: 20, range: 15 },
    2: { slot: 2, key: '2', name: 'Disparo Perforante', type: 'projectile', cost: 28, cooldown: 4500, value: 38, range: 15 },
    3: { slot: 3, key: '3', name: 'Lluvia de Flechas', type: 'aoe', cost: 50, cooldown: 9000, value: 34, radius: 8 }
  },
  Necromancer: {
    1: { slot: 1, key: '1', name: 'Toque Necrotico', type: 'projectile', cost: 16, cooldown: 1800, value: 21, range: 11 },
    2: { slot: 2, key: '2', name: 'Drenar Vida', type: 'drain', cost: 30, cooldown: 5000, value: 28 },
    3: { slot: 3, key: '3', name: 'Plaga', type: 'dot', cost: 48, cooldown: 9000, value: 72, range: 11, duration: 6000 }
  }
};

function makeResource(charClass) {
  const r = RESOURCE_DB[charClass] || DEFAULT_RESOURCE;
  return { type: r.type, value: r.max, max: r.max, regen: r.regen };
}

const activeDots = [];

const CRIT_DB = {
  Paladin: { chance: 0.08, mult: 1.5 },
  Cleric: { chance: 0.06, mult: 1.5 },
  Rogue: { chance: 0.25, mult: 2.0 },
  Druid: { chance: 0.10, mult: 1.6 },
  Hunter: { chance: 0.20, mult: 1.8 },
  Necromancer: { chance: 0.12, mult: 1.7 }
};

function rollCrit(player) {
  // Phase 1+: prefer the player's derived crit (attributes/subclass) when present.
  const base = CRIT_DB[player.charClass] || { chance: 0.05, mult: 1.5 };
  const chance = (player.stats && typeof player.stats.critChance === 'number') ? player.stats.critChance : base.chance;
  const mult = (player.stats && typeof player.stats.critMult === 'number') ? player.stats.critMult : base.mult;
  return Math.random() < chance ? { isCrit: true, mult } : { isCrit: false, mult: 1 };
}

// --- Depth systems config (code-driven, never persisted) ---
const LEVEL_CAP = 30;
// Per allocated attribute point: STR->dmg, VIT->maxHp, DEX->crit chance, SPI->resource regen.
const ATTR_PER_POINT = { str: { dmg: 2 }, vit: { maxHp: 12 }, dex: { critChance: 0.004 }, spi: { regen: 0.4 } };
const ATTR_KEYS = ['str', 'vit', 'dex', 'spi'];
const ATTR_RESPEC_COST = 200;
// Flatter XP curve with a hard cap (old 100*1.5^(l-1) exploded). XP needed to go FROM level l TO l+1.
const XP_TABLE = {
  1: 120, 2: 240, 3: 400, 4: 600, 5: 850, 6: 1150, 7: 1500, 8: 1900, 9: 2350, 10: 2850,
  11: 3400, 12: 4000, 13: 4650, 14: 5350, 15: 6100, 16: 6900, 17: 7750, 18: 8650, 19: 9600, 20: 10600,
  21: 11650, 22: 12750, 23: 13900, 24: 15100, 25: 16350, 26: 17650, 27: 19000, 28: 20400, 29: 21850, 30: Infinity
};
// Level at which each action-bar slot unlocks (slot 4 also requires a subclass).
const SKILL_UNLOCK = { 1: 1, 2: 2, 3: 4, 4: 10 };
// Minimum level to equip an item of each rarity.
const GEAR_TIER_REQ = { common: 1, uncommon: 5, rare: 10, epic: 16, legendary: 22 };
// Subclasses: gated by flags.subclassUnlocked AND this floor; chosen at the barracks trainer.
const SUBCLASS_MIN_LEVEL = 10;
const SUBCLASS_RESPEC_COST = 250;
// 2 subclasses per class. skill4 follows the SKILL_KITS shape (slot 4).
// passive keys: bonusArmor, bonusDmgPct, lifesteal, critChanceAdd, critMultAdd, regenMul, regenAdd.
// statMods: hpMul, dmgMul, rangeAdd. (Guardian's "Muro de Escudos" ships as a self-shield
// heal in v1 — the buff system only models offensive dmgMul, not damage reduction.)
const SUBCLASS_DB = {
  Paladin: {
    guardian: {
      name: 'Guardián', role: 'Tanque', desc: 'Muralla viviente que absorbe el castigo por su grupo.',
      skill4: { slot: 4, key: '4', name: 'Muro de Escudos', type: 'buff', cost: 30, cooldown: 14000, defMul: 0.45, healOnCast: 40, duration: 6000 },
      passive: { bonusArmor: 10, lifesteal: 0.05 }, statMods: { hpMul: 1.15, dmgMul: 0.95 },
      passiveText: '+10 Armadura, +5% Robo de vida, +15% Vida'
    },
    templario: {
      name: 'Templario', role: 'Daño', desc: 'Cruzado ofensivo que castiga con luz sagrada.',
      skill4: { slot: 4, key: '4', name: 'Martillo Radiante', type: 'aoe', cost: 45, cooldown: 8000, value: 46, radius: 6 },
      passive: { bonusDmgPct: 0.12, critChanceAdd: 0.05 }, statMods: { dmgMul: 1.1 },
      passiveText: '+12% Daño, +5% Crítico'
    }
  },
  Cleric: {
    oraculo: {
      name: 'Oráculo', role: 'Soporte', desc: 'Sanador supremo que sostiene la línea de batalla.',
      skill4: { slot: 4, key: '4', name: 'Palabra de Vida', type: 'heal', cost: 40, cooldown: 7000, value: 95 },
      passive: { regenMul: 1.3, bonusArmor: 4 }, statMods: { hpMul: 1.05 },
      passiveText: '+30% Regeneración, +4 Armadura'
    },
    inquisidor: {
      name: 'Inquisidor', role: 'Daño', desc: 'Castigador que purga al enemigo con fuego sagrado.',
      skill4: { slot: 4, key: '4', name: 'Llama Purificadora', type: 'projectile', cost: 30, cooldown: 4000, value: 44, range: 14 },
      passive: { bonusDmgPct: 0.15, critMultAdd: 0.3 }, statMods: { dmgMul: 1.15, rangeAdd: 1 },
      passiveText: '+15% Daño, +0.3 Mult. crítico'
    }
  },
  Rogue: {
    asesino: {
      name: 'Asesino', role: 'Daño explosivo', desc: 'Ejecuta objetivos con golpes críticos devastadores.',
      skill4: { slot: 4, key: '4', name: 'Golpe Mortal', type: 'damage', cost: 40, cooldown: 7000, value: 80, range: 3 },
      passive: { critChanceAdd: 0.10, critMultAdd: 0.4 }, statMods: { dmgMul: 1.08 },
      passiveText: '+10% Crítico, +0.4 Mult. crítico'
    },
    forajido: {
      name: 'Forajido', role: 'Control', desc: 'Veneno y sustento para guerras de desgaste.',
      skill4: { slot: 4, key: '4', name: 'Daga Envenenada', type: 'dot', cost: 35, cooldown: 6000, value: 70, range: 4, duration: 5000 },
      passive: { lifesteal: 0.10, regenAdd: 4 }, statMods: { hpMul: 1.1 },
      passiveText: '+10% Robo de vida, +4 Regen, +10% Vida'
    }
  },
  Druid: {
    guardabosques: {
      name: 'Guardabosques', role: 'Daño/Control', desc: 'Desata la furia del bosque sobre grupos enemigos.',
      skill4: { slot: 4, key: '4', name: 'Tormenta de Espinas', type: 'aoe', cost: 50, cooldown: 9000, value: 40, radius: 8 },
      passive: { bonusDmgPct: 0.12, critChanceAdd: 0.04 }, statMods: { dmgMul: 1.1, rangeAdd: 1 },
      passiveText: '+12% Daño, +4% Crítico'
    },
    ursino: {
      name: 'Ursino', role: 'Bruiser', desc: 'Adopta la forma del oso: resistente y feroz.',
      skill4: { slot: 4, key: '4', name: 'Zarpazo Feroz', type: 'damage', cost: 25, cooldown: 4000, value: 42, range: 3 },
      passive: { bonusArmor: 8, lifesteal: 0.08 }, statMods: { hpMul: 1.2, dmgMul: 0.95 },
      passiveText: '+8 Armadura, +8% Robo de vida, +20% Vida'
    }
  },
  Hunter: {
    maestro_bestias: {
      name: 'Maestro de Bestias', role: 'Sustento/Daño', desc: 'Lucha junto a la manada con vigor incansable.',
      skill4: { slot: 4, key: '4', name: 'Llamada de la Manada', type: 'buff', cost: 35, cooldown: 16000, value: 1.3, duration: 8000 },
      passive: { lifesteal: 0.08, regenMul: 1.25 }, statMods: { hpMul: 1.1 },
      passiveText: '+8% Robo de vida, +25% Regeneración, +10% Vida'
    },
    tirador: {
      name: 'Tirador', role: 'Daño a distancia', desc: 'Francotirador letal de un solo disparo.',
      skill4: { slot: 4, key: '4', name: 'Disparo Mortal', type: 'projectile', cost: 45, cooldown: 7000, value: 78, range: 18 },
      passive: { bonusDmgPct: 0.12, critChanceAdd: 0.08, critMultAdd: 0.2 }, statMods: { dmgMul: 1.05, rangeAdd: 2 },
      passiveText: '+12% Daño, +8% Crítico, +2 Alcance'
    }
  },
  Necromancer: {
    nigromante_sangre: {
      name: 'Nigromante de Sangre', role: 'Daño/Sustento', desc: 'Drena la vida del enemigo para fortalecerse.',
      skill4: { slot: 4, key: '4', name: 'Cosecha Sangrienta', type: 'drain', cost: 40, cooldown: 6000, value: 50, range: 12 },
      passive: { lifesteal: 0.10, bonusDmgPct: 0.08 }, statMods: { hpMul: 1.1 },
      passiveText: '+10% Robo de vida, +8% Daño, +10% Vida'
    },
    pestilente: {
      name: 'Pestilente', role: 'Control/Veneno', desc: 'Siembra plagas que pudren a multitudes.',
      skill4: { slot: 4, key: '4', name: 'Nube Putrefacta', type: 'dot', cost: 50, cooldown: 9000, value: 96, range: 12, duration: 6000 },
      passive: { bonusDmgPct: 0.15, regenMul: 1.2 }, statMods: { dmgMul: 1.12, rangeAdd: 1 },
      passiveText: '+15% Daño, +20% Regeneración'
    }
  }
};

function getBuffMultiplier(player) {
  if (!player.buffs) return 1;
  const now = Date.now();
  let m = 1;
  Object.keys(player.buffs).forEach((k) => {
    if (player.buffs[k].expires > now) m *= (player.buffs[k].dmgMul || 1);
    else delete player.buffs[k];
  });
  return m;
}

// Multiplier on incoming damage from active defensive buffs (<1 = mitigation).
function getDamageTakenMultiplier(player) {
  if (!player.buffs) return 1;
  const now = Date.now();
  let m = 1;
  Object.keys(player.buffs).forEach((k) => {
    const b = player.buffs[k];
    if (b.expires > now && b.defMul != null) m *= b.defMul;
  });
  return m;
}

const controlPoints = {
  sunspire: {
    id: 'sunspire',
    name: 'Torre del Alba',
    position: [0, 1, -95],
    owner: null,
    progress: 0,
    contestingFaction: null
  },
  duskfall: {
    id: 'duskfall',
    name: 'Bastion del Crepusculo',
    position: [-82, 1, 48],
    owner: null,
    progress: 0,
    contestingFaction: null
  },
  wildroot: {
    id: 'wildroot',
    name: 'Raiz Primigenia',
    position: [82, 1, 48],
    owner: null,
    progress: 0,
    contestingFaction: null
  }
};

// --- Main campaign (linear questline routing the player city-to-city) ---
// Per-faction mob slots [m0 weak, m1 mid, m2 brute] + the two collectible tokens
// (gathered in ch3 from m1, ch5 from m2) + the signature gear reward.
const CAMPAIGN_MOBS = {
  nature: ['wolf', 'spider', 'treant'],
  sun: ['bandit', 'orc', 'bandit'],
  shadow: ['skeleton', 'specter', 'specter']
};
const CAMPAIGN_TOKENS = {
  nature: ['blight_sap', 'heartwood_core'],
  sun: ['orc_tusk', 'bandit_insignia'],
  shadow: ['essence_shadow', 'cursed_bone']
};
const CAMPAIGN_GEAR = { nature: 'gear_nature_totem', sun: 'gear_sun_blade', shadow: 'gear_shadow_focus' };

// Builds the 8-chapter chain for a faction. Settlement ids = `${faction}_${key}`,
// story envoy ids = `story_${faction}_${key}` (created in gameData.buildStoryNPCs).
function buildCampaign(faction) {
  const mobs = CAMPAIGN_MOBS[faction];
  const tok = CAMPAIGN_TOKENS[faction];
  const gear = CAMPAIGN_GEAR[faction];
  const sid = (k) => `${faction}_${k}`;
  const eid = (k) => `story_${faction}_${k}`;
  const id = (n) => `main_${faction}_ch${n}`;
  const mobName = (t) => (MOBS_DATA[t] && MOBS_DATA[t].name) || t;
  const itName = (c) => (ITEMS_DB[c] && ITEMS_DB[c].name) || c;

  return [
    { id: id(1), chain: 'main', faction, order: 1, level: 1, title: 'Raices Inquietas',
      description: 'Las bestias acechan a las afueras. Demuestra tu valía a la ciudad.',
      requires: null, giverNpc: eid('starter'), turnInNpc: eid('starter'),
      objectives: [
        { type: 'kill', mob: mobs[0], count: 6, label: `Abate ${mobName(mobs[0])} (6)` },
        { type: 'talk', npc: eid('starter'), label: 'Informa al Cronista' }
      ],
      rewards: { xp: 120, gold: 60 } },
    { id: id(2), chain: 'main', faction, order: 2, level: 2, title: 'Senda al Prado',
      description: 'Una emisaria te espera en la aldea vecina. Ponte en marcha.',
      requires: id(1), giverNpc: eid('starter'), turnInNpc: eid('village_a'),
      objectives: [{ type: 'visit', settlement: sid('village_a'), radius: 40, label: 'Viaja a la aldea' }],
      rewards: { xp: 130, gold: 40 } },
    { id: id(3), chain: 'main', faction, order: 3, level: 3, title: 'Plaga en la Aldea',
      description: 'La aldea sufre una infestación. Limpia la zona y reúne muestras.',
      requires: id(2), giverNpc: eid('village_a'), turnInNpc: eid('village_a'),
      objectives: [
        { type: 'kill', mob: mobs[1], count: 8, label: `Abate ${mobName(mobs[1])} (8)` },
        { type: 'collect', mob: mobs[1], item: tok[0], count: 5, dropChance: 0.5, label: `Reúne ${itName(tok[0])} (5)` }
      ],
      rewards: { xp: 200, gold: 80, item: 'leather_vest' } },
    { id: id(4), chain: 'main', faction, order: 4, level: 4, title: 'El Camino del Pueblo',
      description: 'Lleva las nuevas al pueblo, más adentro del reino.',
      requires: id(3), giverNpc: eid('village_a'), turnInNpc: eid('town_a'),
      objectives: [
        { type: 'visit', settlement: sid('town_a'), radius: 40, label: 'Viaja al pueblo' },
        { type: 'talk', npc: eid('town_a'), label: 'Habla con el Capitán' }
      ],
      rewards: { xp: 240, gold: 60 } },
    { id: id(5), chain: 'main', faction, order: 5, level: 6, title: 'Guardianes del Camino',
      description: 'Criaturas mayores bloquean las rutas. Rómpeles la línea.',
      requires: id(4), giverNpc: eid('town_a'), turnInNpc: eid('town_a'),
      objectives: [
        { type: 'kill', mob: mobs[2], count: 4, label: `Abate ${mobName(mobs[2])} (4)` },
        { type: 'collect', mob: mobs[2], item: tok[1], count: 3, dropChance: 0.6, label: `Reúne ${itName(tok[1])} (3)` }
      ],
      rewards: { xp: 380, gold: 120, item: gear } },
    { id: id(6), chain: 'main', faction, order: 6, level: 8, title: 'Hacia la Gran Ciudad',
      description: 'El consejo de la ciudad mayor requiere tu presencia.',
      requires: id(5), giverNpc: eid('town_a'), turnInNpc: eid('city2'),
      objectives: [{ type: 'visit', settlement: sid('city2'), radius: 44, label: 'Viaja a la ciudad' }],
      rewards: { xp: 420, gold: 100 } },
    { id: id(7), chain: 'main', faction, order: 7, level: 10, title: 'Frente Abierto',
      description: 'Limpia los flancos y avanza hacia la última ciudad antes de la capital.',
      requires: id(6), giverNpc: eid('city2'), turnInNpc: eid('city3'),
      objectives: [
        { type: 'kill', mob: mobs[1], count: 5, label: `Abate ${mobName(mobs[1])} (5)` },
        { type: 'kill', mob: mobs[0], count: 5, label: `Abate ${mobName(mobs[0])} (5)` },
        { type: 'visit', settlement: sid('city3'), radius: 44, label: 'Viaja a la ciudad fronteriza' }
      ],
      rewards: { xp: 560, gold: 160, item: 'steel_blade' } },
    { id: id(8), chain: 'main', faction, order: 8, level: 12, title: 'Audiencia en la Capital',
      description: 'El líder del reino te concederá audiencia. Has llegado lejos.',
      requires: id(7), giverNpc: eid('city3'), turnInNpc: eid('capital'),
      objectives: [
        { type: 'visit', settlement: sid('capital'), radius: 48, label: 'Llega a la capital' },
        { type: 'talk', npc: eid('capital'), label: 'Preséntate ante el Soberano' }
      ],
      rewards: { xp: 800, gold: 250, unlocks: 'subclassUnlocked' } }
  ];
}

// --- Quest state helpers (objectives shape, backward compatible with legacy) ---
// Per-player: player.quests[id] = { accepted, completed, objectives: [{progress}] }.
function getQuestObjectives(quest) {
  if (quest && Array.isArray(quest.objectives)) return quest.objectives;
  // Legacy single-kill quests synthesize one kill objective.
  return [{ type: 'kill', mob: quest.targetType, count: quest.targetCount || 1, label: quest.title }];
}
function objectiveTarget(obj) { return obj.count || 1; }
function initQuestState(quest) {
  return { accepted: true, completed: false, objectives: getQuestObjectives(quest).map(() => ({ progress: 0 })) };
}
function isQuestComplete(player, questId) {
  const quest = QUESTS_DB[questId];
  const state = player.quests && player.quests[questId];
  if (!quest || !state) return false;
  const objs = getQuestObjectives(quest);
  return objs.every((o, i) => (state.objectives?.[i]?.progress || 0) >= objectiveTarget(o));
}
// Upgrade a stored quests blob to the objectives shape (legacy {progress,completed}).
function loadQuestState(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  Object.entries(raw).forEach(([qid, st]) => {
    if (st && Array.isArray(st.objectives)) { out[qid] = st; return; }
    const quest = QUESTS_DB[qid];
    const objs = quest ? getQuestObjectives(quest) : [{}];
    const arr = objs.map((o, i) => ({ progress: i === 0 ? (st?.progress || 0) : 0 }));
    out[qid] = { accepted: true, completed: Boolean(st?.completed), objectives: arr };
  });
  return out;
}

function mainQuestsForFaction(faction) {
  return Object.values(QUESTS_DB)
    .filter((q) => q.chain === 'main' && q.faction === faction)
    .sort((a, b) => a.order - b.order);
}
function questOfferableAt(player, npcId) {
  return mainQuestsForFaction(player.faction).find((q) => q.giverNpc === npcId
    && !(player.quests && player.quests[q.id])
    && (!q.requires || (player.quests[q.requires] && player.quests[q.requires].completed)));
}
function questTurnInAt(player, npcId) {
  return mainQuestsForFaction(player.faction).find((q) => q.turnInNpc === npcId
    && player.quests && player.quests[q.id] && !player.quests[q.id].completed && isQuestComplete(player, q.id));
}
function questInProgressAt(player, npcId) {
  return mainQuestsForFaction(player.faction).find((q) => q.turnInNpc === npcId
    && player.quests && player.quests[q.id] && !player.quests[q.id].completed && !isQuestComplete(player, q.id));
}
function objectivesText(player, quest) {
  const state = player.quests && player.quests[quest.id];
  return getQuestObjectives(quest).map((o, i) => {
    const p = (state && state.objectives && state.objectives[i] && state.objectives[i].progress) || 0;
    const t = objectiveTarget(o);
    return `• ${o.label || o.type} [${p >= t ? '✓' : `${p}/${t}`}]`;
  }).join('\n');
}

// --- LOAD CONFIG FROM DB ---
let FACTION_SPAWNS = {};
let CLASS_STATS = {};
let MOBS_DATA = {};
let ITEMS_DB = {};
let SKILLS_DB = {};
let QUESTS_DB = {};

function loadConfig(attempt = 0) {
  FACTION_SPAWNS = {};
  CLASS_STATS = {};
  MOBS_DATA = {};
  ITEMS_DB = { ...CODE_ITEMS };
  SKILLS_DB = {};

  db.all('SELECT * FROM factions', (err, rows) => {
    if (rows) {
      rows.forEach(r => {
        FACTION_SPAWNS[r.id] = DEFAULT_FACTION_SPAWNS[r.id] || [r.spawn_x, r.spawn_y, r.spawn_z];
      });
      console.log('Loaded Factions:', Object.keys(FACTION_SPAWNS).length);
    }
  });

  db.all('SELECT * FROM classes', (err, rows) => {
    if (rows) {
      rows.forEach(r => {
        CLASS_STATS[r.name] = { hp: r.hp, dmg: r.dmg, range: r.range };
        // Full 3-skill kit from code; fall back to the legacy DB skill if unknown class.
        SKILLS_DB[r.name] = SKILL_KITS[r.name]
          || (r.skill_2_json ? { 2: { slot: 2, key: '2', ...JSON.parse(r.skill_2_json) } } : {});
      });
      console.log('Loaded Classes:', Object.keys(CLASS_STATS).length);
    }
  });

  db.all('SELECT * FROM mobs_data', (err, rows) => {
    if (rows) {
      rows.forEach(r => {
        MOBS_DATA[r.type] = { 
          hp: r.hp,
          dmg: r.dmg,
          xp: r.xp,
          speed: r.speed,
          range: r.range,
          zone: r.zone,
          name: r.name,
          role: r.role || 'melee',
          size: r.size || 1,
          elite: Boolean(r.elite),
          glow: r.glow || '#ffffff'
        };
      });
      console.log('Loaded Mobs Data:', Object.keys(MOBS_DATA).length);
    }
  });

  db.all('SELECT * FROM items_data', (err, rows) => {
    if (rows) {
      rows.forEach(r => {
        // Code item catalogue wins; only add legacy DB rows we don't define.
        if (!ITEMS_DB[r.type]) {
          ITEMS_DB[r.type] = {
            itemCode: r.type,
            name: r.name,
            itemType: r.item_type,
            effect: r.effect,
            value: r.value, color: r.color
          };
        }
      });
      console.log('Loaded Items Data:', Object.keys(ITEMS_DB).length);
    }
  });
  
  // Quests are manual for now in code structure above, but let's init empty
  // If we had a quests table:
  /*
  db.all('SELECT * FROM quests_data', (err, rows) => {
     // ...
  });
  */
  // For now use static fallback until DB populated or logic updated
  QUESTS_DB = {
    'quest_wolf': {
        id: 'quest_wolf',
        title: 'Amenaza de Lobos',
        description: 'Los lobos están atacando a nuestros recolectores. Acaba con 3 de ellos.',
        targetType: 'wolf',
        targetCount: 3,
        rewards: { xp: 100, gold: 50 }
    },
    'quest_skeleton': {
        id: 'quest_skeleton',
        title: 'Huesos Inquietos',
        description: 'El cementerio está revuelto. Destruye 3 Esqueletos.',
        targetType: 'skeleton',
        targetCount: 3,
        rewards: { xp: 120, gold: 60 }
    },
    'quest_bandit': {
        id: 'quest_bandit',
        title: 'Bandidos en el Camino',
        description: 'Los bandidos asaltan nuestras caravanas. Elimina a 3 de ellos.',
        targetType: 'bandit',
        targetCount: 3,
        rewards: { xp: 110, gold: 55 }
    }
  };

  // Merge the linear main campaign (8 chapters per faction) into QUESTS_DB.
  ['sun', 'shadow', 'nature'].forEach((faction) => {
    buildCampaign(faction).forEach((q) => { QUESTS_DB[q.id] = q; });
  });

  if (attempt < 5) {
    setTimeout(() => {
      if (!Object.keys(CLASS_STATS).length || !Object.keys(MOBS_DATA).length || !Object.keys(ITEMS_DB).length) {
        loadConfig(attempt + 1);
      }
    }, 300);
  }
}

loadConfig(); // Start loading

const mobs = {};
const items = {}; // Dropped items on the ground
const npcs = {}; // Quest givers and shops

function getXpForLevel(level) {
  return XP_TABLE[level] != null ? XP_TABLE[level] : Infinity;
}

function parseJSONSafe(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function distance2D(a, b) {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dz * dz);
}

function clampPosition(position) {
  return [
    Math.max(-WORLD_BOUNDARY, Math.min(WORLD_BOUNDARY, position[0])),
    position[1],
    Math.max(-WORLD_BOUNDARY, Math.min(WORLD_BOUNDARY, position[2]))
  ];
}

function sumEquippedStats(equipped) {
  const total = { bonusDmg: 0, bonusHp: 0, bonusArmor: 0, bonusRange: 0, lifesteal: 0 };
  if (!equipped) return total;
  EQUIP_SLOTS.forEach((slot) => {
    const item = equipped[slot];
    if (!item || !item.stats) return;
    Object.keys(total).forEach((k) => { if (item.stats[k]) total[k] += item.stats[k]; });
  });
  return total;
}

function normalizeAttributes(attr) {
  const out = { str: 0, vit: 0, dex: 0, spi: 0 };
  if (attr && typeof attr === 'object') {
    ATTR_KEYS.forEach((k) => { out[k] = Math.max(0, Math.floor(Number(attr[k]) || 0)); });
  }
  return out;
}

// Points owed = (level-1) total earned minus already-spent. Reconciles legacy
// characters (who earned no points) on next login, idempotently.
function deriveUnspent(level, attributes, storedUnspent) {
  const spent = ATTR_KEYS.reduce((s, k) => s + (attributes[k] || 0), 0);
  const earned = Math.max(0, (level || 1) - 1);
  const owed = Math.max(0, earned - spent);
  // Trust stored value only if it's not larger than what could be owed.
  const stored = Math.max(0, Math.floor(Number(storedUnspent) || 0));
  return Math.min(owed, Math.max(stored, owed));
}

function getSubclass(charClass, subclass) {
  if (!subclass) return null;
  const bucket = SUBCLASS_DB[charClass];
  return bucket ? (bucket[subclass] || null) : null;
}

// Stat order: base -> flat level growth -> attributes -> subclass statMods -> equipment.
// passiveDmgPct is returned (NOT folded into dmg); damage paths apply it once.
function buildCombatStats(charClass, level = 1, equipped = null, attributes = null, subclass = '') {
  const baseStats = CLASS_STATS[charClass] || { hp: 100, dmg: 10, range: 2 };
  const attr = normalizeAttributes(attributes);
  const lvl = Math.max(1, level);

  // Flat per-level growth (replaces compounding 1.1x).
  const hpStep = Math.max(1, Math.round(baseStats.hp * 0.06));
  const dmgStep = Math.max(1, Math.round(baseStats.dmg * 0.05));
  let maxHp = baseStats.hp + ((lvl - 1) * hpStep);
  let dmg = baseStats.dmg + ((lvl - 1) * dmgStep);
  let range = baseStats.range;

  // Attributes.
  maxHp += attr.vit * ATTR_PER_POINT.vit.maxHp;
  dmg += attr.str * ATTR_PER_POINT.str.dmg;
  const crit = CRIT_DB[charClass] || { chance: 0.05, mult: 1.5 };
  let critChance = crit.chance + (attr.dex * ATTR_PER_POINT.dex.critChance);
  let critMult = crit.mult;
  let regenAdd = attr.spi * ATTR_PER_POINT.spi.regen;
  let regenMul = 1;
  let passiveDmgPct = 0;
  let armorPassive = 0;
  let lifestealPassive = 0;

  // Subclass modifiers (statMods multiplicative; passive additive). SUBCLASS_DB
  // empty until Phase 2 -> no-op for unspecialized chars.
  const sub = getSubclass(charClass, subclass);
  if (sub) {
    if (sub.statMods) {
      if (sub.statMods.hpMul) maxHp = Math.round(maxHp * sub.statMods.hpMul);
      if (sub.statMods.dmgMul) dmg = Math.round(dmg * sub.statMods.dmgMul);
      if (sub.statMods.rangeAdd) range += sub.statMods.rangeAdd;
    }
    if (sub.passive) {
      passiveDmgPct = sub.passive.bonusDmgPct || 0;
      armorPassive = sub.passive.bonusArmor || 0;
      lifestealPassive = sub.passive.lifesteal || 0;
      if (sub.passive.critChanceAdd) critChance += sub.passive.critChanceAdd;
      if (sub.passive.critMultAdd) critMult += sub.passive.critMultAdd;
      if (sub.passive.regenAdd) regenAdd += sub.passive.regenAdd;
      if (sub.passive.regenMul) regenMul *= sub.passive.regenMul;
    }
  }

  const eq = sumEquippedStats(equipped);
  return {
    hp: maxHp + eq.bonusHp,
    maxHp: maxHp + eq.bonusHp,
    dmg: dmg + eq.bonusDmg,
    range: range + eq.bonusRange,
    armor: armorPassive + eq.bonusArmor,
    lifesteal: lifestealPassive + eq.lifesteal,
    critChance,
    critMult,
    regenAdd,
    regenMul,
    passiveDmgPct
  };
}

// Rebuild a player's stats from class/level/attributes/subclass/equipped, preserving HP ratio.
function recomputeStats(player) {
  const ratio = player.stats.maxHp > 0 ? player.stats.hp / player.stats.maxHp : 1;
  const rebuilt = buildCombatStats(player.charClass, player.stats.level || 1, player.equipped, player.attributes, player.subclass);
  player.stats.maxHp = rebuilt.maxHp;
  player.stats.dmg = rebuilt.dmg;
  player.stats.range = rebuilt.range;
  player.stats.armor = rebuilt.armor;
  player.stats.lifesteal = rebuilt.lifesteal;
  player.stats.critChance = rebuilt.critChance;
  player.stats.critMult = rebuilt.critMult;
  player.stats.passiveDmgPct = rebuilt.passiveDmgPct;
  player.stats.hp = Math.max(1, Math.min(rebuilt.maxHp, Math.round(rebuilt.maxHp * ratio)));
  // Resource regen = (class base + spirit/subclass add) * subclass mult.
  if (player.resource) {
    const baseRegen = player.baseRegen != null ? player.baseRegen : (RESOURCE_DB[player.charClass] || DEFAULT_RESOURCE).regen;
    player.resource.regen = (baseRegen + (rebuilt.regenAdd || 0)) * (rebuilt.regenMul || 1);
  }
}

// Build an inventory/equip item instance from an item code.
function makeItemInstance(code) {
  const def = ITEMS_DB[code] || CODE_ITEMS[code];
  if (!def) return null;
  return {
    id: uuidv4(),
    itemCode: code,
    itemType: def.itemType,
    name: def.name,
    effect: def.effect || null,
    value: def.value || 0,
    color: def.color,
    slot: def.slot || null,
    rarity: def.rarity || 'common',
    stats: def.stats || {}
  };
}

function getFactionLabel(faction) {
  if (faction === 'sun') return 'Orden del Sol';
  if (faction === 'shadow') return 'Pacto de la Sombra';
  if (faction === 'nature') return 'Alianza de la Naturaleza';
  return faction || 'Sin faccion';
}

function emitSystemMessage(text, target = io) {
  target.emit('chat:message', {
    id: uuidv4(),
    playerName: 'SISTEMA',
    text,
    timestamp: Date.now(),
    faction: 'system'
  });
}

function emitWorldState(target = io) {
  const boss = (activeBossId && mobs[activeBossId])
    ? { id: activeBossId, name: mobs[activeBossId].name, hp: mobs[activeBossId].hp, maxHp: mobs[activeBossId].maxHp, position: mobs[activeBossId].position }
    : null;
  target.emit('world:state', {
    controlPoints,
    quests: QUESTS_DB,
    skills: SKILLS_DB,
    resources: RESOURCE_DB,
    boss,
    factionBuff,
    // Depth-system config so the client never hardcodes balance numbers.
    subclasses: SUBCLASS_DB,
    skillUnlocks: SKILL_UNLOCK,
    attrPerPoint: ATTR_PER_POINT,
    levelCap: LEVEL_CAP,
    gearTierReq: GEAR_TIER_REQ
  });
}

function applySkillAoe(player, radius, baseValue) {
  const dmg = Math.max(1, Math.round(baseValue * getFactionDamageMultiplier(player.faction)));
  Object.values(mobs).forEach((m) => {
    if (distance2D(player.position, m.position) <= radius) applyDamageToMob(player, m.id, dmg);
  });
  Object.values(players).forEach((t) => {
    if (t.id !== player.id && t.faction !== player.faction && t.stats.hp > 0 && distance2D(player.position, t.position) <= radius) {
      applyDamageToPlayer(player.id, t, dmg);
    }
  });
}

function processDots() {
  const now = Date.now();
  for (let i = activeDots.length - 1; i >= 0; i -= 1) {
    const d = activeDots[i];
    if (now < d.nextAt) continue;
    d.nextAt = now + 1000;
    d.ticks -= 1;
    if (d.targetType === 'mob') {
      if (mobs[d.targetId]) {
        const attacker = players[d.attackerId] || { id: d.attackerId, faction: d.faction, stats: { xp: 0, maxXp: 1e9, level: 1 } };
        applyDamageToMob(attacker, d.targetId, d.perTick);
      } else {
        d.ticks = 0;
      }
    } else {
      const t = players[d.targetId];
      if (t && t.stats.hp > 0) applyDamageToPlayer(d.attackerId, t, d.perTick);
    }
    if (d.ticks <= 0) activeDots.splice(i, 1);
  }
}

function regenResources() {
  let changed = false;
  Object.values(players).forEach((p) => {
    if (!p.resource || p.stats.hp <= 0) return;
    const next = Math.min(p.resource.max, p.resource.value + p.resource.regen);
    if (next !== p.resource.value) { p.resource.value = next; changed = true; }
  });
  if (changed) io.emit('players:update', players);
}

function getFactionControlCount(faction) {
  return Object.values(controlPoints).filter((point) => point.owner === faction).length;
}

function getFactionDamageMultiplier(faction) {
  let m = 1 + (getFactionControlCount(faction) * CONTROL_POINT_DAMAGE_BONUS);
  if (factionBuff && factionBuff.faction === faction && Date.now() < factionBuff.expires) m += 0.15;
  return m;
}

function spawnWorldBoss() {
  if ((activeBossId && mobs[activeBossId]) || !Object.keys(players).length) return;
  const id = uuidv4();
  const pos = [0, 1, 50]; // war_arena
  mobs[id] = {
    id, type: 'world_boss', name: 'Coloso de la Forja', isBoss: true,
    hp: 4000, maxHp: 4000, dmg: 40, xpReward: 1500, speed: 0.1, range: 4,
    role: 'brute', size: 3.2, elite: true, glow: '#ff7a3c', level: 20,
    position: pos, rotation: 0, spawnPoint: [...pos], campId: null,
    aggroRange: 42, targetId: null, lastAttack: 0
  };
  activeBossId = id;
  bossSpawnedAt = Date.now();
  io.emit('mobs:update', mobs);
  io.emit('boss:spawn', { id, name: 'Coloso de la Forja', hp: 4000, maxHp: 4000, position: pos });
  emitSystemMessage('¡El Coloso de la Forja ha despertado en el Anfiteatro de Guerra! Reune a tu faccion.');
}

function onBossDefeated(attacker, mob) {
  activeBossId = null;
  if (attacker && attacker.faction) {
    factionBuff = { faction: attacker.faction, expires: Date.now() + BOSS_BUFF_MS };
  }
  spawnItem(mob.position, 'boss_relic_blade');
  spawnItem([mob.position[0] + 2, mob.position[1], mob.position[2]], 'gold');
  spawnItem([mob.position[0] - 2, mob.position[1], mob.position[2]], 'gold');
  spawnItem(mob.position, 'potion_hp_large');
  io.emit('boss:defeated', { faction: attacker?.faction || null, factionBuff });
  emitSystemMessage(`${getFactionLabel(attacker?.faction)} ha derrotado al Coloso de la Forja. +15% de dano para su faccion durante 2 minutos.`);
}

function savePlayer(socketId) {
  const player = players[socketId];
  if (!player?.dbId) return;

  db.run(
    `
      UPDATE characters
      SET hp = ?, max_hp = ?, level = ?, xp = ?, gold = ?,
          position_x = ?, position_y = ?, position_z = ?, rotation_y = ?, quests_json = ?, equipped = ?,
          subclass = ?, attributes = ?, unspent_points = ?, flags_json = ?
      WHERE id = ?
    `,
    [
      player.stats.hp,
      player.stats.maxHp,
      player.stats.level,
      player.stats.xp,
      player.gold || 0,
      player.position[0],
      player.position[1],
      player.position[2],
      player.rotation?.[1] || 0,
      JSON.stringify(player.quests || {}),
      JSON.stringify(player.equipped || {}),
      player.subclass || '',
      JSON.stringify(player.attributes || { str: 0, vit: 0, dex: 0, spi: 0 }),
      player.unspentPoints || 0,
      JSON.stringify(player.flags || {}),
      player.dbId
    ]
  );

  db.run(
    `
      INSERT INTO inventory (character_id, items)
      VALUES (?, ?)
      ON CONFLICT(character_id) DO UPDATE SET items = excluded.items
    `,
    [player.dbId, JSON.stringify(player.inventory || [])]
  );
}

function respawnPlayer(player) {
  const spawn = FACTION_SPAWNS[player.faction] || [0, 1, 0];
  player.position = [
    spawn[0] + (Math.random() * 4 - 2),
    spawn[1],
    spawn[2] + (Math.random() * 4 - 2)
  ];
  player.stats.hp = player.stats.maxHp;
  return player.position;
}

function getFactionSpawn(faction) {
  return FACTION_SPAWNS[faction] || [0, 1, 0];
}

function shouldRelocateToFactionSpawn(position, faction) {
  if (!position) return true;
  const [x = 0, , z = 0] = position;
  const distFromCenter = Math.sqrt((x * x) + (z * z));
  if (distFromCenter <= WAR_ZONE_RADIUS + 10) return true;
  return !isInsideSettlementSafety(position, 30);
}

function isInsideSettlementSafety(position, margin = 34) {
  return LANDMARKS.some((landmark) => {
    if (!SAFE_LANDMARK_TYPES.has(landmark.type)) return false;
    return distance2D(position, landmark.position) <= margin;
  });
}

function pickMobSpawnPosition(zone) {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    let pos = [0, 1, 0];

    if (zone === 'nature') {
      pos = [
        150 + (Math.random() * (MAP_RADIUS - 170)),
        1,
        30 + (Math.random() * (MAP_RADIUS - 40))
      ];
    } else if (zone === 'shadow') {
      pos = [
        -MAP_RADIUS + 35 + (Math.random() * 120),
        1,
        30 + (Math.random() * (MAP_RADIUS - 40))
      ];
    } else if (zone === 'sun') {
      pos = [
        -120 + (Math.random() * 240),
        1,
        -MAP_RADIUS + 35 + (Math.random() * 120)
      ];
    } else {
      pos = [
        (Math.random() - 0.5) * (WAR_ZONE_RADIUS * 1.6),
        1,
        (Math.random() - 0.5) * (WAR_ZONE_RADIUS * 1.6)
      ];
    }

    if (!isInsideSettlementSafety(pos)) {
      return pos;
    }
  }

  if (zone === 'sun') return [0, 1, -176];
  if (zone === 'shadow') return [-176, 1, 84];
  if (zone === 'nature') return [176, 1, 84];
  return [0, 1, 0];
}

function applyLevelUps(player) {
  let leveledUp = false;

  // maxXp = Infinity at LEVEL_CAP, so this loop naturally stops at the cap.
  while (player.stats.level < LEVEL_CAP && player.stats.xp >= player.stats.maxXp) {
    player.stats.xp -= player.stats.maxXp;
    player.stats.level += 1;
    player.stats.maxXp = getXpForLevel(player.stats.level);
    player.unspentPoints = (player.unspentPoints || 0) + 1; // 1 attribute point / level
    leveledUp = true;
  }

  if (player.stats.level >= LEVEL_CAP) {
    player.stats.level = LEVEL_CAP;
    player.stats.maxXp = Infinity;
    player.stats.xp = 0; // no overflow display past the cap
  }

  if (leveledUp) {
    // Rebuild from class/level/attributes/subclass/equipped, then top off to full.
    recomputeStats(player);
    player.stats.hp = player.stats.maxHp;
    if (player.resource) player.resource.value = player.resource.max;
  }

  return leveledUp;
}

// Advance KILL objectives on a mob kill (handles new objectives shape + legacy).
function updateQuestProgress(player, mobType) {
  if (!player?.quests) return;
  let changed = false;

  Object.entries(player.quests).forEach(([questId, state]) => {
    const quest = QUESTS_DB[questId];
    if (!quest || state.completed) return;
    const objs = getQuestObjectives(quest);
    objs.forEach((o, i) => {
      if (o.type !== 'kill' || o.mob !== mobType) return;
      const slot = state.objectives[i] || (state.objectives[i] = { progress: 0 });
      if (slot.progress < objectiveTarget(o)) { slot.progress += 1; changed = true; }
    });
  });

  if (changed) {
    io.emit('players:update', players);
    savePlayer(player.id);
    Object.keys(player.quests).forEach((questId) => {
      const state = player.quests[questId];
      if (state.completed) return;
      if (isQuestComplete(player, questId)) {
        emitSystemMessage(`Misión lista para entregar: ${QUESTS_DB[questId].title}`, io.to(player.id));
        io.to(player.id).emit('quest:advanced', { questId, ready: true });
      }
    });
  }
}

// Advance COLLECT objectives on a kill: roll dropChance and increment directly
// (no ground item / inventory clutter). Called from awardMobKill with (player, mobType).
function maybeDropQuestItem(player, mobType) {
  if (!player?.quests) return;
  let changed = false;
  Object.entries(player.quests).forEach(([questId, state]) => {
    const quest = QUESTS_DB[questId];
    if (!quest || state.completed) return;
    getQuestObjectives(quest).forEach((o, i) => {
      if (o.type !== 'collect' || o.mob !== mobType) return;
      const slot = state.objectives[i] || (state.objectives[i] = { progress: 0 });
      if (slot.progress >= objectiveTarget(o)) return;
      if (Math.random() < (o.dropChance || 0.5)) {
        slot.progress += 1; changed = true;
        const itemName = (ITEMS_DB[o.item] && ITEMS_DB[o.item].name) || o.item;
        emitSystemMessage(`Obtenido: ${itemName} (${slot.progress}/${objectiveTarget(o)})`, io.to(player.id));
      }
    });
  });
  if (changed) {
    io.emit('players:update', players);
    savePlayer(player.id);
    Object.keys(player.quests).forEach((questId) => {
      if (!player.quests[questId].completed && isQuestComplete(player, questId)) {
        io.to(player.id).emit('quest:advanced', { questId, ready: true });
      }
    });
  }
}

// Advance VISIT objectives (throttled, called from player:move).
function advanceVisitObjectives(player) {
  if (!player?.quests) return;
  let changed = false;
  Object.entries(player.quests).forEach(([questId, state]) => {
    const quest = QUESTS_DB[questId];
    if (!quest || state.completed) return;
    getQuestObjectives(quest).forEach((o, i) => {
      if (o.type !== 'visit') return;
      const slot = state.objectives[i] || (state.objectives[i] = { progress: 0 });
      if (slot.progress >= 1) return;
      const lm = getLandmarkById(o.settlement);
      if (lm && distance2D(player.position, lm.position) <= (o.radius || 40)) {
        slot.progress = 1; changed = true;
      }
    });
  });
  if (changed) {
    io.emit('players:update', players);
    savePlayer(player.id);
  }
}

// Advance TALK objectives when speaking to a specific NPC.
function advanceTalkObjectives(player, npcId) {
  if (!player?.quests) return false;
  let changed = false;
  Object.entries(player.quests).forEach(([questId, state]) => {
    const quest = QUESTS_DB[questId];
    if (!quest || state.completed) return;
    getQuestObjectives(quest).forEach((o, i) => {
      if (o.type !== 'talk' || o.npc !== npcId) return;
      const slot = state.objectives[i] || (state.objectives[i] = { progress: 0 });
      if (slot.progress < 1) { slot.progress = 1; changed = true; }
    });
  });
  if (changed) { io.emit('players:update', players); savePlayer(player.id); }
  return changed;
}

function awardMobKill(attacker, mobId) {
  const mob = mobs[mobId];
  if (!attacker || !mob) return;

  attacker.stats.xp += (mob.xpReward || 10);
  updateQuestProgress(attacker, mob.type);

  const leveledUp = applyLevelUps(attacker);

  io.emit('player:exp', {
    id: attacker.id,
    xp: attacker.stats.xp,
    maxXp: attacker.stats.maxXp,
    level: attacker.stats.level
  });

  if (leveledUp) {
    io.emit('player:levelup', {
      id: attacker.id,
      level: attacker.stats.level,
      stats: attacker.stats,
      unspentPoints: attacker.unspentPoints || 0,
      attributes: attacker.attributes
    });
  }

  if (mob.isBoss) {
    onBossDefeated(attacker, mob);
  } else {
    if (Math.random() < 0.28) {
      spawnItem(mob.position, 'potion_hp');
    }
    if (Math.random() < 0.6) {
      spawnItem(mob.position, 'gold');
    }
    // Equipment drop from the mob's loot table (rarity baked into the item def).
    const gearCode = rollGearDrop(mob.type);
    if (gearCode) {
      spawnItem([mob.position[0] + (Math.random() * 2 - 1), mob.position[1], mob.position[2] + (Math.random() * 2 - 1)], gearCode);
    }
    // Quest collectible drop if the killer is on a matching collect objective.
    maybeDropQuestItem(attacker, mob.type);
  }

  // Let clients play a death fade before the mob vanishes.
  io.emit('mob:death', { mobId, position: mob.position, type: mob.type });
  delete mobs[mobId];
  io.emit('mobs:update', mobs);
  savePlayer(attacker.id);
}

function findNearestEnemyPlayer(attacker, range) {
  let target = null;
  let minDistance = range;

  Object.values(players).forEach((candidate) => {
    if (candidate.id === attacker.id) return;
    if (candidate.faction === attacker.faction) return;
    if (candidate.stats.hp <= 0) return;

    const dist = distance2D(attacker.position, candidate.position);
    if (dist <= minDistance) {
      minDistance = dist;
      target = candidate;
    }
  });

  return target;
}

function findNearestMob(position, range) {
  let mob = null;
  let minDistance = range;

  Object.values(mobs).forEach((candidate) => {
    const dist = distance2D(position, candidate.position);
    if (dist <= minDistance) {
      minDistance = dist;
      mob = candidate;
    }
  });

  return mob;
}

function getFacingVector(entity) {
  const yaw = Array.isArray(entity?.rotation) ? (entity.rotation[1] || 0) : 0;
  return {
    x: -Math.sin(yaw),
    z: -Math.cos(yaw)
  };
}

function findBestAttackTarget(attacker, range) {
  const forward = getFacingVector(attacker);
  const coneThreshold = Math.cos(Math.PI / 3.4);
  const candidates = [
    ...Object.values(players)
      .filter((candidate) => candidate.id !== attacker.id && candidate.faction !== attacker.faction && candidate.stats.hp > 0)
      .map((candidate) => ({ type: 'player', target: candidate })),
    ...Object.values(mobs).map((candidate) => ({ type: 'mob', target: candidate }))
  ];

  let bestConeTarget = null;
  let bestConeScore = -Infinity;
  let bestFallbackTarget = null;
  let bestFallbackDistance = range;

  candidates.forEach((candidate) => {
    const { target } = candidate;
    const dx = target.position[0] - attacker.position[0];
    const dz = target.position[2] - attacker.position[2];
    const distance = Math.sqrt((dx * dx) + (dz * dz));
    if (distance > range) return;

    if (distance < bestFallbackDistance) {
      bestFallbackDistance = distance;
      bestFallbackTarget = candidate;
    }

    const nx = dx / Math.max(distance, 0.0001);
    const nz = dz / Math.max(distance, 0.0001);
    const alignment = (nx * forward.x) + (nz * forward.z);

    if (alignment >= coneThreshold) {
      const score = (alignment * 2) - (distance / Math.max(range, 1));
      if (!bestConeTarget || score > bestConeScore) {
        bestConeScore = score;
        bestConeTarget = candidate;
      }
    }
  });

  return bestConeTarget || bestFallbackTarget;
}

// If the attacker has a manually selected target that is valid and in range, use it.
function resolveSelectedTarget(attacker, range) {
  const id = attacker.targetId;
  if (!id) return null;
  const mob = mobs[id];
  if (mob) {
    return distance2D(attacker.position, mob.position) <= range ? { type: 'mob', target: mob } : null;
  }
  const p = players[id];
  if (p && p.id !== attacker.id && p.faction !== attacker.faction && p.stats.hp > 0
    && distance2D(attacker.position, p.position) <= range) {
    return { type: 'player', target: p };
  }
  return null;
}

function applyDamageToPlayer(attackerId, target, damage, isCrit = false) {
  const armor = target.stats.armor || 0;
  const armorMitig = damage * (100 / (100 + armor));
  const mitigated = Math.max(1, Math.round(armorMitig * getDamageTakenMultiplier(target)));
  target.stats.hp -= mitigated;
  io.emit('player:damage', {
    targetId: target.id,
    attackerId,
    damage: mitigated,
    newHp: target.stats.hp,
    isCrit
  });

  if (target.stats.hp <= 0) {
    const position = respawnPlayer(target);
    io.emit('player:respawn', { id: target.id, position, hp: target.stats.hp });
    savePlayer(target.id);
  }
}

function applyDamageToMob(attacker, mobId, damage, isCrit = false) {
  const mob = mobs[mobId];
  if (!mob) return false;

  mob.hp -= damage;
  io.emit('mob:damage', { mobId, damage, newHp: mob.hp, isCrit });

  if (mob.hp <= 0) {
    awardMobKill(attacker, mobId);
    return true;
  }

  return false;
}

function applyLifesteal(attacker, dmgDealt) {
  const ls = attacker?.stats?.lifesteal || 0;
  if (ls > 0 && attacker.stats.hp > 0) {
    attacker.stats.hp = Math.min(attacker.stats.maxHp, attacker.stats.hp + Math.round(dmgDealt * ls));
  }
}

function updateControlPoints() {
  let changed = false;

  Object.values(controlPoints).forEach((point) => {
    const nearby = Object.values(players).filter((player) => {
      return player.stats.hp > 0 && distance2D(player.position, point.position) <= CONTROL_POINT_RADIUS;
    });

    const factionsPresent = [...new Set(nearby.map((player) => player.faction))];

    if (factionsPresent.length === 1) {
      const activeFaction = factionsPresent[0];
      const pressure = nearby.length;

      if (point.owner === activeFaction) {
        if (point.progress !== 100 || point.contestingFaction) {
          point.progress = 100;
          point.contestingFaction = null;
          changed = true;
        }
        return;
      }

      if (point.contestingFaction && point.contestingFaction !== activeFaction) {
        point.progress = Math.max(0, point.progress - (CONTROL_POINT_CAPTURE_RATE * pressure));
        changed = true;

        if (point.progress === 0) {
          point.contestingFaction = activeFaction;
        }
        return;
      }

      point.contestingFaction = activeFaction;
      point.progress = Math.min(100, point.progress + (CONTROL_POINT_CAPTURE_RATE * pressure));
      changed = true;

      if (point.progress >= 100) {
        point.owner = activeFaction;
        point.progress = 100;
        point.contestingFaction = null;
        emitSystemMessage(`${getFactionLabel(activeFaction)} ha conquistado ${point.name}. Bonus de dano global +5%.`);
      }
      return;
    }

    if (factionsPresent.length === 0 && point.contestingFaction) {
      point.progress = Math.max(0, point.progress - (CONTROL_POINT_CAPTURE_RATE / 2));
      changed = true;

      if (point.progress === 0) {
        point.contestingFaction = null;
      }
    }
  });

  if (changed) {
    io.emit('controlPoints:update', controlPoints);
  }
}

// Initialize NPCs
function spawnNPCs() {
  NPCS.forEach((npc) => {
    npcs[npc.id] = { ...npc };
  });
  console.log('NPCs Spawned');
}
spawnNPCs();

function spawnItem(pos, type) {
  const itemData = ITEMS_DB[type];
  if (!itemData) return;

  const id = uuidv4();
  items[id] = {
    id,
    itemCode: itemData.itemCode,
    itemType: itemData.itemType,
    position: [pos[0], 2.0, pos[2]], // Float higher to avoid clipping terrain
    name: itemData.name,
    effect: itemData.effect,
    value: itemData.value,
    color: itemData.color,
    slot: itemData.slot || null,
    rarity: itemData.rarity || 'common',
    stats: itemData.stats || {}
  };
  io.emit('items:update', items);
}

function spawnMob() {
  if (Object.keys(mobs).length >= MOBS_LIMIT) return;

  const types = Object.keys(MOBS_DATA);
  if (!types.length) return;
  const type = types[Math.floor(Math.random() * types.length)];
  const data = MOBS_DATA[type];
  
  const pos = pickMobSpawnPosition(data.zone);

  const id = uuidv4();
  mobs[id] = {
    id,
    type,
    name: data.name,
    hp: data.hp,
    maxHp: data.hp,
    dmg: data.dmg,
    xpReward: data.xp,
    speed: data.speed,
    range: data.range,
    role: data.role || 'melee',
    size: data.size || 1,
    elite: Boolean(data.elite),
    glow: data.glow || '#ffffff',
    position: pos,
    rotation: Math.random() * Math.PI * 2,
    spawnPoint: [...pos],
    aggroRange: data.role === 'ranged' ? 28 : data.role === 'caster' ? 32 : data.role === 'ambusher' ? 26 : 20,
    targetId: null,
    lastAttack: 0
  };
}

// --- MOB CAMPS ---
// Generated from the world's points of interest (spread across the large map) so
// the wilderness stays populated. Mob types match the realm; packs deeper toward
// the war zone / frontier hit harder. Each camp refills toward `target`.
const REALM_MOBS = {
  sun: ['bandit', 'orc'],
  shadow: ['skeleton', 'specter'],
  nature: ['wolf', 'spider', 'treant'],
  frontier: ['guardian', 'wisp', 'ogre'],
  war: ['guardian', 'ogre', 'wisp']
};

const MOB_CAMPS = POINTS_OF_INTEREST.map((poi) => {
  const realm = (poi.faction && poi.faction !== 'system')
    ? poi.faction
    : getRealmAt(poi.position[0], poi.position[2]);
  const types = REALM_MOBS[realm] || REALM_MOBS.frontier;
  const distFromCenter = Math.sqrt((poi.position[0] ** 2) + (poi.position[2] ** 2));
  const levelMul = distFromCenter < 360 ? 1.25 : 1; // closer to the war front = tougher
  return {
    id: `camp_${poi.id}`,
    center: poi.position,
    radius: (poi.radius || 6) * 2.4,
    target: poi.type === 'camp' ? 7 : 5,
    types,
    levelMul
  };
});

let campTick = 0;

function jitterAround(center, radius) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * radius;
    const pos = [center[0] + (Math.cos(angle) * dist), center[1] || 1, center[2] + (Math.sin(angle) * dist)];
    if (!isInsideSettlementSafety(pos)) return pos;
  }
  return [center[0], center[1] || 1, center[2]];
}

function spawnMobAt(type, pos, campId, levelMul = 1) {
  const data = MOBS_DATA[type];
  if (!data) return;

  const id = uuidv4();
  const hp = Math.max(1, Math.round(data.hp * levelMul));

  mobs[id] = {
    id,
    type,
    name: data.name,
    hp,
    maxHp: hp,
    dmg: Math.max(1, Math.round(data.dmg * levelMul)),
    xpReward: Math.round((data.xp || 10) * levelMul),
    speed: data.speed,
    range: data.range,
    role: data.role || 'melee',
    size: data.size || 1,
    elite: Boolean(data.elite),
    glow: data.glow || '#ffffff',
    level: Math.max(1, Math.round((levelMul - 1) * 10) + 1),
    position: [pos[0], pos[1] || 1, pos[2]],
    rotation: Math.random() * Math.PI * 2,
    spawnPoint: [pos[0], pos[1] || 1, pos[2]],
    campId,
    aggroRange: data.role === 'ranged' ? 28 : data.role === 'caster' ? 32 : data.role === 'ambusher' ? 26 : 20,
    targetId: null,
    lastAttack: 0
  };
}

function maintainCamps() {
  if (!Object.keys(MOBS_DATA).length) return;

  MOB_CAMPS.forEach((camp) => {
    if (Object.keys(mobs).length >= MOBS_LIMIT) return;
    const alive = Object.values(mobs).filter((mob) => mob.campId === camp.id).length;
    if (alive < camp.target) {
      const type = camp.types[Math.floor(Math.random() * camp.types.length)];
      const pos = jitterAround(camp.center, camp.radius);
      spawnMobAt(type, pos, camp.id, camp.levelMul || 1);
    }
  });
}

// Game Loop
setInterval(() => {
  // Keep mob camps populated (~1 spawn per camp per second until full)
  campTick += 1;
  if (campTick >= 10) {
    campTick = 0;
    maintainCamps();
  }

  const mobIds = Object.keys(mobs);
  let updateNeeded = false;

  mobIds.forEach(id => {
    const mob = mobs[id];
    const stats = MOBS_DATA[mob.type] || mob; // boss/custom mobs use their own fields
    if (!stats) return;
    
    // 1. Find Target
    let closestPlayer = null;
    let minDist = mob.aggroRange || 20;

    Object.values(players).forEach(p => {
      if (p.stats.hp <= 0) return; // Don't target dead
      const dx = p.position[0] - mob.position[0];
      const dz = p.position[2] - mob.position[2];
      const dist = Math.sqrt(dx*dx + dz*dz);
      if (dist < minDist) {
        minDist = dist;
        closestPlayer = p;
      }
    });

    if (closestPlayer) {
      const dx = closestPlayer.position[0] - mob.position[0];
      const dz = closestPlayer.position[2] - mob.position[2];
      const dist = Math.sqrt(dx*dx + dz*dz);

      const moveSpeed = (stats.speed || mob.speed || 0.15) * (stats.elite ? 1.15 : 1);
      const meleeRange = Math.max(1.4, stats.range || mob.range || 2);
      const desiredDistance = stats.role === 'ranged' ? 9 : stats.role === 'caster' ? 11 : meleeRange;

      if (dist > desiredDistance) {
        mob.position[0] += (dx / dist) * moveSpeed;
        mob.position[2] += (dz / dist) * moveSpeed;
        mob.rotation = Math.atan2(dx, dz);
        updateNeeded = true;
      } else if (stats.role === 'ranged' || stats.role === 'caster') {
        if (dist < desiredDistance * 0.7) {
          mob.position[0] -= (dx / dist) * (moveSpeed * 0.65);
          mob.position[2] -= (dz / dist) * (moveSpeed * 0.65);
          mob.rotation = Math.atan2(dx, dz);
          updateNeeded = true;
        }
      } else if (stats.role === 'ambusher' && dist > meleeRange) {
        mob.position[0] += (dx / dist) * (moveSpeed * 1.25);
        mob.position[2] += (dz / dist) * (moveSpeed * 1.25);
        mob.rotation = Math.atan2(dx, dz);
        updateNeeded = true;
      }

      if (dist <= meleeRange && Date.now() - mob.lastAttack > (stats.role === 'brute' || mob.elite ? 1200 : 1500)) {
        mob.lastAttack = Date.now();
        const baseDmg = mob.dmg || stats.dmg;
        const attackDamage = Math.max(1, Math.round(baseDmg * (mob.elite ? 1.25 : 1)));
        applyDamageToPlayer(mob.id, closestPlayer, attackDamage);
      }
    } else {
      // Idle wander (simple jitter)
      if (Math.random() < 0.05) {
        const wanderSpeed = (stats.speed || 0.15) * 0.75;
        mob.rotation += (Math.random() - 0.5) * 0.8;
        mob.position[0] += Math.sin(mob.rotation) * wanderSpeed;
        mob.position[2] += Math.cos(mob.rotation) * wanderSpeed;
        updateNeeded = true;
      }
    }
  });

  if (updateNeeded) {
    io.emit('mobs:update', mobs);
  }
}, 100); // 10 ticks per second

setInterval(() => {
  updateControlPoints();
  processDots();
  regenResources();

  // World boss leash / despawn.
  if (activeBossId && mobs[activeBossId] && Date.now() - bossSpawnedAt > BOSS_LEASH_MS) {
    delete mobs[activeBossId];
    activeBossId = null;
    io.emit('mobs:update', mobs);
    io.emit('boss:despawn', {});
    emitSystemMessage('El Coloso de la Forja se ha desvanecido en las brasas.');
  }
}, 1000);

setInterval(spawnWorldBoss, BOSS_SPAWN_INTERVAL);

setInterval(() => {
  Object.keys(players).forEach((playerId) => {
    savePlayer(playerId);
  });
}, AUTOSAVE_INTERVAL);

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Send existing players to new client immediately (so they can see others)
  // But only active players
  socket.emit('players:update', players);
  socket.emit('mobs:update', mobs);
  socket.emit('items:update', items);
  socket.emit('npcs:update', npcs);
  emitWorldState(socket);
  socket.emit('controlPoints:update', controlPoints);

  // --- AUTHENTICATION ---

  socket.on('auth:register', ({ username, password }, callback) => {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return callback({ error: 'Server error' });
      db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], function(err) {
        if (err) return callback({ error: 'Username already exists' });
        callback({ success: true, userId: this.lastID });
      });
    });
  });

  socket.on('auth:login', ({ username, password }, callback) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
      if (err || !user) return callback({ error: 'Invalid credentials' });
      
      bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
          // Fetch characters
          db.all('SELECT * FROM characters WHERE user_id = ?', [user.id], (err, rows) => {
            const characters = (rows || []).map((character) => ({
              ...character,
              quests: parseJSONSafe(character.quests_json, {})
            }));

            callback({ success: true, userId: user.id, characters });
          });
        } else {
          callback({ error: 'Invalid credentials' });
        }
      });
    });
  });

  // --- CHARACTER MANAGEMENT ---

  socket.on('character:create', (data, callback) => {
    const { userId, name, faction, charClass } = data;
    console.log('Creating character:', data);

    // Basic Validation
    if (!name || name.length < 3) return callback({ error: 'Invalid name' });

    // Determine spawn based on faction city
    const spawn = getFactionSpawn(faction);
    const stats = CLASS_STATS[charClass];

    if (!stats) {
      console.error('Invalid class stats for:', charClass);
      return callback({ error: 'Invalid class selected' });
    }

    db.run(`
      INSERT INTO characters (user_id, name, faction, class, hp, max_hp, position_x, position_y, position_z, level, xp, gold, quests_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, ?)
    `, [userId, name, faction, charClass, stats.hp, stats.hp, spawn[0], spawn[1], spawn[2], '{}'], function(err) {
      if (err) {
        console.error('DB Error create character:', err.message);
        return callback({ error: 'Name taken or server error' });
      }
      
      const charId = this.lastID;

      // Initialize inventory
      db.run('INSERT INTO inventory (character_id, items) VALUES (?, ?)', [charId, '[]']);
      
      // Return the new character object so client can update list immediately
      const newCharacter = {
        id: charId,
        user_id: userId,
        name,
        faction,
        class: charClass,
        level: 1,
        hp: stats.hp,
        max_hp: stats.hp,
        xp: 0,
        gold: 0,
        quests: {},
        quests_json: '{}',
        position_x: spawn[0],
        position_y: spawn[1],
        position_z: spawn[2]
      };

      console.log('Character created successfully:', charId);
      callback({ success: true, character: newCharacter });
    });
  });

  socket.on('character:select', ({ characterId }, callback) => {
    console.log('Selecting character:', characterId, 'for socket:', socket.id);
    db.get(`
      SELECT c.*, i.items as inventoryJson 
      FROM characters c 
      LEFT JOIN inventory i ON c.id = i.character_id 
      WHERE c.id = ?`, [characterId], (err, char) => {
      
      if (err) {
        console.error('DB Error select char:', err);
        return callback({ error: 'DB error' });
      }
      if (!char) {
        console.error('Character not found for ID:', characterId);
        return callback({ error: 'Character not found' });
      }

      try {
        console.log('Character found:', char.name);
        const inventory = parseJSONSafe(char.inventoryJson, []);
        const equipped = parseJSONSafe(char.equipped, {});
        // Depth-system per-character state (Phase 0: parsed + persisted; wired in later phases).
        const attributes = normalizeAttributes(parseJSONSafe(char.attributes, {}));
        const subclass = char.subclass || '';
        const flags = parseJSONSafe(char.flags_json, {});
        const stats = buildCombatStats(char.class, char.level || 1, equipped, attributes, subclass);
        const unspentPoints = deriveUnspent(char.level || 1, attributes, char.unspent_points);
        const quests = loadQuestState(parseJSONSafe(char.quests_json, {}));
        const spawn = getFactionSpawn(char.faction);
        const currentPosition = [char.position_x, char.position_y, char.position_z];
        const needsRelocate = shouldRelocateToFactionSpawn(currentPosition);
        const position = needsRelocate ? [...spawn] : currentPosition;

        if (needsRelocate) {
          db.run(
            'UPDATE characters SET position_x = ?, position_y = ?, position_z = ? WHERE id = ?',
            [position[0], position[1], position[2], char.id]
          );
        }

        // Add to active players
        players[socket.id] = {
          id: socket.id,
          dbId: char.id,
          name: char.name,
          faction: char.faction,
          charClass: char.class,
          stats: {
            ...stats,
            hp: char.hp > 0 ? Math.min(char.hp, stats.maxHp) : stats.maxHp,
            maxHp: stats.maxHp,
            xp: char.xp,
            level: char.level,
            maxXp: getXpForLevel(char.level || 1)
          },
          attributes,
          subclass,
          flags,
          unspentPoints,
          baseRegen: (RESOURCE_DB[char.class] || DEFAULT_RESOURCE).regen,
          inventory: inventory,
          equipped,
          quests,
          gold: char.gold,
          position,
          rotation: [0, char.rotation_y, 0],
          cooldowns: {},
          resource: makeResource(char.class),
          targetId: null
        };

        // Apply spirit/subclass regen bonus to the freshly made resource.
        recomputeStats(players[socket.id]);
        players[socket.id].stats.hp = char.hp > 0 ? Math.min(char.hp, players[socket.id].stats.maxHp) : players[socket.id].stats.maxHp;
        // Tell a returning character about owed attribute points from past levels.
        if (unspentPoints > 0) {
          emitSystemMessage(`Tienes ${unspentPoints} punto(s) de atributo sin gastar. Pulsa C.`, socket);
        }

        console.log('Player added to world. Broadcasting...');

        // Broadcast join
        socket.broadcast.emit('players:update', players);
        socket.emit('player:joined', players[socket.id]);
        
        // Send current state
        socket.emit('players:update', players);
        emitSystemMessage('Controla las fortalezas del centro para dar bonus de dano a tu faccion.', socket);
        
        callback({ success: true });
      } catch (e) {
        console.error('Error in character:select logic:', e);
        callback({ error: 'Server logic error' });
      }
    });
  });

  socket.on('character:delete', ({ characterId, userId }, callback) => {
    db.get(
      'SELECT id FROM characters WHERE id = ? AND user_id = ?',
      [characterId, userId],
      (lookupError, row) => {
        if (lookupError) {
          return callback({ error: 'Unable to verify character' });
        }

        if (!row) {
          return callback({ error: 'Character not found' });
        }

        db.run('DELETE FROM inventory WHERE character_id = ?', [characterId]);
        db.run(
          'DELETE FROM characters WHERE id = ? AND user_id = ?',
          [characterId, userId],
          function deleteCharacterRun(error) {
            if (error) {
              return callback({ error: 'Unable to delete character' });
            }

            callback({ success: true });
          }
        );
      }
    );
  });

  // Removed old player:join listener
  // socket.on('player:join', ... ); 

  socket.on('player:talk', (npcId) => {
    const player = players[socket.id];
    const npc = npcs[npcId];
    
    if (!player || !npc) return;

    // Check distance
    const dx = player.position[0] - npc.position[0];
    const dz = player.position[2] - npc.position[2];
    const dist = Math.sqrt(dx*dx + dz*dz);

    if (dist > 5) return; // Too far

    // Determine dialog content
    let dialogData = {
      npcName: npc.name,
      text: `Saludos, viajero de la ${player.faction}.`,
      options: [{ label: 'Adios', action: 'close' }]
    };

    const role = npc.role || npc.type;
    if (role === 'merchant') {
      const kind = npc.establishment || npc.shopKind;
      const merchantText = (kind === 'smith')
        ? 'Hierro y acero forjados para el frente. ¿Buscas un buen filo o una coraza?'
        : (kind === 'alchemist')
          ? 'Pociones y elixires recien destilados. Nunca salgas a la guerra sin reservas.'
          : (kind === 'arcanist')
            ? 'Reliquias y sellos de poder, tallados para la guerra. ¿Algo arcano para ti?'
            : (kind === 'provisioner')
              ? 'Suministros, flechas y vendas para el largo camino. Equípate bien.'
              : 'Bienvenido a mi tienda, viajero. Echa un vistazo a mis mercancias.';
      dialogData.text = merchantText;
      dialogData.options = [
        { label: 'Ver tienda', action: 'open_shop', merchantId: npc.id },
        { label: 'Adios', action: 'close' }
      ];
    } else if (role === 'innkeeper') {
      dialogData.text = 'Bienvenido a la taberna. Una jarra caliente y una cama: descansa y recupera tus fuerzas.';
      dialogData.options = [
        { label: 'Descansar (recuperar vida y energia)', action: 'rest' },
        { label: 'Adios', action: 'close' }
      ];
    } else if (role === 'trainer') {
      const bucket = SUBCLASS_DB[player.charClass] || {};
      const keys = Object.keys(bucket);
      if (!keys.length) {
        dialogData.text = 'Entrena cerca de la ciudad y lleva tu fuerza al frente.';
      } else if (!(player.flags && player.flags.subclassUnlocked)) {
        dialogData.text = 'Completa la campaña principal de tu reino, hasta la audiencia en la capital, para desbloquear tu especialización.';
      } else if ((player.stats.level || 1) < SUBCLASS_MIN_LEVEL) {
        dialogData.text = `Aún no estás listo. Vuelve al alcanzar el nivel ${SUBCLASS_MIN_LEVEL} para elegir tu especialización.`;
      } else if (!player.subclass) {
        dialogData.text = 'Has demostrado tu valía. Elige tu especialización, guerrero.';
        dialogData.options = keys.map((k) => ({ label: `${bucket[k].name} · ${bucket[k].role}`, action: 'choose_subclass', subKey: k }));
        dialogData.options.push({ label: 'Más tarde', action: 'close' });
      } else {
        const cur = bucket[player.subclass];
        dialogData.text = `Tu camino: ${cur ? cur.name : player.subclass}. Puedes reentrenarte por ${SUBCLASS_RESPEC_COST} de oro.`;
        dialogData.options = keys.filter((k) => k !== player.subclass)
          .map((k) => ({ label: `Reentrenar: ${bucket[k].name} (${SUBCLASS_RESPEC_COST} oro)`, action: 'choose_subclass', subKey: k, respec: true }));
        dialogData.options.push({ label: 'Adiós', action: 'close' });
      }
    } else if (role === 'healer') {
      dialogData.text = 'Cada reino protege su retaguardia. Si caes, volveras a un santuario seguro de tu faccion.';
    } else if (role === 'guard') {
      dialogData.text = 'Las puertas del reino estan cerradas al enemigo. La guerra queda en el centro del continente.';
    } else if (role === 'citizen') {
      dialogData.text = 'Nuestros pueblos siguen creciendo. El mapa es grande, pero cada camino lleva de vuelta a casa.';
    }

    // Story envoys: the linear main campaign (offer / progress / turn-in).
    if (npc.type === 'story_giver') {
      advanceTalkObjectives(player, npc.id); // speaking here satisfies any talk-objective
      const turnIn = questTurnInAt(player, npc.id);
      const inProg = questInProgressAt(player, npc.id);
      const offer = questOfferableAt(player, npc.id);
      const rewardLine = (q) => {
        const r = q.rewards || {};
        const it = r.item ? `, ${(ITEMS_DB[r.item] && ITEMS_DB[r.item].name) || r.item}` : '';
        return `Recompensa: ${r.xp} XP, ${r.gold} Oro${it}`;
      };
      if (turnIn) {
        dialogData.text = `${turnIn.title}\n\n¡Has cumplido tu cometido! Acepta tu recompensa.`;
        dialogData.options = [
          { label: 'Completar capítulo', action: 'complete_quest', questId: turnIn.id },
          { label: 'Más tarde', action: 'close' }
        ];
      } else if (inProg) {
        dialogData.text = `${inProg.title}\n\n${inProg.description}\n\n${objectivesText(player, inProg)}`;
        dialogData.options = [{ label: 'En camino', action: 'close' }];
      } else if (offer) {
        dialogData.text = `${offer.title}\n\n${offer.description}\n\n${rewardLine(offer)}`;
        dialogData.options = [
          { label: 'Aceptar', action: 'accept_quest', questId: offer.id },
          { label: 'Ahora no', action: 'close' }
        ];
      } else {
        dialogData.text = 'Por ahora no tengo encargos para ti. El camino continúa en otra parte del reino.';
      }
    } else if (npc.type === 'quest_giver' && npc.questId) {
      const quest = QUESTS_DB[npc.questId];
      if (quest) {
        const pq = player.quests && player.quests[npc.questId];
        if (pq && pq.completed) {
           dialogData.text = "¡Gracias por tu ayuda! El reino está más seguro ahora.";
        } else if (pq && !pq.completed) {
           if (isQuestComplete(player, npc.questId)) {
             dialogData.text = `¡Has derrotado a los enemigos! Aquí tienes tu recompensa.`;
             dialogData.options = [
               { label: 'Completar Misión', action: 'complete_quest', questId: npc.questId },
               { label: 'Más tarde', action: 'close' }
             ];
           } else {
             const prog = (pq.objectives && pq.objectives[0] && pq.objectives[0].progress) || 0;
             dialogData.text = `¿Aún no has terminado? ${quest.description} (${prog}/${quest.targetCount})`;
           }
        } else {
           dialogData.text = `${quest.title}\n\n${quest.description}\n\nRecompensa: ${quest.rewards.xp} XP, ${quest.rewards.gold} Oro`;
           dialogData.options = [
             { label: 'Aceptar Misión', action: 'accept_quest', questId: npc.questId },
             { label: 'Rechazar', action: 'close' }
           ];
        }
      }
    }

    socket.emit('dialog:open', dialogData);
  });

  // Rest at a tavern: fully restore HP + class resource (must stand by an innkeeper).
  socket.on('player:rest', () => {
    const player = players[socket.id];
    if (!player) return;
    const nearInn = Object.values(npcs).some(
      (n) => n.role === 'innkeeper' && distance2D(player.position, n.position) <= 6
    );
    if (!nearInn) { emitSystemMessage('Necesitas estar en una taberna para descansar.', io.to(socket.id)); return; }
    if (player.stats) player.stats.hp = player.stats.maxHp;
    if (!player.resource) player.resource = makeResource(player.charClass);
    player.resource.value = player.resource.max;
    io.emit('players:update', players);
    emitSystemMessage('Has descansado en la taberna. Vida y energia al maximo.', io.to(socket.id));
  });

  // Pray at a wilderness shrine: a timed blessing (per-player cooldown). Rewards
  // exploring the open world's set-pieces.
  socket.on('shrine:pray', () => {
    const player = players[socket.id];
    if (!player) return;
    const shrine = POINTS_OF_INTEREST.find((p) => p.type === 'shrine' && distance2D(player.position, p.position) <= (p.radius || 5) + 4);
    if (!shrine) { emitSystemMessage('Acércate a un santuario para orar.', io.to(socket.id)); return; }
    const now = Date.now();
    if (player.shrineCooldownUntil && now < player.shrineCooldownUntil) {
      const secs = Math.ceil((player.shrineCooldownUntil - now) / 1000);
      emitSystemMessage(`El santuario aún no responde (${secs}s).`, io.to(socket.id));
      return;
    }
    player.shrineCooldownUntil = now + 300000; // 5 min cooldown
    if (!player.buffs) player.buffs = {};
    player.buffs['Bendicion del Santuario'] = { expires: now + 180000, dmgMul: 1.15, defMul: 0.92 };
    player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + Math.round(player.stats.maxHp * 0.25));
    io.emit('players:update', players);
    socket.emit('player:buffed', { name: 'Bendicion del Santuario', expires: now + 180000 });
    emitSystemMessage('Bendición del Santuario: +15% daño, -8% daño recibido y vigor restaurado (3 min).', io.to(socket.id));
  });

  socket.on('quest:accept', (questId) => {
    const player = players[socket.id];
    if (!player) return;
    if (!player.quests) player.quests = {};
    const quest = QUESTS_DB[questId];
    if (!quest || player.quests[questId]) return;

    // Campaign prerequisite gate.
    if (quest.requires && !(player.quests[quest.requires] && player.quests[quest.requires].completed)) {
      emitSystemMessage('Aún no puedes aceptar esta misión.', io.to(socket.id));
      return;
    }

    player.quests[questId] = initQuestState(quest);
    savePlayer(socket.id);
    io.emit('players:update', players);
    socket.emit('chat:message', { id: uuidv4(), playerName: 'SISTEMA', text: `Misión Aceptada: ${quest.title}`, faction: 'system' });
    socket.emit('quest:advanced', { questId, accepted: true });
  });

  socket.on('quest:complete', (questId) => {
    const player = players[socket.id];
    if (!player || !player.quests || !player.quests[questId]) return;

    const pQuest = player.quests[questId];
    const quest = QUESTS_DB[questId];
    if (!quest || pQuest.completed || !isQuestComplete(player, questId)) return;

    // Campaign turn-ins must happen at the quest's turn-in NPC (proximity).
    if (quest.turnInNpc) {
      const npc = npcs[quest.turnInNpc];
      if (!npc || distance2D(player.position, npc.position) > 6) {
        emitSystemMessage('Debes entregar esta misión ante el encargado correspondiente.', io.to(socket.id));
        return;
      }
    }

    pQuest.completed = true;

    // Rewards: xp + gold (single growth model), optional fixed item, optional flag unlock.
    player.stats.xp += quest.rewards.xp || 0;
    player.gold += quest.rewards.gold || 0;
    if (quest.rewards.item) {
      if (!player.inventory) player.inventory = [];
      if (player.inventory.length < 20) {
        const inst = makeItemInstance(quest.rewards.item);
        if (inst) {
          player.inventory.push(inst);
          emitSystemMessage(`Recompensa: ${inst.name}.`, io.to(socket.id));
        }
      } else {
        emitSystemMessage('Inventario lleno: recoge tu recompensa más tarde.', io.to(socket.id));
      }
    }
    if (quest.rewards.unlocks) {
      if (!player.flags) player.flags = {};
      player.flags[quest.rewards.unlocks] = true;
      socket.emit('quest:flag', { flag: quest.rewards.unlocks });
      if (quest.rewards.unlocks === 'subclassUnlocked') {
        emitSystemMessage('¡Has desbloqueado tu especialización! Visita al Maestro de Armas de tu ciudad inicial.', io.to(socket.id));
      }
    }

    const leveledUp = applyLevelUps(player);

    savePlayer(socket.id);
    io.emit('players:update', players);
    io.emit('player:exp', { id: socket.id, xp: player.stats.xp, maxXp: player.stats.maxXp, level: player.stats.level });
    socket.emit('chat:message', { id: uuidv4(), playerName: 'SISTEMA', text: `¡Misión Completada: ${quest.title}!`, faction: 'system' });
    socket.emit('quest:advanced', { questId, completed: true });

    if (leveledUp) {
      io.emit('player:levelup', { id: socket.id, level: player.stats.level, stats: player.stats, unspentPoints: player.unspentPoints || 0, attributes: player.attributes });
    }
  });

  socket.on('player:pickup', (itemId) => {
    try {
      const player = players[socket.id];
      const item = items[itemId];
      
      if (player && item) {
        // Check distance
        const dx = player.position[0] - item.position[0];
        const dz = player.position[2] - item.position[2];
        const dist = Math.sqrt(dx*dx + dz*dz);
        
        if (dist < 3) { // Pickup range
          const isGold = item.itemType === 'currency';

          if (isGold) {
            player.gold = (player.gold || 0) + item.value;
          } else {
            if (!player.inventory) player.inventory = [];
            player.inventory.push(item);
          }
          
          delete items[itemId];
          io.emit('items:update', items);
          io.emit('players:update', players); // Update inventory/gold
          
          // Trigger immediate save for gold/inventory change
          savePlayer(socket.id);
        }
      }
    } catch (e) {
      console.error('Error picking up item:', e);
    }
  });

  socket.on('player:useItem', (index) => {
    const player = players[socket.id];
    if (!player || !player.inventory[index]) return;

    const item = player.inventory[index];

    if (item.itemType === 'consumable' && item.effect === 'heal') {
      // Heal logic
      const healAmount = item.value || 50;
      player.stats.hp = Math.min(player.stats.hp + healAmount, player.stats.maxHp);
      
      // Remove item
      player.inventory.splice(index, 1);
      
      // Notify
      io.emit('players:update', players);
      savePlayer(socket.id);
      // Optional: Emit a healing effect event for visuals
    }
  });

  function shopMerchantInRange(player, merchantId) {
    const npc = npcs[merchantId];
    if (!npc || (npc.role || npc.type) !== 'merchant') return null;
    return distance2D(player.position, npc.position) <= 6 ? npc : null;
  }

  function buildShopStock(kind) {
    const codes = SHOP_STOCKS[kind] || SHOP_STOCK;
    return codes.map((code) => {
      const d = ITEMS_DB[code];
      if (!d) return null;
      return {
        itemCode: code, name: d.name, itemType: d.itemType, slot: d.slot || null,
        rarity: d.rarity || 'common', stats: d.stats || {}, color: d.color,
        price: d.price || 0, sellValue: d.sellValue || 0
      };
    }).filter(Boolean);
  }

  socket.on('shop:open', (merchantId, callback) => {
    const player = players[socket.id];
    if (!player) return;
    const npc = shopMerchantInRange(player, merchantId);
    if (!npc) { if (callback) callback({ error: 'too_far' }); return; }
    const payload = { merchantId, merchantName: npc.name, items: buildShopStock(npc.shopKind) };
    socket.emit('shop:state', payload);
    if (callback) callback({ success: true, shop: payload });
  });

  socket.on('shop:buy', ({ itemCode, qty = 1, merchantId }) => {
    const player = players[socket.id];
    if (!player) return;
    const npc = shopMerchantInRange(player, merchantId);
    if (!npc) return;

    const stock = SHOP_STOCKS[npc.shopKind] || SHOP_STOCK;
    const itemData = ITEMS_DB[itemCode];
    if (!itemData || !stock.includes(itemCode)) return;
    const count = Math.max(1, Math.min(10, Math.floor(Number(qty) || 1)));
    const total = (itemData.price || 0) * count;

    if ((player.gold || 0) < total) { emitSystemMessage('No tienes oro suficiente.', io.to(socket.id)); return; }
    if (!player.inventory) player.inventory = [];
    if (player.inventory.length + count > 20) { emitSystemMessage('Inventario lleno.', io.to(socket.id)); return; }

    player.gold -= total;
    for (let i = 0; i < count; i += 1) {
      const inst = makeItemInstance(itemCode);
      if (inst) player.inventory.push(inst);
    }
    io.emit('players:update', players);
    savePlayer(socket.id);
    emitSystemMessage(`Has comprado ${count}x ${itemData.name} por ${total} de oro.`, io.to(socket.id));
  });

  socket.on('shop:sell', ({ index, merchantId }) => {
    const player = players[socket.id];
    if (!player || !player.inventory) return;
    if (!shopMerchantInRange(player, merchantId)) return;
    const item = player.inventory[index];
    if (!item) return;
    const def = ITEMS_DB[item.itemCode];
    const value = def?.sellValue || 0;
    if (item.itemType === 'quest' || item.itemType === 'currency' || value <= 0) {
      emitSystemMessage('No puedes vender eso.', io.to(socket.id));
      return;
    }
    player.inventory.splice(index, 1);
    player.gold = (player.gold || 0) + value;
    io.emit('players:update', players);
    savePlayer(socket.id);
    emitSystemMessage(`Has vendido ${item.name} por ${value} de oro.`, io.to(socket.id));
  });

  socket.on('player:setTarget', (targetId) => {
    const player = players[socket.id];
    if (!player) return;
    if (targetId && (mobs[targetId] || (players[targetId] && players[targetId].faction !== player.faction))) {
      player.targetId = targetId;
    } else {
      player.targetId = null;
    }
    socket.emit('player:targetSet', { targetId: player.targetId });
  });

  socket.on('player:equip', (index) => {
    const player = players[socket.id];
    if (!player || !player.inventory) return;
    const item = player.inventory[index];
    if (!item || item.itemType !== 'equipment' || !item.slot) return;

    // Gear-tier gating: block equipping items above your level (already-equipped
    // gear is grandfathered — only NEW equips are checked).
    const reqLevel = GEAR_TIER_REQ[item.rarity] || 1;
    if ((player.stats.level || 1) < reqLevel) {
      emitSystemMessage(`Necesitas nivel ${reqLevel} para equipar ${item.name}.`, io.to(socket.id));
      return;
    }

    if (!player.equipped) player.equipped = {};
    const prev = player.equipped[item.slot] || null;
    player.equipped[item.slot] = item;
    player.inventory.splice(index, 1);
    if (prev) player.inventory.push(prev);

    recomputeStats(player);
    io.emit('players:update', players);
    savePlayer(socket.id);
  });

  socket.on('player:unequip', (slot) => {
    const player = players[socket.id];
    if (!player || !player.equipped || !player.equipped[slot]) return;
    if ((player.inventory || []).length >= 20) {
      emitSystemMessage('Inventario lleno.', io.to(socket.id));
      return;
    }
    const item = player.equipped[slot];
    delete player.equipped[slot];
    if (!player.inventory) player.inventory = [];
    player.inventory.push(item);

    recomputeStats(player);
    io.emit('players:update', players);
    savePlayer(socket.id);
  });

  // --- Attribute allocation / respec ---
  socket.on('attr:spend', (payload = {}) => {
    const player = players[socket.id];
    if (!player) return;
    const attr = payload.attr;
    if (!ATTR_KEYS.includes(attr)) return;
    if ((player.unspentPoints || 0) <= 0) { emitSystemMessage('No tienes puntos de atributo.', io.to(socket.id)); return; }
    player.attributes = normalizeAttributes(player.attributes);
    player.attributes[attr] += 1;
    player.unspentPoints -= 1;
    recomputeStats(player);
    io.emit('players:update', players);
    socket.emit('player:attrUpdate', { id: socket.id, attributes: player.attributes, unspentPoints: player.unspentPoints, stats: player.stats });
    savePlayer(socket.id);
  });

  socket.on('attr:respec', () => {
    const player = players[socket.id];
    if (!player) return;
    const nearTrainer = Object.values(npcs).some((n) => n.role === 'trainer' && distance2D(player.position, n.position) <= 6);
    if (!nearTrainer) { emitSystemMessage('Habla con un Maestro de Armas para reentrenar.', io.to(socket.id)); return; }
    player.attributes = normalizeAttributes(player.attributes);
    const spent = ATTR_KEYS.reduce((s, k) => s + (player.attributes[k] || 0), 0);
    if (spent === 0) { emitSystemMessage('No tienes atributos que reentrenar.', io.to(socket.id)); return; }
    if ((player.gold || 0) < ATTR_RESPEC_COST) { emitSystemMessage(`Reentrenar cuesta ${ATTR_RESPEC_COST} de oro.`, io.to(socket.id)); return; }
    player.gold -= ATTR_RESPEC_COST;
    player.attributes = { str: 0, vit: 0, dex: 0, spi: 0 };
    player.unspentPoints = (player.unspentPoints || 0) + spent;
    recomputeStats(player);
    io.emit('players:update', players);
    socket.emit('player:attrUpdate', { id: socket.id, attributes: player.attributes, unspentPoints: player.unspentPoints, stats: player.stats });
    emitSystemMessage(`Atributos reentrenados (${spent} puntos devueltos).`, io.to(socket.id));
    savePlayer(socket.id);
  });

  // --- Subclass choose / respec (at the barracks trainer) ---
  socket.on('subclass:choose', (payload = {}, callback) => {
    const player = players[socket.id];
    if (!player) return;
    const subKey = payload.subKey;
    const respec = Boolean(payload.respec);
    const bucket = SUBCLASS_DB[player.charClass];
    if (!bucket || !bucket[subKey]) { if (callback) callback({ error: 'invalid' }); return; }

    const nearTrainer = Object.values(npcs).some((n) => n.role === 'trainer' && distance2D(player.position, n.position) <= 6);
    if (!nearTrainer) { emitSystemMessage('Habla con un Maestro de Armas para especializarte.', io.to(socket.id)); if (callback) callback({ error: 'too_far' }); return; }

    // Gate: questline capstone flag + level floor.
    if (!(player.flags && player.flags.subclassUnlocked)) {
      emitSystemMessage('Completa la campaña principal para desbloquear tu especialización.', io.to(socket.id));
      if (callback) callback({ error: 'locked' }); return;
    }
    if ((player.stats.level || 1) < SUBCLASS_MIN_LEVEL) {
      emitSystemMessage(`Necesitas nivel ${SUBCLASS_MIN_LEVEL} para especializarte.`, io.to(socket.id));
      if (callback) callback({ error: 'level' }); return;
    }
    // Anti-exploit: HP-ratio preservation means respeccing at low HP could be abused.
    if (player.stats.hp < player.stats.maxHp) {
      emitSystemMessage('Debes estar a plena vida para cambiar tu especializacion.', io.to(socket.id));
      if (callback) callback({ error: 'hp' }); return;
    }

    const already = player.subclass || '';
    if (already === subKey) { if (callback) callback({ error: 'same' }); return; }
    if (already && already !== subKey) {
      if (!respec) { if (callback) callback({ error: 'need_respec' }); return; }
      if ((player.gold || 0) < SUBCLASS_RESPEC_COST) {
        emitSystemMessage(`Reentrenar cuesta ${SUBCLASS_RESPEC_COST} de oro.`, io.to(socket.id));
        if (callback) callback({ error: 'gold' }); return;
      }
      player.gold -= SUBCLASS_RESPEC_COST;
    }

    player.subclass = subKey;
    recomputeStats(player);
    player.stats.hp = player.stats.maxHp; // top off after the stat rebuild
    if (player.resource) player.resource.value = player.resource.max;
    io.emit('players:update', players);
    socket.emit('subclass:changed', { subclass: subKey, skill4: bucket[subKey].skill4, name: bucket[subKey].name });
    emitSystemMessage(`Te has especializado: ${bucket[subKey].name}.`, io.to(socket.id));
    savePlayer(socket.id);
    if (callback) callback({ success: true });
  });

  socket.on('player:skill', (slotArg) => {
    const player = players[socket.id];
    if (!player || player.stats.hp <= 0) return;

    const slot = Number(slotArg);
    // Build the kit: base 1/2/3 + the subclass 4th skill when specialized.
    const kit = { ...(SKILLS_DB[player.charClass] || {}) };
    const sub = getSubclass(player.charClass, player.subclass);
    if (sub && sub.skill4) kit[4] = sub.skill4;
    const skill = kit[slot];
    if (!skill) return;

    // Skill-slot gating by level (slot 4 also needs a subclass, which kit[4] enforces).
    const reqLevel = SKILL_UNLOCK[slot] || 1;
    if ((player.stats.level || 1) < reqLevel) {
      emitSystemMessage(`Aun no has aprendido esta habilidad (nivel ${reqLevel}).`, io.to(socket.id));
      return;
    }

    const now = Date.now();
    const lastUsed = player.cooldowns?.[slot] || 0;
    if (now - lastUsed < skill.cooldown) return;

    if (!player.resource) player.resource = makeResource(player.charClass);
    if (player.resource.value < (skill.cost || 0)) {
      emitSystemMessage(`Sin ${player.resource.type} suficiente.`, io.to(socket.id));
      return;
    }

    if (!player.cooldowns) player.cooldowns = {};
    player.cooldowns[slot] = now;
    player.resource.value = Math.max(0, player.resource.value - (skill.cost || 0));

    const mult = getFactionDamageMultiplier(player.faction) * getBuffMultiplier(player) * (1 + (player.stats.passiveDmgPct || 0));
    const type = skill.type;

    if (type === 'heal') {
      player.stats.hp = Math.min(player.stats.hp + skill.value, player.stats.maxHp);
    } else if (type === 'dash') {
      const angle = player.rotation ? player.rotation[1] : 0;
      player.position[0] -= Math.sin(angle) * skill.value;
      player.position[2] -= Math.cos(angle) * skill.value;
      player.position = clampPosition(player.position);
    } else if (type === 'buff') {
      if (!player.buffs) player.buffs = {};
      player.buffs[skill.name] = {
        expires: now + (skill.duration || 5000),
        // Offensive buffs read dmgMul (legacy: from `value`); defensive read defMul.
        dmgMul: skill.dmgMul != null ? skill.dmgMul : (skill.defMul != null ? 1 : (skill.value || 1.3)),
        defMul: skill.defMul != null ? skill.defMul : 1
      };
      if (skill.healOnCast) player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + skill.healOnCast);
    } else if (type === 'damage' || type === 'projectile') {
      const { isCrit, mult: critMult } = rollCrit(player);
      const damage = Math.max(1, Math.round(skill.value * mult * critMult));
      const range = skill.range || (player.stats.range + 2);
      const target = resolveSelectedTarget(player, range) || findBestAttackTarget(player, range);
      if (target?.type === 'player') { applyDamageToPlayer(player.id, target.target, damage, isCrit); applyLifesteal(player, damage); }
      else if (target?.type === 'mob') { applyDamageToMob(player, target.target.id, damage, isCrit); applyLifesteal(player, damage); }
    } else if (type === 'drain') {
      const { isCrit, mult: critMult } = rollCrit(player);
      const damage = Math.max(1, Math.round(skill.value * mult * critMult));
      const heal = Math.floor(damage * 0.75);
      const range = skill.range || 10;
      const target = resolveSelectedTarget(player, range) || findBestAttackTarget(player, range);
      if (target?.type === 'player') {
        applyDamageToPlayer(player.id, target.target, damage, isCrit);
        player.stats.hp = Math.min(player.stats.hp + heal, player.stats.maxHp);
      } else if (target?.type === 'mob') {
        applyDamageToMob(player, target.target.id, damage, isCrit);
        player.stats.hp = Math.min(player.stats.hp + heal, player.stats.maxHp);
      }
    } else if (type === 'aoe') {
      applySkillAoe(player, skill.radius || 6, skill.value);
    } else if (type === 'dot') {
      const range = skill.range || 10;
      const target = resolveSelectedTarget(player, range) || findBestAttackTarget(player, range);
      if (target) {
        const ticks = Math.max(1, Math.floor((skill.duration || 5000) / 1000));
        const perTick = Math.max(1, Math.round((skill.value / ticks) * mult));
        activeDots.push({ attackerId: player.id, faction: player.faction, targetType: target.type, targetId: target.target.id, ticks, perTick, nextAt: now + 1000 });
      }
    }

    io.emit('players:update', players);
    io.emit('player:skillUsed', { id: socket.id, skill: skill.name, type: skill.type, slot });
    savePlayer(socket.id);
  });

  socket.on('player:attack', () => {
    const attacker = players[socket.id];
    if (!attacker) return;

    const now = Date.now();
    const lastAttackAt = attacker.lastBasicAttackAt || 0;
    if (now - lastAttackAt < BASIC_ATTACK_COOLDOWN_MS) return;
    attacker.lastBasicAttackAt = now;

    const range = attacker.stats.range + 0.5;
    const { isCrit, mult } = rollCrit(attacker);
    const dmg = Math.max(1, Math.round(attacker.stats.dmg * getFactionDamageMultiplier(attacker.faction) * getBuffMultiplier(attacker) * mult * (1 + (attacker.stats.passiveDmgPct || 0))));

    // Broadcast attack start for animation
    io.emit('player:attacked', { id: socket.id });

    const target = resolveSelectedTarget(attacker, range) || findBestAttackTarget(attacker, range);
    if (target?.type === 'player') {
      applyDamageToPlayer(attacker.id, target.target, dmg, isCrit);
      applyLifesteal(attacker, dmg);
    } else if (target?.type === 'mob') {
      applyDamageToMob(attacker, target.target.id, dmg, isCrit);
      applyLifesteal(attacker, dmg);
    }

    io.emit('players:update', players);
    savePlayer(socket.id);
  });

  socket.on('chat:message', (msg) => {
    if (!players[socket.id]) return;

    if (typeof msg === 'string' && msg.trim().toLowerCase() === '/boss') {
      spawnWorldBoss();
      return;
    }

    const messageData = {
      id: uuidv4(),
      playerId: socket.id,
      playerName: players[socket.id].name,
      text: msg,
      timestamp: Date.now(),
      faction: players[socket.id].faction
    };
    
    io.emit('chat:message', messageData);
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    savePlayer(socket.id);
    delete players[socket.id];
    io.emit('players:update', players);
  });

  // Future: Handle movement events
  socket.on('player:move', (data) => {
    const player = players[socket.id];
    if (player) {
      player.position = clampPosition(data.position);
      if (data.rotation) player.rotation = data.rotation;

      // Throttled visit-objective check (~1/s) so we don't scan per move tick.
      const now = Date.now();
      if (now - (player.lastVisitCheck || 0) > 1000) {
        player.lastVisitCheck = now;
        advanceVisitObjectives(player);
      }

      socket.broadcast.emit('players:update', players);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

