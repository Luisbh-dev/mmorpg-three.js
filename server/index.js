import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import db from './database.js';
import { LANDMARKS, MAP_RADIUS, NPCS, WAR_ZONE_RADIUS, WORLD_BOUNDARY as WORLD_LIMIT } from '../client/src/lib/gameData.js';

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
const MOBS_LIMIT = 30;
const CONTROL_POINT_RADIUS = 18;
const CONTROL_POINT_CAPTURE_RATE = 14;
const CONTROL_POINT_DAMAGE_BONUS = 0.05;
const BASIC_ATTACK_COOLDOWN_MS = 500;
const AUTOSAVE_INTERVAL = 15000;
const SAFE_LANDMARK_TYPES = new Set(['capital', 'city', 'town', 'village', 'outpost']);

const controlPoints = {
  sunspire: {
    id: 'sunspire',
    name: 'Torre del Alba',
    position: [0, 1, -28],
    owner: null,
    progress: 0,
    contestingFaction: null
  },
  duskfall: {
    id: 'duskfall',
    name: 'Bastion del Crepusculo',
    position: [-30, 1, 18],
    owner: null,
    progress: 0,
    contestingFaction: null
  },
  wildroot: {
    id: 'wildroot',
    name: 'Raiz Primigenia',
    position: [30, 1, 18],
    owner: null,
    progress: 0,
    contestingFaction: null
  }
};

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
  ITEMS_DB = {};
  SKILLS_DB = {};

  db.all('SELECT * FROM factions', (err, rows) => {
    if (rows) {
      rows.forEach(r => {
        FACTION_SPAWNS[r.id] = [r.spawn_x, r.spawn_y, r.spawn_z];
      });
      console.log('Loaded Factions:', Object.keys(FACTION_SPAWNS).length);
    }
  });

  db.all('SELECT * FROM classes', (err, rows) => {
    if (rows) {
      rows.forEach(r => {
        CLASS_STATS[r.name] = { hp: r.hp, dmg: r.dmg, range: r.range };
        if (r.skill_2_json) {
          SKILLS_DB[r.name] = { slot: 2, ...JSON.parse(r.skill_2_json) };
        }
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
        ITEMS_DB[r.type] = { 
          itemCode: r.type,
          name: r.name,
          itemType: r.item_type,
          effect: r.effect, 
          value: r.value, color: r.color 
        };
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
  return Math.floor(100 * Math.pow(1.5, level - 1));
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

function buildCombatStats(charClass, level = 1) {
  const baseStats = CLASS_STATS[charClass] || { hp: 100, dmg: 10, range: 2 };
  let maxHp = baseStats.hp;
  let dmg = baseStats.dmg;

  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    maxHp = Math.floor(maxHp * 1.1);
    dmg = Math.floor(dmg * 1.1);
  }

  return {
    hp: maxHp,
    maxHp,
    dmg,
    range: baseStats.range
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
  target.emit('world:state', {
    controlPoints,
    quests: QUESTS_DB,
    skills: SKILLS_DB
  });
}

function getFactionControlCount(faction) {
  return Object.values(controlPoints).filter((point) => point.owner === faction).length;
}

function getFactionDamageMultiplier(faction) {
  return 1 + (getFactionControlCount(faction) * CONTROL_POINT_DAMAGE_BONUS);
}

function savePlayer(socketId) {
  const player = players[socketId];
  if (!player?.dbId) return;

  db.run(
    `
      UPDATE characters
      SET hp = ?, max_hp = ?, level = ?, xp = ?, gold = ?,
          position_x = ?, position_y = ?, position_z = ?, rotation_y = ?, quests_json = ?
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

  while (player.stats.xp >= player.stats.maxXp) {
    player.stats.xp -= player.stats.maxXp;
    player.stats.level += 1;
    player.stats.maxXp = getXpForLevel(player.stats.level);
    player.stats.maxHp = Math.floor(player.stats.maxHp * 1.1);
    player.stats.hp = player.stats.maxHp;
    player.stats.dmg = Math.floor(player.stats.dmg * 1.1);
    leveledUp = true;
  }

  return leveledUp;
}

function updateQuestProgress(player, mobType) {
  if (!player?.quests) return;

  let changed = false;
  Object.entries(player.quests).forEach(([questId, questState]) => {
    const questData = QUESTS_DB[questId];
    if (!questData || questState.completed || questData.targetType !== mobType) return;

    if (questState.progress < questData.targetCount) {
      questState.progress += 1;
      changed = true;
    }
  });

  if (changed) {
    io.emit('players:update', players);
    savePlayer(player.id);

    Object.entries(player.quests).forEach(([questId, questState]) => {
      const questData = QUESTS_DB[questId];
      if (!questData || questState.completed) return;
      if (questState.progress >= questData.targetCount) {
        emitSystemMessage(`Mision lista para entregar: ${questData.title}`, io.to(player.id));
      }
    });
  }
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
      stats: attacker.stats
    });
  }

  if (Math.random() < 0.3) {
    spawnItem(mob.position, 'potion_hp');
  }
  if (Math.random() < 0.5) {
    spawnItem(mob.position, 'gold');
  }

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

function applyDamageToPlayer(attackerId, target, damage) {
  target.stats.hp -= damage;
  io.emit('player:damage', {
    targetId: target.id,
    attackerId,
    damage,
    newHp: target.stats.hp
  });

  if (target.stats.hp <= 0) {
    const position = respawnPlayer(target);
    io.emit('player:respawn', { id: target.id, position, hp: target.stats.hp });
    savePlayer(target.id);
  }
}

function applyDamageToMob(attacker, mobId, damage) {
  const mob = mobs[mobId];
  if (!mob) return false;

  mob.hp -= damage;
  io.emit('mob:damage', { mobId, damage, newHp: mob.hp });

  if (mob.hp <= 0) {
    awardMobKill(attacker, mobId);
    return true;
  }

  return false;
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
    color: itemData.color
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

// Game Loop
setInterval(() => {
  // Spawn mobs
  if (Math.random() < 0.1) spawnMob();

  const mobIds = Object.keys(mobs);
  let updateNeeded = false;

  mobIds.forEach(id => {
    const mob = mobs[id];
    const stats = MOBS_DATA[mob.type];
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

      if (dist <= meleeRange && Date.now() - mob.lastAttack > (stats.role === 'brute' || stats.elite ? 1200 : 1500)) {
        mob.lastAttack = Date.now();
        const attackDamage = Math.max(1, Math.round(stats.dmg * (stats.elite ? 1.25 : 1)));
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
}, 1000);

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

    // Determine spawn based on faction
    const spawn = FACTION_SPAWNS[faction] || [0, 1, 0];
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
        const stats = buildCombatStats(char.class, char.level || 1);
        const quests = parseJSONSafe(char.quests_json, {});

        // Add to active players
        players[socket.id] = {
          id: socket.id,
          dbId: char.id,
          name: char.name,
          faction: char.faction,
          charClass: char.class,
          stats: {
            ...stats,
            hp: char.hp,
            maxHp: char.max_hp,
            xp: char.xp,
            level: char.level,
            maxXp: getXpForLevel(char.level || 1)
          },
          inventory: inventory,
          quests,
          gold: char.gold,
          position: [char.position_x, char.position_y, char.position_z],
          rotation: [0, char.rotation_y, 0],
          cooldowns: {}
        };

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
      dialogData.text = 'Las tiendas completas vendran despues, pero ya estas en una ciudad viva. Revisa el entorno y habla con los artesanos del reino.';
    } else if (role === 'trainer') {
      dialogData.text = 'Entrena cerca de la ciudad, aprende tu ritmo y luego lleva esa fuerza al frente.';
    } else if (role === 'healer') {
      dialogData.text = 'Cada reino protege su retaguardia. Si caes, volveras a un santuario seguro de tu faccion.';
    } else if (role === 'guard') {
      dialogData.text = 'Las puertas del reino estan cerradas al enemigo. La guerra queda en el centro del continente.';
    } else if (role === 'citizen') {
      dialogData.text = 'Nuestros pueblos siguen creciendo. El mapa es grande, pero cada camino lleva de vuelta a casa.';
    }

    if (npc.type === 'quest_giver' && npc.questId) {
      const quest = QUESTS_DB[npc.questId];
      if (quest) {
        // Check if player already has quest
        const playerQuest = player.quests && player.quests[npc.questId];
        
        if (playerQuest && playerQuest.completed) {
           dialogData.text = "¡Gracias por tu ayuda! El reino está más seguro ahora.";
        } else if (playerQuest && !playerQuest.completed) {
           if (playerQuest.progress >= quest.targetCount) {
             dialogData.text = `¡Has derrotado a los enemigos! Aquí tienes tu recompensa.`;
             dialogData.options = [
               { label: 'Completar Misión', action: 'complete_quest', questId: npc.questId },
               { label: 'Más tarde', action: 'close' }
             ];
           } else {
             dialogData.text = `¿Aún no has terminado? ${quest.description} (${playerQuest.progress}/${quest.targetCount})`;
           }
        } else {
           // Offer quest
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

  socket.on('quest:accept', (questId) => {
    const player = players[socket.id];
    if (!player) return;
    if (!player.quests) player.quests = {};
    
    // Add quest
    if (!player.quests[questId]) {
      player.quests[questId] = { progress: 0, completed: false };
      savePlayer(socket.id);
      io.emit('players:update', players); 
      const quest = QUESTS_DB[questId];
      socket.emit('chat:message', { id: uuidv4(), playerName: 'SISTEMA', text: `Misión Aceptada: ${quest.title}`, faction: 'system' });
    }
  });

  socket.on('quest:complete', (questId) => {
    const player = players[socket.id];
    if (!player || !player.quests || !player.quests[questId]) return;

    const pQuest = player.quests[questId];
    const quest = QUESTS_DB[questId];

    if (!pQuest.completed && pQuest.progress >= quest.targetCount) {
      // Complete
      pQuest.completed = true;
      
      // Rewards
      player.stats.xp += quest.rewards.xp;
      player.gold += quest.rewards.gold;

      // Check Level Up
      let leveledUp = false;
      while (player.stats.xp >= player.stats.maxXp) {
         player.stats.xp -= player.stats.maxXp;
         player.stats.level += 1;
         player.stats.maxXp = getXpForLevel(player.stats.level);
         player.stats.maxHp = Math.floor(player.stats.maxHp * 1.1);
         player.stats.hp = player.stats.maxHp;
         player.stats.dmg = Math.floor(player.stats.dmg * 1.1);
         leveledUp = true;
      }

      savePlayer(socket.id);
      io.emit('players:update', players);
      socket.emit('chat:message', { id: uuidv4(), playerName: 'SISTEMA', text: `¡Misión Completada: ${quest.title}!`, faction: 'system' });
      
      if (leveledUp) {
         io.emit('player:levelup', { id: socket.id, level: player.stats.level, stats: player.stats });
      }
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

  socket.on('player:skill', (slot) => {
    const player = players[socket.id];
    if (!player) return;

    // Only slot 2 implemented for now
    if (slot !== 2) return;

    const skill = SKILLS_DB[player.charClass];
    if (!skill) return;

    const now = Date.now();
    const lastUsed = player.cooldowns?.[slot] || 0;

    if (now - lastUsed >= skill.cooldown) {
      // Cast Skill
      if (!player.cooldowns) player.cooldowns = {};
      player.cooldowns[slot] = now;

      // Logic based on skill type
      if (skill.type === 'heal') {
        player.stats.hp = Math.min(player.stats.hp + skill.value, player.stats.maxHp);
      } else if (skill.type === 'dash') {
        // Move player forward
        // Need rotation from player state. Assuming client sent rotation earlier in movement.
        // player.rotation is [x, y, z] euler.
        // Move 5 units forward
        const dist = skill.value;
        const angle = player.rotation ? player.rotation[1] : 0; // Yaw
        player.position[0] -= Math.sin(angle) * dist;
        player.position[2] -= Math.cos(angle) * dist;
        
        // Validate bounds
        player.position = clampPosition(player.position);
      } else if (skill.type === 'damage') {
        const damage = Math.max(1, Math.round(skill.value * getFactionDamageMultiplier(player.faction)));
        const skillRange = skill.range || player.stats.range + 2;
        const target = findBestAttackTarget(player, skillRange);

        if (target?.type === 'player') {
          applyDamageToPlayer(player.id, target.target, damage);
        } else if (target?.type === 'mob') {
          applyDamageToMob(player, target.target.id, damage);
        }
      } else if (skill.type === 'drain') {
        const target = findBestAttackTarget(player, skill.range || 8);
        const drainDamage = Math.max(1, Math.round(skill.value * getFactionDamageMultiplier(player.faction)));
        const healAmount = Math.floor(drainDamage * 0.75);

        if (target?.type === 'player') {
          applyDamageToPlayer(player.id, target.target, drainDamage);
          player.stats.hp = Math.min(player.stats.hp + healAmount, player.stats.maxHp);
        } else if (target?.type === 'mob') {
          applyDamageToMob(player, target.target.id, drainDamage);
          player.stats.hp = Math.min(player.stats.hp + healAmount, player.stats.maxHp);
        }
      }

      io.emit('players:update', players);
      io.emit('player:skillUsed', { id: socket.id, skill: skill.name, type: skill.type });
      savePlayer(socket.id);
    }
  });

  socket.on('player:attack', () => {
    const attacker = players[socket.id];
    if (!attacker) return;

    const now = Date.now();
    const lastAttackAt = attacker.lastBasicAttackAt || 0;
    if (now - lastAttackAt < BASIC_ATTACK_COOLDOWN_MS) return;
    attacker.lastBasicAttackAt = now;

    const range = attacker.stats.range + 0.5;
    const dmg = Math.max(1, Math.round(attacker.stats.dmg * getFactionDamageMultiplier(attacker.faction)));
    
    // Broadcast attack start for animation
    io.emit('player:attacked', { id: socket.id });

    const target = findBestAttackTarget(attacker, range);
    if (target?.type === 'player') {
      applyDamageToPlayer(attacker.id, target.target, dmg);
    } else if (target?.type === 'mob') {
      applyDamageToMob(attacker, target.target.id, dmg);
    }

    io.emit('players:update', players);
    savePlayer(socket.id);
  });

  socket.on('chat:message', (msg) => {
    if (!players[socket.id]) return;
    
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
    if (players[socket.id]) {
      let pos = data.position;

      players[socket.id].position = clampPosition(pos);
      if (data.rotation) players[socket.id].rotation = data.rotation;
      
      socket.broadcast.emit('players:update', players);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

