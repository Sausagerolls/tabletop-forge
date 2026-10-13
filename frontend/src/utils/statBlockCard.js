// Printable A5 stat block for a creature.
//
// Companion to shipCard.js and built the same way: a bare popup window holding
// one self-contained document, which then raises the print dialog. "Save as
// PDF" in that dialog is the export. A popup rather than an in-app print
// stylesheet because the VTT's own page is a full-bleed canvas app — hiding all
// of it to reveal one card fights every layout rule in the app, while a fresh
// document starts from nothing.
//
// WHAT GOES ON IT
// ───────────────
// Only what appears on a published stat block, in the published order. The
// creature rows in this app carry a great deal besides — token art and
// lighting, inventory, currency, loot tables, and the whole player-character
// side of the schema (class, level, XP, death saves, backstory, notes). None
// of that is on a stat block and none of it prints. The allow-list below is
// deliberate: new columns get added to `creatures` fairly often, and a
// deny-list would quietly start leaking them onto the page.
//
// The lines themselves are built by the shared formatters in utils/creature.js
// — the same ones the on-screen block uses — so the printed card and the app
// cannot come to disagree about how a saving-throw line reads.
import {
  formatSizeType, modStr, signed, acLine,
  sensesStr, speedStr, savesStr, skillsStr,
} from './creature.js';

// GM-authored text lands in innerHTML, so it has to be escaped. Names, trait
// text and action text are all free text somebody typed.
function esc(v) {
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escMultiline(v) {
  return esc(v).replace(/\n/g, '<br>');
}

// A stat block's entries are "**Name.** text" — the name run into the start of
// the paragraph rather than sitting on its own line.
function entryHtml(item) {
  const name = esc(item?.name || '');
  const desc = escMultiline(item?.desc || '');
  if (!name && !desc) return '';
  return `<p class="entry">${name ? `<span class="ename">${name}.</span> ` : ''}${desc}</p>`;
}

function entriesHtml(list) {
  return (Array.isArray(list) ? list : []).map(entryHtml).join('');
}

// A labelled line, dropped entirely when there is nothing to say — a stat block
// omits "Damage Immunities" rather than printing it empty.
function line(label, value) {
  const v = String(value ?? '').trim();
  if (!v) return '';
  return `<p class="line"><span class="lbl">${esc(label)}</span> ${esc(v)}</p>`;
}

const ABILITIES = [
  ['STR', 'strength'], ['DEX', 'dexterity'], ['CON', 'constitution'],
  ['INT', 'intelligence'], ['WIS', 'wisdom'], ['CHA', 'charisma'],
];

const SPELL_LEVEL_LABEL = (lvl, slots) => {
  if (lvl === 0) return 'Cantrips (at will)';
  const ord = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'][lvl] || `${lvl}th`;
  return slots ? `${ord} level (${slots} slot${slots === 1 ? '' : 's'})` : `${ord} level`;
};

// Spells live in their own structured column here, but on a published block
// they appear as prose inside the Spellcasting trait. So they are rendered in
// that shape — and only when the creature has no Spellcasting trait of its own
// already, which several imported creatures do; printing both would say the
// same thing twice.
function spellcastingHtml(creature) {
  let spells = creature.spells;
  if (typeof spells === 'string') { try { spells = JSON.parse(spells); } catch { spells = []; } }
  if (!Array.isArray(spells) || !spells.length) return '';

  const traits = Array.isArray(creature.special_abilities) ? creature.special_abilities : [];
  if (traits.some((t) => /spellcast|innate/i.test(String(t?.name || '')))) return '';

  let slots = creature.spell_slots;
  if (typeof slots === 'string') { try { slots = JSON.parse(slots); } catch { slots = {}; } }
  slots = (slots && typeof slots === 'object') ? slots : {};

  const rows = [];
  for (let lvl = 0; lvl <= 9; lvl++) {
    const at = spells.filter((s) => Number(s?.level) === lvl);
    if (!at.length) continue;
    const names = at.map((s) => esc(s?.name || '')).filter(Boolean).sort().join(', ');
    rows.push(`<p class="entry"><span class="ename">${esc(SPELL_LEVEL_LABEL(lvl, Number(slots[lvl]) || 0))}:</span> <i>${names}</i></p>`);
  }
  if (!rows.length) return '';
  return `<p class="entry"><span class="ename">Spellcasting.</span> The creature has the following spells prepared:</p>${rows.join('')}`;
}

function sectionHtml(title, body) {
  if (!body) return '';
  return `<h3 class="sect">${esc(title)}</h3>${body}`;
}

function cardHtml(creature) {
  const c = creature || {};
  const ac = acLine(c);
  const saves = savesStr(c);
  const skills = skillsStr(c);
  const senses = sensesStr(c);

  const abilities = ABILITIES.map(([label, key]) => {
    const score = c[key] ?? 10;
    return `<div class="ab"><div class="abl">${label}</div><div class="abv">${esc(score)} (${esc(modStr(score))})</div></div>`;
  }).join('');

  const cr = String(c.challenge_rating ?? '').trim();
  const xp = Number(c.xp);
  const crLine = cr ? `${cr}${Number.isFinite(xp) && xp > 0 ? ` (${xp.toLocaleString()} XP)` : ''}` : '';

  const traits = entriesHtml(c.special_abilities) + spellcastingHtml(c);

  const legendaryIntro = (c.legendary_actions || []).length && c.legendary_action_count
    ? `<p class="entry">${esc(c.name)} can take ${esc(c.legendary_action_count)} legendary action${Number(c.legendary_action_count) === 1 ? '' : 's'}, choosing from the options below. Only one legendary action can be used at a time and only at the end of another creature's turn. ${esc(c.name)} regains spent legendary actions at the start of its turn.</p>`
    : '';

  return `<article class="page">
  <header>
    <h1>${esc(c.name || 'Creature')}</h1>
    <p class="subtitle">${esc(formatSizeType(c))}${c.alignment ? `, ${esc(c.alignment)}` : ''}</p>
  </header>
  <hr>
  <div class="block">
    ${line('Armor Class', `${ac.total}${ac.parts.length ? ` (${ac.parts.join(', ')})` : ''}`)}
    ${line('Hit Points', `${c.hit_points ?? ''}${c.hit_dice ? ` (${c.hit_dice})` : ''}`)}
    ${line('Speed', speedStr(c))}
  </div>
  <hr>
  <div class="abilities">${abilities}</div>
  <hr>
  <div class="block">
    ${line('Saving Throws', saves)}
    ${line('Skills', skills)}
    ${line('Damage Vulnerabilities', c.damage_vulnerabilities)}
    ${line('Damage Resistances', c.damage_resistances)}
    ${line('Damage Immunities', c.damage_immunities)}
    ${line('Condition Immunities', c.condition_immunities)}
    ${line('Senses', senses)}
    ${line('Languages', c.languages)}
    ${line('Challenge', crLine)}
    ${line('Proficiency Bonus', signed(c.proficiency_bonus ?? 2))}
  </div>
  <hr>
  ${traits ? `<div class="block">${traits}</div>` : ''}
  ${sectionHtml('Actions', entriesHtml(c.actions))}
  ${sectionHtml('Bonus Actions', entriesHtml(c.bonus_actions))}
  ${sectionHtml('Reactions', entriesHtml(c.reactions))}
  ${sectionHtml('Legendary Actions', legendaryIntro + entriesHtml(c.legendary_actions))}
</article>`;
}

const CARD_CSS = `
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #6b6b6b;
    font-family: "Book Antiqua", Palatino, "Palatino Linotype", Georgia, serif;
    color: #1a1a1a;
  }
  /* A5 is 148 x 210mm. The page is a fixed box so the auto-fit below can tell
     whether the content actually overflows it. */
  .page {
    width: 148mm; height: 210mm; padding: 7mm 8mm;
    margin: 10px auto; background: #fdfaf3;
    overflow: hidden; font-size: 9.4pt; line-height: 1.28;
  }
  /* Set once the fitter gives up: let a very long creature run to a second
     sheet rather than silently cropping its last actions. */
  .page.flow { height: auto; overflow: visible; }
  h1 {
    margin: 0; font-size: 1.95em; font-variant: small-caps; font-weight: 700;
    color: #7a200d; line-height: 1.05;
  }
  .subtitle { margin: 1px 0 0; font-style: italic; font-size: 0.95em; }
  hr {
    border: none; height: 3px; margin: 4px 0;
    background: #7a200d;
    /* The tapered rule of a published block. */
    clip-path: polygon(0 0, 100% 50%, 0 100%);
  }
  .block { margin: 3px 0; }
  .line { margin: 0 0 1px; }
  .lbl { font-weight: 700; color: #7a200d; }
  .abilities { display: flex; justify-content: space-between; text-align: center; margin: 3px 0; }
  .ab { flex: 1; }
  .abl { font-weight: 700; color: #7a200d; font-size: 0.9em; }
  .abv { font-size: 0.95em; }
  .sect {
    margin: 7px 0 2px; font-size: 1.25em; font-variant: small-caps; font-weight: 400;
    color: #7a200d; border-bottom: 1px solid #7a200d; line-height: 1.1;
  }
  .entry { margin: 0 0 3px; text-align: justify; }
  .ename { font-weight: 700; font-style: italic; }
  /* Margins MUST match .page's padding above. The auto-fit measures the
     on-screen box; if the printed content box were a different size, a block
     that just fitted the preview would spill a line onto a second sheet. */
  @page { size: A5; margin: 7mm 8mm; }
  @media print {
    body { background: none; }
    .page {
      width: auto; height: auto; margin: 0; padding: 0;
      background: none; overflow: visible;
      page-break-after: always;
    }
    .page:last-child { page-break-after: auto; }
    /* The rules and headings are the block's identity — printers drop
       decorative colour by default. */
    h1, .sect, .lbl, .abl, hr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

// Shrinks the type until the block fits its A5 sheet, then stops. A stat block
// is meant to be one page you can hold, so fitting matters more than a fixed
// point size — but only down to a floor, below which it stops being readable
// at arm's length and a second sheet is the better answer.
const FIT_JS = `
  (function () {
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) {
      var p = pages[i], size = 9.4;
      while (p.scrollHeight > p.clientHeight && size > 6.4) {
        size -= 0.2;
        p.style.fontSize = size.toFixed(1) + 'pt';
      }
      // Still too long even at the floor: let it flow onto another sheet.
      if (p.scrollHeight > p.clientHeight) p.className += ' flow';
    }
    window.focus();
    window.print();
  })();
`;

/**
 * Open one or more creatures as A5 stat blocks and raise the print dialog.
 * Returns false when the browser blocked the popup, so the caller can say so.
 */
export function printStatBlockCard(creatures) {
  const list = (Array.isArray(creatures) ? creatures : [creatures]).filter(Boolean);
  if (!list.length) return false;
  const win = window.open('', '_blank', 'width=620,height=880');
  if (!win) return false;
  const title = list.length === 1
    ? String(list[0].name || 'Creature').replace(/[<>]/g, '')
    : `${list.length} stat blocks`;
  win.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(title)} — stat block</title>
<style>${CARD_CSS}</style></head>
<body>${list.map(cardHtml).join('\n')}
<script>window.onload = function () {${FIT_JS}};<\/script>
</body></html>`);
  win.document.close();
  return true;
}

// Exported for tests: the document body without the popup plumbing.
export function statBlockCardHtml(creature) {
  return cardHtml(creature);
}
