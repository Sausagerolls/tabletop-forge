import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import socket from '../socket.js';
import BackdropLayer from './BackdropLayer.jsx';
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
// Following the GM
// ────────────────
//   Spectator always renders the session's current map. There's no
//   override fetch and no map-switch fade — the map just changes when
//   the GM swaps it. A short "Switching to <Map>…" toast keeps the
//   audience oriented but isn't blocking.
export default function SpectatorView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');

  const [session, setSession]       = useState(null);
  // Read inside socket handlers, which are registered once and would otherwise
  // close over the first (null) session.
  const sessionRef = useRef(null);
  useEffect(() => { sessionRef.current = session; }, [session]);
  const [tokens, setTokens]         = useState([]);
  const [tokenFx, setTokenFx]       = useState([]);
  const [walls, setWalls]           = useState([]);
  const [doors, setDoors]           = useState([]);
  const [lights, setLights]         = useState([]);
  const [magicalDarkness, setMagicalDarkness] = useState([]);
  const [terrain, setTerrain]       = useState([]);
  const [tiles, setTiles]           = useState([]);
  const [ships, setShips]           = useState([]);
  const [shipFx, setShipFx]         = useState([]);
  const [spellTemplates, setSpellTemplates]   = useState([]);
  const [userColors, setUserColors] = useState({});
  const [allMaps, setAllMaps]       = useState([]);
  const [error, setError]           = useState('');
  // Full-screen scene art in place of the map. The TV view is player-facing,
  // so it follows the same backdrop the players see.
  const [backdrop, setBackdrop]     = useState(null);
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
  // GM projecting the live map: the whole map is revealed and this client's
  // camera follows the GM's rather than being driven locally.
  const [liveMapView, setLiveMapView] = useState(false);
  const [liveMapCamera, setLiveMapCamera] = useState(null);


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

    socket.on('session_joined', ({ state, userColors: uc, liveMapCamera: cam }) => {
      setLiveMapView(!!state.session?.live_map_view);
      setLiveMapCamera(cam || null);
      setSession(state.session);
      // Pick up a scene already running, so a TV rebooted mid-session comes
      // back to the art rather than the map behind it.
      setBackdrop(state.session?.backdrop_id && state.session?.backdrop_image
        ? { id: state.session.backdrop_id, name: state.session.backdrop_name, image_path: state.session.backdrop_image }
        : null);
      setSpellTemplates(Array.isArray(state.spellTemplates) ? state.spellTemplates : []);
      // Hidden tokens still hidden — the GM's audience shouldn't see the
      // ambush before it triggers any more than the players do.
      setTokens((state.tokens || []).filter((t) => !t.is_hidden));
      setTerrain(state.terrain || []);
      setTiles(state.tiles || []);
      setShips(state.ships || []);
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
    socket.on('token_visibility_changed', ({ tokenId, isHidden, token }) => {
      if (isHidden) {
        setTokens((p) => p.filter((t) => t.id !== tokenId));
      } else if (token) {
        // Reveal: hidden tokens were filtered out — re-add from the payload.
        setTokens((p) => p.some((t) => t.id === tokenId)
          ? p.map((t) => (t.id === tokenId ? { ...t, ...token } : t))
          : [...p, token]);
      }
    });
    socket.on('token_flying_changed', ({ tokenId, isFlying }) => setTokens(p => p.map(t => t.id === tokenId ? { ...t, is_flying: isFlying } : t)));
    socket.on('token_size_changed',   ({ tokenId, size, sizeSquares }) => setTokens(p => p.map(t => t.id === tokenId ? { ...t, size, size_squares: sizeSquares ?? null } : t)));
    socket.on('token_name_changed',   ({ tokenId, name: n })   => setTokens(p => p.map(t => t.id === tokenId ? { ...t, name: n } : t)));
    socket.on('token_nickname_changed',({ tokenId, nickname }) => setTokens(p => p.map(t => t.id === tokenId ? { ...t, nickname } : t)));
    socket.on('token_familiar_changed',({ tokenId, familiarOf, companionKind }) => setTokens(p => p.map(t => t.id === tokenId ? { ...t, familiar_of: familiarOf, companion_kind: companionKind || null } : t)));
    // Transformation / destruction animations also play on the TV.
    socket.on('token_fx', ({ tokenId, effect, ts }) => {
      const entry = { tokenId, effect, ts: ts || Date.now() };
      setTokenFx((prev) => [...prev, entry]);
      setTimeout(() => setTokenFx((prev) => prev.filter((f) => f !== entry)), 2500);
    });
    socket.on('token_auras_changed', ({ tokenId, auras }) => setTokens(p => p.map(t => t.id === tokenId ? { ...t, auras } : t)));
    socket.on('token_mark_changed', ({ tokenId, markedBy, markLabel }) => setTokens(p => p.map(t => t.id === tokenId ? { ...t, marked_by: markedBy, mark_label: markLabel } : t)));
    socket.on('token_exhaustion_changed', ({ tokenId, exhaustion }) => setTokens(p => p.map(t => t.id === tokenId ? { ...t, exhaustion } : t)));
    socket.on('token_label_visibility_changed', ({ tokenId, hideName, hideHp }) => setTokens(p => p.map(t => t.id === tokenId
      ? { ...t, hide_name_from_players: hideName, hide_hp_from_players: hideHp }
      : t)));
    // The TV is a player-facing view, so hidden labels apply here too — which
    // means it also needs the combat flag that overrides them. Without these
    // two, `in_combat` would only ever be as fresh as the last full fetch.
    socket.on('combat_changed', ({ active, tokenIds }) => {
      const idSet = tokenIds ? new Set(tokenIds) : null;
      setTokens(p => p.map(t => ({ ...t, in_combat: active ? (idSet ? idSet.has(t.id) : t.in_combat) : false })));
    });
    socket.on('tokens_added_to_combat', ({ tokenIds }) => {
      const idSet = new Set(tokenIds || []);
      setTokens(p => p.map(t => idSet.has(t.id) ? { ...t, in_combat: true } : t));
    });
    socket.on('token_light_changed',  ({ tokenId, brightFt, dimFt, color, flicker }) => {
      setTokens((p) => p.map((t) => t.id === tokenId ? {
        ...t,
        token_light_bright: brightFt,
        token_light_dim:    dimFt,
        ...(color   !== undefined ? { token_light_color:   color   } : {}),
        ...(flicker !== undefined ? { token_light_flicker: flicker } : {}),
      } : t));
    });
    socket.on('token_added',   ({ token })      => { if (!token.is_hidden) setTokens((p) => p.some((t) => t.id === token.id) ? p.map((t) => t.id === token.id ? { ...t, ...token } : t) : [...p, token]); });
    socket.on('token_elevation_changed', ({ tokenId, elevation, isFlying }) => {
      setTokens((prev) => prev.map((t) => (t.id === tokenId ? { ...t, elevation, is_flying: isFlying } : t)));
    });

    socket.on('token_refreshed', ({ token })    => setTokens((p) => p.map((t) => t.id === token.id ? { ...t, ...token } : t)));
    socket.on('token_removed', ({ tokenId })    => setTokens((p) => p.filter((t) => t.id !== tokenId)));
    socket.on('token_map_changed', ({ tokenId, toMapId, gridCol, gridRow }) => {
      setTokens((p) => p.map((t) => t.id === tokenId ? { ...t, map_id: toMapId, grid_col: gridCol, grid_row: gridRow } : t));
    });

    socket.on('live_map_view_changed', ({ on, camera }) => {
      setLiveMapView(!!on);
      // Null on the way out, so the local camera takes over again cleanly.
      setLiveMapCamera(on ? (camera || null) : null);
    });
    socket.on('live_map_camera', ({ camera }) => setLiveMapCamera(camera || null));

    socket.on('backdrop_changed', ({ backdrop: b }) => setBackdrop(b || null));

    // ── Map / walls / doors / lights / darkness / terrain ──────────────
    socket.on('map_changed', ({ map, walls: w, doors: d, lights: l, tokens: tk, magicalDarkness: dz, terrain: trn, ships: shp, fowEnabled: fw, tiles: tl }) => {
      setMapSwitchToast({ name: map.name || 'New map', ts: Date.now() });
      setSession((prev) => prev ? { ...prev, map_id: map.id, map_image: map.image_path, map_width: map.width, map_height: map.height, map_type: map.map_type || 'image', map_grid_cols: map.grid_cols ?? null, map_grid_rows: map.grid_rows ?? null, map_grid_size: map.grid_size ?? null, map_grid_type: map.grid_type || 'square', map_grid_scale: map.grid_scale ?? 5, map_grid_unit: map.grid_unit ?? 'ft', map_grid_scale_visible: !!map.grid_scale_visible, grid_size: map.grid_size, map_name: map.name } : prev);
      setWalls(w || []);
      setDoors(d || []);
      setLights(l || []);
      setMagicalDarkness(dz || []);
      setTerrain((trn || []).filter((t) => !(t.hide_until_revealed && !t.is_revealed)));
      setShips(shp || []);
      // Replaced with the board, not kept: a tile map's dungeon belongs to the
      // map it was laid on.
      setTiles(tl || []);
      if (fw !== undefined) setFowEnabled(!!fw);
      setTokens((tk || []).filter((t) => !t.is_hidden));
    });

    // Tiles, as the GM builds the dungeon in front of the audience. Mirrored
    // rather than acted on — nothing here can lay a tile.
    socket.on('tiles_placed', ({ tile }) => {
      // Only for the board on screen. The broadcast reaches the whole session,
      // and the TV follows the GM's map, so a tile laid on any other map is not
      // this audience's business.
      const here = sessionRef.current?.map_id ?? null;
      if (tile?.map_id != null && here != null && tile.map_id !== here) return;
      setTiles((prev) => (prev.some((x) => x.id === tile.id) ? prev : [...prev, tile]));
    });
    socket.on('tiles_removed', ({ tileId }) => {
      setTiles((prev) => prev.filter((x) => x.id !== tileId));
    });

    // Ships. The TV view is read-only, so it only mirrors state — the crew
    // patches ride along with the hull move so nobody lags a frame behind.
    const applyShipTokenPatches = (patches) => {
      if (!patches?.length) return;
      const byId = new Map(patches.map((p) => [p.tokenId, p]));
      setTokens((prev) => prev.map((t) => {
        const p = byId.get(t.id);
        return p ? { ...t, grid_col: p.gridCol, grid_row: p.gridRow } : t;
      }));
    };
    socket.on('ship_placed',  ({ ship })   => setShips((p) => p.some((s) => s.id === ship.id) ? p : [...p, ship]));
    // Ship destruction animation — geometry travels with the event, since the
    // ship row is gone by the time this arrives.
    socket.on('ship_destroyed', (fx) => {
      setShipFx((prev) => [...prev.filter((f) => Date.now() - f.ts < 4000), fx]);
      setTimeout(() => setShipFx((prev) => prev.filter((f) => f !== fx)), 4000);
    });
    socket.on('ship_removed', ({ shipId }) => setShips((p) => p.filter((s) => s.id !== shipId)));
    socket.on('ship_moved',   ({ shipId, gridCol, gridRow, tokenPatches }) => {
      setShips((p) => p.map((s) => s.id === shipId ? { ...s, grid_col: gridCol, grid_row: gridRow } : s));
      applyShipTokenPatches(tokenPatches);
    });
    socket.on('ship_rotated', ({ shipId, rotation, tokenPatches }) => {
      setShips((p) => p.map((s) => s.id === shipId ? { ...s, rotation } : s));
      applyShipTokenPatches(tokenPatches);
    });
    socket.on('ships_refreshed', ({ ships: rows }) => setShips(rows || []));
    socket.on('ship_deck_changed', ({ shipId, deckIndex }) =>
      setShips((p) => p.map((s) => s.id === shipId ? { ...s, active_deck: deckIndex } : s)));
    socket.on('token_deck_moved', ({ tokenId, shipId, deckIndex, gridCol, gridRow, deckCol, deckRow }) =>
      setTokens((p) => p.map((t) => t.id === tokenId
        ? { ...t, ship_id: shipId, deck_index: deckIndex, grid_col: gridCol, grid_row: gridRow, deck_col: deckCol, deck_row: deckRow }
        : t)));

    socket.on('wall_added',    ({ wall })    => setWalls((p) => p.find((w) => w.id === wall.id) ? p : [...p, wall]));
    socket.on('wall_deleted',  ({ wallId })  => setWalls((p) => p.filter((w) => w.id !== wallId)));
    socket.on('wall_updated',  ({ wall })    => setWalls((p) => p.map((w) => w.id === wall.id ? wall : w)));
    socket.on('walls_cleared', () => setWalls([]));

    socket.on('door_added',       ({ door })   => setDoors((p) => p.find((d) => d.id === door.id) ? p : [...p, door]));
    socket.on('door_deleted',     ({ doorId }) => setDoors((p) => p.filter((d) => d.id !== doorId)));
    socket.on('door_toggled',     ({ doorId, isOpen }) => setDoors((p) => p.map((d) => d.id === doorId ? { ...d, is_open: isOpen } : d)));
    socket.on('door_dir_flipped', ({ doorId, openDir }) => setDoors((p) => p.map((d) => d.id === doorId ? { ...d, open_dir: openDir } : d)));
    socket.on('door_sprite_changed', ({ doorId, spritePath, spriteMotion }) => setDoors((p) => p.map((d) => d.id === doorId ? { ...d, sprite_path: spritePath, sprite_motion: spriteMotion } : d)));
    socket.on('door_light_changed', ({ doorId, lightRadius, lightColor, lightSide }) => setDoors((p) => p.map((d) => d.id === doorId ? { ...d, light_radius: lightRadius, light_color: lightColor, light_side: lightSide } : d)));
    socket.on('doors_cleared',    () => setDoors([]));

    socket.on('light_added',   ({ light })   => setLights((p) => p.find((l) => l.id === light.id) ? p : [...p, light]));
    socket.on('light_updated', ({ light })   => setLights((p) => p.map((l) => l.id === light.id ? light : l)));
    socket.on('light_deleted', ({ lightId }) => setLights((p) => p.filter((l) => l.id !== lightId)));
    socket.on('lights_cleared', () => setLights([]));

    // The server sends { darkness } and { darknessId }; this listened for
    // { zone } / { id }, so adding a zone threw on `zone.id` and deleting one
    // silently did nothing on the TV. Accept both shapes.
    socket.on('magical_darkness_added', (payload) => {
      const zone = payload?.darkness || payload?.zone;
      if (!zone?.id) return;
      setMagicalDarkness((p) => (p.some((z) => z.id === zone.id) ? p : [...p, zone]));
    });
    socket.on('magical_darkness_updated', (payload) => {
      const zone = payload?.darkness || payload?.zone;
      if (!zone?.id) return;
      setMagicalDarkness((p) => p.map((z) => (z.id === zone.id ? zone : z)));
    });
    socket.on('magical_darkness_deleted', (payload) => {
      const id = payload?.darknessId ?? payload?.id;
      if (!id) return;
      setMagicalDarkness((p) => p.filter((z) => z.id !== id));
    });
    socket.on('darkness_attached', ({ darknessId, tokenId }) =>
      setMagicalDarkness((p) => p.map((z) => (z.id === darknessId ? { ...z, attached_token_id: tokenId } : z))));
    socket.on('magical_darkness_cleared', () => setMagicalDarkness([]));

    // Live terrain sync.
    //
    // The server broadcasts these to the WHOLE session room — see
    // broadcastTerrain in backend/src/index.js — filtered only by whether the
    // piece is hidden, not by which map each client happens to be rendering.
    // The row carries its own map_id, so `added` has to be filtered here or a
    // piece placed on one board turns up on whatever board this client is
    // showing. That is exactly how a star system's planets ended up standing
    // on a dockside map.
    //
    // `updated` and `removed` need no guard: both are no-ops when the piece
    // isn't already in the list.
    socket.on('terrain_added', ({ terrain: t }) => {
      if (!t) return;
      const here = sessionRef.current?.map_id;
      if (t.map_id != null && here != null && Number(t.map_id) !== Number(here)) return;
      setTerrain(prev => prev.some(x => x.id === t.id) ? prev : [...prev, t]);
    });
    socket.on('terrain_updated', ({ terrain: t }) => setTerrain((p) => p.map((x) => x.id === t.id ? t : x)));
    socket.on('terrain_removed', ({ id })         => setTerrain((p) => p.filter((x) => x.id !== id)));

    socket.on('spell_template_added', ({ template }) => setSpellTemplates((p) => p.find((t) => t.id === template.id) ? p : [...p, template]));
    socket.on('spell_template_removed', ({ id })     => setSpellTemplates((p) => p.filter((t) => t.id !== id)));
    socket.on('spell_templates_cleared', () => setSpellTemplates([]));

    // ── Session-level settings the GM may toggle live ──────────────────
    socket.on('fow_changed', ({ enabled, mapId }) => {
      // Per-map setting: the TV view only follows the session's map, so a flip
      // aimed at any other map isn't ours to take.
      if (mapId != null && Number(mapId) !== Number(sessionRef.current?.map_id)) return;
      setFowEnabled(!!enabled);
    });
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
      {/* Backdrop covers the entire TV output — see PlayerView for the
          blurred-fill rationale. */}
      <BackdropLayer backdrop={backdrop} className="z-40" />
      <MapStage
        mapUrl={mapUrl}
        mapId={session?.map_id ?? null}
        mapWidth={mapWidth}
        mapHeight={mapHeight}
        mapType={session.map_type || 'image'}
        gridCols={session.map_grid_cols ?? null}
        gridRows={session.map_grid_rows ?? null}
        ships={ships}
        shipFx={shipFx}
        gridSize={Number(session.map_grid_size) || gridSize}
        gridType={session.map_grid_type || 'square'}
        revealAll={liveMapView}
        cameraRect={liveMapView ? liveMapCamera : null}
        gridScale={session.map_grid_scale ?? 5}
        gridUnit={session.map_grid_unit ?? 'ft'}
        showScaleKey={!!session.map_grid_scale_visible}
        tokens={onMapTokens}
        tokenFx={tokenFx}
        // isPlayer: gates out GM-only chrome (terrain handles, wall draw,
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
        tiles={tiles}
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

      {/* Map-switch toast — brief audience cue when the GM swaps maps so
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
