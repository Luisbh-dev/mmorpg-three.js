export const MAP_RADIUS = 200;
export const WAR_ZONE_RADIUS = 60;

export const LANDMARKS = [
  {
    id: 'sun_capital',
    name: 'Bastion del Amanecer',
    shortName: 'Capital del Sol',
    faction: 'sun',
    type: 'capital',
    position: [0, 1, -160]
  },
  {
    id: 'shadow_capital',
    name: 'Torre del Crepusculo',
    shortName: 'Capital de Sombra',
    faction: 'shadow',
    type: 'capital',
    position: [-160, 1, 100]
  },
  {
    id: 'nature_capital',
    name: 'Corazon Verde',
    shortName: 'Capital Natural',
    faction: 'nature',
    type: 'capital',
    position: [160, 1, 100]
  },
  {
    id: 'war_forge',
    name: 'Forja del Alba',
    shortName: 'Fuerte Central',
    faction: 'system',
    type: 'fortress',
    position: [0, 1, -28]
  },
  {
    id: 'sun_gate',
    name: 'Puerta Dorada',
    shortName: 'Acceso Norte',
    faction: 'sun',
    type: 'gate',
    position: [0, 1, -90]
  },
  {
    id: 'shadow_grove',
    name: 'Arboleda Umbria',
    shortName: 'Ruinas Sombras',
    faction: 'shadow',
    type: 'ruins',
    position: [-96, 1, 84]
  },
  {
    id: 'nature_grove',
    name: 'Senda de Raices',
    shortName: 'Ruinas Naturales',
    faction: 'nature',
    type: 'ruins',
    position: [96, 1, 84]
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

export function getZoneFromPosition(position = [0, 0, 0]) {
  const [x, , z] = position;
  const dist = Math.sqrt((x * x) + (z * z));

  if (dist <= WAR_ZONE_RADIUS) {
    return {
      id: 'war',
      name: 'Zona de Guerra',
      subtitle: 'Fortalezas en disputa',
      color: '#ff846b'
    };
  }

  if (z < -55 && Math.abs(x) < 150) {
    return {
      id: 'sun',
      name: 'Valles Soleados',
      subtitle: 'Dominio de la Orden del Sol',
      color: FACTION_META.sun.color
    };
  }

  if (x < -45 && z > 40) {
    return {
      id: 'shadow',
      name: 'Bosque de las Brumas',
      subtitle: 'Territorio del Pacto de la Sombra',
      color: FACTION_META.shadow.color
    };
  }

  if (x > 45 && z > 40) {
    return {
      id: 'nature',
      name: 'Arboleda Ancestral',
      subtitle: 'Refugio de la Alianza Natural',
      color: FACTION_META.nature.color
    };
  }

  return {
    id: 'frontier',
    name: 'Tierras Fronterizas',
    subtitle: 'Paso peligroso entre reinos',
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

export function getLandmarkById(id) {
  return LANDMARKS.find((landmark) => landmark.id === id);
}

export function getLandmarkColor(landmark) {
  return getFactionMeta(landmark?.faction).color;
}
