import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'game.db');
const db = new sqlite3.Database(dbPath);

// Initialize Tables
db.serialize(() => {
  // Users Table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Characters Table
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

  // Inventory Table (Simple JSON storage for now or relational)
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      character_id INTEGER PRIMARY KEY,
      items TEXT DEFAULT '[]',
      FOREIGN KEY (character_id) REFERENCES characters(id)
    )
  `);

  // --- CONFIGURATION TABLES ---

  // Factions
  db.run(`
    CREATE TABLE IF NOT EXISTS factions (
      id TEXT PRIMARY KEY,
      name TEXT,
      spawn_x REAL,
      spawn_y REAL,
      spawn_z REAL
    )
  `, () => {
    // Seed Factions
    const FACTIONS = [
      ['sun', 'Orden del Sol', 0, 1, -160],
      ['shadow', 'Pacto de la Sombra', -160, 1, 100],
      ['nature', 'Alianza de la Naturaleza', 160, 1, 100]
    ];
    FACTIONS.forEach(f => {
      db.run('INSERT OR IGNORE INTO factions (id, name, spawn_x, spawn_y, spawn_z) VALUES (?, ?, ?, ?, ?)', f);
    });
  });

  // Classes
  db.run(`
    CREATE TABLE IF NOT EXISTS classes (
      name TEXT PRIMARY KEY,
      hp INTEGER,
      dmg INTEGER,
      range INTEGER,
      skill_2_json TEXT
    )
  `, () => {
    // Seed Classes
    const CLASSES = [
      ['Paladin', 120, 10, 2, JSON.stringify({ name: 'Luz Sagrada', cooldown: 5000, type: 'heal', value: 30 })],
      ['Cleric', 80, 8, 5, JSON.stringify({ name: 'Gran Curación', cooldown: 8000, type: 'heal', value: 60 })],
      ['Rogue', 70, 15, 2, JSON.stringify({ name: 'Paso Sombrío', cooldown: 4000, type: 'dash', value: 5 })],
      ['Druid', 100, 8, 2, JSON.stringify({ name: 'Rejuvenecer', cooldown: 6000, type: 'heal', value: 40 })],
      ['Hunter', 70, 12, 8, JSON.stringify({ name: 'Disparo Rápido', cooldown: 3000, type: 'damage', value: 20, range: 10 })],
      ['Necromancer', 80, 12, 6, JSON.stringify({ name: 'Drenar Vida', cooldown: 5000, type: 'drain', value: 20 })]
    ];
    CLASSES.forEach(c => {
      db.run('INSERT OR IGNORE INTO classes (name, hp, dmg, range, skill_2_json) VALUES (?, ?, ?, ?, ?)', c);
    });
  });

  // Mobs Data
  db.run(`
    CREATE TABLE IF NOT EXISTS mobs_data (
      type TEXT PRIMARY KEY,
      name TEXT,
      hp INTEGER,
      dmg INTEGER,
      xp INTEGER,
      speed REAL,
      range INTEGER,
      zone TEXT
    )
  `, () => {
    const MOBS = [
      ['wolf', 'Lobo Salvaje', 50, 5, 20, 0.2, 2, 'nature'],
      ['skeleton', 'Esqueleto Guerrero', 60, 8, 25, 0.15, 2, 'shadow'],
      ['bandit', 'Bandido del Desierto', 70, 7, 30, 0.18, 2, 'sun'],
      ['guardian', 'Guardián de Piedra', 200, 15, 100, 0.1, 3, 'center']
    ];
    MOBS.forEach(m => {
      db.run('INSERT OR IGNORE INTO mobs_data (type, name, hp, dmg, xp, speed, range, zone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', m);
    });
  });

  // Items Data
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
      ['potion_hp', 'Poción de Vida', 'consumable', 'heal', 50, 'red'],
      ['gold', 'Moneda de Oro', 'currency', null, 1, 'yellow']
    ];
    ITEMS.forEach(i => {
      db.run('INSERT OR IGNORE INTO items_data (type, name, item_type, effect, value, color) VALUES (?, ?, ?, ?, ?, ?)', i);
    });
  });
});

export default db;
