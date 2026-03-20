import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'game.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT UNIQUE NOT NULL,
      faction TEXT NOT NULL,
      class TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      hp INTEGER DEFAULT 100,
      max_hp INTEGER DEFAULT 100,
      gold INTEGER DEFAULT 0,
      position_x REAL DEFAULT 0,
      position_y REAL DEFAULT 0,
      position_z REAL DEFAULT 0,
      rotation_y REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.all(`PRAGMA table_info(characters)`, (err, columns) => {
    if (err || !columns) return;

    const hasQuestsJson = columns.some((column) => column.name === 'quests_json');
    if (!hasQuestsJson) {
      db.run(`ALTER TABLE characters ADD COLUMN quests_json TEXT DEFAULT '{}'`);
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      character_id INTEGER PRIMARY KEY,
      items TEXT DEFAULT '[]',
      FOREIGN KEY (character_id) REFERENCES characters(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS factions (
      id TEXT PRIMARY KEY,
      name TEXT,
      spawn_x REAL,
      spawn_y REAL,
      spawn_z REAL
    )
  `, () => {
    const FACTIONS = [
      ['sun', 'Orden del Sol', 0, 1, -160],
      ['shadow', 'Pacto de la Sombra', -160, 1, 100],
      ['nature', 'Alianza de la Naturaleza', 160, 1, 100]
    ];

    FACTIONS.forEach((faction) => {
      db.run(
        'INSERT OR IGNORE INTO factions (id, name, spawn_x, spawn_y, spawn_z) VALUES (?, ?, ?, ?, ?)',
        faction
      );
    });
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS classes (
      name TEXT PRIMARY KEY,
      hp INTEGER,
      dmg INTEGER,
      range INTEGER,
      skill_2_json TEXT
    )
  `, () => {
    const CLASSES = [
      ['Paladin', 120, 10, 2, JSON.stringify({ name: 'Luz Sagrada', cooldown: 5000, type: 'heal', value: 30 })],
      ['Cleric', 80, 8, 5, JSON.stringify({ name: 'Gran Curacion', cooldown: 8000, type: 'heal', value: 60 })],
      ['Rogue', 70, 15, 2, JSON.stringify({ name: 'Paso Sombrio', cooldown: 4000, type: 'dash', value: 5 })],
      ['Druid', 100, 8, 2, JSON.stringify({ name: 'Rejuvenecer', cooldown: 6000, type: 'heal', value: 40 })],
      ['Hunter', 70, 12, 8, JSON.stringify({ name: 'Disparo Rapido', cooldown: 3000, type: 'damage', value: 20, range: 10 })],
      ['Necromancer', 80, 12, 6, JSON.stringify({ name: 'Drenar Vida', cooldown: 5000, type: 'drain', value: 20 })]
    ];

    CLASSES.forEach((klass) => {
      db.run(
        'INSERT OR IGNORE INTO classes (name, hp, dmg, range, skill_2_json) VALUES (?, ?, ?, ?, ?)',
        klass
      );
    });
  });

  db.run(`DROP TABLE IF EXISTS mobs_data`);

  db.run(`
    CREATE TABLE mobs_data (
      type TEXT PRIMARY KEY,
      name TEXT,
      hp INTEGER,
      dmg INTEGER,
      xp INTEGER,
      speed REAL,
      range INTEGER,
      zone TEXT,
      role TEXT DEFAULT 'melee',
      size REAL DEFAULT 1,
      elite INTEGER DEFAULT 0,
      glow TEXT DEFAULT '#ffffff'
    )
  `, () => {
    const MOBS = [
      ['wolf', 'Lobo Salvaje', 50, 5, 20, 0.2, 2, 'nature', 'melee', 1, 0, '#8d6e63'],
      ['spider', 'Aracnido Abisal', 46, 6, 24, 0.23, 2, 'nature', 'ambusher', 0.85, 0, '#91a85d'],
      ['treant', 'Guardia del Bosque', 150, 12, 75, 0.12, 2, 'nature', 'brute', 1.45, 0, '#4f7d45'],
      ['skeleton', 'Esqueleto Guerrero', 60, 8, 25, 0.15, 2, 'shadow', 'melee', 1, 0, '#d8d7d2'],
      ['specter', 'Espectro Umbrio', 55, 10, 30, 0.18, 6, 'shadow', 'caster', 1.05, 0, '#8a7dff'],
      ['bandit', 'Bandido del Desierto', 70, 7, 30, 0.18, 3, 'sun', 'ranged', 1, 0, '#6e4b3a'],
      ['orc', 'Orco de Guardia', 95, 11, 42, 0.16, 2, 'sun', 'brute', 1.2, 0, '#6f7d4c'],
      ['guardian', 'Guardian de Piedra', 200, 15, 100, 0.1, 3, 'center', 'tank', 1.6, 1, '#b7b1a3'],
      ['wisp', 'Llama Astral', 42, 9, 36, 0.26, 5, 'center', 'caster', 0.8, 0, '#74d7ff'],
      ['ogre', 'Ogro de Guerra', 220, 18, 120, 0.09, 2, 'center', 'brute', 1.8, 1, '#8a5a3b']
    ];

    MOBS.forEach((mob) => {
      db.run(
        'INSERT OR IGNORE INTO mobs_data (type, name, hp, dmg, xp, speed, range, zone, role, size, elite, glow) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        mob
      );
    });
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS items_data (
      type TEXT PRIMARY KEY,
      name TEXT,
      item_type TEXT,
      effect TEXT,
      value INTEGER,
      color TEXT
    )
  `, () => {
    const ITEMS = [
      ['potion_hp', 'Pocion de Vida', 'consumable', 'heal', 50, 'red'],
      ['gold', 'Moneda de Oro', 'currency', null, 1, 'yellow']
    ];

    ITEMS.forEach((item) => {
      db.run(
        'INSERT OR IGNORE INTO items_data (type, name, item_type, effect, value, color) VALUES (?, ?, ?, ?, ?, ?)',
        item
      );
    });
  });
});

export default db;
