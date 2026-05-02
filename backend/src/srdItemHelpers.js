// Shared helpers for the SRD item importers.
//
//   - WEAPON_DESCRIPTIONS / ARMOR_DESCRIPTIONS: short flavor text for
//     the SRD's mundane weapons and armor. The SRD itself has no per-
//     item paragraphs, only the table row. These are written in the
//     same voice as the SRD entries so the catalog reads consistently.
//
//   - splitPlusN: turns a combined "Weapon, +1, +2, or +3" magic item
//     into three discrete rows ("Weapon, +1" / +2 / +3), each with
//     the right rarity and the right numeric bonus column.

const WEAPON_DESCRIPTIONS = {
  // ── Simple Melee ──
  'Club': "A length of hardwood worn smooth by use. The cheapest weapon in any traveler's pack and a reliable bludgeon when nothing else is at hand.",
  'Dagger': "A short, double-edged blade balanced for the hand or for the throw. Ubiquitous and inconspicuous; every adventurer keeps at least one.",
  'Greatclub': "A two-handed bludgeon, often little more than a knot of oak with the bark stripped off. Crude but devastating in the right hands.",
  'Handaxe': "A small chopping axe useful for splitting kindling or skulls, with enough weight to throw at a foe a short distance away.",
  'Javelin': "A light throwing spear with a slim shaft and a hardened tip, made to be cast at distance rather than wielded in melee.",
  'Light Hammer': "A short hafted hammer that can be hurled or used in close combat. Favored by craft-soldiers who like a familiar tool in their belt.",
  'Mace': "A weighted metal head atop a sturdy haft. Heavy enough to crush armor, simple enough that any guard can be trained on one in an afternoon.",
  'Quarterstaff': "A six-foot length of straight-grained wood, often shod with iron at the ends. Equally at home in the hands of a hedge wizard or a road-warden.",
  'Sickle': "A curved single-edged blade hooked back on itself. Originally a harvesting tool, easily turned to harsher work.",
  'Spear': "A piercing weapon of a sharpened head on a long shaft. Used in formation, thrown at close range, or fished with — among the most ancient of arms.",
  // ── Simple Ranged ──
  'Dart': "A small finned missile thrown by hand. Light, easily concealed, and surprisingly accurate at short range.",
  'Light Crossbow': "A compact crossbow drawn by hand or with a stirrup. Slower to load than a bow but requires far less training to use well.",
  'Shortbow': "A wooden bow short enough to be drawn from horseback. Standard issue for scouts and skirmishers across the realms.",
  'Sling': "A simple leather pouch on cords, whirled overhead to launch a stone. Cheap, silent, and surprisingly hard-hitting in the hands of a practiced shepherd.",
  // ── Martial Melee ──
  'Battleaxe': "A heavy chopping axe forged for war rather than woodcraft. Used one- or two-handed, it cleaves through shields and helms alike.",
  'Flail': "A spiked or weighted head joined to the haft by a length of chain, designed to whip past a defender's guard.",
  'Glaive': "A long polearm tipped with a heavy single-edged blade. Reach lets the wielder strike before a swordsman can close.",
  'Greataxe': "A massive two-handed axe whose blade is broader than a man's chest. The signature weapon of the fiercest reavers.",
  'Greatsword': "A long, broad-bladed sword wielded in both hands. Slow to bring around but capable of severing limbs in a single sweep.",
  'Halberd': "A polearm combining axe-blade, spear-point, and back-spike. Standard issue for city watches throughout the lands.",
  'Lance': "A long, heavy spear designed for use from horseback. In a charge, no other weapon delivers as much force per moment.",
  'Longsword': "A straight, double-edged blade balanced for cut or thrust, used one-handed with a shield or two-handed for greater reach.",
  'Maul': "A two-handed sledge with a head of iron or stone. Crude in design, brutal in effect, much-loved by ogrish-bloodlines.",
  'Morningstar': "A short-hafted spiked weapon — half mace, half spear — common among soldiers who want a piercing weapon they can bash with as well.",
  'Pike': "An eighteen-foot wooden shaft tipped with a steel point. The weapon of disciplined infantry braced against cavalry charges.",
  'Rapier': "A long, slender thrusting sword. The duelist's blade — beautiful, precise, and lethal in skilled hands.",
  'Scimitar': "A curved single-edged blade favored by skirmishers and corsairs. Light enough to dance with, sharp enough to cut horseback.",
  'Shortsword': "A short, leaf-bladed sword of straightforward design. The companion blade of choice for rogues, rangers, and second-rank infantry.",
  'Trident': "A three-pronged spear of fishermen and sea-temples, its center tine often longer than the outer two. As at home in deep water as on land.",
  'Warhammer': "A one- or two-handed war hammer with a flat striking face and a beaked back. The favored sidearm of armored knights.",
  'War Pick': "A military pick whose narrow steel beak punches clean through breastplates and helms. Less elegant than a sword but far more decisive against armor.",
  'Whip': "A long braided leather lash. Surprisingly versatile in trained hands — used to disarm, to drive cattle, or to deliver a crack of pure pain at reach.",
  // ── Martial Ranged ──
  'Blowgun': "A hollow tube through which a small dart is propelled by breath. Silent and easily concealed; favored where a death must look natural.",
  'Hand Crossbow': "A small crossbow drawable with one hand. Short of range and quick to empty, but easily hidden under a cloak.",
  'Heavy Crossbow': "A massive ranged weapon braced against the body and cranked back with a windlass. Slow to reload, but one bolt punches through plate.",
  'Longbow': "A tall yew or laminated bow with a deep draw. Trained to from childhood, it ranks among the deadliest ranged weapons in the world.",
  'Musket': "A long, smoothbore firearm fired by spark or match. Loud, slow to reload, and devastating when the shot lands true.",
  'Pistol': "A short single-shot firearm fired with one hand. Reasonably accurate at close range and easily holstered or concealed.",
  // 2014-only differences (Open5e variants)
  'Crossbow, hand': "A small crossbow drawable with one hand.",
  'Crossbow, heavy': "A massive crossbow drawn with a windlass.",
  'Crossbow, light': "A compact crossbow drawn by hand or stirrup.",
  'Net': "A weighted mesh thrown to entangle a foe. Useless after the first throw unless retrieved and untangled.",
};

const ARMOR_DESCRIPTIONS = {
  'Padded Armor': "Quilted layers of cloth and batting. Cheap, hot to wear, and noisy enough that stealth in it is nearly impossible.",
  'Leather Armor': "A boiled-leather cuirass over flexible leather sleeves and skirting. The standard kit of caravan guards and underbrush hunters.",
  'Leather': "A boiled-leather cuirass over flexible leather sleeves and skirting.",
  'Padded': "Quilted layers of cloth and batting.",
  'Studded Leather Armor': "Tough leather reinforced with hardened metal studs and rivets. A favorite of rogues who want real protection without sacrificing freedom of movement.",
  'Studded Leather': "Tough leather reinforced with hardened metal studs and rivets.",
  'Hide Armor': "Heavy fur and thick hides cured by smoke and oil. Crude but rugged armor of frontier peoples and beast-tamers.",
  'Hide': "Heavy fur and thick hides cured by smoke and oil.",
  'Chain Shirt': "A waist-length shirt of interlinked metal rings worn over a padded gambeson. Concealable beneath ordinary clothing if cut close.",
  'Scale Mail': "A coat of overlapping metal scales sewn to a sturdy backing. Affordable enough that local militias arm in it.",
  'Breastplate': "A fitted metal cuirass covering chest and back, worn over a quilted underlayer. The cavalry officer's preferred armor.",
  'Half Plate Armor': "Plate covering the torso, shoulders, and limbs above the knee, with mail filling the gaps. Used where full plate's expense is unwarranted.",
  'Half plate': "Plate covering the torso, shoulders, and limbs above the knee, with mail filling the gaps.",
  'Ring Mail': "Heavy leather sewn with rings of metal. Less protective than chain but cheaper to make and easier to repair.",
  'Ring mail': "Heavy leather sewn with rings of metal.",
  'Chain Mail': "A full suit of interlocked metal rings over a padded gambeson, sometimes including a coif and chausses. The mainstay of professional men-at-arms.",
  'Chain mail': "A full suit of interlocked metal rings over a padded gambeson.",
  'Splint Armor': "Vertical strips of metal riveted to a leather backing, covering the limbs and torso. Stiff and noisy but cheaper than full plate.",
  'Splint': "Vertical strips of metal riveted to a leather backing.",
  'Plate Armor': "A full suit of articulated steel plates fitted by a master smith, overlapping at every joint. The pinnacle of mundane armor.",
  'Plate': "A full suit of articulated steel plates fitted by a master smith.",
  'Shield': "A panel of bound wood and metal carried on the off-arm. Trained use turns it into both a defense and a weapon.",
};

// Flavor for the +1/+2/+3 split rows.
function plusSuffix(prefix, n) {
  const adj = ['superior', 'masterwork', 'masterwork+'][n - 1] || 'masterwork';
  return `Magical ${prefix.toLowerCase()} of ${adj} make. Grants a +${n} bonus.`;
}

// Names whose +N expansion has been replaced by per-base-item fan-out
// (every Battleaxe / Longsword / Arrow / Bolt gets its own +1, +2, +3
// row built by generateWeaponMagicVariants / generateAmmoMagicVariants).
// We still want these source rows dropped from the magic-items table —
// the splitPlusN call returns [] so nothing gets imported.
const FAN_OUT_NAMES = new Set([
  'Weapon, +1, +2, or +3',
  'Ammunition, +1, +2, or +3',
]);

// Patterns we know how to split. Each entry returns the variant rows
// when a base row matches by name.
const PLUS_N_RULES = [
  {
    test: /^Armor, \+1, \+2, or \+3$/,
    expand: (base) => [1, 2, 3].map((n) => ({
      ...base,
      name: `Armor, +${n}`,
      slug: `armor-plus-${n}`,
      item_type: 'magic_item',
      rarity: ['rare', 'very rare', 'legendary'][n - 1],
      ac_bonus: n,
    })),
  },
  {
    test: /^Shield, \+1, \+2, or \+3$/,
    expand: (base) => [1, 2, 3].map((n) => ({
      ...base,
      name: `Shield, +${n}`,
      slug: `shield-plus-${n}`,
      item_type: 'magic_item',
      rarity: ['uncommon', 'rare', 'very rare'][n - 1],
      ac_bonus: n,
    })),
  },
  {
    test: /^Wand of the War Mage, \+1, \+2, or \+3$/,
    expand: (base) => [1, 2, 3].map((n) => ({
      ...base,
      name: `Wand of the War Mage, +${n}`,
      slug: `wand-of-the-war-mage-plus-${n}`,
      item_type: 'magic_item',
      rarity: ['uncommon', 'rare', 'very rare'][n - 1],
    })),
  },
];

// Yield 1 row (unchanged), N rows (split), or 0 rows (dropped because
// the importer fans the source row out per base item elsewhere).
function splitPlusN(item) {
  if (FAN_OUT_NAMES.has(item.name)) return [];
  for (const rule of PLUS_N_RULES) {
    if (rule.test.test(item.name)) return rule.expand(item);
  }
  return [item];
}

// ── Mundane ammunition ───────────────────────────────────────────
// Listed in the SRD's Adventuring Gear table. Bundle weight is per
// quantity (one arrow weighs 1/20 lb, hence 0.05). Firearms are 2024
// only.
const AMMO_TYPES = [
  { name: 'Arrows',          weight: 0.05,  cost: '1 GP per 20',  editions: ['2014', '2024'],
    desc: "Slim wooden shafts fletched with feathers and tipped with a steel head. Standard ammunition for any bow." },
  { name: 'Bolts',           weight: 0.075, cost: '1 GP per 20',  editions: ['2014', '2024'],
    desc: "Short, heavy crossbow projectiles, fletched and metal-tipped." },
  { name: 'Sling Bullets',   weight: 0.075, cost: '4 CP per 20',  editions: ['2014', '2024'],
    desc: "Lead or stone shot used in slings. Cheap, common, and surprisingly devastating at range." },
  { name: 'Blowgun Needles', weight: 0.02,  cost: '1 GP per 50',  editions: ['2014', '2024'],
    desc: "Slender wooden needles for use in blowguns. Often coated in poison." },
  { name: 'Firearm Bullets', weight: 0.1,   cost: '3 GP per 10',  editions: ['2024'],
    desc: "Lead balls and powder charges for muskets and pistols." },
];

function ammoTypesForEdition(edition) {
  return AMMO_TYPES.filter((t) => t.editions.includes(edition));
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Build a compact "Range" cell for the weapons table from a 5e
// properties string. Three cases:
//   • Ammunition keyword → purely ranged, return "X/Y ft." only.
//   • Thrown keyword     → primarily melee with a throwing option,
//                          return "5 ft. or thrown X/Y ft." so the
//                          weapon is read as melee first.
//   • Otherwise          → return "" (melee 5 ft. is the implicit
//                          default and should stay invisible).
// A Dagger has Finesse+Light+Thrown, so it reads as a melee weapon
// with an optional throw, not a 20/60 ranged weapon.
function deriveWeaponRange(properties) {
  const p = String(properties || '');
  const ammo = p.match(/Ammunition\s*\(Range\s+(\d+\/\d+)/i);
  if (ammo) return `${ammo[1]} ft.`;
  const thrown = p.match(/Thrown\s*\(Range\s+(\d+\/\d+)/i);
  if (thrown) return `5 ft. or thrown ${thrown[1]} ft.`;
  return '';
}

// Mundane ammunition rows for a given edition. Use item_type='gear'
// so it's filterable separately from weapons in the picker.
function generateMundaneAmmo(edition) {
  const src = edition === '2024' ? 'SRD 5.2.1 (2024)' : 'SRD 5.1 (2014)';
  return ammoTypesForEdition(edition).map((t) => ({
    name: t.name,
    slug: slugify(t.name),
    item_type: 'gear',
    description: t.desc,
    weight: t.weight,
    cost: t.cost,
    source: src,
  }));
}

// Magic ammunition: each ammo type × {+1, +2, +3}.
function generateAmmoMagicVariants(edition) {
  const src = edition === '2024' ? 'SRD 5.2.1 (2024)' : 'SRD 5.1 (2014)';
  const out = [];
  for (const t of ammoTypesForEdition(edition)) {
    for (const n of [1, 2, 3]) {
      out.push({
        name: `${t.name} +${n}`,
        slug: `${slugify(t.name)}-plus-${n}`,
        item_type: 'magic_item',
        rarity: ['uncommon', 'rare', 'very rare'][n - 1],
        attack_bonus_misc: n,
        description: `${t.desc} This piece is enchanted: you have a +${n} bonus to attack and damage rolls made with it. Once it hits a target, the ammunition is no longer magical.`,
        source: src,
      });
    }
  }
  return out;
}

// Append a flat bonus to a damage-dice string. "1d8" → "1d8 + 1";
// "1d8 + 2" → "1d8 + 3"; "" stays empty (Net etc.).
function addDamageBonus(dmg, n) {
  const s = String(dmg || '').trim();
  if (!s) return s;
  const m = s.match(/^(.*?)\s*([+-])\s*(\d+)\s*$/);
  if (m) {
    const sign = m[2] === '-' ? -1 : 1;
    const total = sign * Number(m[3]) + n;
    if (total === 0) return m[1].trim();
    return `${m[1].trim()} ${total > 0 ? '+' : '-'} ${Math.abs(total)}`;
  }
  return `${s} + ${n}`;
}

// Magic weapon variants — every mundane weapon gets +1/+2/+3 rows
// that carry the original damage entries, properties and mastery
// alongside the magical bonus. Caller passes the upserted weapon
// rows so we don't need to know each edition's catalog here.
//
// A +N magic weapon adds +N to BOTH attack rolls and damage rolls,
// so we set attack_bonus_misc *and* fold the bonus into each damage
// entry's dice string ("1d8" → "1d8 + 1"). The picker reads the
// rolled-up dice string into the inventory row's damage_dice so the
// stat block shows the correct totals without any extra wiring.
function generateWeaponMagicVariants(weapons, edition) {
  const src = edition === '2024' ? 'SRD 5.2.1 (2024)' : 'SRD 5.1 (2014)';
  const out = [];
  for (const w of weapons) {
    for (const n of [1, 2, 3]) {
      const damage_entries = (w.damage_entries || []).map((d) => ({
        ...d,
        damage: addDamageBonus(d.damage, n),
      }));
      out.push({
        ...w,
        name: `${w.name} +${n}`,
        slug: `${slugify(w.name)}-plus-${n}`,
        item_type: 'weapon',
        rarity: ['uncommon', 'rare', 'very rare'][n - 1],
        attack_bonus_misc: n,
        damage_entries,
        description: `${w.description ? w.description + ' ' : ''}This ${w.name.toLowerCase()} is enchanted: you have a +${n} bonus to attack and damage rolls made with it.`,
        source: src,
      });
    }
  }
  return out;
}

// Decide whether an Open5e armor row is actually a wearable item.
// Open5e tags class features and the Mage Armor spell as armor rows;
// "Unarmored" is the rules abstraction for "not wearing armor" — none
// of these belong in a player-facing inventory library.
function isRealArmorRow(category) {
  const c = String(category || '').toLowerCase();
  return c !== 'class feature' && c !== 'spell' && c !== 'no armor';
}

module.exports = {
  WEAPON_DESCRIPTIONS,
  ARMOR_DESCRIPTIONS,
  splitPlusN,
  isRealArmorRow,
  plusSuffix,
  generateMundaneAmmo,
  generateAmmoMagicVariants,
  generateWeaponMagicVariants,
  deriveWeaponRange,
};
