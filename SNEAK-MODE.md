# Sneak Mode — how it works, and how to test it

A stealth system for TableTop Forge. Guards work out what they can see whenever
anything moves; the party is told only that *something* noticed them.

Everything below is live on the server. The GM controls live on a new **Sneak**
tab in the right-hand panel.

---

## Quick reference

| Thing | Where | Notes |
|---|---|---|
| Turn it on | Sneak tab → **On** | Off by default. Switching it off stands every guard down and clears every sneak flag. |
| Make someone sneak | **Sneak** button on any token's row | Moves it to the top list. Any token can sneak, not just claimed player characters. |
| Set the roll | **DC** box next to the sneaker | The Stealth check *result*, not the modifier. Blank is treated as 10. |
| Point a guard | An arc dropdown **per sense**, then a compass letter for the token | Each sense has its own arc. Default is all-round, which means facing is ignored for that sense. |
| Stand one down | **Reset** on that guard | Alerted never expires on its own. |
| Stand everyone down | **Stand all down** | Appears whenever anyone is suspicious or alerted. |
| Movement limit | Automatic while sneak mode is on | Each sneaking token gets a round's movement every 6 seconds. |
| Which speed | Speed dropdown on the sneaker's row | Auto follows the board (airborne → fly speed). Force Walk/Fly/Swim/Climb/Burrow when it cannot. |

### The three states

| State | Colour | What the guard does |
|---|---|---|
| **Unaware** | teal | Patrols normally. |
| **Suspicious** | amber | Stops walking, turns toward the last contact. Clears itself after ~18 seconds (three rounds) with no further contact. |
| **Alerted** | red | Stops walking. Stays alerted until you press Reset. |

### How a guard decides

Five tests, in this order. Failing any one of them means "not noticed".

1. **Range** — is the target inside one of the guard's senses? A sense with no
   range is unlimited.
2. **Line of sight** — is a wall or a shut door in the way?
3. **Light** — is the target lit, and can this guard use that light? Dim light
   costs 5 points (disadvantage). Darkvision reads dim as bright and dark as
   dim. Magical darkness defeats ordinary darkvision but not devil's sight.
4. **Facing** — is the target inside *that sense's* cone? Skipped entirely at
   360°. Blindsight and tremorsense default to all-round, but can be given an
   arc of their own.
5. **Contest** — the guard's passive Perception (minus any light penalty)
   against the sneaker's Stealth DC.

Each sense is tested **separately** and the best answer wins. That is what makes
a creature with eyes *and* blindsight behave like one creature: the eyes are
stopped by a wall or by the dark, the blindsight is not, and whichever still
reaches is the one that decides.

The result is a margin, not a yes/no:

- beat the DC by **5 or more** → **Alerted**
- beat it by **0 to 4** → **Suspicious**
- fail → nothing

Tremorsense can only ever make a guard *suspicious*, however good the roll —
feeling something through the floor tells you it is there, not what or where.

---

## Creatures with more than one sense

A creature is usually several sensors at once, and they do not share a shape. A
guard dog watches a wedge in front of it and hears in every direction; a
grimlock has blindsight all round and no useful eyes at all.

So **the arc belongs to the sense, not to the token**. The Sneak tab shows one
row per sense, each with its own arc:

```
Guard
  Sight         ∞      [ 90°       ]
  Blindsight    25 ft  [ All round ]
  Tremorsense   45 ft  [ 180°      ]
  [N] [NE] [E] [SE] [S] [SW] [W] [NW]
```

**Facing is per token** — a creature turns as a whole, however many senses it is
turning. The compass row appears once at least one sense is directional.

Defaults, so nothing you already set up changes:

- a sense with its own arc uses it;
- **blindsight and tremorsense default to all round**, which is what the engine
  used to hard-code for them;
- everything else falls back to the token's original single arc.

Setting a sense explicitly to **All round** is not the same as leaving it
unset — an explicit 360 overrides the token-wide arc, where an unset one
inherits it.

### On the map

Each sense that has a shape worth drawing gets one, all clipped to the guard's
real line of sight:

- a **wedge** for a directional sense;
- a **circle** for an all-round sense with a finite range (a blindsight bubble);
- **nothing** for a sense that is both all-round and unlimited, because there is
  no shape to draw.

**Blindsight and tremorsense are drawn with a dashed edge** — they are not
sight, and the edge says so without spending a second colour.

To edit which senses a creature has at all (as opposed to their arcs), use the
token's own senses editor; the Sneak tab only sets the shapes.

---

## A round's worth of movement

While a sneak sequence is running, **a player cannot drag a token further than
its walking speed in any six-second window**. The moment the budget runs out the
drag stops dead under the cursor; it refills six seconds after the token's first
move of that window.

- **Everyone is charged, only players are refused.** The GM's drags count
  against the budget too — otherwise the clock never starts and each new drag
  begins from full — but a GM move is never blocked, just billed.
- **Only during sneak mode.** Normal play is not turn-timed, and a budget would
  be a running argument with the table.
- **One clock for the table.** The round starts when you switch sneak mode on
  and ticks every six seconds until you switch it off; everyone's budget refills
  on the tick. It shows as a single bar at the top of the map — `SNEAKING ·
  10 ft left · 1.8s` — visible to the GM and to every player.
- **Speed follows what the creature is doing.** A token that is airborne — the
  GM's flying flag *or* any elevation — uses its **fly speed** if it has one;
  everything else walks. This applies to ordinary movement too, not just
  sneaking: the drag readout measures against the right speed either way.
- **You can override it per sneaker** with the speed dropdown in the Sneak tab:
  Auto / Walk / Fly / Swim / Climb / Burrow, for the cases the board cannot see
  — crawling, or swimming a corridor the map draws as floor. A mode the
  creature has no speed for falls back to walking rather than pinning it in
  place, and the panel shows the figure it resolved to.
- Distance is measured the way the ruler already measures it: every square is
  5 ft, so a diagonal costs the same as a straight line.
- Moving back costs movement too, exactly as it does in play. Dragging out and
  back within a *single* drag costs nothing, because the distance is measured
  from where the drag started.

### What you see

A single bar sits at the top of the map for the whole table, counting the round
down and showing what is left. The GM's copy shows whichever sneaking token has
the least remaining, since that is the one about to stop the party; a player's
shows their own.

While dragging, the readout under the cursor changes from Dash advice to a
budget:

```
  20 ft / 10 left            ← still moving
  30 ft / 0 left · out of movement   ← clamped, red
```

The token simply stops following the cursor at the limit. If a move somehow
reaches the server over budget anyway, it snaps back and the player gets
**"Out of movement — N ft left this round"**.

The clamp is for feel; the server checks it again on arrival, because a budget
a client enforces is a budget a client can be told to ignore.

Ending the sneak sequence hands everyone their legs back immediately.

---

## Test run

Each step isolates one gate, so if something misbehaves you know which.

### Setup

1. **Hard-refresh the GM view** — `http://192.168.50.131:8899/dm?code=<YOUR CODE>`
   — Cmd+Shift+R. There is a new bundle; a cached one will not have the tab.
2. Load a map with **at least one wall**. Any Dungeondraft import will do, or
   draw a single wall with the Walls tool.
3. From **Library**, drop two tokens:
   - a monster with a real Passive Perception — open its stat block and note the
     number. Call it **P**.
   - any character token.
4. Open the **Sneak** tab and press **On**.

Fog of war is *not* required — detection does not depend on it — but leave it on
if you want the player's side to feel right.

### 1. The contest

In **Guards · facing and arc**, press **Sneak** on the character. It jumps to the
top list.

Put the two tokens in plain sight of each other, then type into the DC box:

| DC | Expect |
|---|---|
| `P − 1` | **Alerted** (red) |
| `P` exactly | **Suspicious** (amber) — beaten, but not pinpointed |
| `P + 5` | **Unaware** |

Press **Reset** on the guard between each one. Alerted is sticky by design, so
if a state looks stuck, that is why.

Leave the DC at `P` for the next tests.

### 2. Walls

Drag the character behind the wall.

- **Expect:** Unaware, even if you drop the DC to 1.
- Drag back into the open and it notices again.

### 3. Facing — the step that makes it a game

On the guard's row, set the **Sight** arc to **90°**. A cone appears on the map,
clipped to what that guard can really see — it will not lie to you across a
wall.

- Click the compass letter pointing **away** from the character → **Unaware**,
  and the cone swings round.
- Click the letter pointing **at** them → notices immediately.

Leave every guard on "All round" and facing is ignored, which makes the whole
system pure dice. This is the step worth spending time on.

**Then test a second sense.** Give the guard blindsight with a short range and
leave it all-round. Face the guard away from the character and stand just
outside the blindsight radius → unnoticed. Step inside it → noticed, even though
the guard is looking the other way. That is the sense-by-sense test working: the
eyes failed on facing, the blindsight did not care.

### 4. Light

Open **Light/Dark** and set ambient to **Dark**.

- A normal-vision guard now sees nothing, at any DC.
- Give the guard **darkvision** (token senses) → it notices again, but 5 points
  worse than in daylight.
- Or give the *character* a torch (token light) → the guard spots them by their
  own light.

Both are worth trying: the first is the guard's problem, the second is the
party's.

### 5. The player's side

Click **Preview** in the top bar, or open
`http://192.168.50.131:8899/play?code=<CODE>&previewTokenId=<token id>`.

- Drop the DC to 1 → a **red edge glow** and **"You've been seen"**.
- Reset, set the DC to `P` → amber, **"Something heard you"**.

Now check what is **not** there: no cone, no guard marker, no state read-out, no
count. `awareness` and `stealth_dc` are stripped out of the player's data
entirely, so there is nothing to read in the browser console either.

### 6. Patrols

Give the guard a patrol route.

- It walks, and **its cone turns to follow the route** automatically.
- The moment it notices anything, it stops walking.
- **Reset** starts it again.

### 7. Movement budget

With sneak mode **on**, as the GM or as a player — both are capped on tokens
flagged Sneak, and the bar appears for both:

1. Drag your token a long way in one go. It **stops at your speed** and the
   readout turns red: `30 ft / 0 left · out of movement`.
2. Let go, then immediately try to drag again → it will not move.
3. Watch the bar at the top run down, then refill at zero → full movement back.
4. Drag 10 ft, let go, drag again → you get 20 ft, not 30, and the bar says so.
   The round did not restart, only the budget was spent down.
5. Switch sneak mode off → unlimited again straight away.

The GM is clamped on screen like anyone else, but never *refused* by the
server — turn Sneak off for that token, or end the sequence, to drag freely.

### 8. Decay

Get a guard to **Suspicious**, then move out of its sight and wait.

- After ~18 seconds it returns to **Unaware** on its own and resumes patrolling.
- Only Suspicious decays. Alerted waits for you.

---

## Timing

- A move is evaluated about **0.4 s** after it happens. Bursts are collapsed, so
  a patrol tick moving eight guards is one evaluation, not eight.
- The decay sweep runs every **3 s**.
- Nothing is evaluated at all for a session with sneak mode off, or for a board
  with nobody watching it.

---

## If something looks wrong

| Symptom | Likely cause |
|---|---|
| No **Sneak** tab | Cached bundle. Hard-refresh. |
| Nobody in the sneaking list | Nobody is sneaking yet — press **Sneak** on a row in the guards list. `is_player` is only set when a person *claims* a token from the lobby, so a character you dropped from the Library will start out in the guards list. |
| A guard notices everything regardless of where it looks | Its **Sight** arc is still **All round** — or it has a second sense, such as blindsight, that is all-round by default. |
| A guard notices things behind it | Check its other senses; blindsight and tremorsense are all-round unless you give them an arc. |
| A guard is stuck on Alerted | By design. Press **Reset**. |
| A guard never notices anything | Check its Passive Perception (defaults to 10 if the creature has none), and check ambient light — in the dark, ordinary vision sees nothing at all. |
| Nothing happens when tokens move | Sneak mode is off, or nobody has the **Sneak** flag set. |
| A player's token will not drag far | Working as intended — that is the movement budget. The readout says how much is left. |
| The GM's drags are limited too | They should not be. The cap applies only to non-GM clients. |

---

## Machine-checked version

On the server:

```bash
docker exec tabletopforge-backend-1 node src/detection.test.js
```

33 assertions covering every gate — magical darkness, devil's sight,
invisibility, tremorsense through walls, blinded guards, and the margin
boundaries either side of "spotted". They run without a database, so they are
safe to run on the live box at any time.

---

## Where the code is

| File | What it does |
|---|---|
| `backend/src/detection.js` | The rules engine, the awareness state machine, and the scheduler. |
| `backend/src/losCore.js` | Line-of-sight geometry on the server. A deliberate second copy of the maths in `frontend/src/utils/los.js` — the header explains why, and which functions have to change together. |
| `backend/src/detection.test.js` | The 49 assertions above. |
| `backend/src/movement.js` | The shared six-second round and the movement budget, with 51 assertions in `movement.test.js`. |
| `backend/src/patrols.js` | Stops a guard that has noticed something; derives facing from the route. |
| `frontend/src/components/SneakPanel.jsx` | The GM's switchboard. |
| `frontend/src/components/MapStage.jsx` | The cones, clipped to real line of sight. |
| `frontend/src/components/PlayerView.jsx` | The player's edge glow. |

---

## Not built yet

- **Asking a player to roll.** You type the Stealth DC yourself. A general
  "request a roll" mechanism is worth building on its own terms, not as a sneak
  feature.
- **Noise.** Nothing models sound — no armour penalty, no hearing through doors.
- **Cones in the 3D view.** They are drawn on the flat map only.
