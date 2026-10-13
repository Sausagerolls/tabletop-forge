// terrainVisibility.js — the one rule for whether a placed terrain piece is
// hidden from players.
//
// Extracted so the socket layer (index.js) and the per-map REST slice
// (routes/maps.js) can't drift apart. They used to be the same code in one
// place because only the socket layer needed it; the moment the map-state
// route started returning terrain as well, a second copy would have been two
// definitions of "hidden" waiting to disagree.

// Is a placed piece hidden from the players?
//
// Two rules, because the two kinds of piece want different things. A MARKER
// (ship, settlement, point of interest) hides on a plain per-placement toggle —
// the GM flips it and it appears or vanishes. SCENERY keeps the older
// hidden-until-revealed rule, where the library entry opts in and the placement
// records whether the party has found it yet.
//
// Markers reaching here without the joined `is_marker` column fall through to
// the scenery rule, which is the safe direction: it can only ever leave a piece
// visible that a toggle would have hidden, never the reverse.
function isTerrainHidden(t) {
  return t.is_marker ? !t.is_revealed : !!(t.hide_until_revealed && !t.is_revealed);
}

// Strip a placed piece's NAME for a player, when the GM has marked the name
// tag GM-only.
//
// Done here rather than in the renderer because a name is the kind of thing a
// GM hides for a reason ("Lair of the Lich", "Ambush Point"), and a flag the
// client is trusted to honour is a name already sitting in the player's
// browser. Both the per-placement `label` and the library fallback `lib_name`
// go, since a marker with neither draws no tag at all — which is the point.
//
// The piece itself stays visible; only its name goes. Use with isTerrainHidden,
// not instead of it.
function stripTerrainLabelForPlayer(t) {
  if (!t || !t.hide_label_from_players) return t;
  return { ...t, label: null, lib_name: null };
}

// Everything a player is allowed to receive from a list of placed pieces:
// hidden pieces dropped entirely, GM-only names stripped from the rest.
function terrainForPlayer(rows) {
  return (rows || []).filter((t) => !isTerrainHidden(t)).map(stripTerrainLabelForPlayer);
}

module.exports = { isTerrainHidden, stripTerrainLabelForPlayer, terrainForPlayer };
