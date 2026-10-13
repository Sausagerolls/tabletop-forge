import React, { useState, useMemo, useEffect } from 'react';

// Making a magic item to rules, rather than typing one out.
//
// Two families the DMG defines by SPELL LEVEL, which is the whole reason this
// is worth automating: the rarity, the charges and the attunement all fall out
// of which spell you chose, and looking that up by hand is three table lookups
// per item.
//
// The tiers below were read off the compendium's own item entries — the Spell
// Scroll and Enspelled Staff variants — rather than recalled, because a wrong
// rarity quietly misprices an item for the rest of the campaign.

// Spell Scroll, by spell level. Cantrips and 1st are both common.
const SCROLL_RARITY = {
  0: 'common', 1: 'common', 2: 'uncommon', 3: 'uncommon', 4: 'rare',
  5: 'rare', 6: 'very rare', 7: 'very rare', 8: 'very rare', 9: 'legendary',
};

// Enspelled Weapon / Armour / Staff, by the level of the embedded spell. Note
// it stops at 8: there is no Enspelled item for a 9th-level spell.
const ENSPELLED_RARITY = {
  0: 'uncommon', 1: 'uncommon', 2: 'rare', 3: 'rare', 4: 'very rare',
  5: 'very rare', 6: 'legendary', 7: 'legendary', 8: 'legendary',
};

// The scroll's own casting numbers, for a caster using a spell not on their
// list. The standard DMG table — it is not in the compendium's item data, so it
// is written out here and labelled as such in the description.
const SCROLL_CASTING = {
  0: [13, 5], 1: [13, 5], 2: [13, 5], 3: [15, 7], 4: [15, 7],
  5: [17, 9], 6: [17, 9], 7: [18, 10], 8: [18, 10], 9: [19, 11],
};

// Which spells each item may hold, BY SCHOOL.
//
// This is a rule, not a preference. The 2024 Dungeon Master's Guide restricts
// the Enspelled items:
//
//   Enspelled Weapon — conjuration, divination, evocation, necromancy or
//                      transmutation
//   Enspelled Armor  — abjuration or illusion
//   Enspelled Staff  — any school ("can be of any school of magic")
//
// An earlier version of this filtered on the app's own combat/healing/utility
// grouping instead, which let a weapon hold an enchantment spell the book
// forbids while hiding legal transmutations that happen to be tagged utility.
// The school is what the book cares about, so the school is what this uses.
const ALL_SCHOOLS = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation',
];

const KINDS = [
  { id: 'scroll', label: 'Spell Scroll',     itemType: 'item',   schools: ALL_SCHOOLS },
  { id: 'weapon', label: 'Enspelled Weapon', itemType: 'weapon',
    schools: ['Conjuration', 'Divination', 'Evocation', 'Necromancy', 'Transmutation'] },
  { id: 'armor',  label: 'Enspelled Armour', itemType: 'armor',
    schools: ['Abjuration', 'Illusion'] },
  { id: 'staff',  label: 'Enspelled Staff',  itemType: 'weapon', schools: ALL_SCHOOLS },
];

const levelWord = (n) => (Number(n) === 0 ? 'Cantrip' : `Level ${n}`);
const ordinal = (n) => (Number(n) === 0 ? 'cantrip'
  : `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' })[n] || 'th'}-level`);

export default function MagicItemForge({ spells = [], onCreate }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('scroll');
  const [spellId, setSpellId] = useState('');
  const [base, setBase] = useState('');
  const [q, setQ] = useState('');
  const [levelFilter, setLevelFilter] = useState('any');   // 'any' | 0..9
  const [baseItems, setBaseItems] = useState([]);
  const [baseId, setBaseId] = useState('');

  // Ordinary weapons and armour, to hang the spell on.
  //
  // Only the non-magical ones: an Enspelled Longsword is built from a
  // longsword, not from a Flame Tongue. In this library a base item is the one
  // with no rarity, and where both editions ship the same item the 2024 row
  // wins — same book the rest of this follows.
  useEffect(() => {
    let gone = false;
    Promise.all([
      fetch('/api/item-library?type=weapon').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/item-library?type=armor').then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([w, a]) => {
      if (gone) return;
      const rows = [...(Array.isArray(w) ? w : []), ...(Array.isArray(a) ? a : [])]
        .filter((it) => !String(it.rarity || '').trim());
      const best = new Map();
      for (const it of rows) {
        const key = `${it.item_type}|${it.name}`;
        const prev = best.get(key);
        if (!prev || (String(it.edition) === '2024' && String(prev.edition) !== '2024')) best.set(key, it);
      }
      setBaseItems([...best.values()].sort((x, y) => String(x.name).localeCompare(y.name)));
    });
    return () => { gone = true; };
  }, []);

  const enspelled = kind !== 'scroll';
  const maxLevel = enspelled ? 8 : 9;
  const kindDef = KINDS.find((k) => k.id === kind) || KINDS[0];
  const wantsBase = kind === 'weapon' || kind === 'armor';
  const baseChoices = useMemo(
    () => baseItems.filter((it) => it.item_type === (kind === 'armor' ? 'armor' : 'weapon')),
    [baseItems, kind]
  );
  const baseItem = baseChoices.find((it) => String(it.id) === String(baseId)) || null;
  const allowedSchools = kindDef.schools;
  const restricted = allowedSchools.length < ALL_SCHOOLS.length;

  // Only spells this kind of item can hold. Filtering the list is kinder than
  // letting a GM pick a 9th-level spell and then explaining why it is refused.
  const usable = useMemo(() => {
    const t = q.trim().toLowerCase();
    const schoolOf = (sp) => String(sp.school || '').trim().toLowerCase();
    const allowed = allowedSchools.map((x) => x.toLowerCase());
    return spells
      .filter((s) => Number(s.level) <= maxLevel)
      .filter((s) => levelFilter === 'any' || Number(s.level) === Number(levelFilter))
      // A spell with no school recorded cannot be shown to satisfy a rule about
      // schools, so it is excluded from a restricted item rather than assumed.
      .filter((s) => allowed.includes(schoolOf(s)))
      .filter((s) => !t || (s.name || '').toLowerCase().includes(t))
      .sort((a, b) => (a.level - b.level) || String(a.name).localeCompare(b.name));
  }, [spells, q, maxLevel, levelFilter, allowedSchools]);

  // A level that has nothing in it is worth saying, rather than showing an
  // empty box and leaving the GM to guess whether it is the filter or the
  // library that is empty.
  const levelCounts = useMemo(() => {
    const counts = {};
    for (const sp of spells) {
      const l = Number(sp.level);
      if (l > maxLevel) continue;
      counts[l] = (counts[l] || 0) + 1;
    }
    return counts;
  }, [spells, maxLevel]);

  const spell = spells.find((s) => String(s.id) === String(spellId)) || null;
  const level = spell ? Number(spell.level) : null;

  const built = useMemo(() => {
    if (!spell || level == null) return null;
    const k = KINDS.find((x) => x.id === kind);

    if (kind === 'scroll') {
      const [dc, atk] = SCROLL_CASTING[level] || [13, 5];
      return {
        item_type: 'item',
        name: `Spell Scroll (${spell.name})`,
        // The spell, as data. The sheet shows its full entry when the scroll is
        // opened, and reading it back out of the brackets in the name only
        // works while nobody renames the item.
        spell_name: spell.name,
        spell_level: level,
        qty: 1,
        rarity: SCROLL_RARITY[level],
        attunement_required: false,
        desc: [
          `A spell scroll bearing ${spell.name}, ${ordinal(level)}.`,
          `If the spell is on your class's spell list you can cast it from the scroll, requiring no material components; the scroll then crumbles to dust.`,
          `Otherwise, make a DC ${10 + level} Intelligence (Arcana) check to cast it. On a failure the spell is lost and the scroll is destroyed.`,
          `Casting from the scroll uses spell save DC ${dc} and spell attack bonus +${atk} (standard DMG scroll table).`,
        ].join('\n'),
      };
    }

    const baseName = (baseItem?.name || base.trim());
    const noun = kind === 'weapon' ? (baseName || 'Weapon')
      : kind === 'armor' ? (baseName || 'Armour')
      : 'Staff';

    // Everything the base item already knows about itself. Without this the
    // GM got an "Enspelled Longsword" with no damage and an "Enspelled
    // Breastplate" with no AC, and had to retype both from the book.
    const carried = baseItem ? (kind === 'armor'
      ? {
        ac_base: baseItem.ac_base ?? null,
        armor_category: baseItem.armor_category || '',
        str_req: baseItem.str_req ?? null,
        stealth_disadvantage: !!baseItem.stealth_disadvantage,
        weight: baseItem.weight ?? '',
      }
      : {
        damage_entries: Array.isArray(baseItem.damage_entries) ? baseItem.damage_entries : [],
        weapon_range: baseItem.weapon_range || '',
        attack_stat: baseItem.attack_stat || 'STR',
        properties: baseItem.properties || '',
        mastery: baseItem.mastery || '',
        weight: baseItem.weight ?? '',
      }) : {};
    const label = kind === 'armor' ? 'Enspelled Armour' : kind === 'staff' ? 'Enspelled Staff' : 'Enspelled Weapon';
    return {
      item_type: k.itemType,
      name: baseName && kind !== 'staff'
        ? `Enspelled ${noun} (${spell.name})`
        : `${label} (${spell.name})`,
      spell_name: spell.name,
      spell_level: level,
      qty: 1,
      ...carried,
      rarity: ENSPELLED_RARITY[level],
      attunement_required: true,
      desc: [
        `${label}, holding ${spell.name} (${levelWord(level)}).`,
        `Has 6 charges and regains 1d6 expended charges daily at dawn.`,
        `While holding it you can expend 1 charge to cast ${spell.name} from it (save DC 15, spell attack bonus +7).`,
        kind === 'armor'
          ? 'You must be wearing the armour to use it, and it requires attunement.'
          : 'You must be holding it to use it, and it requires attunement.',
      ].join('\n'),
    };
  }, [spell, level, kind, base]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-xs bg-violet-900/40 hover:bg-violet-800/50 border border-violet-800 text-violet-200 rounded px-2 py-1.5"
      >
        ✦ Create a magic item (scroll · enspelled weapon or armour)
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-violet-800/70 bg-violet-950/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-violet-200">Create a magic item</span>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-sm px-1">×</button>
      </div>

      <div className="grid grid-cols-2 gap-1">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => {
              setKind(k.id);
              setSpellId('');
              // A longsword is not a valid base for armour.
              setBaseId('');
              setBase('');
              // An Enspelled item cannot hold a 9th-level spell, so a level 9
              // filter carried over from a scroll would show an empty list.
              if (k.id !== 'scroll' && levelFilter !== 'any' && Number(levelFilter) > 8) setLevelFilter('any');
            }}
            className={`text-xs px-2 py-1.5 rounded border ${
              kind === k.id ? 'bg-violet-800/60 border-violet-500 text-violet-100' : 'bg-gray-800 border-gray-700 text-gray-300'
            }`}
          >{k.label}</button>
        ))}
      </div>

      {wantsBase && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
            Base {kind === 'armor' ? 'armour' : 'weapon'}
          </div>
          <select
            value={baseId}
            onChange={(e) => { setBaseId(e.target.value); if (e.target.value) setBase(''); }}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
          >
            <option value="">— pick one, or name your own below —</option>
            {baseChoices.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}
                {kind === 'armor'
                  ? (it.ac_base ? ` — AC ${it.ac_base}${it.armor_category ? ` ${it.armor_category}` : ''}` : '')
                  : (Array.isArray(it.damage_entries) && it.damage_entries[0]?.damage
                      ? ` — ${it.damage_entries[0].damage}${it.damage_entries[0].damage_type ? ` ${it.damage_entries[0].damage_type}` : ''}` : '')}
              </option>
            ))}
          </select>

          {/* Picking from the library is the useful path, but a homebrew base
              still has to be possible. */}
          {!baseId && (
            <input
              value={base}
              onChange={(e) => setBase(e.target.value)}
              placeholder={kind === 'weapon' ? 'or type a base weapon (no stats)' : 'or type a base armour (no stats)'}
              className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
            />
          )}

          {baseItem && (
            <p className="text-[10px] text-emerald-300/80 mt-1 leading-snug">
              Carrying over:{' '}
              {kind === 'armor'
                ? [
                    baseItem.ac_base ? `AC ${baseItem.ac_base}` : null,
                    baseItem.armor_category || null,
                    baseItem.str_req ? `Str ${baseItem.str_req}` : null,
                    baseItem.stealth_disadvantage ? 'stealth disadvantage' : null,
                  ].filter(Boolean).join(' · ')
                : [
                    (baseItem.damage_entries || []).map((d) => `${d.damage}${d.damage_type ? ` ${d.damage_type}` : ''}`).join(' + ') || null,
                    baseItem.weapon_range || null,
                    baseItem.mastery ? `mastery ${baseItem.mastery}` : null,
                    baseItem.properties || null,
                  ].filter(Boolean).join(' · ')}
            </p>
          )}
          {!baseItem && base.trim() && (
            <p className="text-[10px] text-amber-300/70 mt-1 leading-snug">
              Typed by hand, so it carries no damage or AC — fill those in on the item once it is in the list.
            </p>
          )}
        </div>
      )}

      {/* Level. The explicit filter — picking "3rd-level spell" is how a GM
          thinks about building one of these. */}
      <div>
        <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Spell level</div>
        <div className="flex flex-wrap gap-1">
          {['any', ...Array.from({ length: maxLevel + 1 }, (_, i) => i)].map((l) => {
            const isAny = l === 'any';
            const n = isAny ? null : (levelCounts[l] || 0);
            return (
              <button
                key={String(l)}
                type="button"
                disabled={!isAny && n === 0}
                onClick={() => setLevelFilter(l)}
                title={isAny ? 'Any level' : (n === 0 ? 'No spells of this level in your library' : `${n} spells`)}
                className={`text-[11px] px-2 py-1 rounded border min-w-[28px] ${
                  String(levelFilter) === String(l)
                    ? 'bg-violet-800/60 border-violet-500 text-violet-100'
                    : 'bg-gray-800 border-gray-700 text-gray-300 disabled:opacity-30'
                }`}
              >{isAny ? 'Any' : (l === 0 ? 'C' : l)}</button>
            );
          })}
        </div>
      </div>

      {/* School. A rule from the book, so it is stated rather than toggled. */}
      <div>
        <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
          Allowed schools{restricted ? '' : ' — any'}
        </div>
        <div className="flex flex-wrap gap-1">
          {ALL_SCHOOLS.map((sc) => {
            const on = allowedSchools.includes(sc);
            return (
              <span
                key={sc}
                title={on ? undefined : `${kindDef.label} cannot hold ${sc.toLowerCase()} spells`}
                className={`text-[11px] px-2 py-1 rounded border ${
                  on ? 'bg-gray-800 border-gray-600 text-gray-200' : 'bg-gray-900 border-gray-800 text-gray-600 line-through'
                }`}
              >{sc}</span>
            );
          })}
        </div>
        {restricted && (
          <p className="text-[10px] text-gray-500 mt-1 leading-snug">
            The 2024 DMG limits {kindDef.label.toLowerCase()} to{' '}
            {allowedSchools.map((x) => x.toLowerCase()).join(', ')} spells.
          </p>
        )}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name…"
        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
      />
      <select
        value={spellId}
        onChange={(e) => setSpellId(e.target.value)}
        size={6}
        className="w-full bg-gray-800 border border-gray-600 rounded px-1 py-1 text-xs text-white"
      >
        {usable.length === 0 && (
          <option value="">
            {levelFilter === 'any'
              ? 'No spells match'
              : `No allowed spells at ${levelFilter === 0 ? 'cantrip' : `level ${levelFilter}`}`}
          </option>
        )}
        {usable.map((s) => (
          <option key={s.id} value={s.id}>
            {Number(s.level) === 0 ? 'C' : s.level} · {s.name}
            {s.school ? `  (${String(s.school).toLowerCase()})` : ''}
          </option>
        ))}
      </select>

      {built && (
        <div className="rounded bg-gray-900/70 border border-gray-700 p-2 space-y-1">
          <div className="text-xs text-white font-semibold">{built.name}</div>
          <div className="text-[11px] text-gray-400 capitalize">
            {built.rarity}
            {built.attunement_required ? ' · requires attunement' : ''}
            {enspelled ? ' · 6 charges' : ''}
          </div>
          <p className="text-[11px] text-gray-400 whitespace-pre-wrap leading-snug">{built.desc}</p>
        </div>
      )}

      <button
        type="button"
        disabled={!built}
        onClick={() => { onCreate(built); setSpellId(''); setBase(''); setBaseId(''); setQ(''); }}
        className="w-full text-xs bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white rounded px-2 py-1.5 font-semibold"
      >
        {built ? 'Add to treasure' : 'Pick a spell first'}
      </button>
      {enspelled && (
        <p className="text-[10px] text-gray-500 leading-snug">
          Rarity follows the 2024 DMG's Enspelled tiers — cantrip/1st uncommon, 2nd–3rd rare,
          4th–5th very rare, 6th–8th legendary. Fill in the base item's damage or AC below
          once it is in the list.
        </p>
      )}
    </div>
  );
}
