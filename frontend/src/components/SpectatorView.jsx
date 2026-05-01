import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import socket from '../socket.js';
import MapStage from './MapStage.jsx';

// SpectatorView — read-only, audience-facing display intended to run on
// a TV at the table. Joins the session room with role='spectator', no
// password, no character. The MapStage runs with isSpectator=true so the
// fog-of-war LOS unions every player token's vision instead of just one
// player's. There are no controls — every write-side socket handler on
// the server gates on role==='dm', so this client is structurally
// incapable of mutating anything.
//
// Off-map party indicators
// ────────────────────────
//   When a player is pinned to a different map than the one the
//   spectator is rendering (the "Split the Party" feature), they don't
//   contribute to the visibility union and don't appear on the map.
//   We surface them as small chips along the top edge so the audience
//   knows the rest of the party is somewhere else (and which map).
//
// Following the DM
// ────────────────
//   Spectator always renders the session's current map. There's no
//   override fetch and no map-switch fade — the map just changes when
//   the DM swaps it. A short "Switching to <Map>…" toast keeps the
//   audience oriented but isn't blocking.
export default function SpectatorView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');

  const [session, setSession]       = useState(null);
  const [tokens, setTokens]         = useState([]);
  const [walls, setWalls]           = useState([]);
  const [doors, setDoors]           = useState([]);
  const [lights, setLights]         = useState([]);
  const [magicalDarkness, setMagicalDarkness] = useState([]);
  const [terrain, setTerrain]       = useState([]);
  const [spellTemplates, setSpellTemplates]   = useState([]);
  const [userColors, setUserColors] = useState({});
  const [allMaps, setAllMaps]       = useState([]);
  const [error, setError]           = useState('');
  const [connected, setConnected]   = useState(false);
  const [mapSwitchToast, setMapSwitchToast] = useState(null);

  // Fog / lighting / grid settings — mirrored from session so MapStage
  // renders the same atmosphere the players see.
  const [fowEnabled, setFowEnabled] = useState(false);
  const [fowBlur, setFowBlur]       = useState(16);
  const [fowColor, setFowColor]     = useState('#000000');
  const [ambientLight, setAmbientLight] = useState('bright');
  const [gridColor, setGridColor]       = useState('rgba(0,0,0,0.35)');
  const [gridThickness, setGridThickness] = useState(0.7);
  const [tokenNameFontSize, setTokenNameFontSize] = useState(45);

  useEffect(() => {
    if (!code) { navigate('/'); return; }

    socket.connect();
    socket.on('connect', () => {
      setConnected(true);
      // Spectator role: server skips the password + character setup
      // gates and joins us straight into the room as a read-only client.
      socket.emit('join_session', { sessionCode: code, role: 'spectator', name: 'TV' });
    });

    socket.on('error', ({ message }) => setError(message));
    socket.on('session_code_changed', () => {
      setError('Session code rotated. Spectator disconnected.');
      setTimeout(() => navigate('/'), 2500);
    });

    socket.on('session_joined', ({ state, userColors: uc }) => {
      setSession(state.session);
      setSpellTemplates(Array.isArray(state.spellTemplates) ? state.spellTemplates : []);
      // Hidden tokens still hidden — the DM's audience shouldn't see the
      // ambush before it triggers any more than the players do.
      setTokens((state.tokens || []).filter((t) => !t.is_hidden));
      setTerrain(state.terrain || []);
      setWalls(state.walls || []);
      setDoors(state.doors || []);
      setLights(state.lights || []);
      setMagicalDarkness(state.magicalDarkness || []);
      setFowEnabled(state.session.fow_enabled || false);
      setFowBlur(state.session.fow_blur ?? 16);
      setFowColor(state.session.fow_color || '#000000');
      setAmbientLight(state.session.ambient_light || 'bright');
      if (state.session.grid_color) setGridColor(state.session.grid_color);
      if (state.session.grid_thickness != null) setGridThickness(state.session.grid_thickness);
      if (state.session.token_name_font_size != null) setTokenNameFontSize(state.session.token_name_font_size);
      if (uc) setUserColors(uc);
    });

    // ── Token lifecycle ─────────────────────────────────────────────────
    socket.on('token_moved', ({ tokenId, gridCol, gridRow }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, grid_col: gridCol, grid_row: gridRow } : t));
    });
    socket.on('token_hp_changed',     ({ tokenId, currentHp }) => setTokens(p => p.map(t => t.id === tokenId ? { ...t, current_hp: currentHp } : t)));
    socket.on('token_max_hp_changed', ({ tokenId, maxHp })     => setTokens(p => p.map(t => t.id === tokenId ? { ...t, max_hp: maxHp }     : t)));
    socket.on('token_temp_hp_changed',({ tokenId, tempHp })    => setTokens(p => p.map(t => t.id === tokenId ? { ...t, temp_hp: tempHp }   : t)));
    socket.on('token_conditions_changed', ({ tokenId, conditions }) => setTokens(p => p.map(t => t.id === tokenId ? { ...t, conditions } : t)));
    socket.on('token_initiative_changed', ({ tokenId, initiative }) => setTokens(p => p.map(t => t.id === tokenId ? { ...t, initiative } : t)));
    socket.on('token_visibility_changed', ({ tokenId, isHidden }) => {
      if (isHidden) setTokens((p) => p.filter((t) => t.id !== tokenId));
    });
    socket.on('token_flying_changed', ({ tokenId, isFlying }) => setTokens(p => p.map(t => t.id === tokenId ? { ...t, is_flying: isFlying } : t)));
    socket.on('token_size_changed',   ({ tokenId, size })      => setTokens(p => p.map(t => t.id === tokenId ? { ...t, size }    : t)));
    socket.on('token_name_changed',   ({ tokenId, name: n })   => setTokens(p => p.map(t => t.id === tokenId ? { ...t, name: n } : t)));
    socket.on('token_nickname_changed',({ tokenId, nickname }) => setTokens(p => p.map(t => t.id === tokenId ? { ...t, nickname } : t)));
    socket.on('token_light_changed',  ({ tokenId, brightFt, dimFt, color, flicker }) => {
      setTokens((p) => p.map((t) => t.id === tokenId ? {
        ...t,
        token_light_bright: brightFt,
        token_light_dim:    dimFt,
        ...(color   !== undefined ? { token_light_color:   color   } : {}),
        ...(flicker !== undefined ? { token_light_flicker: flicker } : {}),
      } : t));
    });
    socket.on('token_added',   ({ token })      => { if (!token.is_hidden) setTokens((p) => p.find((t) => t.id === token.id) ? p : [...p, token]); });
    socket.on('token_refreshed', ({ token })    => setTokens((p) => p.map((t) => t.id === token.id ? { ...t, ...token } : t)));
    socket.on('token_removed', ({ tokenId })    => setTokens((p) => p.filter((t) => t.id !== tokenId)));
    socket.on('token_map_changed', ({ tokenId, toMapId, gridCol, gridRow }) => {
      setTokens((p) => p.map((t) => t.id === tokenId ? { ...t, map_id: toMapId, grid_col: gridCol, grid_row: gridRow } : t));
    });

    // ── Map / walls / doors / lights / darkness / terrain ──────────────
    socket.on('map_changed', ({ map, walls: w, doors: d, lights: l, tokens: tk, magicalDarkness: dz, terrain: trn }) => {
      setMapSwitchToast({ name: map.name || 'New map', ts: Date.now() });
      setSession((prev) => prev ? { ...prev, map_id: map.id, map_image: map.image_path, map_width: map.width, map_height: map.height, grid_size: map.grid_size, map_name: map.name } : prev);
      setWalls(w || []);
      setDoors(d || []);
      setLights(l || []);
      setMagicalDarkness(dz || []);
      setTerrain((trn || []).filter((t) => !(t.hide_until_revealed && !t.is_revealed)));
      setTokens((tk || []).filter((t) => !t.is_hidden));
    });

    socket.on('wall_added',    ({ wall })    => setWalls((p) => p.find((w) => w.id === wall.id) ? p : [...p, wall]));
    socket.on('wall_deleted',  ({ wallId })  => setWalls((p) => p.filter((w) => w.id !== wallId)));
    socket.on('wall_updated',  ({ wall })    => setWalls((p) => p.map((w) => w.id === wall.id ? wall : w)));
    socket.on('walls_cleared', () => setWalls([]));

    socket.on('door_added',       ({ door })   => setDoors((p) => p.find((d) => d.id === door.id) ? p : [...p, door]));
    socket.on('door_deleted',     ({ doorId }) => setDoors((p) => p.filter((d) => d.id !== doorId)));
    socket.on('door_toggled',     ({ doorId, isOpen }) => setDoors((p) => p.map((d) => d.id === doorId ? { ...d, is_open: isOpen } : d)));
    socket.on('door_dir_flipped', ({ doorId, openDir }) => setDoors((p) => p.map((d) => d.id === doorId ? { ...d, open_dir: openDir } : d)));
    socket.on('doors_cleared',    () => setDoors([]));

    socket.on('light_added',   ({ light })   => setLights((p) => p.find((l) => l.id === light.id) ? p : [...p, light]));
    socket.on('light_updated', ({ light })   => setLights((p) => p.map((l) => l.id === light.id ? light : l)));
    socket.on('light_deleted', ({ lightId }) => setLights((p) => p.filter((l) => l.id !== lightId)));
    socket.on('lights_cleared', () => setLights([]));

    socket.on('magical_darkness_added',   ({ zone })  => setMagicalDarkness((p) => p.find((z) => z.id === zone.id) ? p : [...p, zone]));
    socket.on('magical_darkness_updated', ({ zone })  => setMagicalDarkness((p) => p.map((z) => z.id === zone.id ? zone : z)));
    socket.on('magical_darkness_deleted', ({ id })    => setMagicalDarkness((p) => p.filter((z) => z.id !== id)));
    socket.on('magical_darkness_cleared', () => setMagicalDarkness([]));

    socket.on('terrain_added',   ({ terrain: t }) => setTerrain((p) => p.find((x) => x.id === t.id) ? p : [...p, t]));
    socket.on('terrain_updated', ({ terrain: t }) => setTerrain((p) => p.map((x) => x.id === t.id ? t : x)));
    socket.on('terrain_removed', ({ id })         => setTerrain((p) => p.filter((x) => x.id !== id)));

    socket.on('spell_template_added', ({ template }) => setSpellTemplates((p) => p.find((t) => t.id === template.id) ? p : [...p, template]));
    socket.on('spell_template_removed', ({ id })     => setSpellTemplates((p) => p.filter((t) => t.id !== id)));
    socket.on('spell_templates_cleared', () => setSpellTemplates([]));

    // ── Session-level settings the DM may toggle live ──────────────────
    socket.on('fow_changed',      ({ enabled }) => setFowEnabled(!!enabled));
    socket.on('fow_blur_changed', ({ blur })    => setFowBlur(Number(blur) || 0));
    socket.on('fow_color_changed',({ color })   => setFowColor(color || '#000000'));
    socket.on('ambient_light_changed', ({ ambientLight: a }) => setAmbientLight(a || 'bright'));
    socket.on('grid_color_changed',     ({ color })     => setGridColor(color));
    socket.on('grid_thickness_changed', ({ thickness }) => setGridThickness(thickness));
    socket.on('grid_size_changed',      ({ gridSize })  => setSession((prev) => prev ? { ...prev, grid_size: gridSize } : prev));

    socket.on('disconnect', () => setConnected(false));

    return () => {
      // Disconnect the underlying socket so the spectator slot frees up
      // server-side as soon as the tab navigates away.
      socket.disconnect();
      socket.removeAllListeners();
    };
  }, [code, navigate]);

  // Off-map party detection: any player token whose map_id !== session.map_id.
  // Server sends every visible token in `tokens` (filtered by hidden flag);
  // we just bucket them by current map for the indicator strip.
  // To know map names, fetch the maps list once after we know the session id.
  useEffect(() => {
    if (!session?.id) return;
    fetch(`/api/maps?session_id=${session.id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setAllMaps(Array.isArray(rows) ? rows : []))
      .catch(() => {});
  }, [session?.id]);

  const offMapPlayers = useMemo(() => {
    if (!session) return [];
    const currentMapId = session.map_id;
    const mapNameById = new Map(allMaps.map((m) => [m.id, m.name]));
    return (tokens || [])
      .filter((t) => t.is_player && !t.is_hidden && t.map_id != null && t.map_id !== currentMapId)
      .map((t) => ({
        id: t.id,
        name: t.nickname || t.player_name || t.name || 'Adventurer',
        mapName: mapNameById.get(t.map_id) || 'Elsewhere',
        color: userColors[t.player_name || ''] || '#fcd34d',
      }));
  }, [tokens, session, allMaps, userColors]);

  // Tokens currently on the rendered map. MapStage's vision-origin
  // resolver filters by is_player itself, so we just pre-filter by map.
  const onMapTokens = useMemo(
    () => (tokens || []).filter((t) => t.map_id == null || t.map_id === session?.map_id),
    [tokens, session?.map_id]
  );

  // Auto-clear the map-switch toast after 2.5s.
  useEffect(() => {
    if (!mapSwitchToast) return;
    const id = setTimeout(() => setMapSwitchToast(null), 2500);
    return () => clearTimeout(id);
  }, [mapSwitchToast]);

  if (!code) return null;
  if (error) {
    return (
      <div className="w-screen h-screen bg-black text-red-300 flex items-center justify-center text-xl">
        {error}
      </div>
    );
  }
  if (!session) {
    return (
      <div className="w-screen h-screen bg-black text-gray-400 flex flex-col items-center justify-center gap-3">
        <div className="text-2xl">Spectator</div>
        <div className="font-mono tracking-widest text-dnd-gold">{code}</div>
        <div className="text-sm">{connected ? 'Joining session…' : 'Connecting…'}</div>
      </div>
    );
  }

  const mapUrl = session.map_image ? `/uploads/${session.map_image}` : null;
  const mapWidth  = session.map_width  || 2000;
  const mapHeight = session.map_height || 1500;
  const gridSize  = session.grid_size  || 50;

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      <MapStage
        mapUrl={mapUrl}
        mapWidth={mapWidth}
        mapHeight={mapHeight}
        gridSize={gridSize}
        tokens={onMapTokens}
        // isPlayer: gates out DM-only chrome (terrain handles, wall draw,
        // context menus, etc). Spectator should be locked down the same way.
        isPlayer
        // isSpectator: switches MapStage's visOrigins resolver to union
        // every player token's vision instead of using a single tokenId.
        isSpectator
        playerTokenId={null}
        activeTool="pan"
        gridColor={gridColor}
        gridThickness={gridThickness}
        tokenNameFontSize={tokenNameFontSize}
        walls={walls}
        doors={doors}
        lights={lights}
        magicalDarkness={magicalDarkness}
        spellTemplates={spellTemplates}
        fogOfWar={fowEnabled}
        fowBlur={fowBlur}
        fowColor={fowColor}
        ambientLight={ambientLight}
        terrain={terrain}
      />

      {/* Off-map party indicator strip — surfaces players pinned to a
          different map than the one we're rendering. Audience-friendly
          chips with player name + their current map name. */}
      {offMapPlayers.length > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none z-30">
          {offMapPlayers.map((p) => (
            <div
              key={p.id}
              className="bg-black/70 border border-yellow-700/60 rounded-full px-3 py-1 text-xs text-yellow-100 shadow-lg flex items-center gap-1.5"
            >
              <span style={{ color: p.color }}>↗</span>
              <span className="font-semibold">{p.name}</span>
              <span className="text-yellow-300/70">in {p.mapName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Map-switch toast — brief audience cue when the DM swaps maps so
          the change isn't disorienting. */}
      {mapSwitchToast && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 border border-dnd-gold/40 rounded-xl px-4 py-2 text-sm text-dnd-gold shadow-2xl z-30">
          Switching to <span className="font-semibold">{mapSwitchToast.name}</span>…
        </div>
      )}

      {/* Connection-state pip in the corner. Hidden when healthy; only
          flashes red if the socket drops so the audience knows the
          display is stale. */}
      {!connected && (
        <div className="absolute top-3 right-3 bg-red-900/80 border border-red-500 rounded-full px-3 py-1 text-xs text-red-100 z-30">
          Reconnecting…
        </div>
      )}
    </div>
  );
}
