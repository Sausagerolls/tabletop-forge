// The optional Gods module (rules/gods.md): religion, Favor and Lapses.
// Stored on the crawler as st.faith = { god, favor, lapses, riteDone, offeringDone,
// lapsedThisFloor, ability, apostate: [god names], met: [god names], slain: [god names], leftRank }.
import SETTING from './generated/setting.json';

export const GODS = SETTING.gods || [];
export const findGod = (name) => GODS.find((g) => g.name === name) || null;
export const shortName = (name) => String(name || '').split(',')[0];

export const RANKS = [['Initiate', 0], ['Devotee', 5], ['Zealot', 15], ['Chosen', 30]];
export const rankOf = (favor) => RANKS.filter(([, at]) => (favor || 0) >= at).pop()[0];
export const rankIndex = (rank) => RANKS.findIndex(([r]) => r === rank);

// The Lapse ladder: stage name, Favor lost when you reach it, and what it does.
export const LAPSE_STAGES = [
  { n: 0, name: 'In good standing', lose: 0, text: 'Every Boon of your rank works.' },
  { n: 1, name: 'Warning', lose: 1, text: 'The god has noticed.' },
  { n: 2, name: 'Cold Shoulder', lose: 3, text: 'Your highest-rank Boon stops working.' },
  { n: 3, name: 'Displeasure', lose: 5, text: "All your Boons stop working, and the god's Displeasure starts." },
  { n: 4, name: 'Wrath', lose: 0, text: "The god's Wrath starts too. Only Atonement gains Favor." },
  { n: 5, name: 'Forsaken', lose: 0, text: 'The god smites you (it can kill) and you are no longer a worshipper.' },
];
export const SMITE_DICE = { Initiate: 4, Devotee: 8, Zealot: 12, Chosen: 16 };
export const SMITE_LASTS = { Initiate: 'until the end of the floor', Devotee: 'until the end of the next floor', Zealot: 'for three floors', Chosen: 'permanently' };

export const faithOf = (st) => ({ god: '', favor: 0, lapses: 0, apostate: [], met: [], slain: [], ...(st.faith || {}) });
export const isSlain = (f, name) => (f.slain || []).includes(name);
// The rival of a god, as a god entry ("Embrix" -> Embrix the Unquenched).
export const rivalOf = (name) => {
  const g = findGod(name);
  if (!g) return null;
  const r = g.rival.toLowerCase().replace(/^the /, '');
  return GODS.find((x) => x.name.toLowerCase().includes(r)) || null;
};
// Gods whose followers are hostile to you: apostate of (left, Forsaken or a Great Crime), or branded by your god's rival.
export function brandedBy(f) {
  const out = (f.apostate || []).map((n) => ({ name: n, why: 'apostate' }));
  const rival = f.god && !isSlain(f, f.god) ? rivalOf(f.god) : null;
  if (rival && !out.some((x) => x.name === rival.name)) out.push({ name: rival.name, why: 'rival' });
  return out;
}

// Which boons work now: by rank, minus the ones Lapses switch off.
export function boonsFor(f) {
  const g = findGod(f.god);
  if (!g || isSlain(f, f.god)) return []; // a slain god's religion has no effects
  const top = rankIndex(rankOf(f.favor));
  return g.boons.map((b, i) => {
    const earned = i <= top;
    const off = earned && (f.lapses >= 3 || (f.lapses === 2 && i === top));
    return { ...b, earned, active: earned && !off };
  });
}

// One more Lapse (and the Favor it costs).
export function addLapse(s, why) {
  const f = faithOf(s);
  if (!f.god || isSlain(f, f.god)) return s;
  f.lapses = Math.min(5, f.lapses + 1);
  f.favor = Math.max(0, f.favor - LAPSE_STAGES[f.lapses].lose);
  f.lapsedThisFloor = true;
  f.log = [{ text: `Lapse ${f.lapses} (${LAPSE_STAGES[f.lapses].name}): ${why}`, at: Date.now() }, ...(f.log || [])].slice(0, 30);
  s.faith = f;
  return s;
}

// Long rest: a day without the Rite is a Lapse.
export function faithLongRest(s) {
  const f = faithOf(s);
  if (!f.god || isSlain(f, f.god)) return s;
  if (!f.riteDone) addLapse(s, 'a day without the Rite');
  s.faith = { ...faithOf(s), riteDone: false };
  return s;
}

// Taking the stairs: no Offering is a Lapse; a clean floor removes one.
export function faithStairs(s) {
  const f = faithOf(s);
  if (!f.god || isSlain(f, f.god)) return s;
  if (!f.offeringDone) addLapse(s, 'took the stairs without the Offering');
  const after = faithOf(s);
  if (!after.lapsedThisFloor && after.lapses > 0) after.lapses -= 1;
  s.faith = { ...after, offeringDone: false, lapsedThisFloor: false, greatDeedDone: false };
  return s;
}

// Leave the current god: apostate, smite noted in the log. `extraLapses` for joining its rival.
export function leaveGod(x, why) {
  if (!x.god) return x;
  const god = findGod(x.god);
  x.apostate = [...new Set([...(x.apostate || []), x.god])];
  x.leftRank = rankOf(x.favor);
  x.log = [{ text: `Left ${shortName(x.god)} as ${x.leftRank}${why ? ` (${why})` : ''}: smitten (${god?.smite?.name || 'smite'}, ${SMITE_DICE[x.leftRank]}d10).`, at: Date.now() }, ...(x.log || [])];
  Object.assign(x, { god: '', favor: 0, lapses: 0, riteDone: false, offeringDone: false, greatDeedDone: false, lapsedThisFloor: false });
  return x;
}

// Join a god you have met: favor 2 when accepting the Divine Offer, 0 at a shrine.
export function joinGod(x, name, how) {
  const first = how === 'offer';
  Object.assign(x, { god: name, favor: first ? 2 : 0, lapses: 0, riteDone: false, offeringDone: false, lapsedThisFloor: false, greatDeedDone: false });
  x.log = [{ text: first ? `Accepted ${shortName(name)}'s Divine Offer (+2 Favor).` : `Took the vow of ${shortName(name)} at a shrine.`, at: Date.now() }, ...(x.log || [])];
  return x;
}
export const MEETINGS = ['In person', 'Herald', 'Calling', 'Answered prayer'];
export const CRIMES = [
  ['Desecrated or destroyed its temple or shrine', 'Devotee'],
  ['Stole from its temple, or destroyed a holy relic', 'Devotee'],
  ['Killed a worshipper at its shrine, or one who surrendered', 'Devotee'],
  ['Killed one of its minor deities, or its Chosen', 'Zealot'],
  ['Broke one of its Taboos on purpose, in its temple', 'Initiate'],
];
// A Great Crime: the god brands you its apostate and smites you at the crime's rank.
export function greatCrime(x, name, crime, rank) {
  const god = findGod(name);
  if (x.god === name) { Object.assign(x, { god: '', favor: 0, lapses: 0, riteDone: false, offeringDone: false, greatDeedDone: false, lapsedThisFloor: false }); }
  x.apostate = [...new Set([...(x.apostate || []), name])];
  x.log = [{ text: `Great Crime against ${shortName(name)} (${crime}): branded apostate, smitten (${god?.smite?.name || 'smite'}, ${SMITE_DICE[rank]}d10, lasting effect ${SMITE_LASTS[rank]}).`, at: Date.now() }, ...(x.log || [])];
  return x;
}
// A god is slain: its religion ends for everyone (apostates stay apostates).
export function slayGod(x, name) {
  x.slain = [...new Set([...(x.slain || []), name])];
  x.log = [{ text: `${shortName(name)} has been slain. Its Boons, Lapses and smites end.`, at: Date.now() }, ...(x.log || [])];
  return x;
}
