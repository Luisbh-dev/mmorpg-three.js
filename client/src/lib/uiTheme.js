// Shared in-game UI theme (dark fantasy / brass) matching the login + chat look.
export const UI = {
  gold: '#c5a059',
  goldBright: '#e6c478',
  goldDim: '#8a7240',
  ink: '#e9dfc8',
  inkDim: '#a99e85',
  inkFaint: '#7d735f',
  bad: '#d8534f',
  good: '#7bd88f',
  warn: '#e7b15a',

  fontTitle: '"Cinzel", serif',
  fontBody: '"Spectral", "Segoe UI", serif',

  // A reusable glass panel with a brass hairline border.
  panel: {
    background: 'linear-gradient(180deg, rgba(24,19,13,0.90), rgba(12,10,8,0.86))',
    border: '1px solid rgba(197,160,89,0.30)',
    borderRadius: 8,
    boxShadow: '0 10px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,236,196,0.06)',
    backdropFilter: 'blur(2px)'
  },

  hpFill: 'linear-gradient(90deg, #7a1f1f, #d83a3a)',
  manaFill: 'linear-gradient(90deg, #234a8a, #4f8fe0)',
  xpFill: 'linear-gradient(90deg, #9c7a2e, #e6c478)'
};

// Faction emblem glyphs reused across the UI.
export const FACTION_EMBLEM = {
  sun: '☀',
  shadow: '☾',
  nature: '❧',
  system: '✦'
};

// Rarity colours (single source for Inventory + Shop).
export const RARITY = {
  common: '#b9b2a3',
  uncommon: '#7bd88f',
  rare: '#5aa9ff',
  epic: '#b388ff',
  legendary: '#f0a93a'
};

export const SELL_VALUE_BY_RARITY = { common: 8, uncommon: 20, rare: 50, epic: 120, legendary: 300 };

// A thin section title with a brass underline.
export const titleStyle = {
  fontFamily: UI.fontTitle,
  fontWeight: 700,
  fontSize: '0.8rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: UI.goldBright
};
