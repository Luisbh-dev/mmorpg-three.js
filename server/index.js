import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import db from './database.js';

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

// --- LOAD CONFIG FROM DB ---
let FACTION_SPAWNS = {};
let CLASS_STATS = {};
let MOBS_DATA = {};
let ITEMS_DB = {};
let SKILLS_DB = {};
let QUESTS_DB = {};

function loadConfig() {
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
          hp: r.hp, dmg: r.dmg, xp: r.xp, speed: r.speed, 
          range: r.range, zone: r.zone, name: r.name 
        };
      });
      console.log('Loaded Mobs Data:', Object.keys(MOBS_DATA).length);
    }
  });

  db.all('SELECT * FROM items_data', (err, rows) => {
    if (rows) {
      rows.forEach(r => {
        ITEMS_DB[r.type] = { 
          name: r.name, type: r.item_type, effect: r.effect, 
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
}

loadConfig(); // Start loading

const mobs = {};
const items = {}; // Dropped items on the ground
const npcs = {}; // Quest givers and shops
const MOBS_LIMIT = 30;

function getXpForLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

// Initialize NPCs
function spawnNPCs() {
  // Hardcoded quest givers for now, could be DB
  const npcList = [
    { id: 'npc_sun', name: 'Capitán Solarius', faction: 'sun', position: [0, 1, -150], type: 'quest_giver', questId: 'quest_bandit' },
    { id: 'npc_shadow', name: 'Sombra Silenciosa', faction: 'shadow', position: [-150, 1, 90], type: 'quest_giver', questId: 'quest_skeleton' },
    { id: 'npc_nature', name: 'Druida Mayor', faction: 'nature', position: [150, 1, 90], type: 'quest_giver', questId: 'quest_wolf' }
  ];

  npcList.forEach(n => {
    npcs[n.id] = n;
  });
  console.log('NPCs Spawned');
}
spawnNPCs();

function spawnItem(pos, type) {
  const id = uuidv4();
  items[id] = {
    id,
    type,
    position: [pos[0], 2.0, pos[2]], // Float higher to avoid clipping terrain
    ...ITEMS_DB[type]
  };
  io.emit('items:update', items);
}

function spawnMob() {
  if (Object.keys(mobs).length >= MOBS_LIMIT) return;

  const types = Object.keys(MOBS_DATA);
  const type = types[Math.floor(Math.random() * types.length)];
  const data = MOBS_DATA[type];
  
  let pos = [0, 1, 0];
  
  // Spawn logic per zone
  if (data.zone === 'nature') {
    pos = [100 + Math.random() * 80, 1, 100 + Math.random() * 80];
  } else if (data.zone === 'shadow') {
    pos = [-100 - Math.random() * 80, 1, 100 + Math.random() * 80]; 
  } else if (data.zone === 'sun') {
    pos = [(Math.random() - 0.5) * 100, 1, -100 - Math.random() * 80];
  } else {
    // Center
    pos = [(Math.random() - 0.5) * 40, 1, (Math.random() - 0.5) * 40];
  }

  const id = uuidv4();
  mobs[id] = {
    id,
    type,
    name: data.name,
    hp: data.hp,
    maxHp: data.hp,
    dmg: data.dmg,
    xpReward: data.xp,
    position: pos,
    rotation: Math.random() * Math.PI * 2,
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
    
    // 1. Find Target
    let closestPlayer = null;
    let minDist = 200;

    Object.values(players).forEach(p => {
      if (p.stats.hp <= 0) return; // Don't target dead
      const dx = p.position[0] - mob.position[0];
      const dz = p.position[2] - mob.position[2];
      const dist = Math.sqrt(dx*dx + dz*dz);
      if (dist < 20 && dist < minDist) { // Aggro range 20
        minDist = dist;
        closestPlayer = p;
      }
    });

    if (closestPlayer) {
      // Chase
      const dx = closestPlayer.position[0] - mob.position[0];
      const dz = closestPlayer.position[2] - mob.position[2];
      const dist = Math.sqrt(dx*dx + dz*dz);

      if (dist > 1.5) { // Move if not in range
        const speed = stats.speed;
        mob.position[0] += (dx / dist) * speed;
        mob.position[2] += (dz / dist) * speed;
        mob.rotation = Math.atan2(dx, dz);
        updateNeeded = true;
      }

      // Attack
      if (dist <= stats.range && Date.now() - mob.lastAttack > 1500) {
        mob.lastAttack = Date.now();
        closestPlayer.stats.hp -= stats.dmg;
        io.emit('player:damage', { 
          targetId: closestPlayer.id, 
          attackerId: mob.id, 
          damage: stats.dmg, 
          newHp: closestPlayer.stats.hp,
          isMob: true
        });
        
        // Respawn player if dead logic is handled in attack event usually, but here too
        if (closestPlayer.stats.hp <= 0) {
           // ... respawn logic reused or function extracted
           const spawn = FACTION_SPAWNS[closestPlayer.faction];
           closestPlayer.position = [
            spawn[0] + (Math.random() * 4 - 2),
            spawn[1],
            spawn[2] + (Math.random() * 4 - 2)
          ];
          closestPlayer.stats.hp = closestPlayer.stats.maxHp;
          io.emit('player:respawn', { id: closestPlayer.id, position: closestPlayer.position, hp: closestPlayer.stats.hp });
        }
      }
    } else {
      // Idle wander (simple jitter)
      if (Math.random() < 0.05) {
        mob.rotation += (Math.random() - 0.5);
        mob.position[0] += Math.sin(mob.rotation) * 0.5;
        mob.position[2] += Math.cos(mob.rotation) * 0.5;
        updateNeeded = true;
      }
    }
  });

  if (updateNeeded) {
    io.emit('mobs:update', mobs);
  }
}, 100); // 10 ticks per second

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Send existing players to new client immediately (so they can see others)
  // But only active players
  socket.emit('players:update', players);
  socket.emit('mobs:update', mobs);
  socket.emit('items:update', items);
  socket.emit('npcs:update', npcs);

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
            callback({ success: true, userId: user.id, characters: rows });
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
      INSERT INTO characters (user_id, name, faction, class, hp, max_hp, position_x, position_y, position_z, level, xp, gold)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0)
    `, [userId, name, faction, charClass, stats.hp, stats.hp, spawn[0], spawn[1], spawn[2]], function(err) {
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
        quests: {}, // { questId: { progress: 0, completed: false } }
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
        const inventory = JSON.parse(char.inventoryJson || '[]');
        const stats = CLASS_STATS[char.class] || { hp: 100, dmg: 10, range: 2 };

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
          gold: char.gold,
          position: [char.position_x, char.position_y, char.position_z],
          rotation: [0, char.rotation_y, 0]
        };

        console.log('Player added to world. Broadcasting...');

        // Broadcast join
        socket.broadcast.emit('players:update', players);
        socket.emit('player:joined', players[socket.id]);
        
        // Send current state
        socket.emit('players:update', players);
        
        callback({ success: true });
      } catch (e) {
        console.error('Error in character:select logic:', e);
        callback({ error: 'Server logic error' });
      }
    });
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
      options: [{ label: 'Adiós', action: 'close' }]
    };

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
    if (!player || !player.quests) return;
    
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
          // Check type from DB or item object.
          const isGold = item.type === 'currency' || (ITEMS_DB['gold'] && item.name === ITEMS_DB['gold'].name) || item.type === 'gold';

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

    if (item.type === 'consumable' && item.effect === 'heal') {
      // Heal logic
      const healAmount = item.value || 50;
      player.stats.hp = Math.min(player.stats.hp + healAmount, player.stats.maxHp);
      
      // Remove item
      player.inventory.splice(index, 1);
      
      // Notify
      io.emit('players:update', players);
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
        const BOUNDARY = 200;
        if (player.position[0] > BOUNDARY) player.position[0] = BOUNDARY;
        if (player.position[0] < -BOUNDARY) player.position[0] = -BOUNDARY;
        if (player.position[2] > BOUNDARY) player.position[2] = BOUNDARY;
        if (player.position[2] < -BOUNDARY) player.position[2] = -BOUNDARY;

      } else if (skill.type === 'drain') {
         // Damage closest enemy and heal
         // Simplified: just find one
         // ...
      }

      io.emit('players:update', players);
      io.emit('player:skillUsed', { id: socket.id, skill: skill.name, type: skill.type });
    }
  });

  socket.on('player:attack', () => {
    const attacker = players[socket.id];
    if (!attacker) return;

    const range = attacker.stats.range;
    const dmg = attacker.stats.dmg;
    
    // Broadcast attack start for animation
    io.emit('player:attacked', { id: socket.id });

    // Simple distance check hit detection (very naive for now)
    // In a real game, we'd check direction/cone too
    
    // 1. Check Players
    Object.values(players).forEach(target => {
      if (target.id === attacker.id) return; // Don't hit self
      if (target.faction === attacker.faction) return; // No friendly fire

      const dx = target.position[0] - attacker.position[0];
      const dz = target.position[2] - attacker.position[2];
      const dist = Math.sqrt(dx*dx + dz*dz);

      if (dist <= range) {
        // Hit!
        target.stats.hp -= dmg;
        
        // Notify everyone of the hit/damage
        io.emit('player:damage', { 
          targetId: target.id, 
          attackerId: attacker.id, 
          damage: dmg,
          newHp: target.stats.hp
        });

        if (target.stats.hp <= 0) {
          // Respawn logic
          const spawn = FACTION_SPAWNS[target.faction];
          target.position = [
            spawn[0] + (Math.random() * 4 - 2),
            spawn[1],
            spawn[2] + (Math.random() * 4 - 2)
          ];
          target.stats.hp = target.stats.maxHp;
          io.emit('player:respawn', { id: target.id, position: target.position, hp: target.stats.hp });
        }
      }
    });

    // 2. Check Mobs
    Object.keys(mobs).forEach(mobId => {
      const mob = mobs[mobId];
      const dx = mob.position[0] - attacker.position[0];
      const dz = mob.position[2] - attacker.position[2];
      const dist = Math.sqrt(dx*dx + dz*dz);

      if (dist <= range) {
        mob.hp -= dmg;
        io.emit('mob:damage', { mobId, damage: dmg, newHp: mob.hp });

        if (mob.hp <= 0) {
           // XP Reward
           if (attacker) {
             attacker.stats.xp += (mob.xpReward || 10);
             
             // Level Up Logic
             let leveledUp = false;
             while (attacker.stats.xp >= attacker.stats.maxXp) {
               attacker.stats.xp -= attacker.stats.maxXp;
               attacker.stats.level += 1;
               attacker.stats.maxXp = getXpForLevel(attacker.stats.level);
               
               // Stat increase
               attacker.stats.maxHp = Math.floor(attacker.stats.maxHp * 1.1);
               attacker.stats.hp = attacker.stats.maxHp; // Heal on level up
               attacker.stats.dmg = Math.floor(attacker.stats.dmg * 1.1);
               
               leveledUp = true;
             }

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
           }

           // Loot Drop
           if (Math.random() < 0.3) {
             spawnItem(mob.position, 'potion_hp');
           }
           if (Math.random() < 0.5) {
             spawnItem(mob.position, 'gold');
           }

           delete mobs[mobId];
           io.emit('mobs:update', mobs); 
        }
      }
    });

    io.emit('players:update', players);
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
    delete players[socket.id];
    io.emit('players:update', players);
  });

  // Future: Handle movement events
  socket.on('player:move', (data) => {
    if (players[socket.id]) {
      let pos = data.position;
      
      // Server-side validation for boundaries
      const BOUNDARY = 200;
      if (pos[0] > BOUNDARY) pos[0] = BOUNDARY;
      if (pos[0] < -BOUNDARY) pos[0] = -BOUNDARY;
      if (pos[2] > BOUNDARY) pos[2] = BOUNDARY;
      if (pos[2] < -BOUNDARY) pos[2] = -BOUNDARY;

      players[socket.id].position = pos;
      if (data.rotation) players[socket.id].rotation = data.rotation;
      
      socket.broadcast.emit('players:update', players);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
