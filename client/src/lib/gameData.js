export const MAP_RADIUS = 1050;
export const WORLD_BOUNDARY = 1020;
export const WAR_ZONE_RADIUS = 150;
export const REALM_EDGE = 380; // |axis| beyond which you're in a faction realm

// Outward direction of each faction homeland from the center, + a perpendicular
// used to spread settlements laterally inside the sector.
const FACTION_AXES = {
  sun: { fx: 0, fz: -1 },
  shadow: { fx: -1, fz: 0 },
  nature: { fx: 1, fz: 0 }
};

// Settlement layout template (distance from center `d`, lateral offset `l`).
// Same shape for every faction so the world is symmetric and fair.
const SETTLEMENT_TEMPLATE = [
  { key: 'capital', type: 'capital', d: 980, l: 0 },
  { key: 'starter', type: 'city', d: 560, l: 0, starter: true },
  { key: 'city2', type: 'city', d: 820, l: -300 },
  { key: 'city3', type: 'city', d: 760, l: 320 },
  { key: 'town_a', type: 'town', d: 640, l: -180 },
  { key: 'town_b', type: 'town', d: 520, l: 250 },
  { key: 'town_c', type: 'town', d: 880, l: 150 },
  { key: 'village_a', type: 'village', d: 470, l: -210 },
  { key: 'village_b', type: 'village', d: 700, l: 100 },
  { key: 'village_c', type: 'village', d: 600, l: -340 },
  { key: 'outpost_a', type: 'outpost', d: 400, l: 70 },
  { key: 'outpost_b', type: 'outpost', d: 440, l: -260 }
];

// Per-settlement IDENTITY (indexed 1:1 with SETTLEMENT_TEMPLATE). theme drives the
// signature structure; vendorKind picks the SHOP_STOCKS specialty; establishmentKinds
// lists which interactive buildings to spawn (empty = none, just a signature). So each
// city reads distinctly and travel between them is rewarded.
const SETTLEMENT_PROFILES = [
  { theme: 'seat', themeLabel: 'Sede del Poder', specialty: 'Corte real y mercado mayor', vendorKind: 'general',
    establishmentKinds: ['townhall', 'smith', 'apothecary', 'tavern', 'temple', 'barracks'], questHub: true, signature: 'throne_banners' },
  { theme: 'civic', themeLabel: 'Ciudad Inicial', specialty: 'Servicios completos para aventureros', vendorKind: 'general',
    establishmentKinds: ['townhall', 'smith', 'apothecary', 'tavern', 'temple', 'barracks'], questHub: true, signature: 'market_stalls' },
  { theme: 'forge', themeLabel: 'Ciudad Forja', specialty: 'Las mejores armas y armaduras', vendorKind: 'smith',
    establishmentKinds: ['smith', 'townhall', 'tavern', 'barracks'], questHub: true, signature: 'forge_anvil' },
  { theme: 'arcane', themeLabel: 'Ciudad Arcana', specialty: 'Reliquias y abalorios de poder', vendorKind: 'arcanist',
    establishmentKinds: ['arcanist', 'temple', 'tavern', 'townhall'], questHub: true, signature: 'arcane_obelisk' },
  { theme: 'trade', themeLabel: 'Pueblo Mercante', specialty: 'Suministros para el largo camino', vendorKind: 'provisioner',
    establishmentKinds: ['provisioner', 'tavern', 'townhall'], questHub: true, signature: 'market_stalls' },
  { theme: 'sacred', themeLabel: 'Pueblo Sagrado', specialty: 'Pociones y santuario', vendorKind: 'alchemist',
    establishmentKinds: ['apothecary', 'temple', 'tavern'], signature: 'temple_spire' },
  { theme: 'granary', themeLabel: 'Pueblo Granero', specialty: 'Provisiones y descanso', vendorKind: 'provisioner',
    establishmentKinds: ['provisioner', 'tavern'], signature: 'granary' },
  { theme: 'hunt', themeLabel: 'Aldea Cazadora', specialty: 'Equipo de montaraz', vendorKind: 'provisioner',
    establishmentKinds: ['provisioner', 'tavern'], questHub: true, signature: 'hunters_totem' },
  { theme: 'forge_small', themeLabel: 'Aldea Herrera', specialty: 'Forja de aldea', vendorKind: 'smith',
    establishmentKinds: ['smith', 'tavern'], signature: 'forge_anvil' },
  { theme: 'herbal', themeLabel: 'Aldea Botánica', specialty: 'Boticario rural', vendorKind: 'alchemist',
    establishmentKinds: ['apothecary'], signature: 'temple_spire' },
  { theme: 'watch', themeLabel: 'Atalaya', specialty: 'Puesto de vigilancia', vendorKind: null,
    establishmentKinds: ['tavern'], signature: 'watch_brazier' },
  { theme: 'watch', themeLabel: 'Reducto', specialty: 'Reducto fronterizo', vendorKind: null,
    establishmentKinds: [], signature: 'watch_brazier' }
];

// Flavour names per faction, indexed to match SETTLEMENT_TEMPLATE order.
const FACTION_NAMES = {
  sun: {
    label: 'Orden del Sol', short: 'Sol',
    list: [
      { name: 'Bastion del Amanecer', short: 'Capital del Sol' },
      { name: 'Ciudad de Aurel', short: 'Ciudad Inicial' },
      { name: 'Solmork', short: 'Ciudad Dorada' },
      { name: 'Heliox', short: 'Ciudad del Sol' },
      { name: 'Pueblo de Lumen', short: 'Pueblo Solar' },
      { name: 'Vado de Oro', short: 'Pueblo del Vado' },
      { name: 'Granero de Helia', short: 'Pueblo del Grano' },
      { name: 'Ladera del Alba', short: 'Aldea del Alba' },
      { name: 'Trigales', short: 'Aldea Dorada' },
      { name: 'Espigas', short: 'Aldea de Espigas' },
      { name: 'Fuerte del Horizonte', short: 'Fuerte Solar' },
      { name: 'Atalaya de Bronce', short: 'Atalaya Solar' }
    ]
  },
  shadow: {
    label: 'Pacto de la Sombra', short: 'Sombra',
    list: [
      { name: 'Torre del Crepusculo', short: 'Capital de Sombra' },
      { name: 'Vela Nocturna', short: 'Ciudad Inicial' },
      { name: 'Nyxgrad', short: 'Ciudad Umbria' },
      { name: 'Umbravale', short: 'Ciudad de Sombra' },
      { name: 'Pueblo de Marea Negra', short: 'Pueblo Umbrio' },
      { name: 'Cripta de Veln', short: 'Pueblo de Cripta' },
      { name: 'Sombrahondo', short: 'Pueblo Hondo' },
      { name: 'Bosque de las Brumas', short: 'Aldea de Bruma' },
      { name: 'Sepulcro de Hollin', short: 'Aldea de Hollin' },
      { name: 'Velo Gris', short: 'Aldea del Velo' },
      { name: 'Atalaya del Eclipse', short: 'Atalaya Oscura' },
      { name: 'Fuerte de Ceniza', short: 'Fuerte Umbrio' }
    ]
  },
  nature: {
    label: 'Alianza de la Naturaleza', short: 'Naturaleza',
    list: [
      { name: 'Corazon Verde', short: 'Capital Natural' },
      { name: 'Raizal', short: 'Ciudad Inicial' },
      { name: 'Sylvaheim', short: 'Ciudad Verde' },
      { name: 'Frondavera', short: 'Ciudad del Bosque' },
      { name: 'Pueblo de Niebla Clara', short: 'Pueblo del Bosque' },
      { name: 'Claro de Musgo', short: 'Pueblo del Claro' },
      { name: 'Valdehoja', short: 'Pueblo de la Hoja' },
      { name: 'Prado de Hoja', short: 'Aldea Verde' },
      { name: 'Soto de Robles', short: 'Aldea del Roble' },
      { name: 'Helechal', short: 'Aldea del Helecho' },
      { name: 'Vigilia de Raices', short: 'Atalaya Verde' },
      { name: 'Fuerte de Espinas', short: 'Fuerte Verde' }
    ]
  }
};

function placeInSector(faction, d, l) {
  const { fx, fz } = FACTION_AXES[faction];
  const px = -fz; // perpendicular
  const pz = fx;
  return [(fx * d) + (px * l), 1, (fz * d) + (pz * l)];
}

function buildSettlements(faction) {
  const names = FACTION_NAMES[faction].list;
  return SETTLEMENT_TEMPLATE.map((tpl, index) => ({
    id: `${faction}_${tpl.key}`,
    key: tpl.key,
    name: names[index].name,
    shortName: names[index].short,
    faction,
    type: tpl.type,
    starter: Boolean(tpl.starter),
    position: placeInSector(faction, tpl.d, tpl.l),
    ...(SETTLEMENT_PROFILES[index] || {})
  }));
}

const FACTION_SETTLEMENTS = {
  sun: buildSettlements('sun'),
  shadow: buildSettlements('shadow'),
  nature: buildSettlements('nature')
};

export const FACTION_SPAWNS = {
  sun: FACTION_SETTLEMENTS.sun.find((s) => s.starter).position,
  shadow: FACTION_SETTLEMENTS.shadow.find((s) => s.starter).position,
  nature: FACTION_SETTLEMENTS.nature.find((s) => s.starter).position
};

// --- Interactive establishments inside each faction's starter city ---
// Each is a signposted building with its service NPC at the door, arranged in a
// ring around the spawn plaza so the starter city reads as a real, living town.
const FACTION_QUEST_NPC = { sun: 'quest_bandit', shadow: 'quest_skeleton', nature: 'quest_wolf' };

const ESTABLISHMENT_TEMPLATE = [
  { key: 'townhall',   name: 'Ayuntamiento', kind: 'townhall',   npcName: 'Comandante',       role: 'commander', npcType: 'quest_giver', model: 'block' },
  { key: 'smith',      name: 'Herreria',     kind: 'smith',      npcName: 'Herrero',          role: 'merchant',  npcType: 'merchant',   shopKind: 'smith',     model: 'towerA' },
  { key: 'apothecary', name: 'Botica',       kind: 'apothecary', npcName: 'Boticario',        role: 'merchant',  npcType: 'merchant',   shopKind: 'alchemist', model: 'houseB' },
  { key: 'tavern',     name: 'Taberna',      kind: 'tavern',     npcName: 'Tabernero',        role: 'innkeeper', npcType: 'innkeeper',  model: 'houseC' },
  { key: 'temple',     name: 'Templo',       kind: 'temple',     npcName: 'Sacerdote',        role: 'healer',    npcType: 'healer',     model: 'towerB' },
  { key: 'barracks',   name: 'Cuartel',      kind: 'barracks',   npcName: 'Maestro de Armas', role: 'trainer',   npcType: 'trainer',    model: 'houseA' },
  { key: 'arcanist',   name: 'Arcanorium',   kind: 'arcanist',   npcName: 'Arcanista',        role: 'merchant',  npcType: 'merchant',   shopKind: 'arcanist',  model: 'towerB' },
  { key: 'provisioner', name: 'Mercado',     kind: 'provisioner', npcName: 'Proveedor',       role: 'merchant',  npcType: 'merchant',   shopKind: 'provisioner', model: 'houseA' }
];
const EST_BY_KIND = Object.fromEntries(ESTABLISHMENT_TEMPLATE.map((t) => [t.kind, t]));

const EST_PAD_Y = 1.0; // matches SETTLEMENT_PAD in terrain.js (flat city pad)
// Building/NPC ring radius per settlement type (kept inside the flat terrain pad
// so structures sit level and NPCs stay within talk range).
const EST_RING_BY_TYPE = {
  capital: { ring: 24, npc: 20 },
  city: { ring: 18, npc: 14 },
  town: { ring: 15, npc: 12 },
  village: { ring: 11, npc: 8 },
  outpost: { ring: 11, npc: 8 }
};

// Spawn the interactive establishments declared by each settlement's profile,
// across the WHOLE map (not just the starter city).
function buildEstablishments(faction) {
  const out = [];
  FACTION_SETTLEMENTS[faction].forEach((settlement) => {
    const kinds = settlement.establishmentKinds || [];
    if (!kinds.length) return;
    const cx = settlement.position[0];
    const cz = settlement.position[2];
    const rad = EST_RING_BY_TYPE[settlement.type] || EST_RING_BY_TYPE.town;
    kinds.forEach((kind, index) => {
      const tpl = EST_BY_KIND[kind];
      if (!tpl) return;
      const angle = (index / kinds.length) * Math.PI * 2;
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      // The legacy 3-kill quest is only offered by the STARTER townhall commander.
      const isStarterQuestGiver = tpl.npcType === 'quest_giver' && settlement.starter;
      out.push({
        id: `est_${settlement.id}_${kind}`,
        npcId: `npc_${settlement.id}_${kind}`,
        settlementId: settlement.id,
        faction,
        kind: tpl.kind,
        name: tpl.name,
        model: tpl.model,
        theme: settlement.theme,
        themeLabel: settlement.themeLabel,
        position: [cx + (sin * rad.ring), EST_PAD_Y, cz + (cos * rad.ring)],
        facing: angle + Math.PI,
        npcName: tpl.npcName,
        npcType: isStarterQuestGiver ? 'quest_giver' : (tpl.npcType === 'quest_giver' ? 'commander' : tpl.npcType),
        role: tpl.role,
        shopKind: tpl.shopKind,
        questId: isStarterQuestGiver ? FACTION_QUEST_NPC[faction] : undefined,
        npcPosition: [cx + (sin * rad.npc), 1, cz + (cos * rad.npc)]
      });
    });
  });
  return out;
}

const FACTION_ESTABLISHMENTS = {
  sun: buildEstablishments('sun'),
  shadow: buildEstablishments('shadow'),
  nature: buildEstablishments('nature')
};

export const ESTABLISHMENTS = [
  ...FACTION_ESTABLISHMENTS.sun,
  ...FACTION_ESTABLISHMENTS.shadow,
  ...FACTION_ESTABLISHMENTS.nature
];

function buildNPCs(faction) {
  const fname = FACTION_NAMES[faction];
  const starter = FACTION_SETTLEMENTS[faction].find((s) => s.starter);
  const npcs = [];

  // One service NPC at the door of every establishment, across all cities.
  FACTION_ESTABLISHMENTS[faction].forEach((est) => {
    npcs.push({
      id: est.npcId,
      name: est.npcName,
      faction,
      role: est.role,
      type: est.npcType,
      shopKind: est.shopKind,
      establishment: est.kind,
      themeLabel: est.themeLabel,
      questId: est.questId,
      position: est.npcPosition
    });
  });

  // Settlements with a vendor specialty but NO establishment buildings still get a
  // lone themed merchant so their identity is felt.
  FACTION_SETTLEMENTS[faction].forEach((s) => {
    if ((s.establishmentKinds || []).length) return;
    if (!s.vendorKind) return;
    npcs.push({ id: `npc_${s.id}_vendor`, name: `Mercader de ${s.shortName}`, faction, role: 'merchant', type: 'merchant', shopKind: s.vendorKind, themeLabel: s.themeLabel, position: [s.position[0] + 6, 1, s.position[2] + 6] });
  });

  // Ambient guard + citizen near the starter-city entrance.
  npcs.push({ id: `npc_${faction}_guard`, name: `Guardia de ${fname.short}`, faction, role: 'guard', type: 'guard', position: [starter.position[0], 1, starter.position[2] + 26] });
  npcs.push({ id: `npc_${faction}_citizen`, name: 'Aldeano', faction, role: 'citizen', type: 'citizen', position: [starter.position[0] - 24, 1, starter.position[2] + 10] });

  return npcs;
}

const NEUTRAL_LANDMARKS = [
  { id: 'war_forge', name: 'Forja de Guerra', shortName: 'Forja Central', faction: 'system', type: 'fortress', position: [0, 1, -55] },
  { id: 'war_arena', name: 'Anfiteatro de Guerra', shortName: 'Arena Central', faction: 'system', type: 'arena', position: [0, 1, 50] },
  { id: 'war_gate_n', name: 'Puerta del Norte', shortName: 'Acceso Norte', faction: 'system', type: 'gate', position: [0, 1, -150] },
  { id: 'war_gate_s', name: 'Puerta del Sur', shortName: 'Acceso Sur', faction: 'system', type: 'gate', position: [0, 1, 150] },
  { id: 'war_gate_w', name: 'Puerta de Ceniza', shortName: 'Acceso Oeste', faction: 'system', type: 'gate', position: [-150, 1, 0] },
  { id: 'war_gate_e', name: 'Puerta de Raiz', shortName: 'Acceso Este', faction: 'system', type: 'gate', position: [150, 1, 0] },
  { id: 'outer_ruins', name: 'Ruinas del Juramento', shortName: 'Ruinas Centrales', faction: 'system', type: 'ruins', position: [-90, 1, -110] }
];

export const LANDMARKS = [
  ...FACTION_SETTLEMENTS.sun,
  ...FACTION_SETTLEMENTS.shadow,
  ...FACTION_SETTLEMENTS.nature,
  ...NEUTRAL_LANDMARKS
];

// A road from each capital, through the starter city, to the war-zone gate.
function buildRoad(faction) {
  const { fx, fz } = FACTION_AXES[faction];
  const dists = [720, 540, 380, WAR_ZONE_RADIUS + 6];
  return {
    id: `${faction}_road`,
    faction,
    points: dists.map((d) => [fx * d, fz * d])
  };
}

export const ROADS = [buildRoad('sun'), buildRoad('shadow'), buildRoad('nature')];

// --- Main campaign story envoys (one per hub settlement; the questline routes
// the player between them). ids follow the convention story_<faction>_<key> so
// the server can build the campaign by settlement key without extra exports. ---
const STORY_HUBS = [
  { key: 'starter', title: 'Cronista', dx: 6, dz: 6 },
  { key: 'village_a', title: 'Exploradora', dx: 0, dz: 6 },
  { key: 'town_a', title: 'Capitan de la Guardia', dx: 0, dz: 6 },
  { key: 'city2', title: 'Maestre', dx: 0, dz: 6 },
  { key: 'city3', title: 'General', dx: 0, dz: 6 },
  { key: 'capital', title: 'Soberano', dx: 0, dz: 10 }
];

function buildStoryNPCs(faction) {
  const fname = FACTION_NAMES[faction];
  return STORY_HUBS.map((hub) => {
    const settlement = FACTION_SETTLEMENTS[faction].find((s) => s.id === `${faction}_${hub.key}`);
    if (!settlement) return null;
    return {
      id: `story_${faction}_${hub.key}`,
      name: `${hub.title} de ${fname.short}`,
      faction,
      role: 'story',
      type: 'story_giver',
      position: [settlement.position[0] + hub.dx, 1, settlement.position[2] + hub.dz]
    };
  }).filter(Boolean);
}

export const NPCS = [
  ...buildStoryNPCs('sun'),
  ...buildStoryNPCs('shadow'),
  ...buildStoryNPCs('nature'),
  ...buildNPCs('sun'),
  ...buildNPCs('shadow'),
  ...buildNPCs('nature')
];

// Wilderness set-pieces spread across the much larger frontier.
function buildPOIs() {
  const out = [];
  const add = (id, name, type, faction, pos, radius) => out.push({ id, name, type, faction, position: pos, radius });
  // Per-faction wilderness camps/ruins/shrines spread through each realm.
  Object.keys(FACTION_AXES).forEach((faction) => {
    add(`poi_${faction}_camp`, 'Campamento Bandido', 'camp', faction, placeInSector(faction, 470, 140), 7);
    add(`poi_${faction}_shrine`, 'Altar Antiguo', 'shrine', faction, placeInSector(faction, 520, -180), 5);
    add(`poi_${faction}_ruins`, 'Ruinas Olvidadas', 'ruins', faction, placeInSector(faction, 700, 300), 7);
    add(`poi_${faction}_camp2`, 'Guarida Salvaje', 'camp', faction, placeInSector(faction, 860, -250), 7);
    add(`poi_${faction}_shrine2`, 'Santuario Perdido', 'shrine', faction, placeInSector(faction, 920, 200), 5);
  });
  // Contested frontier zones between the realms + war front.
  add('poi_frontier_ruins', 'Ruinas del Juramento', 'ruins', 'system', [-60, 1, 320], 8);
  add('poi_frontier_shrine', 'Piedra del Pacto', 'shrine', 'system', [160, 1, 420], 6);
  add('poi_frontier_camp', 'Reducto Mercenario', 'camp', 'system', [-240, 1, -240], 7);
  add('poi_frontier_camp2', 'Atalaya Caida', 'ruins', 'system', [260, 1, -240], 7);
  return out;
}

export const POINTS_OF_INTEREST = buildPOIs();

export const FACTION_META = {
  sun: { id: 'sun', label: 'Orden del Sol', shortLabel: 'Sol', color: '#f4c95d', glow: '#fff1a6' },
  shadow: { id: 'shadow', label: 'Pacto de la Sombra', shortLabel: 'Sombra', color: '#8a7dff', glow: '#cbbfff' },
  nature: { id: 'nature', label: 'Alianza de la Naturaleza', shortLabel: 'Naturaleza', color: '#57c777', glow: '#c4f1be' },
  system: { id: 'system', label: 'Sistema', shortLabel: 'Sistema', color: '#74d7ff', glow: '#d4f4ff' }
};

export function getFactionMeta(faction) {
  return FACTION_META[faction] || { id: faction || 'neutral', label: faction || 'Neutral', shortLabel: faction || 'Neutral', color: '#d9d9d9', glow: '#ffffff' };
}

export function getLandmarkById(id) {
  return LANDMARKS.find((landmark) => landmark.id === id);
}

export function getLandmarkColor(landmark) {
  return getFactionMeta(landmark?.faction).color;
}

// Single source of truth for which realm a world point belongs to.
export function getRealmAt(x, z) {
  const dist = Math.sqrt((x * x) + (z * z));
  if (dist <= WAR_ZONE_RADIUS) return 'war';
  if (z <= -REALM_EDGE) return 'sun';
  if (x <= -REALM_EDGE) return 'shadow';
  if (x >= REALM_EDGE) return 'nature';
  return 'frontier';
}

export function getNearestLandmark(position = [0, 0, 0], maxDistance = 90) {
  let nearest = null;
  let nearestDistance = maxDistance;
  LANDMARKS.forEach((landmark) => {
    const dx = position[0] - landmark.position[0];
    const dz = position[2] - landmark.position[2];
    const distance = Math.sqrt((dx * dx) + (dz * dz));
    if (distance <= nearestDistance) {
      nearestDistance = distance;
      nearest = landmark;
    }
  });
  return nearest;
}

const REALM_INFO = {
  war: { id: 'war', name: 'Zona de Guerra', subtitle: 'Fortalezas disputadas en el centro', color: '#ff846b' },
  sun: { id: 'sun_realm', name: 'Reino del Alba', subtitle: 'Ciudades, campos y rutas del norte', color: FACTION_META.sun.color },
  shadow: { id: 'shadow_realm', name: 'Dominio Umbrio', subtitle: 'Murallas, criptas y caminos del oeste', color: FACTION_META.shadow.color },
  nature: { id: 'nature_realm', name: 'Territorio Verde', subtitle: 'Selvas, aldeas y arboledas del este', color: FACTION_META.nature.color },
  frontier: { id: 'frontier', name: 'Tierras Fronterizas', subtitle: 'Caravanas y rutas entre reinos', color: '#c3b48a' }
};

export function getZoneFromPosition(position = [0, 0, 0]) {
  const realm = getRealmAt(position[0], position[2]);
  if (realm === 'war') return REALM_INFO.war;

  const nearestLandmark = getNearestLandmark(position, 70);
  if (nearestLandmark) {
    const factionMeta = getFactionMeta(nearestLandmark.faction);
    return {
      id: nearestLandmark.id,
      name: nearestLandmark.name,
      subtitle: `${nearestLandmark.shortName} de ${factionMeta.label}`,
      color: getLandmarkColor(nearestLandmark)
    };
  }
  return REALM_INFO[realm] || REALM_INFO.frontier;
}

export function getFactionControlBonus(controlPoints = {}, faction) {
  const owned = Object.values(controlPoints).filter((point) => point.owner === faction).length;
  return { owned, bonusPct: owned * 5 };
}

export function getQuestTitle(questDefinitions = {}, questId) {
  return questDefinitions[questId]?.title || 'Mision';
}
