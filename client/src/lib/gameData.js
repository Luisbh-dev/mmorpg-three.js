export const MAP_RADIUS = 320;
export const WORLD_BOUNDARY = 310;
export const WAR_ZONE_RADIUS = 86;

export const FACTION_SPAWNS = {
  sun: [-82, 1, -210],
  shadow: [-202, 1, 58],
  nature: [202, 1, 58]
};

const FACTION_SETTLEMENTS = {
  sun: [
    {
      id: 'sun_capital',
      name: 'Bastion del Amanecer',
      shortName: 'Capital del Sol',
      faction: 'sun',
      type: 'capital',
      position: [0, 1, -248]
    },
    {
      id: 'sun_city',
      name: 'Ciudad de Aurel',
      shortName: 'Ciudad Dorada',
      faction: 'sun',
      type: 'city',
      position: [-82, 1, -210]
    },
    {
      id: 'sun_town',
      name: 'Pueblo de Lumen',
      shortName: 'Pueblo Solar',
      faction: 'sun',
      type: 'town',
      position: [84, 1, -202]
    },
    {
      id: 'sun_village',
      name: 'Ladera del Alba',
      shortName: 'Aldea del Alba',
      faction: 'sun',
      type: 'village',
      position: [0, 1, -176]
    },
    {
      id: 'sun_outpost',
      name: 'Fuerte del Horizonte',
      shortName: 'Fuerte Solar',
      faction: 'sun',
      type: 'outpost',
      position: [0, 1, -132]
    }
  ],
  shadow: [
    {
      id: 'shadow_capital',
      name: 'Torre del Crepusculo',
      shortName: 'Capital de Sombra',
      faction: 'shadow',
      type: 'capital',
      position: [-250, 1, 134]
    },
    {
      id: 'shadow_city',
      name: 'Ciudad de Vela Nocturna',
      shortName: 'Ciudad Umbria',
      faction: 'shadow',
      type: 'city',
      position: [-202, 1, 58]
    },
    {
      id: 'shadow_town',
      name: 'Pueblo de Marea Negra',
      shortName: 'Pueblo Umbrio',
      faction: 'shadow',
      type: 'town',
      position: [-176, 1, 178]
    },
    {
      id: 'shadow_village',
      name: 'Bosque de las Brumas',
      shortName: 'Aldea de Bruma',
      faction: 'shadow',
      type: 'village',
      position: [-132, 1, 112]
    },
    {
      id: 'shadow_outpost',
      name: 'Atalaya del Eclipse',
      shortName: 'Atalaya Oscura',
      faction: 'shadow',
      type: 'outpost',
      position: [-132, 1, 12]
    }
  ],
  nature: [
    {
      id: 'nature_capital',
      name: 'Corazon Verde',
      shortName: 'Capital Natural',
      faction: 'nature',
      type: 'capital',
      position: [250, 1, 134]
    },
    {
      id: 'nature_city',
      name: 'Ciudad de Raizal',
      shortName: 'Ciudad Verde',
      faction: 'nature',
      type: 'city',
      position: [202, 1, 58]
    },
    {
      id: 'nature_town',
      name: 'Pueblo de Niebla Clara',
      shortName: 'Pueblo del Bosque',
      faction: 'nature',
      type: 'town',
      position: [176, 1, 178]
    },
    {
      id: 'nature_village',
      name: 'Prado de Hoja',
      shortName: 'Aldea Verde',
      faction: 'nature',
      type: 'village',
      position: [132, 1, 112]
    },
    {
      id: 'nature_outpost',
      name: 'Vigilia de Raices',
      shortName: 'Atalaya Verde',
      faction: 'nature',
      type: 'outpost',
      position: [132, 1, 12]
    }
  ]
};

const NEUTRAL_LANDMARKS = [
  {
    id: 'war_forge',
    name: 'Forja del Alba',
    shortName: 'Forja Central',
    faction: 'system',
    type: 'fortress',
    position: [0, 1, -30]
  },
  {
    id: 'war_arena',
    name: 'Anfiteatro de Guerra',
    shortName: 'Arena Central',
    faction: 'system',
    type: 'arena',
    position: [0, 1, 18]
  },
  {
    id: 'war_gate_north',
    name: 'Puerta del Norte',
    shortName: 'Acceso Norte',
    faction: 'system',
    type: 'gate',
    position: [0, 1, -92]
  },
  {
    id: 'war_gate_west',
    name: 'Puerta de Ceniza',
    shortName: 'Acceso Oeste',
    faction: 'system',
    type: 'gate',
    position: [-66, 1, -18]
  },
  {
    id: 'war_gate_east',
    name: 'Puerta de Raiz',
    shortName: 'Acceso Este',
    faction: 'system',
    type: 'gate',
    position: [66, 1, -18]
  },
  {
    id: 'outer_ruins',
    name: 'Ruinas del Juramento',
    shortName: 'Ruinas Centrales',
    faction: 'system',
    type: 'ruins',
    position: [-18, 1, 58]
  }
];

export const LANDMARKS = [
  ...FACTION_SETTLEMENTS.sun,
  ...FACTION_SETTLEMENTS.shadow,
  ...FACTION_SETTLEMENTS.nature,
  ...NEUTRAL_LANDMARKS
];

export const ROADS = [
  {
    id: 'sun_road',
    faction: 'sun',
    points: [[0, -248], [0, -220], [0, -180], [0, -136], [0, -92], [0, -40], [0, -4]]
  },
  {
    id: 'shadow_road',
    faction: 'shadow',
    points: [[-250, 134], [-220, 118], [-188, 92], [-154, 66], [-120, 42], [-88, 18], [-44, 4], [-4, 0]]
  },
  {
    id: 'nature_road',
    faction: 'nature',
    points: [[250, 134], [220, 118], [188, 92], [154, 66], [120, 42], [88, 18], [44, 4], [4, 0]]
  }
];

export const NPCS = [
  {
    id: 'npc_sun_commander',
    name: 'Capitan Solarius',
    faction: 'sun',
    role: 'commander',
    type: 'quest_giver',
    questId: 'quest_bandit',
    position: [0, 1, -232]
  },
  {
    id: 'npc_sun_merchant',
    name: 'Mara del Alba',
    faction: 'sun',
    role: 'merchant',
    type: 'merchant',
    position: [-18, 1, -226]
  },
  {
    id: 'npc_sun_trainer',
    name: 'Maestro Aurel',
    faction: 'sun',
    role: 'trainer',
    type: 'trainer',
    position: [20, 1, -226]
  },
  {
    id: 'npc_sun_healer',
    name: 'Siria la Radiante',
    faction: 'sun',
    role: 'healer',
    type: 'healer',
    position: [-34, 1, -240]
  },
  {
    id: 'npc_sun_guard',
    name: 'Guardia Bronce',
    faction: 'sun',
    role: 'guard',
    type: 'guard',
    position: [0, 1, -190]
  },
  {
    id: 'npc_sun_citizen',
    name: 'Lina del Grano',
    faction: 'sun',
    role: 'citizen',
    type: 'citizen',
    position: [36, 1, -204]
  },
  {
    id: 'npc_shadow_commander',
    name: 'Sombra Silenciosa',
    faction: 'shadow',
    role: 'commander',
    type: 'quest_giver',
    questId: 'quest_skeleton',
    position: [-236, 1, 130]
  },
  {
    id: 'npc_shadow_merchant',
    name: 'Selene de Bruma',
    faction: 'shadow',
    role: 'merchant',
    type: 'merchant',
    position: [-214, 1, 116]
  },
  {
    id: 'npc_shadow_trainer',
    name: 'Maestra Umbral',
    faction: 'shadow',
    role: 'trainer',
    type: 'trainer',
    position: [-204, 1, 86]
  },
  {
    id: 'npc_shadow_healer',
    name: 'Nox la Sepulturera',
    faction: 'shadow',
    role: 'healer',
    type: 'healer',
    position: [-192, 1, 144]
  },
  {
    id: 'npc_shadow_guard',
    name: 'Guardia del Eclipse',
    faction: 'shadow',
    role: 'guard',
    type: 'guard',
    position: [-170, 1, 126]
  },
  {
    id: 'npc_shadow_citizen',
    name: 'Tovan de Humo',
    faction: 'shadow',
    role: 'citizen',
    type: 'citizen',
    position: [-180, 1, 162]
  },
  {
    id: 'npc_nature_commander',
    name: 'Druida Mayor',
    faction: 'nature',
    role: 'commander',
    type: 'quest_giver',
    questId: 'quest_wolf',
    position: [236, 1, 130]
  },
  {
    id: 'npc_nature_merchant',
    name: 'Iria Brote',
    faction: 'nature',
    role: 'merchant',
    type: 'merchant',
    position: [214, 1, 116]
  },
  {
    id: 'npc_nature_trainer',
    name: 'Sefiro de Raiz',
    faction: 'nature',
    role: 'trainer',
    type: 'trainer',
    position: [204, 1, 86]
  },
  {
    id: 'npc_nature_healer',
    name: 'Luma del Claro',
    faction: 'nature',
    role: 'healer',
    type: 'healer',
    position: [192, 1, 144]
  },
  {
    id: 'npc_nature_guard',
    name: 'Guardia Musgo',
    faction: 'nature',
    role: 'guard',
    type: 'guard',
    position: [170, 1, 126]
  },
  {
    id: 'npc_nature_citizen',
    name: 'Brin de Corteza',
    faction: 'nature',
    role: 'citizen',
    type: 'citizen',
    position: [180, 1, 162]
  }
];

export const FACTION_META = {
  sun: {
    id: 'sun',
    label: 'Orden del Sol',
    shortLabel: 'Sol',
    color: '#f4c95d',
    glow: '#fff1a6'
  },
  shadow: {
    id: 'shadow',
    label: 'Pacto de la Sombra',
    shortLabel: 'Sombra',
    color: '#8a7dff',
    glow: '#cbbfff'
  },
  nature: {
    id: 'nature',
    label: 'Alianza de la Naturaleza',
    shortLabel: 'Naturaleza',
    color: '#57c777',
    glow: '#c4f1be'
  },
  system: {
    id: 'system',
    label: 'Sistema',
    shortLabel: 'Sistema',
    color: '#74d7ff',
    glow: '#d4f4ff'
  }
};

export function getFactionMeta(faction) {
  return FACTION_META[faction] || {
    id: faction || 'neutral',
    label: faction || 'Neutral',
    shortLabel: faction || 'Neutral',
    color: '#d9d9d9',
    glow: '#ffffff'
  };
}

export function getLandmarkById(id) {
  return LANDMARKS.find((landmark) => landmark.id === id);
}

export function getLandmarkColor(landmark) {
  return getFactionMeta(landmark?.faction).color;
}

export function getNearestLandmark(position = [0, 0, 0], maxDistance = 72) {
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

export function getZoneFromPosition(position = [0, 0, 0]) {
  const [x, , z] = position;
  const dist = Math.sqrt((x * x) + (z * z));

  if (dist <= WAR_ZONE_RADIUS) {
    return {
      id: 'war',
      name: 'Zona de Guerra',
      subtitle: 'Fortalezas disputadas en el centro',
      color: '#ff846b'
    };
  }

  const nearestLandmark = getNearestLandmark(position, 56);
  if (nearestLandmark) {
    const factionMeta = getFactionMeta(nearestLandmark.faction);
    return {
      id: nearestLandmark.id,
      name: nearestLandmark.name,
      subtitle: `${nearestLandmark.shortName} de ${factionMeta.label}`,
      color: getLandmarkColor(nearestLandmark)
    };
  }

  if (z <= -120) {
    return {
      id: 'sun_realm',
      name: 'Reino del Alba',
      subtitle: 'Ciudades, campos y rutas del norte',
      color: FACTION_META.sun.color
    };
  }

  if (x <= -120) {
    return {
      id: 'shadow_realm',
      name: 'Dominio Umbrio',
      subtitle: 'Murallas, criptas y caminos del oeste',
      color: FACTION_META.shadow.color
    };
  }

  if (x >= 120) {
    return {
      id: 'nature_realm',
      name: 'Territorio Verde',
      subtitle: 'Selvas, aldeas y arboledas del este',
      color: FACTION_META.nature.color
    };
  }

  return {
    id: 'frontier',
    name: 'Tierras Fronterizas',
    subtitle: 'Caravanas y rutas entre reinos',
    color: '#c3b48a'
  };
}

export function getFactionControlBonus(controlPoints = {}, faction) {
  const owned = Object.values(controlPoints).filter((point) => point.owner === faction).length;
  return {
    owned,
    bonusPct: owned * 5
  };
}

export function getQuestTitle(questDefinitions = {}, questId) {
  return questDefinitions[questId]?.title || 'Mision';
}
