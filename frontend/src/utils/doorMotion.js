// How a door gets out of the way when it opens.
//
// One list, shared by the flat map, the 3D board and the GM's door menu. Each
// of those used to test `=== 'slide' || === 'double'` inline and fall back to
// 'swing', which meant adding a fourth kind was four separate edits and any
// one of them missed would silently make the new motion behave as a swing.
//
//   swing   one leaf, hinged, swings clear
//   double  two leaves parting at the centre
//   slide   one leaf slides into the wall beside the opening
//   vanish  the leaf is simply not drawn while the door is open
//   secret  no leaf at all: shut, it is a piece of wall
//
// `vanish` exists because a sliding leaf ends up INSIDE the wall it slid into,
// and two coplanar surfaces in the same place flicker against each other from
// every angle. A door that isn't drawn cannot z-fight with anything, and for a
// schematic or imported door — which has no leaf art worth watching move —
// it reads perfectly well as "this doorway is open".
//
// `secret` is the odd one out: it is not really a way of MOVING, it is a way
// of not being seen. A shut secret door draws as the wall around it — same
// stroke on the flat map, same wall mesh in 3D — so a player looking at it has
// nothing to notice. Opened, it leaves a gap like `vanish`. The GM gets a
// marker over it, because a door the GM cannot find either is a trap for the
// person running the game.
export const DOOR_MOTIONS = ['swing', 'double', 'slide', 'vanish', 'secret'];

export const DOOR_MOTION_LABELS = {
  swing: 'Swing',
  double: 'Double',
  slide: 'Slide',
  vanish: 'Vanish',
  secret: 'Secret (looks like wall)',
};

// Anything unrecognised — including a door that has never had a motion set —
// is a swing, which is what every door did before this existed.
export function doorMotion(door) {
  const m = door?.sprite_motion;
  return DOOR_MOTIONS.includes(m) ? m : 'swing';
}

// Should this door draw no leaf at all right now?
export function doorIsHidden(door) {
  const m = doorMotion(door);
  // A secret door never has a leaf: shut it is wall, open it is a gap.
  if (m === 'secret') return true;
  return !!door?.is_open && m === 'vanish';
}

// Is this door pretending to be wall right now?
//
// Only while it is SHUT. Once opened it is an ordinary hole in the wall —
// hiding it then would leave a passage the players can walk through but not
// see, which is worse than showing it.
export function doorIsWallLike(door) {
  return doorMotion(door) === 'secret' && !door?.is_open;
}

// May this viewer work the door at all?
//
// A shut secret door is not a door as far as a player is concerned, so it does
// not answer clicks — otherwise the giveaway is the cursor. The server makes
// the same check; this one only keeps the map from advertising it.
export function doorIsUsableBy(door, isGM) {
  return isGM || !doorIsWallLike(door);
}
