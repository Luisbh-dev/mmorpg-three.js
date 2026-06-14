// Item definitions, drop tables and shop stock. Pure data + helpers (no uuid /
// socket deps) so index.js stays lean. Item instances (with ids) are built in
// index.js from these defs.

export const RARITY_COLOR = {
  common: '#b9b2a3',
  uncommon: '#7bd88f',
  rare: '#5aa9ff',
  epic: '#b388ff',
  legendary: '#f0a93a'
};

export const SELL_VALUE_BY_RARITY = { common: 8, uncommon: 20, rare: 50, epic: 120, legendary: 300 };

// itemType: consumable | currency | equipment | quest. Equipment carries slot +
// rarity + stats (bonusDmg/bonusHp/bonusArmor/bonusRange/lifesteal).
export const ITEM_DEFS = {
  // Consumables / currency
  potion_hp: { name: 'Pocion de Vida', itemType: 'consumable', effect: 'heal', value: 50, color: '#e84b4b', price: 20, rarity: 'common' },
  potion_hp_large: { name: 'Pocion Mayor', itemType: 'consumable', effect: 'heal', value: 120, color: '#ff7a5a', price: 55, rarity: 'uncommon' },
  elixir_vigor: { name: 'Elixir de Vigor', itemType: 'consumable', effect: 'heal', value: 220, color: '#ffb05a', price: 120, rarity: 'rare' },
  gold: { name: 'Moneda de Oro', itemType: 'currency', value: 1, color: 'yellow', price: 0, rarity: 'common' },

  // Weapons
  iron_sword: { name: 'Espada de Hierro', itemType: 'equipment', slot: 'weapon', rarity: 'common', stats: { bonusDmg: 4 }, price: 8 },
  hunters_bow: { name: 'Arco de Cazador', itemType: 'equipment', slot: 'weapon', rarity: 'uncommon', stats: { bonusDmg: 6, bonusRange: 2 }, price: 20 },
  steel_blade: { name: 'Hoja de Acero', itemType: 'equipment', slot: 'weapon', rarity: 'rare', stats: { bonusDmg: 10 }, price: 50 },
  dawnedge: { name: 'Filo del Alba', itemType: 'equipment', slot: 'weapon', rarity: 'epic', stats: { bonusDmg: 16, bonusHp: 15 }, price: 120 },
  godslayer: { name: 'Hender Dioses', itemType: 'equipment', slot: 'weapon', rarity: 'legendary', stats: { bonusDmg: 26, lifesteal: 0.15 }, price: 300 },

  // Head
  leather_cap: { name: 'Gorro de Cuero', itemType: 'equipment', slot: 'head', rarity: 'common', stats: { bonusArmor: 2, bonusHp: 8 }, price: 8 },
  iron_helm: { name: 'Yelmo de Hierro', itemType: 'equipment', slot: 'head', rarity: 'uncommon', stats: { bonusArmor: 4, bonusHp: 14 }, price: 20 },
  warding_hood: { name: 'Capucha de Proteccion', itemType: 'equipment', slot: 'head', rarity: 'rare', stats: { bonusArmor: 6, bonusHp: 24 }, price: 50 },
  crown_of_embers: { name: 'Corona de Brasas', itemType: 'equipment', slot: 'head', rarity: 'epic', stats: { bonusArmor: 9, bonusHp: 40, bonusDmg: 4 }, price: 120 },

  // Chest
  leather_vest: { name: 'Coraza de Cuero', itemType: 'equipment', slot: 'chest', rarity: 'common', stats: { bonusArmor: 3, bonusHp: 12 }, price: 8 },
  chainmail: { name: 'Cota de Malla', itemType: 'equipment', slot: 'chest', rarity: 'uncommon', stats: { bonusArmor: 6, bonusHp: 24 }, price: 20 },
  plate_armor: { name: 'Armadura de Placas', itemType: 'equipment', slot: 'chest', rarity: 'rare', stats: { bonusArmor: 10, bonusHp: 45 }, price: 50 },
  aegis_of_dawn: { name: 'Egida del Amanecer', itemType: 'equipment', slot: 'chest', rarity: 'epic', stats: { bonusArmor: 15, bonusHp: 70 }, price: 120 },
  bulwark_eternal: { name: 'Baluarte Eterno', itemType: 'equipment', slot: 'chest', rarity: 'legendary', stats: { bonusArmor: 22, bonusHp: 110 }, price: 300 },

  // Legs
  cloth_leggings: { name: 'Calzas de Tela', itemType: 'equipment', slot: 'legs', rarity: 'common', stats: { bonusArmor: 2, bonusHp: 8 }, price: 8 },
  ranger_greaves: { name: 'Grebas de Montaraz', itemType: 'equipment', slot: 'legs', rarity: 'uncommon', stats: { bonusArmor: 4, bonusHp: 16, bonusRange: 1 }, price: 20 },
  plate_greaves: { name: 'Grebas de Placas', itemType: 'equipment', slot: 'legs', rarity: 'rare', stats: { bonusArmor: 7, bonusHp: 30 }, price: 50 },
  striders_of_might: { name: 'Zancadas de Poder', itemType: 'equipment', slot: 'legs', rarity: 'epic', stats: { bonusArmor: 11, bonusHp: 50, bonusDmg: 3 }, price: 120 },

  // Trinket
  copper_charm: { name: 'Amuleto de Cobre', itemType: 'equipment', slot: 'trinket', rarity: 'common', stats: { bonusHp: 10 }, price: 8 },
  band_of_vigor: { name: 'Anillo de Vigor', itemType: 'equipment', slot: 'trinket', rarity: 'uncommon', stats: { bonusHp: 20, bonusDmg: 2 }, price: 20 },
  sigil_of_wrath: { name: 'Sello de Ira', itemType: 'equipment', slot: 'trinket', rarity: 'rare', stats: { bonusDmg: 8, bonusArmor: 3 }, price: 50 },
  heart_of_the_wild: { name: 'Corazon Salvaje', itemType: 'equipment', slot: 'trinket', rarity: 'epic', stats: { bonusHp: 45, bonusDmg: 7, lifesteal: 0.08 }, price: 120 },
  eye_of_eternity: { name: 'Ojo de la Eternidad', itemType: 'equipment', slot: 'trinket', rarity: 'legendary', stats: { bonusDmg: 14, bonusHp: 60, bonusArmor: 8 }, price: 300 },

  // Boss + quest reward gear (not sold)
  boss_relic_blade: { name: 'Filo del Coloso', itemType: 'equipment', slot: 'weapon', rarity: 'epic', stats: { bonusDmg: 12, lifesteal: 0.05 }, color: '#ff7a3c', price: 0 },
  gear_sun_blade: { name: 'Espada del Alba', itemType: 'equipment', slot: 'weapon', rarity: 'rare', stats: { bonusDmg: 6 }, color: '#f4c95d', price: 0 },
  gear_shadow_focus: { name: 'Foco Umbrio', itemType: 'equipment', slot: 'trinket', rarity: 'rare', stats: { bonusDmg: 6 }, color: '#8a7dff', price: 0 },
  gear_nature_totem: { name: 'Totem Silvestre', itemType: 'equipment', slot: 'trinket', rarity: 'rare', stats: { bonusHp: 40 }, color: '#57c777', price: 0 },

  // Quest items (collectibles)
  relic_sun: { name: 'Reliquia del Alba', itemType: 'quest', color: '#f4c95d', rarity: 'common' },
  essence_shadow: { name: 'Esencia Sombria', itemType: 'quest', color: '#8a7dff', rarity: 'common' },
  pelt_nature: { name: 'Piel Salvaje', itemType: 'quest', color: '#57c777', rarity: 'common' },
  // Campaign collectibles (dropped by realm mobs while a collect quest is active)
  blight_sap: { name: 'Savia Corrupta', itemType: 'quest', color: '#7bbf6a', rarity: 'common' },
  heartwood_core: { name: 'Nucleo de Roble', itemType: 'quest', color: '#3f7d45', rarity: 'common' },
  bandit_insignia: { name: 'Insignia de Bandido', itemType: 'quest', color: '#c2a14f', rarity: 'common' },
  orc_tusk: { name: 'Colmillo de Orco', itemType: 'quest', color: '#8a9a5b', rarity: 'common' },
  cursed_bone: { name: 'Hueso Maldito', itemType: 'quest', color: '#c9c4bb', rarity: 'common' }
};

// mobType -> { chance, table: { itemCode: weight } }. Elite mobs already weighted.
export const DROP_TABLES = {
  wolf: { chance: 0.18, table: { leather_cap: 3, leather_vest: 3, cloth_leggings: 3, copper_charm: 2 } },
  spider: { chance: 0.18, table: { cloth_leggings: 3, copper_charm: 3, leather_cap: 2, hunters_bow: 1 } },
  skeleton: { chance: 0.20, table: { iron_sword: 3, leather_cap: 2, iron_helm: 2, chainmail: 2 } },
  bandit: { chance: 0.22, table: { iron_sword: 3, hunters_bow: 3, leather_vest: 2, band_of_vigor: 2 } },
  specter: { chance: 0.22, table: { sigil_of_wrath: 2, warding_hood: 2, band_of_vigor: 3, copper_charm: 2 } },
  orc: { chance: 0.24, table: { iron_sword: 2, steel_blade: 2, chainmail: 3, iron_helm: 2 } },
  treant: { chance: 0.30, table: { plate_armor: 3, plate_greaves: 3, steel_blade: 2, warding_hood: 2 } },
  wisp: { chance: 0.24, table: { sigil_of_wrath: 3, band_of_vigor: 2, warding_hood: 2, hunters_bow: 1 } },
  guardian: { chance: 0.55, table: { plate_armor: 3, plate_greaves: 3, steel_blade: 3, crown_of_embers: 1, aegis_of_dawn: 1, eye_of_eternity: 0.5 } },
  ogre: { chance: 0.60, table: { steel_blade: 3, dawnedge: 2, aegis_of_dawn: 2, striders_of_might: 2, bulwark_eternal: 1, godslayer: 0.5 } }
};

export function weightedPick(table) {
  const entries = Object.entries(table);
  let total = 0;
  entries.forEach(([, w]) => { total += w; });
  let r = Math.random() * total;
  for (let i = 0; i < entries.length; i += 1) {
    r -= entries[i][1];
    if (r <= 0) return entries[i][0];
  }
  return entries[0]?.[0];
}

// Returns an itemCode to drop, or null.
export function rollGearDrop(mobType) {
  const t = DROP_TABLES[mobType];
  if (!t) return null;
  if (Math.random() > t.chance) return null;
  return weightedPick(t.table);
}

export function sellValueOf(def) {
  if (!def) return 0;
  if (def.itemType === 'equipment') return SELL_VALUE_BY_RARITY[def.rarity] || 8;
  if (def.itemType === 'consumable') return Math.max(1, Math.floor((def.price || 0) * 0.4));
  return 0;
}

// Merchant stock (itemCodes). The general list is what capital/town pedlars and
// any merchant without a specific `shopKind` sell. Starter-city establishments
// each carry a focused subset so shops feel distinct.
export const SHOP_STOCK = [
  'potion_hp', 'potion_hp_large', 'elixir_vigor',
  'iron_sword', 'steel_blade', 'iron_helm', 'chainmail', 'plate_armor',
  'plate_greaves', 'band_of_vigor', 'sigil_of_wrath', 'dawnedge', 'crown_of_embers'
];

export const SHOP_STOCKS = {
  general: SHOP_STOCK,
  // Blacksmith: weapons + armour + a couple of combat trinkets.
  smith: [
    'iron_sword', 'steel_blade', 'dawnedge',
    'iron_helm', 'crown_of_embers',
    'chainmail', 'plate_armor',
    'plate_greaves', 'ranger_greaves',
    'band_of_vigor', 'sigil_of_wrath'
  ],
  // Apothecary: consumables only.
  alchemist: [
    'potion_hp', 'potion_hp_large', 'elixir_vigor'
  ],
  // Arcanist: trinkets + a single emergency potion.
  arcanist: [
    'copper_charm', 'band_of_vigor', 'sigil_of_wrath', 'heart_of_the_wild', 'eye_of_eternity', 'potion_hp_large'
  ],
  // Provisioner: traveler/ranger gear + consumables.
  provisioner: [
    'potion_hp', 'potion_hp_large', 'elixir_vigor', 'leather_cap', 'leather_vest', 'cloth_leggings', 'hunters_bow', 'ranger_greaves'
  ]
};
