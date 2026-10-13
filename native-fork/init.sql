-- ============================================================
-- TableTop Forge v1.0.0 — Full Database Schema
-- Tables are ordered to resolve the sessions <-> maps circular FK.
-- ============================================================

-- 1. sessions (map_id added after maps is created below)
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  session_code VARCHAR(10) UNIQUE NOT NULL,
  dm_password_hash VARCHAR(255) NOT NULL,
  grid_size INTEGER DEFAULT 50,
  grid_color VARCHAR(50) DEFAULT 'rgba(0,0,0,0.35)',
  grid_thickness FLOAT DEFAULT 0.7,
  spawn_col FLOAT DEFAULT 0,
  spawn_row FLOAT DEFAULT 0,
  combat_active BOOLEAN DEFAULT false,
  combat_turn INTEGER DEFAULT 0,
  fow_enabled BOOLEAN DEFAULT false,
  -- What newly added library tokens start with for player-facing label
  -- visibility. Player tokens ignore these.
  default_hide_token_names BOOLEAN DEFAULT false,
  default_hide_token_hp BOOLEAN DEFAULT false,
  fow_blur INTEGER DEFAULT 16,
  fow_color VARCHAR(9) DEFAULT '#000000',
  ambient_light VARCHAR(10) DEFAULT 'bright',
  -- When the group next meets. The lobby counts down to this and offers it as
  -- a calendar invite; NULL means nothing is scheduled and no countdown shows.
  -- TIMESTAMPTZ so the instant is absolute — players in another zone read it
  -- in their own local time rather than the GM's digits.
  next_session_at TIMESTAMPTZ,
  next_session_note TEXT DEFAULT '',
  -- Expected run time in minutes; gives the calendar event an end.
  next_session_minutes INTEGER DEFAULT 180,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. maps (references sessions)
CREATE TABLE IF NOT EXISTS maps (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  image_path VARCHAR(500) NOT NULL,
  width INTEGER DEFAULT 2000,
  height INTEGER DEFAULT 1500,
  grid_size INTEGER DEFAULT 50,
  spawn_col FLOAT DEFAULT 0,
  spawn_row FLOAT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2b. backdrops — full-screen scene art shown to players when no map is in
-- play. Deliberately not a map: no grid, no walls, no tokens, no fog.
CREATE TABLE IF NOT EXISTS backdrops (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  image_path VARCHAR(500) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  -- Original art path when this backdrop was generated from a token's image
  -- (the GM's "show this to the players" action); NULL for uploaded scene art.
  -- Pushing the same token again reuses the row rather than making another.
  source_image_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Close the circular reference: sessions -> maps
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS map_id INTEGER REFERENCES maps(id) ON DELETE SET NULL;
-- Which backdrop (if any) is currently on the players' screens. NULL means
-- "show the map" — deleting the live backdrop falls back to the map rather
-- than leaving players staring at a dead reference.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS backdrop_id INTEGER REFERENCES backdrops(id) ON DELETE SET NULL;

-- 4. creatures (all columns including those added in later migrations)
CREATE TABLE IF NOT EXISTS creatures (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  image_path VARCHAR(500),
  -- Full-size artwork shown to players ("Show image to players"); image_path
  -- stays the token face. Optional — the token art is the fallback.
  display_image_path VARCHAR(500),
  -- Standing artwork for the 3D view only. The flat map always uses the
  -- top-down face in image_path; 3D stands a token up as a billboard, where a
  -- face seen from above reads as a coin on its edge. Optional — unset, the 3D
  -- view falls back to image_path.
  standee_image_path VARCHAR(500),
  -- The ring drawn under this creature's token in the 3D view. NULL means the
  -- default: blue for a player, red otherwise, at 70%.
  -- How tall this creature stands in the 3D view, in feet. `size` is the
  -- footprint and cannot express height: a halfling and a human share a square.
  -- NULL derives it from the artwork, as before.
  token_height_ft REAL,
  base_color VARCHAR(20),
  base_opacity INTEGER,
  size VARCHAR(20) DEFAULT 'medium',
  creature_type VARCHAR(100) DEFAULT 'Humanoid',
  subtype VARCHAR(100) DEFAULT '',
  alignment VARCHAR(100) DEFAULT 'Unaligned',
  armor_class INTEGER DEFAULT 10,
  armor_desc VARCHAR(200) DEFAULT '',
  hit_points INTEGER DEFAULT 10,
  hit_dice VARCHAR(50) DEFAULT '2d8',
  speed_walk INTEGER DEFAULT 30,
  speed_fly INTEGER DEFAULT 0,
  speed_swim INTEGER DEFAULT 0,
  speed_burrow INTEGER DEFAULT 0,
  speed_climb INTEGER DEFAULT 0,
  strength INTEGER DEFAULT 10,
  dexterity INTEGER DEFAULT 10,
  constitution INTEGER DEFAULT 10,
  intelligence INTEGER DEFAULT 10,
  wisdom INTEGER DEFAULT 10,
  charisma INTEGER DEFAULT 10,
  save_str INTEGER,
  save_dex INTEGER,
  save_con INTEGER,
  save_int INTEGER,
  save_wis INTEGER,
  save_cha INTEGER,
  skill_acrobatics INTEGER,
  skill_animal_handling INTEGER,
  skill_arcana INTEGER,
  skill_athletics INTEGER,
  skill_deception INTEGER,
  skill_history INTEGER,
  skill_insight INTEGER,
  skill_intimidation INTEGER,
  skill_investigation INTEGER,
  skill_medicine INTEGER,
  skill_nature INTEGER,
  skill_perception INTEGER,
  skill_performance INTEGER,
  skill_persuasion INTEGER,
  skill_religion INTEGER,
  skill_sleight_of_hand INTEGER,
  skill_stealth INTEGER,
  skill_survival INTEGER,
  damage_vulnerabilities TEXT DEFAULT '',
  damage_resistances TEXT DEFAULT '',
  damage_immunities TEXT DEFAULT '',
  condition_immunities TEXT DEFAULT '',
  senses JSONB DEFAULT '[]',
  passive_perception INTEGER DEFAULT 10,
  languages TEXT DEFAULT 'Common',
  challenge_rating VARCHAR(10) DEFAULT '1',
  xp INTEGER DEFAULT 200,
  proficiency_bonus INTEGER DEFAULT 2,
  special_abilities JSONB DEFAULT '[]',
  actions JSONB DEFAULT '[]',
  bonus_actions JSONB DEFAULT '[]',
  reactions JSONB DEFAULT '[]',
  legendary_actions JSONB DEFAULT '[]',
  legendary_action_count INTEGER DEFAULT 0,
  movement_actions JSONB DEFAULT '[]',
  is_player_character BOOLEAN DEFAULT false,
  player_owner VARCHAR(255),
  -- Tokens spawned from this creature start with their name / health bar
  -- hidden from players. Per-token overrides still apply once placed.
  hide_token_name BOOLEAN DEFAULT false,
  hide_token_hp BOOLEAN DEFAULT false,
  inventory JSONB DEFAULT '[]',
  currency_cp INTEGER DEFAULT 0,
  currency_sp INTEGER DEFAULT 0,
  currency_gp INTEGER DEFAULT 0,
  spells JSONB DEFAULT '[]',
  spell_slots JSONB DEFAULT '{}',
  loot JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4b. creature_images — extra token art beyond the creature's primary
-- portrait. `creatures.image_path` stays the default (the face on the stat
-- block and in the library); these are the alternates the GM can pick from
-- when dropping a token, so a pack of wolves or a crowd of guards isn't six
-- copies of one picture.
CREATE TABLE IF NOT EXISTS creature_images (
  id SERIAL PRIMARY KEY,
  creature_id INTEGER REFERENCES creatures(id) ON DELETE CASCADE,
  image_path VARCHAR(500) NOT NULL,
  label VARCHAR(100) DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS creature_images_creature_idx ON creature_images (creature_id, sort_order);

-- 5. session_tokens (all columns)
CREATE TABLE IF NOT EXISTS session_tokens (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
  creature_id INTEGER REFERENCES creatures(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  image_path VARCHAR(500),
  size VARCHAR(20) DEFAULT 'medium',
  grid_col FLOAT DEFAULT 0,
  grid_row FLOAT DEFAULT 0,
  current_hp INTEGER DEFAULT 10,
  max_hp INTEGER DEFAULT 10,
  temp_hp INTEGER DEFAULT 0,
  conditions JSONB DEFAULT '[]',
  is_hidden BOOLEAN DEFAULT false,
  is_dead BOOLEAN DEFAULT false,
  is_player BOOLEAN DEFAULT false,
  player_name VARCHAR(255),
  -- Familiar binding: the player_name this token is attached to, or NULL for
  -- an ordinary token. Bound by name (not by owning token id) so the pairing
  -- survives the owner's token being respawned or moved between maps.
  familiar_of VARCHAR(255),
  -- Label-card visibility for the players' view only. The GM always sees the
  -- full card; a token in combat shows both regardless.
  hide_name_from_players BOOLEAN DEFAULT false,
  hide_hp_from_players BOOLEAN DEFAULT false,
  -- Pre-transformation identity (creature/name/art/size/HP), set when the GM
  -- transforms this token so it can be reverted. NULL = original form.
  pretransform JSONB,
  vision_type VARCHAR(20) DEFAULT 'normal',
  vision_range INTEGER DEFAULT 0,
  senses JSONB,
  token_light_bright FLOAT DEFAULT 0,
  token_light_dim FLOAT DEFAULT 0,
  in_combat BOOLEAN DEFAULT false,
  initiative INTEGER DEFAULT 0,
  z_index INTEGER DEFAULT 0,
  is_flying BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. magical_darkness
CREATE TABLE IF NOT EXISTS magical_darkness (
  id VARCHAR(36) PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  radius FLOAT NOT NULL DEFAULT 60,
  label VARCHAR(255) DEFAULT '',
  zone_type VARCHAR(20) DEFAULT 'darkness',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. walls
CREATE TABLE IF NOT EXISTS walls (
  id UUID PRIMARY KEY,
  map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL DEFAULT 'line',
  points JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. doors
CREATE TABLE IF NOT EXISTS doors (
  id UUID PRIMARY KEY,
  map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
  style VARCHAR(20) NOT NULL DEFAULT 'standard',
  points JSONB NOT NULL DEFAULT '[]',
  is_open BOOLEAN NOT NULL DEFAULT false,
  open_dir INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 9. light_sources
CREATE TABLE IF NOT EXISTS light_sources (
  id UUID PRIMARY KEY,
  map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  bright_radius FLOAT NOT NULL DEFAULT 60,
  dim_radius FLOAT NOT NULL DEFAULT 120,
  label VARCHAR(100) NOT NULL DEFAULT '',
  color VARCHAR(20) NOT NULL DEFAULT '#fbbf24',
  direction FLOAT NOT NULL DEFAULT 0,
  spread_angle FLOAT NOT NULL DEFAULT 360,
  flicker BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- DM-only markers (never sent to players)
CREATE TABLE IF NOT EXISTS dm_markers (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
  marker_type VARCHAR(50) NOT NULL DEFAULT 'note',
  label VARCHAR(100) NOT NULL DEFAULT '',
  note TEXT DEFAULT '',
  grid_col FLOAT NOT NULL DEFAULT 0,
  grid_row FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Player character / additional fields (idempotent)
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS shield_equipped BOOLEAN DEFAULT false;
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS hit_dice_qty INTEGER DEFAULT 0;
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS hit_dice_type VARCHAR(10) DEFAULT '';
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS hit_dice_used INTEGER DEFAULT 0;
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS skill_expertise JSONB DEFAULT '{}';
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS class_features JSONB DEFAULT '[]';
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS feats JSONB DEFAULT '[]';
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS char_class VARCHAR(100) DEFAULT '';
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS char_subclass VARCHAR(100) DEFAULT '';
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS heroic_inspiration BOOLEAN DEFAULT false;
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS death_save_successes INTEGER DEFAULT 0;
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS death_save_failures INTEGER DEFAULT 0;
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS prof_light_armor BOOLEAN DEFAULT false;
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS prof_medium_armor BOOLEAN DEFAULT false;
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS prof_heavy_armor BOOLEAN DEFAULT false;
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS prof_shields BOOLEAN DEFAULT false;
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS concentrating_on VARCHAR(120) DEFAULT '';
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS char_level INTEGER DEFAULT 1;
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS char_xp INTEGER DEFAULT 0;
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS player_notes TEXT DEFAULT '';
ALTER TABLE maps ADD COLUMN IF NOT EXISTS floor_label VARCHAR(60) DEFAULT '';
-- Wildspace maps: the grid defines the play area, not the art. `image_path`
-- holds a distant starscape painted as a fixed backdrop behind the stage —
-- it never pans, zooms or scales with the grid, so a 1000ft encounter needs
-- no 10,000px image. width/height are derived (cols/rows * grid_size) so
-- everything downstream that reads map pixel bounds keeps working unchanged.
ALTER TABLE maps ADD COLUMN IF NOT EXISTS map_type VARCHAR(20) DEFAULT 'image';
ALTER TABLE maps ADD COLUMN IF NOT EXISTS grid_cols INTEGER;
ALTER TABLE maps ADD COLUMN IF NOT EXISTS grid_rows INTEGER;
-- Lattice shape for this map: 'square' or 'hex' (flat-top). Rendering only —
-- token coords stay in the same pixel frame either way, so a map can be
-- flipped between the two without moving anything standing on it, and walls,
-- LOS, fog, templates and measurement are unaffected.
-- GM is projecting the live map to the party: whole map revealed, every
-- follower framed on the GM's camera. A mode the table is in, not a property of
-- a map, so it lives on the session; persisted so a reconnecting player rejoins
-- into it instead of dropping back to their own fogged view.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS live_map_view BOOLEAN DEFAULT false;
-- Map markers: ships, settlements and points of interest for overland/hex maps.
-- Mechanically terrain (free-scaled art the GM places, moves and hides) rather
-- than tokens, because they have no HP, conditions or initiative. `is_marker`
-- splits the library into scenery vs markers and makes a placed piece draw its
-- name; `label` is a per-placement name so one "town" image can be Waterdeep
-- here and Neverwinter there, falling back to the library name.
ALTER TABLE terrain_library ADD COLUMN IF NOT EXISTS is_marker BOOLEAN DEFAULT false;
-- Unframed original behind a marker's circular art. ImageFramer bakes its crop
-- into the saved file, so image_path is the coin drawn on the map and this is
-- the full picture pushed to players. NULL when they're the same file.
ALTER TABLE terrain_library ADD COLUMN IF NOT EXISTS source_image_path VARCHAR(500);
ALTER TABLE map_terrain ADD COLUMN IF NOT EXISTS label VARCHAR(120);
ALTER TABLE maps ADD COLUMN IF NOT EXISTS grid_type VARCHAR(10) DEFAULT 'square';
-- What one cell is worth, for the scale key and the ruler readout. `grid_unit`
-- is free text — an overland hex is as often "10 days travel" as "6 miles", and
-- nothing parses it. Feet-based game objects (spell radii, light, vision) keep
-- their own 5ft-per-cell conversion and ignore these.
ALTER TABLE maps ADD COLUMN IF NOT EXISTS grid_scale FLOAT DEFAULT 5;
ALTER TABLE maps ADD COLUMN IF NOT EXISTS grid_unit VARCHAR(24) DEFAULT 'ft';
ALTER TABLE maps ADD COLUMN IF NOT EXISTS grid_scale_visible BOOLEAN DEFAULT false;
ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS familiar_of VARCHAR(255);
ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS hide_name_from_players BOOLEAN DEFAULT false;
ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS hide_hp_from_players BOOLEAN DEFAULT false;
ALTER TABLE backdrops ADD COLUMN IF NOT EXISTS source_image_path VARCHAR(500);
ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS pretransform JSONB;
ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS companion_kind VARCHAR(20) DEFAULT 'familiar';
ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS auras JSONB DEFAULT '[]';
ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS marked_by VARCHAR(255);
ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS mark_label VARCHAR(60);
ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS exhaustion INTEGER DEFAULT 0;
-- Aboard-ship binding. When ship_id is set, deck_col/deck_row are the token's
-- position in DECK-LOCAL squares and are the source of truth; grid_col/grid_row
-- continue to hold the projected WORLD position, rewritten by the server every
-- time the ship moves or rotates. Keeping world coords in the original columns
-- means LOS origins, fog, auras and measurement all keep working untouched.
ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS ship_id INTEGER REFERENCES map_ships(id) ON DELETE SET NULL;
ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS deck_index INTEGER DEFAULT 0;
ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS deck_col FLOAT;
ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS deck_row FLOAT;
ALTER TABLE magical_darkness ADD COLUMN IF NOT EXISTS attached_token_id INTEGER REFERENCES session_tokens(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS lair_action_enabled BOOLEAN DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS lair_action_note TEXT DEFAULT '';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS default_hide_token_names BOOLEAN DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS default_hide_token_hp BOOLEAN DEFAULT false;
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS hide_token_name BOOLEAN DEFAULT false;
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS hide_token_hp BOOLEAN DEFAULT false;
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS wildshape_forms JSONB DEFAULT '[]';
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS wildshape_eligible BOOLEAN DEFAULT false;
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS ac_misc_bonus INTEGER DEFAULT 0;
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS wildshape_keep_hp BOOLEAN DEFAULT false;
-- Full-size artwork for "Show image to players". image_path is the token face,
-- which is cropped square and small; this is the picture worth putting on
-- everyone's screen. Falls back to the token art when unset.
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS display_image_path VARCHAR(500);

-- Shared spell library — populated by scanning PDFs (or manually). Players
-- "learn" by copying a row into their creature.spells JSONB. The structured
-- shape mirrors the existing per-character spell schema so the copy is direct.
CREATE TABLE IF NOT EXISTS spell_library (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  type VARCHAR(20) NOT NULL DEFAULT 'utility',
  school VARCHAR(40) DEFAULT '',
  casting_time VARCHAR(80) DEFAULT '',
  range_area VARCHAR(120) DEFAULT '',
  duration VARCHAR(80) DEFAULT '',
  comp_v BOOLEAN DEFAULT false,
  comp_s BOOLEAN DEFAULT false,
  comp_m BOOLEAN DEFAULT false,
  comp_m_text VARCHAR(200) DEFAULT '',
  attack_save VARCHAR(20) DEFAULT '',
  save_ability VARCHAR(8) DEFAULT '',
  damage_entries JSONB DEFAULT '[]',
  extra_effects TEXT DEFAULT '',
  description TEXT DEFAULT '',
  source VARCHAR(200) DEFAULT '',
  allowed_classes JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (name)
);
CREATE INDEX IF NOT EXISTS idx_spell_library_level ON spell_library(level);

-- ── Spelljammer ships ────────────────────────────────────────────────────────
-- A ship is a reusable class (ship_library) made of one or more decks
-- (ship_decks), placed onto a map as an instance (map_ships). The split
-- mirrors terrain_library/map_terrain, which solves the same problem: a
-- rotatable, grid-sized thing whose geometry has to be re-projected into map
-- space every time it moves.
CREATE TABLE IF NOT EXISTS ship_library (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL DEFAULT '',
  ship_class VARCHAR(80) DEFAULT '',
  -- Stats. Ship combat uses hull HP against a damage threshold rather than
  -- a creature's HP pool, so these deliberately don't reuse `creatures`.
  armor_class INTEGER DEFAULT 15,
  hull_hp INTEGER DEFAULT 300,
  damage_threshold INTEGER DEFAULT 0,
  -- Tactical speed in feet per round — drives the same movement counter
  -- normal tokens get when the ship is dragged.
  speed INTEGER DEFAULT 0,
  maneuverability VARCHAR(20) DEFAULT '',
  crew_min INTEGER DEFAULT 0,
  crew_max INTEGER DEFAULT 0,
  cargo_tons FLOAT DEFAULT 0,
  keel_length INTEGER DEFAULT 0,
  beam_width INTEGER DEFAULT 0,
  weapons JSONB DEFAULT '[]',
  notes TEXT DEFAULT '',
  -- Air envelope, in feet BEYOND the hull. Spelljammer ships carry their own
  -- air out to roughly their own length, so the envelope comes out oval rather
  -- than round — the hull is longer than it is wide and the bubble is drawn
  -- outward from it. Stored explicitly rather than always derived: the GM can
  -- fudge it per ship, and an explicit number is one less thing to reason
  -- about mid-session. 0 = no envelope drawn.
  air_bubble_ft INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- One row per level. deck_index 0 is the topmost deck and the default view.
-- grid_cols/grid_rows size the deck in SQUARES, so a deck always lands on the
-- host map's own 5ft scale no matter how big the art file is.
CREATE TABLE IF NOT EXISTS ship_decks (
  id SERIAL PRIMARY KEY,
  ship_id INTEGER REFERENCES ship_library(id) ON DELETE CASCADE,
  deck_index INTEGER NOT NULL DEFAULT 0,
  name VARCHAR(80) NOT NULL DEFAULT '',
  image_path VARCHAR(500) NOT NULL,
  grid_cols FLOAT NOT NULL DEFAULT 4,
  grid_rows FLOAT NOT NULL DEFAULT 8,
  -- Where this deck sits relative to the ship's anchor, in squares. Decks are
  -- rarely the same size — a cramped lower hold under a broad main deck — so
  -- without this they'd all pin to the same top-left corner and the hull would
  -- visibly jump when the GM flicks between levels. Deck 0 is the reference
  -- and stays at 0,0; the others are nudged into alignment with it.
  offset_col FLOAT NOT NULL DEFAULT 0,
  offset_row FLOAT NOT NULL DEFAULT 0,
  -- Hull outline in deck-local normalised coords, same shape as
  -- terrain_library.custom_walls ([[{col,row},…]]) so the existing
  -- rotate-into-map-space wall generator can be reused verbatim.
  hull_walls JSONB,
  -- [{ col, row, to_deck, to_col, to_row, kind, label }] — stairs, ladders and
  -- hatches. A token ending its move on one is offered the move to to_deck.
  transitions JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- A ship placed on a map. `rotation` is free (degrees, no snap); the deck grid
-- rotates with the hull. `active_deck` is which level is currently drawn in
-- place on the map — the GM flips it from the buttons beside the ship.
CREATE TABLE IF NOT EXISTS map_ships (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
  library_id INTEGER REFERENCES ship_library(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL DEFAULT '',
  grid_col FLOAT NOT NULL DEFAULT 0,
  grid_row FLOAT NOT NULL DEFAULT 0,
  rotation FLOAT NOT NULL DEFAULT 0,
  active_deck INTEGER NOT NULL DEFAULT 0,
  current_hp INTEGER,
  -- player_name of whoever is attuned to the spelljamming helm. Only they may
  -- drag the ship (the GM always may). NULL = nobody attuned, ship is adrift.
  attuned_player VARCHAR(255),
  z_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ship_decks_ship ON ship_decks(ship_id, deck_index);
CREATE INDEX IF NOT EXISTS idx_map_ships_map ON map_ships(map_id);
CREATE INDEX IF NOT EXISTS idx_session_tokens_ship ON session_tokens(ship_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dm_markers_session ON dm_markers(session_id);
CREATE INDEX IF NOT EXISTS idx_dm_markers_map ON dm_markers(map_id);
CREATE INDEX IF NOT EXISTS idx_session_tokens_session ON session_tokens(session_id);
CREATE INDEX IF NOT EXISTS idx_session_tokens_map ON session_tokens(map_id);
CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_magical_darkness_session ON magical_darkness(session_id);
CREATE INDEX IF NOT EXISTS idx_walls_map ON walls(map_id);
CREATE INDEX IF NOT EXISTS idx_doors_map ON doors(map_id);
CREATE INDEX IF NOT EXISTS idx_lights_map ON light_sources(map_id);
