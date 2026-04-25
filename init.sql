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
  fow_blur INTEGER DEFAULT 16,
  ambient_light VARCHAR(10) DEFAULT 'bright',
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

-- 3. Close the circular reference: sessions -> maps
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS map_id INTEGER REFERENCES maps(id) ON DELETE SET NULL;

-- 4. creatures (all columns including those added in later migrations)
CREATE TABLE IF NOT EXISTS creatures (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  image_path VARCHAR(500),
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
  inventory JSONB DEFAULT '[]',
  currency_cp INTEGER DEFAULT 0,
  currency_sp INTEGER DEFAULT 0,
  currency_gp INTEGER DEFAULT 0,
  spells JSONB DEFAULT '[]',
  spell_slots JSONB DEFAULT '{}',
  loot JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

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
