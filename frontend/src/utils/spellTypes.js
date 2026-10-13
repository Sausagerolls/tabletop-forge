// Spell categories. Kept in one place so adding a category doesn't mean
// hunting down every `type === 'combat' ? ... : ...` ternary in the app.
export const SPELL_TYPES = [
  { key: 'combat',  label: 'Combat',  icon: '⚔', dark: 'text-red-400',   light: 'text-red-700',   badge: '⚔ Combat' },
  { key: 'healing', label: 'Healing', icon: '✚', dark: 'text-green-400', light: 'text-green-700', badge: '✚ Healing' },
  { key: 'utility', label: 'Utility', icon: '◈', dark: 'text-blue-400',  light: 'text-blue-700',  badge: '◈ Utility' },
];

export const SPELL_TYPE_KEYS = SPELL_TYPES.map((t) => t.key);

const BY_KEY = new Map(SPELL_TYPES.map((t) => [t.key, t]));

// Unknown/blank types fall back to utility, which is also the column default.
export function spellType(type) {
  return BY_KEY.get(String(type || '').toLowerCase()) || BY_KEY.get('utility');
}

export function spellTypeLabel(type) {
  return spellType(type).label;
}

export function spellTypeBadge(type) {
  return spellType(type).badge;
}

export function spellTypeColor(type, theme = 'dark') {
  const t = spellType(type);
  return theme === 'light' ? t.light : t.dark;
}
