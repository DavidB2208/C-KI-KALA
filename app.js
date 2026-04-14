
(() => {
  const APP_TITLE = 'HALLILA';
  const DEFAULT_ITEMS = ['Isaac', 'Liam', 'Ariel', 'Samuel', 'Nathan', 'Alex', 'Eitan', 'Gabriel', 'Adam', 'David'];
  const TIERS = ['S', 'A', 'B', 'C', 'D', 'E'];
  const TIER_POINTS = { S: 5, A: 4, B: 3, C: 2, D: 1, E: 0 };
  const TIER_COLORS = { S: '#e65a5a', A: '#e6b751', B: '#cad157', C: '#7ec84f', D: '#83d8d9', E: '#9147d8' };
  const PLAYER_COLORS = [
    '#e65a5a', '#e6b751', '#83d8d9', '#7ec84f', '#cad157', '#6ea8ff', '#f07ac4', '#8b6df3',
    '#f08f5a', '#53d1a8', '#ff8fb1', '#9f8cff', '#00c2ff', '#00d084', '#ffb86b', '#ff6b6b',
    '#4dd4ac', '#74c0fc', '#ffd166', '#c77dff'
  ];
  const WAITING_PHRASES = [
    'Le jury délibère… mais sans café.',
    'On vérifie si tout le monde sait vraiment glisser-déposer.',
    'Les tiers list arrivent plus vite que les excuses.',
    'Un classement se prépare dans l’ombre.',
    'Les avis sont peut-être déjà en train de créer des dramas.',
    'Patience… la vérité statistique va bientôt tomber.',
    'On compte les votes, pas les mensonges.',
    'Le suspense est presque aussi grand que l’ego de certains.',
    'Analyse des chefs-d’œuvre en cours.',
    'Un podium est probablement en train de naître.'
  ];

  const HISTORY_KEY = 'hallila_history_v7';
  const ACTIVE_ROOM_PREFIX = 'hallila_live_room_v7_';
  const PLAYER_SESSION_PREFIX = 'hallila_player_session_v7_';
  const DRAFT_PREFIX = 'hallila_draft_v7_';
  const ROUND_MARK_PREFIX = 'hallila_round_mark_v1_';
  const SETS_KEY = 'hallila_item_sets_v1';
  const MUSIC_STORAGE_KEY = 'hallila_music_enabled_v1';
  const MUSIC_SRC = 'bg-music.wav';
  const PERSONAS_CACHE_KEY = 'hallila_personas_cache_v1';
  const PLAYER_STATS_CACHE_KEY = 'hallila_player_stats_cache_v1';
  const PERSONA_STATS_CACHE_KEY = 'hallila_persona_stats_cache_v1';

  const app = document.getElementById('app');
  let backgroundAudio = null;
  let musicUnlockBound = false;


  const state = {
    ui: {
      theme: '',
      historyTitle: '',
      themeMode: 'direct',
      joinPseudo: '',
      joinColor: PLAYER_COLORS[0],
      draggingItem: null,
      itemEditor: [...DEFAULT_ITEMS],
      itemEditorRoomId: null,
      newItemName: '',
      adminThemeBoxInput: '',
      playerThemeInput: '',
      waitingPhraseIndex: 0,
      waitingTicker: null,
      waitingContext: '',
      resultRevealRoomId: null,
      resultRevealPhase: 'full',
      resultTimer: null,
      notice: null,
      noticeTimer: null,
      editHistoryId: null,
      editHistoryValue: '',
      roomHistoryDraft: '',
      newSetName: '',
      selectedSetId: null,
      joinPreview: null,
      joinPreviewRoom: '',
      joinPreviewStatus: 'idle',
      joinPreviewError: '',
      touchDrag: null,
      musicEnabled: (() => { try { const raw = localStorage.getItem(MUSIC_STORAGE_KEY); return raw === null ? true : JSON.parse(raw); } catch { return true; } })()
    },
    role: null,
    room: null,
    snapshot: null,
    playerSession: null,
    peer: null,
    hostConn: null,
    connections: {},
    previewPeer: null,
    previewConn: null,
    peerStatus: 'offline',
    peerError: ''
  };

  const dbState = {
    ready: false,
    enabled: false,
    localOnly: true,
    error: '',
    syncing: false,
    lastSyncAt: null,
    personas: readJson(PERSONAS_CACHE_KEY, []),
    playerStats: readJson(PLAYER_STATS_CACHE_KEY, []),
    personaStats: readJson(PERSONA_STATS_CACHE_KEY, [])
  };

  const nowIso = () => new Date().toISOString();
  const activeRoomKey = (roomId) => `${ACTIVE_ROOM_PREFIX}${roomId}`;
  const playerSessionKey = (roomId) => `${PLAYER_SESSION_PREFIX}${roomId}`;
  const draftKey = (roomId, playerId) => `${DRAFT_PREFIX}${roomId}_${playerId}`;
  const roundMarkKey = (roomId, playerId) => `${ROUND_MARK_PREFIX}${roomId}_${playerId}`;

  function uid(prefix) {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36).slice(-8)}`;
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function removeKey(key) {
    localStorage.removeItem(key);
  }

  function ensureBackgroundAudio() {
    if (backgroundAudio) return backgroundAudio;
    backgroundAudio = new Audio(MUSIC_SRC);
    backgroundAudio.loop = true;
    backgroundAudio.preload = 'auto';
    backgroundAudio.volume = 0.42;
    return backgroundAudio;
  }

  function persistMusicPreference() {
    try {
      localStorage.setItem(MUSIC_STORAGE_KEY, JSON.stringify(!!state.ui.musicEnabled));
    } catch {}
  }

  function tryStartMusic() {
    if (!state.ui.musicEnabled) return;
    const audio = ensureBackgroundAudio();
    if (!audio.paused) return;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  }

  function pauseMusic() {
    if (!backgroundAudio) return;
    try { backgroundAudio.pause(); } catch {}
  }

  function toggleMusic() {
    state.ui.musicEnabled = !state.ui.musicEnabled;
    persistMusicPreference();
    if (state.ui.musicEnabled) tryStartMusic();
    else pauseMusic();
    render();
  }

  function setupMusicUnlock() {
    if (musicUnlockBound) return;
    musicUnlockBound = true;
    const unlock = () => {
      if (state.ui.musicEnabled) tryStartMusic();
    };
    document.addEventListener('click', unlock, { passive: true });
    document.addEventListener('touchstart', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
  }


  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function itemSetsStore() {
    return readJson(SETS_KEY, []);
  }

  function saveItemSets(sets) {
    writeJson(SETS_KEY, sets);
  }

  function setNotice(text, tone = 'warn', timeout = 3200) {
    state.ui.notice = { text, tone };
    if (state.ui.noticeTimer) clearTimeout(state.ui.noticeTimer);
    if (timeout) {
      state.ui.noticeTimer = setTimeout(() => {
        state.ui.notice = null;
        render();
      }, timeout);
    }
    render();
  }

  function clearNotice() {
    state.ui.notice = null;
    if (state.ui.noticeTimer) {
      clearTimeout(state.ui.noticeTimer);
      state.ui.noticeTimer = null;
    }
  }

  function usedColors(source) {
    return new Set(((source?.players) || []).map((player) => player.color));
  }

  function feedbackSummary(source, playerId = null) {
    const feedback = source?.feedback || {};
    let likes = 0;
    let dislikes = 0;
    Object.values(feedback).forEach((value) => {
      if (value === 'like') likes += 1;
      if (value === 'dislike') dislikes += 1;
    });
    return {
      likes,
      dislikes,
      mine: playerId ? (feedback[playerId] || 'none') : 'none'
    };
  }

  function cleanupJoinPreview() {
    if (state.previewConn) {
      try { state.previewConn.close(); } catch {}
      state.previewConn = null;
    }
    if (state.previewPeer) {
      try { state.previewPeer.destroy(); } catch {}
      state.previewPeer = null;
    }
  }

  function ensureJoinPreview(roomId) {
    if (!roomId) return;
    if (state.ui.joinPreviewRoom === roomId && (state.ui.joinPreviewStatus === 'connecting' || state.ui.joinPreviewStatus === 'ready')) return;
    cleanupJoinPreview();
    state.ui.joinPreviewRoom = roomId;
    state.ui.joinPreviewStatus = 'connecting';
    state.ui.joinPreviewError = '';
    state.ui.joinPreview = null;
    if (!window.Peer) {
      state.ui.joinPreviewStatus = 'error';
      state.ui.joinPreviewError = 'Impossible de vérifier la salle.';
      return;
    }
    const peer = new Peer(uid('hallila_preview'));
    state.previewPeer = peer;
    peer.on('open', () => {
      const conn = peer.connect(roomId, { reliable: true });
      state.previewConn = conn;
      conn.on('open', () => conn.send({ type: 'peek' }));
      conn.on('data', (message) => {
        if (message?.type === 'snapshot') {
          state.ui.joinPreview = message.room;
          state.ui.joinPreviewStatus = 'ready';
          state.ui.joinPreviewError = '';
          render();
          setTimeout(() => cleanupJoinPreview(), 60);
        }
        if (message?.type === 'join-rejected') {
          state.ui.joinPreviewStatus = 'error';
          state.ui.joinPreviewError = message.reason || 'Couleur indisponible.';
          render();
        }
      });
      conn.on('error', () => {
        state.ui.joinPreviewStatus = 'error';
        state.ui.joinPreviewError = 'Salle indisponible.';
        render();
      });
    });
    peer.on('error', () => {
      state.ui.joinPreviewStatus = 'error';
      state.ui.joinPreviewError = 'Salle indisponible.';
      render();
    });
  }

  function saveCurrentItemsAsSet() {
    const items = normalizeItems(state.ui.itemEditor);
    const name = String(state.ui.newSetName || '').trim();
    if (!name) {
      setNotice('Donne un nom au set.', 'warn');
      return;
    }
    if (items.length < 2) {
      setNotice('Il faut au moins 2 noms dans un set.', 'warn');
      return;
    }
    const sets = itemSetsStore();
    const existing = state.ui.selectedSetId ? sets.find((entry) => entry.id === state.ui.selectedSetId) : sets.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
    let activeSet;
    if (existing) {
      existing.name = name;
      existing.items = items;
      activeSet = existing;
      state.ui.selectedSetId = existing.id;
      setNotice('Set mis à jour.', 'ok');
    } else {
      const created = { id: uid('set'), name, items };
      sets.unshift(created);
      activeSet = created;
      state.ui.selectedSetId = created.id;
      setNotice('Set enregistré.', 'ok');
    }
    saveItemSets(sets);
    dbPersistSet(activeSet);
    render();
  }

  function loadSetIntoEditor(setId) {
    const set = itemSetsStore().find((entry) => entry.id === setId);
    if (!set) return;
    state.ui.selectedSetId = set.id;
    state.ui.newSetName = set.name;
    state.ui.itemEditor = [...set.items];
    render();
  }

  function deleteItemSet(setId) {
    const sets = itemSetsStore().filter((entry) => entry.id !== setId);
    saveItemSets(sets);
    if (state.ui.selectedSetId === setId) {
      state.ui.selectedSetId = null;
      state.ui.newSetName = '';
    }
    dbDeleteSet(setId);
    setNotice('Set supprimé.', 'ok');
  }

  function sendFeedbackVote(value) {
    const route = getRoute();
    if (!state.hostConn || !state.hostConn.open || !route.playerId) {
      setNotice('Connexion avec l’admin perdue.', 'bad');
      return;
    }
    state.hostConn.send({ type: 'feedback', playerId: route.playerId, value });
  }

  function getRoute() {
    const params = new URLSearchParams(window.location.search);
    return {
      roomId: params.get('room'),
      joinId: params.get('join'),
      playerId: params.get('player'),
      adminToken: params.get('admin'),
      themeHint: params.get('theme') || '',
      hash: window.location.hash || ''
    };
  }

  function setRoute(params = {}, hash = '') {
    const url = new URL(window.location.href);
    url.search = '';
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
    url.hash = hash || '';
    history.replaceState({}, '', url.toString());
  }

  function historyStore() {
    return readJson(HISTORY_KEY, []);
  }

  function loadActiveRoom(roomId) {
    const room = readJson(activeRoomKey(roomId), null);
    if (!room) return null;
    room.themeMode = room.themeMode || 'direct';
    room.items = normalizeItems(room.items || DEFAULT_ITEMS);
    room.themeBox = Array.isArray(room.themeBox) ? room.themeBox : [];
    room.rankings = room.rankings || {};
    room.feedback = room.feedback || {};
    room.players = Array.isArray(room.players) ? room.players : [];
    room.finalResults = Array.isArray(room.finalResults) ? room.finalResults : [];
    room.usedThemeIds = Array.isArray(room.usedThemeIds) ? room.usedThemeIds : [];
    room.roundId = room.roundId || `round_${room.id || roomId}`;
    room.roundNumber = Number(room.roundNumber || 1);
    room.currentHistoryId = room.currentHistoryId || null;
    return room;
  }

  function saveActiveRoom(room) {
    room.updatedAt = nowIso();
    writeJson(activeRoomKey(room.id), room);
  }

  function loadPlayerSession(roomId) {
    return readJson(playerSessionKey(roomId), null);
  }

  function savePlayerSession(roomId, session) {
    writeJson(playerSessionKey(roomId), session);
  }

  function clearPlayerSession(roomId) {
    removeKey(playerSessionKey(roomId));
  }

  function loadDraft(roomId, playerId) {
    return readJson(draftKey(roomId, playerId), {});
  }

  function saveDraft(roomId, playerId, draft) {
    writeJson(draftKey(roomId, playerId), draft);
  }

  function clearDraft(roomId, playerId) {
    removeKey(draftKey(roomId, playerId));
  }

  function loadRoundMark(roomId, playerId) {
    return readJson(roundMarkKey(roomId, playerId), null);
  }

  function saveRoundMark(roomId, playerId, roundId) {
    writeJson(roundMarkKey(roomId, playerId), roundId);
  }

  function clearRoundMark(roomId, playerId) {
    removeKey(roundMarkKey(roomId, playerId));
  }

  function makeJoinLink(room) {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('join', room.id);
    url.searchParams.set('theme', room.themeMode === 'box' ? 'Boîte à thème' : room.theme);
    return url.toString();
  }

  function normalizePseudo(room, pseudo) {
    const trimmed = pseudo.trim();
    if (!trimmed) return '';
    const existing = new Set(room.players.map((p) => p.pseudo.toLowerCase()));
    let name = trimmed;
    let i = 2;
    while (existing.has(name.toLowerCase())) {
      name = `${trimmed} (${i++})`;
    }
    return name;
  }

  function normalizeItems(items) {
    const seen = new Set();
    const clean = [];
    (items || []).forEach((item) => {
      const name = String(item || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      clean.push(name);
    });
    return clean;
  }

  function availableThemeChoices(roomOrSnapshot) {
    const used = new Set(roomOrSnapshot.usedThemeIds || []);
    return (roomOrSnapshot.themeBox || []).filter((entry) => String(entry.text || '').trim() && !used.has(entry.id));
  }

  function themeBoxCount(roomOrSnapshot) {
    return availableThemeChoices(roomOrSnapshot).length;
  }

  function currentWaitingPhrase() {
    return WAITING_PHRASES[state.ui.waitingPhraseIndex % WAITING_PHRASES.length];
  }

  function setWaitingTicker(mode) {
    if (state.ui.waitingContext === mode) return;
    if (state.ui.waitingTicker) {
      clearInterval(state.ui.waitingTicker);
      state.ui.waitingTicker = null;
    }
    state.ui.waitingContext = mode || '';
    if (!mode) return;
    state.ui.waitingTicker = setInterval(() => {
      state.ui.waitingPhraseIndex = (state.ui.waitingPhraseIndex + 1) % WAITING_PHRASES.length;
      render();
    }, 2600);
  }

  function ensureResultsReveal(room) {
    if (!room) return;
    if (state.ui.resultRevealRoomId === room.id) return;
    if (state.ui.resultTimer) clearTimeout(state.ui.resultTimer);
    state.ui.resultRevealRoomId = room.id;
    state.ui.resultRevealPhase = 'podium';
    state.ui.resultTimer = setTimeout(() => {
      state.ui.resultRevealPhase = 'full';
      render();
    }, 3600);
  }

  function skipReveal() {
    if (state.ui.resultTimer) clearTimeout(state.ui.resultTimer);
    state.ui.resultTimer = null;
    state.ui.resultRevealPhase = 'full';
    render();
  }

  function networkLabel(status) {
    if (status === 'online') return { cls: 'ok', text: 'Connexion en ligne' };
    if (status === 'connecting') return { cls: '', text: 'Connexion en cours…' };
    if (status === 'reconnecting') return { cls: '', text: 'Reconnexion…' };
    return { cls: 'bad', text: 'Hors ligne' };
  }

  function peerErrorMessage(error, isAdmin) {
    const type = error?.type || '';
    if (type === 'peer-unavailable') return 'Partie introuvable ou admin hors ligne.';
    if (type === 'network') return 'Erreur réseau. Vérifie la connexion.';
    if (type === 'browser-incompatible') return 'Navigateur incompatible avec la connexion en temps réel.';
    if (type === 'webrtc') return 'Le navigateur bloque WebRTC. Essaie Chrome ou Edge.';
    if (type === 'socket-error' || type === 'socket-closed') return 'Connexion au serveur temps réel perdue.';
    if (type === 'unavailable-id') return isAdmin ? 'Réouverture de la salle en cours…' : 'Identifiant de salle indisponible.';
    return isAdmin ? 'Impossible d’ouvrir la salle.' : 'Connexion impossible à la partie.';
  }

  function publicSnapshot(room) {
    return {
      id: room.id,
      theme: room.theme,
      themeMode: room.themeMode,
      historyTitle: room.historyTitle,
      status: room.status,
      roundId: room.roundId,
      roundNumber: room.roundNumber,
      currentHistoryId: room.currentHistoryId || null,
      usedThemeIds: [...(room.usedThemeIds || [])],
      items: [...room.items],
      themeBox: (room.themeBox || []).map((entry) => ({
        id: entry.id,
        playerId: entry.playerId,
        author: entry.author,
        text: entry.text
      })),
      chosenThemeMeta: room.chosenThemeMeta || null,
      finalResults: room.finalResults || [],
      feedback: room.feedback || {},
      players: room.players.map((player) => ({
        id: player.id,
        pseudo: player.pseudo,
        color: player.color,
        submittedAt: player.submittedAt || null,
        connected: !!player.connected
      }))
    };
  }

  function computeFinalResults(room) {
    const totalPlayers = room.players.length;
    const results = (room.items || []).map((name) => {
      let sum = 0;
      room.players.forEach((player) => {
        const ranking = room.rankings[player.id] || {};
        const tier = ranking[name] || 'E';
        sum += TIER_POINTS[tier] || 0;
      });
      const averagePoints = totalPlayers ? sum / totalPlayers : 0;
      const score = totalPlayers ? ((averagePoints / 5) * 100) : 0;
      let finalTier = 'E';
      if (score >= 95) finalTier = 'S';
      else if (score >= 80) finalTier = 'A';
      else if (score >= 60) finalTier = 'B';
      else if (score >= 35) finalTier = 'C';
      else if (score >= 15) finalTier = 'D';
      return {
        name,
        sum,
        averagePoints: Number(averagePoints.toFixed(2)),
        score: Number(score.toFixed(2)),
        finalTier
      };
    });
    results.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'fr'));
    return results;
  }

  function saveHistoryEntry(room) {
    const history = historyStore();
    const historyId = room.currentHistoryId || uid('history');
    const payload = {
      id: historyId,
      roomId: room.id,
      roundId: room.roundId,
      roundNumber: room.roundNumber,
      title: room.historyTitle || `Résultat — ${room.theme}`,
      theme: room.theme,
      playersCount: room.players.length,
      completedAt: room.completedAt || nowIso(),
      players: room.players.map((player) => ({ id: player.id, pseudo: player.pseudo, color: player.color })),
      results: room.finalResults
    };
    room.currentHistoryId = historyId;
    const existingIndex = history.findIndex((entry) => entry.id === historyId || (entry.roomId === room.id && entry.roundId === room.roundId));
    if (existingIndex >= 0) history[existingIndex] = payload;
    else history.unshift(payload);
    writeJson(HISTORY_KEY, history);
    dbPersistCompletedRoom(room, payload);
  }

  function saveHistoryEntryFromSnapshot(snapshot) {
    if (!snapshot || snapshot.status !== 'results' || !(snapshot.finalResults || []).length) return;
    const history = historyStore();
    const historyId = snapshot.currentHistoryId || `history_${snapshot.id}_${snapshot.roundId || 'single'}`;
    const payload = {
      id: historyId,
      roomId: snapshot.id,
      roundId: snapshot.roundId || null,
      roundNumber: snapshot.roundNumber || 1,
      title: snapshot.historyTitle || `Résultat — ${snapshot.theme}`,
      theme: snapshot.theme,
      playersCount: (snapshot.players || []).length,
      completedAt: nowIso(),
      players: (snapshot.players || []).map((player) => ({ id: player.id, pseudo: player.pseudo, color: player.color })),
      results: snapshot.finalResults || []
    };
    const existingIndex = history.findIndex((entry) => entry.id === historyId || (entry.roomId === payload.roomId && entry.roundId === payload.roundId));
    if (existingIndex >= 0) history[existingIndex] = payload;
    else history.unshift(payload);
    writeJson(HISTORY_KEY, history);
  }

  function finishRoomIfReady() {
    if (!state.room) return;
    const allSubmitted = state.room.players.length > 0 && state.room.players.every((player) => !!state.room.rankings[player.id]);
    if (!allSubmitted) return;
    state.room.status = 'results';
    state.room.completedAt = nowIso();
    state.room.finalResults = computeFinalResults(state.room);
    saveHistoryEntry(state.room);
  }

  function resetRoomForNextRound(room, options = {}) {
    room.rankings = {};
    room.feedback = {};
    room.finalResults = [];
    room.completedAt = null;
    room.currentHistoryId = null;
    room.roundNumber = Number(room.roundNumber || 1) + 1;
    room.roundId = uid('round');
    room.players.forEach((player) => {
      player.submittedAt = null;
    });
    room.chosenThemeMeta = null;
    if (options.resetThemeBox) {
      room.theme = '';
      room.themeBox = [];
      room.usedThemeIds = [];
    }
  }

  function relaunchSamePlayers() {
    if (!state.room || !state.room.players.length) return;
    const hadBoxMode = state.room.themeMode === 'box';
    const available = hadBoxMode ? availableThemeChoices(state.room) : [];
    resetRoomForNextRound(state.room, { resetThemeBox: hadBoxMode && !available.length });
    state.room.status = 'lobby';
    state.room.themeMode = 'direct';
    state.room.theme = '';
    state.room.chosenThemeMeta = null;
    state.ui.themeMode = 'direct';
    state.ui.theme = '';
    saveActiveRoom(state.room);
    broadcastSnapshot();
    state.ui.resultRevealRoomId = null;
    state.ui.resultRevealPhase = 'full';
    if (hadBoxMode && !available.length) {
      setNotice('La boîte à thème est vide. Choisis un thème ou remplis la boîte à thème de nouveau.', 'warn', 4600);
    } else {
      setNotice('Partie relancée. Choisis un nouveau thème ou utilise la boîte à thème.', 'ok');
    }
    render();
  }

  function upsertPlayer(room, data) {
    const found = room.players.find((player) => player.id === data.playerId);
    if (found) {
      found.pseudo = data.pseudo;
      found.color = data.color;
      found.connected = true;
      return found;
    }
    const created = {
      id: data.playerId,
      pseudo: data.pseudo,
      color: data.color,
      joinedAt: nowIso(),
      submittedAt: null,
      connected: true
    };
    room.players.push(created);
    return created;
  }

  function removePlayer(room, playerId) {
    room.players = room.players.filter((player) => player.id !== playerId);
    delete room.rankings[playerId];
    try { clearDraft(room.id, playerId); } catch {}
    try { clearRoundMark(room.id, playerId); } catch {}
    room.themeBox = (room.themeBox || []).filter((entry) => entry.playerId !== playerId);
  }

  function upsertThemeSuggestion(room, payload) {
    const clean = String(payload.text || '').trim();
    room.themeBox = room.themeBox || [];
    room.usedThemeIds = Array.isArray(room.usedThemeIds) ? room.usedThemeIds : [];
    const existing = room.themeBox.find((entry) => entry.playerId === payload.playerId);
    if (!clean) {
      if (existing) room.themeBox = room.themeBox.filter((entry) => entry.playerId !== payload.playerId);
      return;
    }
    if (existing) {
      existing.text = clean;
      existing.author = payload.author;
      if (room.usedThemeIds.includes(existing.id)) {
        const previousId = existing.id;
        existing.id = uid('theme');
        room.usedThemeIds = room.usedThemeIds.filter((id) => id !== previousId);
      }
    } else {
      room.themeBox.push({
        id: uid('theme'),
        playerId: payload.playerId,
        author: payload.author,
        text: clean
      });
    }
  }

  function resetNetwork() {
    if (state.hostConn) {
      try { state.hostConn.close(); } catch {}
    }
    Object.values(state.connections).forEach((conn) => {
      try { conn.close(); } catch {}
    });
    state.connections = {};
    if (state.peer) {
      try { state.peer.destroy(); } catch {}
    }
    state.peer = null;
    state.hostConn = null;
    cleanupJoinPreview();
    state.peerStatus = 'offline';
    state.peerError = '';
    state.role = null;
    state.snapshot = null;
    state.playerSession = null;
  }

  function broadcastSnapshot() {
    if (!state.room) return;
    const payload = { type: 'snapshot', room: publicSnapshot(state.room) };
    Object.values(state.connections).forEach((conn) => {
      if (conn && conn.open) conn.send(payload);
    });
  }

  function attemptAdminHost(room, attempt) {
    if (state.role !== 'admin' || !state.room || state.room.id !== room.id) return;
    const peer = new Peer(room.id);
    state.peer = peer;

    peer.on('open', () => {
      state.peerStatus = 'online';
      state.peerError = '';
      saveActiveRoom(state.room);
      render();
    });

    peer.on('connection', (conn) => {
      conn.on('open', () => {
        conn.on('data', (message) => handleAdminMessage(conn, message));
        conn.on('close', () => handleAdminDisconnect(conn));
        conn.on('error', () => handleAdminDisconnect(conn));
      });
    });

    peer.on('disconnected', () => {
      state.peerStatus = 'reconnecting';
      render();
      try { peer.reconnect(); } catch {}
    });

    peer.on('close', () => {
      if (state.role === 'admin') {
        state.peerStatus = 'offline';
        render();
      }
    });

    peer.on('error', (error) => {
      if (state.role !== 'admin') return;
      if (error?.type === 'unavailable-id' && attempt < 10) {
        state.peerStatus = 'reconnecting';
        state.peerError = 'Réouverture de la salle…';
        render();
        try { peer.destroy(); } catch {}
        setTimeout(() => attemptAdminHost(room, attempt + 1), 1200);
        return;
      }
      state.peerStatus = 'error';
      state.peerError = peerErrorMessage(error, true);
      render();
    });
  }

  function ensureAdminHosting(room) {
    state.room = room;
    if (state.role === 'admin' && state.peer && state.room?.id === room.id) return;
    resetNetwork();
    state.role = 'admin';
    state.room = room;
    state.connections = {};
    state.peerStatus = 'connecting';
    state.peerError = '';
    attemptAdminHost(room, 0);
  }

  function handleAdminDisconnect(conn) {
    if (!state.room) return;
    const playerId = conn._playerId;
    if (!playerId) return;
    delete state.connections[playerId];
    const player = state.room.players.find((entry) => entry.id === playerId);
    if (player) player.connected = false;
    saveActiveRoom(state.room);
    broadcastSnapshot();
    setNotice(`${player.pseudo} a été retiré de la partie.`, 'ok');
    render();
  }

  function handleAdminMessage(conn, message) {
    if (!state.room || !message || typeof message !== 'object') return;

    if (message.type === 'peek') {
      if (conn.open) conn.send({ type: 'snapshot', room: publicSnapshot(state.room) });
      return;
    }

    if (message.type === 'join') {
      const colorTaken = state.room.players.some((player) => player.color === message.color && player.id !== message.playerId);
      if (colorTaken) {
        if (conn.open) conn.send({ type: 'join-rejected', reason: 'Cette couleur est déjà prise.' });
        try { conn.close(); } catch {}
        return;
      }
      const player = upsertPlayer(state.room, message);
      conn._playerId = player.id;
      state.connections[player.id] = conn;
      player.connected = true;
      saveActiveRoom(state.room);
      broadcastSnapshot();
      if (conn.open) conn.send({ type: 'snapshot', room: publicSnapshot(state.room) });
      render();
      return;
    }

    if (message.type === 'submit') {
      state.room.rankings[message.playerId] = message.ranking || {};
      const player = state.room.players.find((entry) => entry.id === message.playerId);
      if (player) {
        player.submittedAt = nowIso();
        player.connected = true;
      }
      finishRoomIfReady();
      saveActiveRoom(state.room);
      broadcastSnapshot();
      render();
      return;
    }

    if (message.type === 'theme-suggestion') {
      const player = state.room.players.find((entry) => entry.id === message.playerId);
      upsertThemeSuggestion(state.room, {
        playerId: message.playerId,
        author: player?.pseudo || 'Joueur',
        text: message.text
      });
      saveActiveRoom(state.room);
      broadcastSnapshot();
      render();
      return;
    }

    if (message.type === 'feedback') {
      state.room.feedback = state.room.feedback || {};
      if (message.value === 'none') delete state.room.feedback[message.playerId];
      else state.room.feedback[message.playerId] = message.value;
      saveActiveRoom(state.room);
      broadcastSnapshot();
      render();
      return;
    }

    if (message.type === 'leave') {
      removePlayer(state.room, message.playerId);
      delete state.connections[message.playerId];
      finishRoomIfReady();
      saveActiveRoom(state.room);
      broadcastSnapshot();
      render();
    }
  }

  function ensurePlayerConnection(route) {
    const session = loadPlayerSession(route.roomId);
    if (!session || session.playerId !== route.playerId) return;
    state.playerSession = session;
    if (state.role === 'player' && state.peer && state.playerSession?.playerId === session.playerId) return;

    resetNetwork();
    state.role = 'player';
    state.playerSession = session;
    state.peerStatus = 'connecting';
    state.peerError = '';
    state.snapshot = null;

    const peer = new Peer(uid('hallila_player'));
    state.peer = peer;

    peer.on('open', () => connectPlayerToAdmin(route.roomId, session));
    peer.on('disconnected', () => {
      state.peerStatus = 'reconnecting';
      render();
      try { peer.reconnect(); } catch {}
    });
    peer.on('close', () => {
      if (state.role === 'player') {
        state.peerStatus = 'offline';
        render();
      }
    });
    peer.on('error', (error) => {
      state.peerStatus = 'error';
      state.peerError = peerErrorMessage(error, false);
      render();
    });
  }

  function connectPlayerToAdmin(roomId, session) {
    if (!state.peer) return;
    const conn = state.peer.connect(roomId, { reliable: true });
    state.hostConn = conn;
    let opened = false;
    let kicked = false;

    conn.on('open', () => {
      opened = true;
      state.peerStatus = 'online';
      state.peerError = '';
      conn.send({ type: 'join', playerId: session.playerId, pseudo: session.pseudo, color: session.color });
      render();
    });

    conn.on('data', (message) => {
      if (message?.type === 'snapshot') {
        state.snapshot = message.room;
        state.peerStatus = 'online';
        state.peerError = '';
        if (session) {
          const lastRoundId = loadRoundMark(roomId, session.playerId);
          if (message.room?.roundId && lastRoundId !== message.room.roundId) {
            clearDraft(roomId, session.playerId);
            saveRoundMark(roomId, session.playerId, message.room.roundId);
            session.roundId = message.room.roundId;
            savePlayerSession(roomId, session);
            state.playerSession = session;
          }
        }
        if (message.room?.status === 'results') {
          saveHistoryEntryFromSnapshot(message.room);
        }
        render();
        return;
      }
      if (message?.type === 'join-rejected') {
        kicked = true;
        clearPlayerSession(roomId);
        clearDraft(roomId, session.playerId);
        clearRoundMark(roomId, session.playerId);
        resetNetwork();
        state.ui.joinColor = session.color || state.ui.joinColor;
        state.ui.joinPseudo = session.pseudo || state.ui.joinPseudo;
        const currentRoute = getRoute();
        setRoute({ join: roomId, theme: currentRoute.themeHint || '' }, '');
        setNotice(message.reason || 'Impossible de rejoindre la partie.', 'bad', 4200);
        render();
        return;
      }
      if (message?.type === 'kicked') {
        kicked = true;
        clearPlayerSession(roomId);
        clearDraft(roomId, session.playerId);
        clearRoundMark(roomId, session.playerId);
        resetNetwork();
        setRoute({}, '');
        setNotice(message.reason || 'Tu as été retiré de la partie.', 'bad', 4200);
        render();
      }
    });

    conn.on('close', () => {
      if (kicked) return;
      state.peerStatus = 'error';
      state.peerError = opened || state.snapshot ? 'Connexion à l’admin perdue.' : 'Partie introuvable ou admin hors ligne.';
      render();
    });

    conn.on('error', (error) => {
      state.peerStatus = 'error';
      state.peerError = peerErrorMessage(error, false);
      render();
    });
  }

  function createRoom(theme, historyTitle, themeMode) {
    const cleanTheme = String(theme || '').trim();
    const room = {
      id: uid('room'),
      adminToken: uid('admin'),
      themeMode: themeMode || 'direct',
      theme: themeMode === 'direct' ? cleanTheme : '',
      historyTitle: String(historyTitle || '').trim() || (themeMode === 'direct' && cleanTheme ? `Résultat — ${cleanTheme}` : 'Résultat — Boîte à thème'),
      status: 'lobby',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      completedAt: null,
      chosenThemeMeta: null,
      roundId: uid('round'),
      roundNumber: 1,
      currentHistoryId: null,
      usedThemeIds: [],
      players: [],
      items: normalizeItems(state.ui.itemEditor),
      rankings: {},
      feedback: {},
      finalResults: [],
      themeBox: []
    };
    saveActiveRoom(room);
    state.ui.roomHistoryDraft = room.historyTitle;
    setRoute({ room: room.id, admin: room.adminToken }, '');
    render();
  }

  function startRoom() {
    if (!state.room || !state.room.players.length) return;
    if (state.room.themeMode === 'box') {
      const choices = availableThemeChoices(state.room);
      if (!choices.length) {
        setNotice('La boîte à thème est vide. Ajoute au moins un thème non utilisé avant de lancer.', 'warn');
        return;
      }
      const pick = choices[Math.floor(Math.random() * choices.length)];
      state.room.theme = pick.text;
      state.room.chosenThemeMeta = { author: pick.author, playerId: pick.playerId };
      state.room.usedThemeIds = [...(state.room.usedThemeIds || []), pick.id];
    }
    if (!String(state.room.theme || '').trim()) {
      setNotice('Entre un thème valide avant de lancer.', 'warn');
      return;
    }
    state.room.status = 'ranking';
    saveActiveRoom(state.room);
    broadcastSnapshot();
    render();
  }

  function joinRoom(route) {
    const pseudo = (state.ui.joinPseudo || '').trim();
    if (!pseudo) {
      setNotice('Entre un pseudo valide.', 'warn');
      return;
    }
    if (!window.Peer) {
      setNotice('PeerJS n’a pas chargé. Vérifie la connexion internet.', 'bad');
      return;
    }
    const session = {
      playerId: uid('player'),
      pseudo,
      color: state.ui.joinColor
    };
    savePlayerSession(route.joinId, session);
    setRoute({ room: route.joinId, player: session.playerId }, '');
    render();
  }

  function leavePlayerRoom() {
    const route = getRoute();
    const playerId = state.playerSession?.playerId || route.playerId;
    if (state.hostConn && state.hostConn.open && playerId) {
      try {
        state.hostConn.send({ type: 'leave', playerId });
      } catch {}
    }
    if (route.roomId && playerId) {
      clearDraft(route.roomId, playerId);
      clearRoundMark(route.roomId, playerId);
    }
    if (route.roomId) clearPlayerSession(route.roomId);
    resetNetwork();
    setRoute({}, '');
    render();
  }

  function adminRemovePlayer(playerId) {
    if (!state.room) return;
    const player = state.room.players.find((entry) => entry.id === playerId);
    if (!player) return;
    const conn = state.connections[playerId];
    if (conn && conn.open) {
      try { conn.send({ type: 'kicked', reason: 'L’admin t’a retiré de la partie.' }); } catch {}
      try { conn.close(); } catch {}
    }
    delete state.connections[playerId];
    removePlayer(state.room, playerId);
    finishRoomIfReady();
    saveActiveRoom(state.room);
    broadcastSnapshot();
    render();
  }

  function moveDraftItem(roomId, playerId, item, tier) {
    const draft = loadDraft(roomId, playerId);
    if (tier === 'UNASSIGNED' || !tier) delete draft[item];
    else draft[item] = tier;
    saveDraft(roomId, playerId, draft);
    render();
  }

  function submitRanking(roomId, playerId, items) {
    const draft = loadDraft(roomId, playerId);
    const targetItems = items || DEFAULT_ITEMS;
    const missing = targetItems.filter((item) => !draft[item]);
    if (missing.length) {
      setNotice('Classe tous les noms avant d’envoyer la tier list.', 'warn');
      return;
    }
    if (!state.hostConn || !state.hostConn.open) {
      setNotice('Connexion avec l’admin perdue.', 'bad');
      return;
    }
    state.hostConn.send({ type: 'submit', playerId, ranking: draft });
  }

  function updateRoomHistoryTitle(newTitle) {
    if (!state.room || !newTitle.trim()) {
      setNotice('Entre un titre valide.', 'warn');
      return;
    }
    state.room.historyTitle = newTitle.trim();
    state.ui.roomHistoryDraft = state.room.historyTitle;
    saveActiveRoom(state.room);
    const history = historyStore();
    const entry = history.find((item) => item.id === state.room.currentHistoryId || (item.roomId === state.room.id && item.roundId === state.room.roundId));
    if (entry) {
      entry.title = state.room.historyTitle;
      writeJson(HISTORY_KEY, history);
    }
    setNotice('Titre historique enregistré.', 'ok');
    dbUpdateHistoryTitle(state.room.currentHistoryId || state.room.id, state.room.historyTitle, state.room.id, state.room.roundId);
    render();
  }

  function updateHistoryTitle(entryId, newTitle) {
    if (!newTitle.trim()) {
      setNotice('Entre un titre valide.', 'warn');
      return;
    }
    const history = historyStore();
    const entry = history.find((item) => item.id === entryId);
    if (!entry) return;
    entry.title = newTitle.trim();
    writeJson(HISTORY_KEY, history);
    const room = loadActiveRoom(entry.roomId);
    if (room && ((!entry.roundId) || room.roundId === entry.roundId || room.currentHistoryId === entry.id)) {
      room.historyTitle = newTitle.trim();
      saveActiveRoom(room);
      if (state.room?.id === room.id) state.room.historyTitle = newTitle.trim();
    }
    setNotice('Titre historique enregistré.', 'ok');
    dbUpdateHistoryTitle(entry.id, newTitle.trim(), entry.roomId, entry.roundId);
    render();
  }

  function saveItemEditorToRoom() {
    if (!state.room || state.room.status !== 'lobby') return;
    const items = normalizeItems(state.ui.itemEditor);
    if (items.length < 2) {
      setNotice('Il faut au moins 2 noms à classer.', 'warn');
      return;
    }
    state.room.items = items;
    saveActiveRoom(state.room);
    broadcastSnapshot();
    dbEnsurePersonas(items);
    setNotice('Liste des noms sauvegardée.', 'ok');
    render();
  }

  function syncItemEditor(room) {
    if (state.ui.itemEditorRoomId !== room.id) {
      state.ui.itemEditorRoomId = room.id;
      state.ui.itemEditor = [...(room.items || DEFAULT_ITEMS)];
      state.ui.newItemName = '';
    }
  }

  function submitThemeSuggestionFromPlayer(route, text) {
    if (!state.hostConn || !state.hostConn.open) {
      setNotice('Connexion avec l’admin perdue.', 'bad');
      return;
    }
    state.hostConn.send({ type: 'theme-suggestion', playerId: route.playerId, text });
  }

  function submitThemeSuggestionFromAdmin(text) {
    if (!state.room) return;
    upsertThemeSuggestion(state.room, {
      playerId: `admin_${state.room.id}`,
      author: 'Admin',
      text
    });
    saveActiveRoom(state.room);
    broadcastSnapshot();
    render();
  }

  function brand(options = {}) {
    const compact = options.compact || false;
    const home = options.home || false;
    const classes = ['brand-wrap'];
    if (home) classes.push('home-brand');
    return `
      <div class="${classes.join(' ')}">
        <h1 class="brand"${compact ? ' style="font-size:clamp(48px,5.5vw,76px)"' : ''}>${APP_TITLE}</h1>
        <p class="brand-sub"${compact ? ' style="font-size:clamp(16px,1.8vw,26px)"' : ''}>Tiers List Maker</p>
      </div>
    `;
  }

  function networkBadge() {
    const label = networkLabel(state.peerStatus);
    return `
      <div class="network-status">
        <span class="network-dot ${label.cls}"></span>
        <span>${label.text}</span>
      </div>
    `;
  }

  function playerPills(players, showSubmitted = false) {
    return `
      <div class="players-grid">
        ${players.map((player) => `
          <div class="player-pill">
            <div class="player-label" style="background:${player.color};">
              <span class="player-chip-dot"></span>
              ${escapeHtml(player.pseudo)}
              <span class="connected-dot ${player.connected ? 'on' : 'off'}"></span>
              ${showSubmitted && player.submittedAt ? '<span>✓</span>' : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function personCard(name, currentTier) {
    const color = currentTier ? TIER_COLORS[currentTier] : 'rgba(255,255,255,.12)';
    return `
      <div class="person-card" draggable="true" data-item="${escapeHtml(name)}" style="border-color:${color};box-shadow:0 0 0 2px ${currentTier ? `${color}33` : 'transparent'};">
        <div class="person-name">${escapeHtml(name)}</div>
        <div class="quick-actions">
          ${TIERS.map((tier) => `
            <button class="quick-btn" data-move-item="${escapeHtml(name)}" data-target-tier="${tier}" style="border-color:${currentTier === tier ? TIER_COLORS[tier] : 'rgba(255,255,255,.35)'};background:${currentTier === tier ? `${TIER_COLORS[tier]}22` : 'transparent'}">${tier}</button>
          `).join('')}
          <button class="quick-btn clear" data-move-item="${escapeHtml(name)}" data-target-tier="UNASSIGNED">↺</button>
        </div>
      </div>
    `;
  }

  function miniRows(results) {
    const counts = { S: 0, A: 0, B: 0, C: 0, D: 0, E: 0 };
    (results || []).forEach((item) => { counts[item.finalTier] += 1; });
    return TIERS.map((tier) => `
      <div class="mini-row">
        <div class="mini-badge" style="background:${TIER_COLORS[tier]}">${tier}</div>
        <div class="mini-track">
          ${Array.from({ length: Math.max(counts[tier], 1) }).map(() => '<div class="mini-block"></div>').join('')}
        </div>
      </div>
    `).join('');
  }

  function spinnerBlock(extra = '') {
    return `
      <div class="waiting-cluster">
        <div class="spinner"></div>
        <div class="title-big" style="font-size:clamp(22px,2.6vw,34px);">${escapeHtml(extra || 'Waiting screen')} <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span></div>
        <div class="waiting-phrase">${escapeHtml(currentWaitingPhrase())}</div>
      </div>
    `;
  }

  function themeModeBadge(roomOrSnapshot) {
    return roomOrSnapshot.themeMode === 'box'
      ? `<span class="theme-badge"><span class="dot"></span>Boîte à thème · ${themeBoxCount(roomOrSnapshot)} proposition${themeBoxCount(roomOrSnapshot) > 1 ? 's' : ''}</span>`
      : `<span class="theme-badge"><span class="dot" style="background:var(--ok)"></span>Thème direct</span>`;
  }

  function themeBoxList(entries, usedIds = []) {
    const used = new Set(usedIds || []);
    const list = (entries || []).filter((entry) => String(entry.text || '').trim());
    if (!list.length) return '<div class="empty-small">La boîte à thème est vide pour le moment.</div>';
    return `<div class="theme-box-list">${list.map((entry) => `<div class="theme-chip"><strong>${escapeHtml(entry.author)}</strong>${escapeHtml(entry.text)}${used.has(entry.id) ? '<span class="subtle"> · déjà joué</span>' : ''}</div>`).join('')}</div>`;
  }

  function roundRestartBanner(roundNumber) {
    const round = Number(roundNumber || 1);
    if (round <= 1) return '';
    return `
      <div class="round-banner">
        <div class="round-banner-kicker">Nouvelle manche</div>
        <div class="round-banner-title">Manche ${round}</div>
        <div class="round-banner-sub">Même groupe, nouveau classement. Préparez-vous à relancer le débat.</div>
      </div>
    `;
  }

  function podiumMarkup(results) {
    const top = (results || []).slice(0, 3);
    const medals = ['second', 'first', 'third'];
    const order = [1, 0, 2].filter((index) => top[index]);
    return `
      <div class="podium-card">
        <div class="label-top">Révélation</div>
        <h2 class="title-big">Le podium se dévoile…</h2>
        <div class="podium-grid">
          ${order.map((index) => {
            const item = top[index];
            const rank = index === 0 ? 1 : index === 1 ? 2 : 3;
            const medalClass = rank === 1 ? 'first' : rank === 2 ? 'second' : 'third';
            return `
              <div class="podium-slot ${rank === 1 ? 'first' : ''}">
                <div class="medal ${medalClass}">${rank}</div>
                <div class="podium-name">${escapeHtml(item.name)}</div>
                <div class="podium-score">${item.score}% · Tier ${item.finalTier}</div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="reveal-hint">La tier list complète s’affiche automatiquement juste après.</div>
        <div class="row" style="justify-content:center;"><button class="btn" data-action="skip-reveal">Voir la tier list complète</button></div>
      </div>
    `;
  }

  function layout(label, inner) {
    app.innerHTML = `
      <div class="page">
        <div class="page-label">${escapeHtml(label)}</div>
        <div class="surface">
          <div class="screen">
            ${state.ui.notice ? `<div class="notice ${state.ui.notice.tone || 'warn'}">${escapeHtml(state.ui.notice.text)}</div>` : ''}
            ${inner}
          </div>
        </div>
        <button class="music-fab ${state.ui.musicEnabled ? 'active' : ''}" data-action="music-toggle" title="${state.ui.musicEnabled ? 'Couper la musique' : 'Relancer la musique'}">${state.ui.musicEnabled ? '♫ Musique on' : '♫ Musique off'}</button>
      </div>
    `;
    setupDnD();
    setupMusicUnlock();
    if (state.ui.musicEnabled) setTimeout(() => tryStartMusic(), 0);
  }

  function renderHome() {
    setWaitingTicker(null);
    layout('', `
      <div class="center-stack home-hero">
        ${brand({ home: true })}
        <div class="home-actions">
          <button class="big-btn" data-action="go-create">Lancer une partie</button>
          <button class="ghost-btn" data-action="go-history">Historique</button>
          <button class="ghost-btn" data-action="go-stats">Stats</button>
        </div>
        <div class="home-splash">
          <div class="footer-note">Mode multijoueur temps réel : les joueurs peuvent rejoindre depuis un autre appareil avec le lien de partie.</div>
          <div class="footer-note">L’admin doit garder sa page ouverte pendant toute la session.</div>
          <div class="footer-note">Sauvegarde des sets, personas et stats : <strong>${dbStatusText()}</strong></div>
        </div>
      </div>
    `);
  }

  function renderCreate() {
    setWaitingTicker(null);
    const sets = itemSetsStore();
    layout('Créer une partie', `
      <div class="topbar">
        <button class="btn" data-action="go-home">Retour</button>
        ${brand()}
        <div class="meta-side">
          <button class="btn" data-action="create-room">Créer</button>
          <div class="subtle">${state.ui.themeMode === 'box' ? 'Boîte à thème activée' : `${state.ui.itemEditor.length} personnes à classer`}</div>
        </div>
      </div>
      <div class="create-stack">
        <div class="card">
          <div class="form-grid">
            <div style="text-align:left;">
              <div class="label-top">Mode de thème</div>
              <div class="mode-row">
                <button class="mode-btn ${state.ui.themeMode === 'direct' ? 'active' : ''}" data-action="set-theme-mode-direct">Choisir le thème maintenant</button>
                <button class="mode-btn ${state.ui.themeMode === 'box' ? 'active' : ''}" data-action="set-theme-mode-box">Se fier à la boîte à thème</button>
              </div>
            </div>
            <div style="text-align:left;">
              <div class="label-top">${state.ui.themeMode === 'direct' ? 'Thème de la tier list' : 'Nom interne de la partie (optionnel)'}</div>
              <input id="theme-input" class="text-input" placeholder="${state.ui.themeMode === 'direct' ? 'Exemple : Qui a le plus de flow ?' : 'Exemple : Soirée du samedi'}" value="${escapeHtml(state.ui.theme)}">
            </div>
            <div style="text-align:left;">
              <div class="label-top">Titre dans l’historique</div>
              <input id="history-title-input" class="text-input" placeholder="Exemple : Soirée du 12 avril" value="${escapeHtml(state.ui.historyTitle)}">
            </div>
          </div>
        </div>

        <div class="items-card">
          <div class="row" style="justify-content:space-between;">
            <div>
              <div class="label-top">Set actuel</div>
              <div class="subtle">Prépare la liste des personnes à classer avant de créer la partie.</div>
            </div>
            <div class="row">
              <button class="btn" data-action="reset-default-items">Liste par défaut</button>
            </div>
          </div>
          <div class="items-table" style="margin-top:12px;">
            ${state.ui.itemEditor.map((item, index) => `
              <div class="item-row">
                <input class="text-input" data-item-name-index="${index}" value="${escapeHtml(item)}" placeholder="Nom à classer">
                <div class="item-controls">
                  <button class="btn" data-action="delete-item" data-delete-index="${index}">Supprimer</button>
                </div>
              </div>
            `).join('')}
            <div class="item-row">
              <input id="new-item-input" class="text-input" placeholder="Ajouter un nouveau nom" value="${escapeHtml(state.ui.newItemName)}">
              <div class="item-controls">
                <button class="btn" data-action="add-item">Ajouter</button>
              </div>
            </div>
          </div>
        </div>

        <div class="items-card">
          <div class="row" style="justify-content:space-between;">
            <div>
              <div class="label-top">Sets enregistrés</div>
              <div class="subtle">Crée, réutilise et modifie tes sets de joueurs.</div>
            </div>
            <div class="subtle">${sets.length} set${sets.length > 1 ? 's' : ''} · ${dbStatusText()}</div>
          </div>
          <div class="row" style="margin-top:12px;align-items:flex-end;">
            <div style="flex:1;min-width:220px;">
              <div class="label-top">Nom du set</div>
              <input id="set-name-input" class="text-input" placeholder="Exemple : Les cousins" value="${escapeHtml(state.ui.newSetName)}">
            </div>
            <button class="btn" data-action="save-current-set">${state.ui.selectedSetId ? 'Mettre à jour le set' : 'Créer le set'}</button>
          </div>
          <div class="sets-grid" style="margin-top:14px;">
            ${sets.length ? sets.map((set) => `
              <div class="set-card ${state.ui.selectedSetId === set.id ? 'active' : ''}">
                <div class="row" style="justify-content:space-between;">
                  <strong>${escapeHtml(set.name)}</strong>
                  <span class="subtle">${set.items.length} noms</span>
                </div>
                <div class="set-preview">${set.items.slice(0, 6).map((name) => `<span>${escapeHtml(name)}</span>`).join('')}${set.items.length > 6 ? '<span>…</span>' : ''}</div>
                <div class="history-actions">
                  <button class="btn" data-action="load-set" data-set-id="${set.id}">Utiliser</button>
                  <button class="btn" data-action="delete-set" data-set-id="${set.id}">Supprimer</button>
                </div>
              </div>
            `).join('') : '<div class="empty-small">Aucun set enregistré pour le moment.</div>'}
          </div>
        </div>
      </div>
    `);
  }

  function renderJoin(route) {
    setWaitingTicker(null);
    ensureJoinPreview(route.joinId);
    const preview = state.ui.joinPreview;
    const title = preview?.themeMode === 'box' ? 'Boîte à thème' : (preview?.theme || route.themeHint || 'Tier list');
    const taken = usedColors(preview);
    if (taken.has(state.ui.joinColor)) {
      const free = PLAYER_COLORS.find((color) => !taken.has(color));
      if (free) state.ui.joinColor = free;
    }
    layout('Rejoindre une partie', `
      <div class="center-stack">
        ${brand()}
        <div class="card" style="display:grid;gap:18px;text-align:left;">
          <div>
            <div class="label-top">${title === 'Boîte à thème' ? 'Mode' : 'Thème'}</div>
            <div style="font-size:clamp(28px,3.4vw,46px);font-weight:800;">${escapeHtml(title)}</div>
          </div>
          <div class="join-preview-status">${preview ? `${preview.players.length} joueur${preview.players.length > 1 ? 's' : ''} déjà connectés` : (state.ui.joinPreviewStatus === 'connecting' ? 'Vérification de la salle…' : 'La salle sera vérifiée à la connexion')}</div>
          <div>
            <div class="label-top">Pseudo</div>
            <input id="join-pseudo" class="text-input" placeholder="Entre ton pseudo" value="${escapeHtml(state.ui.joinPseudo)}">
          </div>
          <div>
            <div class="label-top">Couleur du joueur</div>
            <div class="color-grid">
              ${PLAYER_COLORS.map((color) => {
                const disabled = taken.has(color) && state.ui.joinColor !== color;
                return `<button class="swatch ${state.ui.joinColor === color ? 'active' : ''} ${disabled ? 'disabled' : ''}" ${disabled ? 'disabled' : ''} data-color="${color}" style="background:${color};border-color:${state.ui.joinColor === color ? '#fff' : 'rgba(255,255,255,.32)'}"></button>`;
              }).join('')}
            </div>
            <div class="footer-note" style="margin-top:8px;">Une couleur déjà choisie devient indisponible pour les autres joueurs.</div>
          </div>
          <div class="row">
            <button class="big-btn" style="min-width:0;width:auto;" data-action="join-room">Rejoindre la partie</button>
            <button class="btn" data-action="go-home">Annuler</button>
          </div>
          ${state.ui.joinPreviewError ? `<div style="color:var(--bad);">${escapeHtml(state.ui.joinPreviewError)}</div>` : ''}
          <div class="footer-note">Le lien partagé fonctionne entre appareils. L’admin doit rester connecté pendant la partie.</div>
        </div>
      </div>
    `);
  }

  function renderInvalidAdmin() {
    setWaitingTicker(null);
    layout('Lien admin', `
      <div class="center-stack">
        <div class="card" style="text-align:center;">
          <h2 class="title-big">Salle admin introuvable</h2>
          <div class="subtle">Ce lien admin n’est pas disponible dans ce navigateur.</div>
          <button class="btn" data-action="go-home">Retour</button>
        </div>
      </div>
    `);
  }

  function renderConnectingPlayer(route, session) {
    setWaitingTicker('connecting');
    layout('Connexion', `
      <div class="topbar">
        <button class="btn" data-action="leave-room">Retour</button>
        ${brand()}
        <div class="meta-side">${networkBadge()}</div>
      </div>
      <div class="center-stack">
        ${spinnerBlock('Connexion à la partie')}
        <div class="card" style="text-align:center;">
          <div class="subtle">Salle : ${escapeHtml(route.roomId || '')}</div>
          <div class="subtle">Joueur : ${escapeHtml(session?.pseudo || '')}</div>
          ${state.peerError ? `<div style="margin-top:12px;color:var(--bad);">${escapeHtml(state.peerError)}</div>` : ''}
          <div class="footer-note" style="margin-top:12px;">Si l’admin ferme la page, la salle n’est plus accessible.</div>
        </div>
      </div>
    `);
  }

  function renderAdminLobby(room) {
    setWaitingTicker(null);
    syncItemEditor(room);
    state.ui.themeMode = room.themeMode || 'direct';
    state.ui.theme = room.theme || '';
    layout('Attente de joueurs', `
      <div class="topbar">
        <button class="btn" data-action="go-home">Retour</button>
        ${brand()}
        <div class="meta-side">
          <button class="btn" data-action="start-room" ${room.players.length && state.peerStatus === 'online' ? '' : 'disabled'}>${room.themeMode === 'box' ? 'Tirer au sort et lancer' : 'Lancer la partie'}</button>
          <div class="players-count">${room.players.length} joueur${room.players.length > 1 ? 's' : ''}</div>
          ${networkBadge()}
        </div>
      </div>

      ${roundRestartBanner(room.roundNumber)}
      <div class="row" style="justify-content:space-between;">
        ${themeModeBadge(room)}
        <div class="subtle">${room.themeMode === 'direct' ? `Thème : ${escapeHtml(room.theme || 'À définir')}` : 'Les joueurs peuvent encore proposer des thèmes.'}</div>
      </div>

      <div class="card">
        <div class="form-grid">
          <div style="text-align:left;">
            <div class="label-top">Mode de thème</div>
            <div class="mode-row">
              <button class="mode-btn ${room.themeMode === 'direct' ? 'active' : ''}" data-action="set-theme-mode-direct">Créer le thème moi-même</button>
              <button class="mode-btn ${room.themeMode === 'box' ? 'active' : ''}" data-action="set-theme-mode-box">Lancer avec boîte à thème</button>
            </div>
          </div>
          ${room.themeMode === 'direct' ? `
            <div style="text-align:left;">
              <div class="label-top">Thème de la tier list</div>
              <input id="theme-input" class="text-input" placeholder="Exemple : Qui a le plus de flow ?" value="${escapeHtml(state.ui.theme || room.theme || '')}">
            </div>
          ` : `
            <div style="text-align:left;">
              <div class="label-top">Mode boîte à thème</div>
              <div class="subtle">Au lancement, un thème sera tiré au hasard parmi les thèmes restants dans la boîte.</div>
            </div>
          `}
        </div>
      </div>

      <div class="share-box">
        <div class="label-top">Lien à partager</div>
        <input id="share-url" class="share-url" readonly value="${escapeHtml(makeJoinLink(room))}">
        <div class="row" style="justify-content:space-between;">
          <button class="btn" data-action="copy-link">Copier le lien</button>
          <div class="subtle">${room.themeMode === 'box' ? `${themeBoxCount(room)} thème${themeBoxCount(room) > 1 ? 's' : ''} dans la boîte` : 'Prêt à démarrer'}</div>
        </div>
      </div>

      ${room.themeMode === 'box' ? `
        <div class="theme-box-card">
          <div class="row" style="justify-content:space-between;">
            <div>
              <div class="label-top">Boîte à thème</div>
              <div class="subtle">Ajoute un thème toi aussi ou laisse les joueurs remplir la boîte.</div>
            </div>
            <div class="subtle">${themeBoxCount(room)} proposition${themeBoxCount(room) > 1 ? 's' : ''}</div>
          </div>
          <div class="row" style="margin-top:10px;">
            <input id="admin-theme-box-input" class="text-input" placeholder="Ajouter un thème à la boîte" value="${escapeHtml(state.ui.adminThemeBoxInput)}">
            <button class="btn" data-action="admin-add-theme">Ajouter</button>
          </div>
          <div style="margin-top:12px;">${themeBoxList(room.themeBox, room.usedThemeIds)}</div>
        </div>
      ` : ''}

      <div class="items-card">
        <div class="row" style="justify-content:space-between;">
          <div>
            <div class="label-top">Tableau des noms à classer</div>
            <div class="subtle">Tu peux modifier, ajouter ou supprimer des noms avant de lancer la partie.</div>
          </div>
          <div class="row">
            <button class="btn" data-action="save-items">Sauvegarder</button>
            <button class="btn" data-action="reset-default-items">Remettre la liste de base</button>
          </div>
        </div>
        <div class="items-table" style="margin-top:12px;">
          ${state.ui.itemEditor.map((item, index) => `
            <div class="item-row">
              <input class="text-input" data-item-name-index="${index}" value="${escapeHtml(item)}" placeholder="Nom à classer">
              <div class="item-controls">
                <button class="btn" data-action="delete-item" data-delete-index="${index}">Supprimer</button>
              </div>
            </div>
          `).join('')}
          <div class="item-row">
            <input id="new-item-input" class="text-input" placeholder="Ajouter un nouveau nom" value="${escapeHtml(state.ui.newItemName)}">
            <div class="item-controls">
              <button class="btn" data-action="add-item">Ajouter</button>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="label-top">Joueurs connectés</div>
        ${room.players.length ? playerPills(room.players) : '<div class="empty-small">Aucun joueur connecté pour le moment.</div>'}
      </div>

      <div class="footer-note">L’admin doit garder cette page ouverte. C’est elle qui héberge la partie.</div>
      ${state.peerError ? `<div style="color:var(--bad);">${escapeHtml(state.peerError)}</div>` : ''}
    `);
  }

  function renderAdminWaiting(room) {
    setWaitingTicker('admin-wait');
    const submitted = room.players.filter((player) => player.submittedAt).length;
    layout('Attente des tiers list', `
      <div class="topbar">
        <button class="btn" data-action="go-home">Accueil</button>
        ${brand()}
        <div class="meta-side">
          <div class="state-pill">${submitted}/${room.players.length}</div>
          ${networkBadge()}
          <div class="subtle">Admin non joueur</div>
        </div>
      </div>

      <div class="row" style="justify-content:space-between;">
        ${themeModeBadge(room)}
        <div class="subtle">${room.chosenThemeMeta ? `Thème tiré de la boîte par ${escapeHtml(room.chosenThemeMeta.author)}` : 'Classement en cours'}</div>
      </div>

      <div class="waiting-cluster">
        ${spinnerBlock('En attente des tiers list')}
        <div class="card" style="text-align:center;width:min(100%,760px);">
          <div class="label-top">Thème joué</div>
          <div style="font-size:clamp(28px,3.5vw,48px);font-weight:800;">${escapeHtml(room.theme)}</div>
          <div class="subtle" style="margin-top:8px;">Tu peux encore retirer un joueur si besoin pendant l’attente.</div>
        </div>
      </div>

      <div class="waiting-list">
        ${room.players.map((player) => `
          <div class="waiting-row">
            <div class="row" style="gap:12px;">
              <div style="width:18px;height:18px;border-radius:999px;background:${player.color};"></div>
              <strong>${escapeHtml(player.pseudo)}</strong>
            </div>
            <div class="row" style="justify-content:flex-end;">
              <div class="tag ${player.connected ? 'good' : 'bad'}">${player.connected ? 'Connecté' : 'Déconnecté'}</div>
              <div class="tag ${player.submittedAt ? 'good' : 'warn'}">${player.submittedAt ? 'Tier list envoyée' : 'En cours'}</div>
              <button class="btn" data-action="remove-player" data-player-id="${player.id}">Retirer</button>
            </div>
          </div>
        `).join('')}
      </div>
      ${state.peerError ? `<div style="color:var(--bad);">${escapeHtml(state.peerError)}</div>` : ''}
    `);
  }

  function renderAdminResults(room) {
    setWaitingTicker(null);
    ensureResultsReveal(room);
    const revealPhase = state.ui.resultRevealPhase;
    const feedback = feedbackSummary(room);
    if (!state.ui.roomHistoryDraft) state.ui.roomHistoryDraft = room.historyTitle || '';
    const fullList = `
      <div class="results-wrap">
        ${TIERS.map((tier) => {
          const rows = room.finalResults.filter((item) => item.finalTier === tier);
          return `
            <div class="result-row">
              <div class="tier-badge" style="background:${TIER_COLORS[tier]};">${tier}</div>
              <div class="result-track">
                ${rows.length ? rows.map((item) => `
                  <div class="score-chip">
                    <strong>${escapeHtml(item.name)}</strong>
                    <div>${item.score}%</div>
                    <div class="subtle-2">Somme : ${item.sum} pts</div>
                  </div>
                `).join('') : '<div class="subtle">Aucun joueur ici.</div>'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    layout('Résultat final', `
      <div class="topbar">
        <button class="btn" data-action="go-history">Historique</button>
        ${brand()}
        <div class="meta-side">
          <div class="players-count">${room.players.length} joueurs</div>
          ${networkBadge()}
          <div class="subtle">Enregistré dans l’historique</div>
        </div>
      </div>
      <div class="row" style="justify-content:space-between;align-items:flex-end;">
        <div>
          <div class="label-top">Thème</div>
          <div style="font-size:clamp(28px,3.6vw,48px);font-weight:800;">${escapeHtml(room.theme)}</div>
        </div>
        <div class="feedback-bar">
          <span class="tag good">👍 ${feedback.likes}</span>
          <span class="tag bad">👎 ${feedback.dislikes}</span>
        </div>
      </div>
      <div class="card inline-form-card">
        <div class="label-top">Titre dans l’historique</div>
        <div class="row">
          <input id="room-history-input" class="text-input" placeholder="Titre d’historique" value="${escapeHtml(state.ui.roomHistoryDraft)}">
          <button class="btn" data-action="save-room-history-title">Enregistrer</button>
          <button class="btn" data-action="go-player-lists">Voir les tiers list de tous les joueurs</button>
          <button class="btn" data-action="relaunch-same-players">Relancer la partie</button>
          <button class="btn" data-action="go-home">Nouvelle partie</button>
        </div>
      </div>
      ${revealPhase === 'podium' ? podiumMarkup(room.finalResults) : fullList}
    `);
  }

  function renderAdminAllPlayerLists(room) {
    setWaitingTicker(null);
    layout('Tiers list des joueurs', `
      <div class="topbar">
        <button class="btn" data-action="back-to-results">Retour aux résultats</button>
        ${brand()}
        <div class="meta-side">
          <div class="players-count">${room.players.length} joueurs</div>
          <div class="subtle">Vue admin</div>
        </div>
      </div>
      <div class="player-lists-wrap">
        <div class="player-list-grid">
          ${room.players.map((player) => {
            const ranking = room.rankings[player.id] || {};
            return `
              <div class="player-list-card">
                <div class="player-head">
                  <div class="player-name"><span class="color-dot" style="background:${player.color};"></span>${escapeHtml(player.pseudo)}</div>
                  <div class="subtle">${player.submittedAt ? 'Envoyée' : 'Non envoyée'}</div>
                </div>
                <div class="player-tier-mini">
                  ${TIERS.map((tier) => `
                    <div class="player-tier-row">
                      <div class="mini-badge" style="background:${TIER_COLORS[tier]};">${tier}</div>
                      <div class="player-tier-track">
                        ${(room.items || []).filter((name) => ranking[name] === tier).map((name) => `<div class="player-tier-pill">${escapeHtml(name)}</div>`).join('') || '<span class="subtle">—</span>'}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `);
  }

  function renderPlayerLobby(snapshot, player) {
    setWaitingTicker(null);
    const mySuggestion = (snapshot.themeBox || []).find((entry) => entry.playerId === player.id)?.text || state.ui.playerThemeInput || '';
    if (!state.ui.playerThemeInput && mySuggestion) state.ui.playerThemeInput = mySuggestion;

    layout('Salle d’attente', `
      <div class="topbar">
        <button class="btn" data-action="leave-room">Retour</button>
        ${brand()}
        <div class="meta-side">
          <div class="players-count">${snapshot.players.length} joueur${snapshot.players.length > 1 ? 's' : ''}</div>
          ${networkBadge()}
          <div class="subtle">Connecté : ${escapeHtml(player.pseudo)}</div>
        </div>
      </div>

      <div class="center-stack">
        ${roundRestartBanner(snapshot.roundNumber)}
        <div class="player-accent"><span class="player-accent-dot" style="background:${player.color};"></span>Écran de ${escapeHtml(player.pseudo)}</div>
        <h2 class="title-big">En attente du lancement…</h2>
        <div class="card player-themed" style="--player-accent:${player.color};text-align:center;">
          <div class="label-top">${snapshot.themeMode === 'box' ? 'Mode' : 'Thème'}</div>
          <div style="font-size:clamp(28px,3.6vw,50px);font-weight:800;">${snapshot.themeMode === 'box' ? 'Boîte à thème' : escapeHtml(snapshot.theme)}</div>
          <div class="subtle" style="margin-top:8px;">${snapshot.themeMode === 'box' ? 'Propose un thème ci-dessous. Un thème sera tiré au hasard au lancement.' : 'L’admin a déjà choisi le thème de la manche.'}</div>
        </div>

        ${snapshot.themeMode === 'box' ? `
          <div class="theme-box-card player-themed" style="--player-accent:${player.color};">
            <div class="row" style="justify-content:space-between;">
              <div>
                <div class="label-top">Ma proposition</div>
                <div class="subtle">Tu peux modifier ton thème tant que la partie n’a pas commencé.</div>
              </div>
              <div class="subtle">${themeBoxCount(snapshot)} thème${themeBoxCount(snapshot) > 1 ? 's' : ''} dans la boîte</div>
            </div>
            <div class="row" style="margin-top:10px;">
              <input id="player-theme-input" class="text-input" placeholder="Écris ton thème" value="${escapeHtml(mySuggestion)}">
              <button class="btn" data-action="player-submit-theme">${mySuggestion ? 'Mettre à jour' : 'Ajouter'}</button>
            </div>
            <div style="margin-top:12px;">${themeBoxList(snapshot.themeBox, snapshot.usedThemeIds)}</div>
          </div>
        ` : ''}

        ${playerPills(snapshot.players)}
        ${state.peerError ? `<div style="color:var(--bad);">${escapeHtml(state.peerError)}</div>` : ''}
      </div>
    `);
  }

  function renderPlayerRanking(snapshot, player, roomId) {
    setWaitingTicker(null);
    const items = snapshot.items || DEFAULT_ITEMS;
    const draft = loadDraft(roomId, player.id);
    const placed = items.filter((item) => draft[item]).length;
    const remaining = items.filter((item) => !draft[item]);
    const submittedCount = snapshot.players.filter((entry) => entry.submittedAt).length;
    const meInSnapshot = snapshot.players.find((entry) => entry.id === player.id);
    const alreadySent = !!meInSnapshot?.submittedAt;

    layout('Tier list joueur', `
      <div class="topbar">
        <button class="btn" data-action="leave-room">Quitter</button>
        ${brand()}
        <div class="meta-side">
          <div class="state-pill">${submittedCount}/${snapshot.players.length}</div>
          ${networkBadge()}
          <div class="subtle">${escapeHtml(player.pseudo)}</div>
        </div>
      </div>

      <div class="main-grid">
        <div class="board-wrap">
          <div class="board-card player-themed player-banner" style="--player-accent:${player.color};">
            <div class="row" style="justify-content:space-between;">
              <div>
                <div class="label-top">Thème</div>
                <div style="font-size:clamp(24px,3vw,42px);font-weight:800;">${escapeHtml(snapshot.theme)}</div>
              </div>
              <div class="player-accent"><span class="player-accent-dot" style="background:${player.color};"></span>${escapeHtml(player.pseudo)}</div>
            </div>
            <div class="subtle" style="margin-top:6px;">Classe les ${items.length} personnes. Ton écran reprend ta couleur pour qu’on voie tout de suite qui joue ici.</div>
          </div>

          <div class="pool-zone dropzone" data-tier="UNASSIGNED">
            ${remaining.length ? remaining.map((name) => personCard(name, null)).join('') : '<div class="subtle">Tous les noms sont classés.</div>'}
          </div>

          ${TIERS.map((tier) => `
            <div class="tier-row">
              <div class="tier-badge" style="background:${TIER_COLORS[tier]};">${tier}</div>
              <div class="tier-drop dropzone" data-tier="${tier}">
                ${items.filter((name) => draft[name] === tier).map((name) => personCard(name, tier)).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <div class="side-stack">
          <div class="status-card player-themed" style="--player-accent:${player.color};">
            <div class="label-top">Progression</div>
            <div style="font-size:42px;font-weight:900;">${placed}/${items.length}</div>
            <div class="subtle">Place tous les noms avant d’envoyer.</div>
          </div>

          <div class="status-card player-themed" style="--player-accent:${player.color};">
            <div class="label-top">État de ma tier list</div>
            <div class="subtle">${alreadySent ? 'Ta tier list est déjà envoyée. Tu peux encore la modifier tant que tout le monde n’a pas fini.' : 'Tu n’as pas encore envoyé ta tier list.'}</div>
            <div class="row" style="margin-top:10px;">
              <div class="tag ${alreadySent ? 'good' : 'warn'}">${alreadySent ? 'Envoyée' : 'À envoyer'}</div>
              <div class="tag">${submittedCount}/${snapshot.players.length} joueurs ont envoyé</div>
            </div>
          </div>

          <div class="status-card">
            <div class="label-top">Score final</div>
            <div class="score-list">
              <div>S = 5 pts</div>
              <div>A = 4 pts</div>
              <div>B = 3 pts</div>
              <div>C = 2 pts</div>
              <div>D = 1 pt</div>
              <div>E = 0 pt</div>
              <div style="margin-top:8px;">Score = ((Somme_pts / nbJoueurs) / 5) × 100</div>
            </div>
          </div>

          <button class="big-btn submit-btn" data-action="submit-ranking">${alreadySent ? 'Mettre à jour ma tier list' : 'Envoyer ma tier list'}</button>
          ${state.peerError ? `<div style="color:var(--bad);font-size:14px;">${escapeHtml(state.peerError)}</div>` : ''}
        </div>
      </div>
    `);
  }

  function renderPlayerResults(snapshot, player) {
    setWaitingTicker(null);
    saveHistoryEntryFromSnapshot(snapshot);
    const feedback = feedbackSummary(snapshot, player.id);
    const fullList = `
      <div class="results-wrap">
        ${TIERS.map((tier) => {
          const rows = (snapshot.finalResults || []).filter((item) => item.finalTier === tier);
          return `
            <div class="result-row">
              <div class="tier-badge" style="background:${TIER_COLORS[tier]};">${tier}</div>
              <div class="result-track">
                ${rows.length ? rows.map((item) => `
                  <div class="score-chip">
                    <strong>${escapeHtml(item.name)}</strong>
                    <div>${item.score}%</div>
                    <div class="subtle-2">Somme : ${item.sum} pts</div>
                  </div>
                `).join('') : '<div class="subtle">Aucun joueur ici.</div>'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    layout('Résultat final', `
      <div class="topbar">
        <button class="btn" data-action="go-home">Accueil</button>
        ${brand()}
        <div class="meta-side">
          <div class="players-count">${snapshot.players.length} joueurs</div>
          ${networkBadge()}
          <div class="subtle">${escapeHtml(player.pseudo)}</div>
        </div>
      </div>
      <div class="center-stack" style="justify-content:flex-start;">
        <div class="player-accent"><span class="player-accent-dot" style="background:${player.color};"></span>Écran de ${escapeHtml(player.pseudo)}</div>
        <div class="card player-themed" style="--player-accent:${player.color};text-align:center;width:min(100%,980px);">
          <div class="label-top">Thème</div>
          <div style="font-size:clamp(28px,3.6vw,46px);font-weight:800;">${escapeHtml(snapshot.theme)}</div>
          <div class="feedback-actions" style="margin-top:14px;">
            <button class="btn ${feedback.mine === 'like' ? 'is-active-like' : ''}" data-action="vote-like">👍 J’aime · ${feedback.likes}</button>
            <button class="btn ${feedback.mine === 'dislike' ? 'is-active-dislike' : ''}" data-action="vote-dislike">👎 J’aime pas · ${feedback.dislikes}</button>
          </div>
        </div>
        ${fullList}
      </div>
    `);
  }

  function renderHistory() {
    setWaitingTicker(null);
    const history = historyStore();
    const emptyCards = Array.from({ length: 3 }).map((_, index) => `
      <div class="history-card">
        <div class="history-mini-board">${miniRows([])}</div>
        <div class="history-card-title">Aucune partie sauvegardée</div>
        <div class="history-card-meta">Lance une partie pour remplir cet historique.</div>
        <div class="history-actions">${index === 0 ? '<button class="btn" data-action="go-create">Créer une partie</button>' : ''}</div>
      </div>
    `).join('');

    layout('Historiques', `
      <div class="topbar history-topbar">
        <button class="btn" data-action="go-home">Retour</button>
        ${brand({ compact: true })}
        <div style="width:96px;"></div>
      </div>
      <div class="row" style="justify-content:center;margin-top:4px;">
        <h2 class="title-big" style="font-size:clamp(26px,3vw,44px);">Historique</h2>
      </div>
      <div class="history-grid-wrap">
        <div class="history-grid">
          ${history.length ? history.map((entry) => `
            <div class="history-card">
              <div class="history-mini-board">${miniRows(entry.results)}</div>
              ${state.ui.editHistoryId === entry.id ? `
                <div class="inline-rename">
                  <input id="history-rename-input" class="text-input" value="${escapeHtml(state.ui.editHistoryValue)}" placeholder="Titre d’historique">
                  <div class="history-actions">
                    <button class="btn" data-action="save-history-inline" data-entry-id="${entry.id}">Enregistrer</button>
                    <button class="btn" data-action="cancel-history-inline">Annuler</button>
                  </div>
                </div>
              ` : `
                <div class="history-card-title">${escapeHtml(entry.title)}</div>
                <div class="history-card-meta">${entry.playersCount} joueurs · Manche ${entry.roundNumber || 1} · ${formatDate(entry.completedAt)}</div>
                <div class="history-actions">
                  <button class="btn" data-history-open="${entry.id}">Ouvrir</button>
                  <button class="btn" data-action="edit-history-inline" data-entry-id="${entry.id}">Renommer</button>
                </div>
              `}
            </div>
          `).join('') : emptyCards}
        </div>
      </div>
    `);
  }

  function renderHistoryDetail(entry) {
    setWaitingTicker(null);
    if (!entry) {
      layout('Historique', `
        <div class="center-stack">
          <div class="card" style="text-align:center;">
            <h2 class="title-big">Résultat introuvable</h2>
            <button class="btn" data-action="go-history">Retour</button>
          </div>
        </div>
      `);
      return;
    }

    layout('Zoom - Historiques', `
      <div class="topbar">
        <button class="btn" data-action="go-history">Retour</button>
        ${brand()}
        <div class="meta-side">
          <div class="players-count">${entry.playersCount} joueurs</div>
        </div>
      </div>
      <div class="card inline-form-card">
        <div class="label-top">Titre dans l’historique</div>
        <div class="row">
          <input id="history-rename-input" class="text-input" value="${escapeHtml(state.ui.editHistoryId === entry.id ? state.ui.editHistoryValue : entry.title)}" placeholder="Titre d’historique">
          <button class="btn" data-action="save-history-inline" data-entry-id="${entry.id}">Enregistrer</button>
        </div>
      </div>
      <div style="text-align:center;">
        <div class="label-top">Résultat</div>
        <div style="font-size:clamp(28px,3.4vw,46px);font-weight:500;line-height:1.15;">${escapeHtml(entry.title)}</div>
        <div class="subtle">${escapeHtml(entry.theme)} · ${formatDate(entry.completedAt)}</div>
      </div>
      <div class="results-wrap">
        ${TIERS.map((tier) => {
          const rows = entry.results.filter((item) => item.finalTier === tier);
          return `
            <div class="result-row">
              <div class="tier-badge" style="background:${TIER_COLORS[tier]};">${tier}</div>
              <div class="result-track">
                ${rows.length ? rows.map((item) => `
                  <div class="score-chip">
                    <strong>${escapeHtml(item.name)}</strong>
                    <div>${item.score}%</div>
                    <div class="subtle-2">Somme : ${item.sum} pts</div>
                  </div>
                `).join('') : '<div class="subtle">Aucun joueur ici.</div>'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `);
  }


  function dbStatusText() {
    if (!dbState.ready) return 'chargement…';
    if (dbState.enabled) return 'BDD connectée';
    return 'mode local';
  }

  function slugifyName(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || uid('slug');
  }

  function getSupabaseConfig() {
    return window.HALLILA_SUPABASE_CONFIG || {};
  }

  let supabaseClient = null;
  function getSupabaseClient() {
    const config = getSupabaseConfig();
    if (!config?.url || !config?.anonKey || !window.supabase?.createClient) return null;
    if (!supabaseClient) supabaseClient = window.supabase.createClient(config.url, config.anonKey);
    return supabaseClient;
  }

  function writeDbCaches() {
    writeJson(PERSONAS_CACHE_KEY, dbState.personas || []);
    writeJson(PLAYER_STATS_CACHE_KEY, dbState.playerStats || []);
    writeJson(PERSONA_STATS_CACHE_KEY, dbState.personaStats || []);
  }

  async function dbBoot() {
    const supabase = getSupabaseClient();
    dbState.ready = false;
    dbState.enabled = !!supabase;
    dbState.localOnly = !supabase;
    dbState.error = '';
    if (!supabase) {
      dbState.ready = true;
      render();
      return;
    }
    try {
      const personasRes = await supabase.from('personas').select('id,name,slug,category,is_active').order('name');
      if (personasRes.error) throw personasRes.error;
      dbState.personas = personasRes.data || [];
      writeDbCaches();

      const setRes = await supabase
        .from('persona_sets')
        .select('id,name,description,visibility,is_default_core,persona_set_items(display_order, personas(name))')
        .order('created_at', { ascending: true });
      if (!setRes.error && Array.isArray(setRes.data)) {
        const remoteSets = setRes.data.map((set) => ({
          id: set.id,
          name: set.name,
          description: set.description || '',
          visibility: set.visibility || 'private',
          isDefaultCore: !!set.is_default_core,
          items: (set.persona_set_items || [])
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
            .map((entry) => entry.personas?.name)
            .filter(Boolean)
        })).filter((entry) => entry.items.length);
        const localByName = new Map(itemSetsStore().map((set) => [set.name.toLowerCase(), set]));
        remoteSets.forEach((set) => localByName.set(set.name.toLowerCase(), { id: set.id, name: set.name, items: set.items }));
        saveItemSets(Array.from(localByName.values()));
      }

      await dbRefreshStats(false);

      const histRes = await supabase.from('history_entries').select('id,game_id,round_id,title,theme_text,players_count,completed_at,snapshot_json').order('completed_at', { ascending: false }).limit(100);
      if (!histRes.error && Array.isArray(histRes.data)) {
        const remoteHistory = histRes.data.map((row) => {
          const snap = row.snapshot_json || {};
          return {
            id: row.id,
            roomId: row.game_id,
            roundId: row.round_id,
            roundNumber: snap.roundNumber || 1,
            title: row.title,
            theme: row.theme_text || snap.theme || '',
            playersCount: row.players_count || (snap.players || []).length,
            completedAt: row.completed_at,
            players: snap.players || [],
            results: snap.results || []
          };
        });
        const merged = [...remoteHistory];
        const seen = new Set(remoteHistory.map((entry) => entry.id));
        historyStore().forEach((entry) => { if (!seen.has(entry.id)) merged.push(entry); });
        writeJson(HISTORY_KEY, merged);
      }

      dbState.ready = true;
      dbState.lastSyncAt = nowIso();
      render();
    } catch (error) {
      dbState.ready = true;
      dbState.enabled = false;
      dbState.localOnly = true;
      dbState.error = error?.message || 'Erreur BDD';
      render();
    }
  }

  async function dbRefreshStats(doRender = true) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      dbState.playerStats = localPlayerStats();
      dbState.personaStats = localPersonaStats();
      writeDbCaches();
      if (doRender) render();
      return;
    }
    const [playerRes, personaRes] = await Promise.all([
      supabase.from('player_name_stats').select('*').order('games_played', { ascending: false }),
      supabase.from('persona_stats').select('persona_id,persona_name,games_count,avg_score_percent,avg_rank_value,s_count,a_count,b_count,c_count,d_count,e_count,best_score,worst_score,last_score').order('games_count', { ascending: false })
    ]);
    dbState.playerStats = playerRes.error ? localPlayerStats() : (playerRes.data || []);
    dbState.personaStats = personaRes.error ? localPersonaStats() : (personaRes.data || []);
    writeDbCaches();
    if (doRender) render();
  }

  async function dbEnsurePersonas(names) {
    const supabase = getSupabaseClient();
    const cleanNames = normalizeItems(names || []);
    if (!cleanNames.length) return;
    const core = new Set(DEFAULT_ITEMS.map((item) => item.toLowerCase()));
    const rows = cleanNames.map((name) => ({
      slug: slugifyName(name),
      name,
      category: core.has(name.toLowerCase()) ? 'core' : 'others',
      is_claimable: true,
      is_active: true
    }));
    const seen = new Set((dbState.personas || []).map((item) => item.slug));
    rows.forEach((row) => {
      if (!seen.has(row.slug)) {
        dbState.personas.push({ id: row.slug, name: row.name, slug: row.slug, category: row.category, is_active: true });
        seen.add(row.slug);
      }
    });
    writeDbCaches();
    if (!supabase) return;
    const { error } = await supabase.from('personas').upsert(rows, { onConflict: 'slug', ignoreDuplicates: false });
    if (!error) {
      const fresh = await supabase.from('personas').select('id,name,slug,category,is_active').in('slug', rows.map((row) => row.slug));
      if (!fresh.error) {
        const bySlug = new Map((dbState.personas || []).map((item) => [item.slug, item]));
        (fresh.data || []).forEach((item) => bySlug.set(item.slug, item));
        dbState.personas = Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        writeDbCaches();
      }
    }
  }

  function personaIdMap() {
    return new Map((dbState.personas || []).map((item) => [item.name.toLowerCase(), item.id]));
  }

  async function dbPersistSet(setRecord) {
    if (!setRecord) return;
    const supabase = getSupabaseClient();
    await dbEnsurePersonas(setRecord.items || []);
    if (!supabase) return;
    const setPayload = {
      id: setRecord.id,
      name: setRecord.name,
      description: setRecord.description || null,
      visibility: setRecord.visibility || 'private',
      is_default_core: !!setRecord.isDefaultCore
    };
    const upsertRes = await supabase.from('persona_sets').upsert(setPayload, { onConflict: 'id' });
    if (upsertRes.error) return;
    const map = personaIdMap();
    await supabase.from('persona_set_items').delete().eq('set_id', setRecord.id);
    const rows = normalizeItems(setRecord.items || []).map((name, index) => ({
      id: uid('psi'),
      set_id: setRecord.id,
      persona_id: map.get(name.toLowerCase()),
      display_order: index + 1
    })).filter((row) => row.persona_id);
    if (rows.length) await supabase.from('persona_set_items').insert(rows);
    dbRefreshStats(false);
  }

  async function dbDeleteSet(setId) {
    const supabase = getSupabaseClient();
    if (!supabase || !setId) return;
    await supabase.from('persona_sets').delete().eq('id', setId);
  }

  async function dbUpdateHistoryTitle(historyId, title, roomId, roundId) {
    const supabase = getSupabaseClient();
    if (!supabase || !title) return;
    if (historyId) {
      const update = await supabase.from('history_entries').update({ title }).eq('id', historyId);
      if (!update.error) return;
    }
    if (roomId && roundId) {
      await supabase.from('history_entries').update({ title }).eq('game_id', roomId).eq('round_id', roundId);
    }
  }

  async function dbPersistCompletedRoom(room, payload) {
    const supabase = getSupabaseClient();
    await dbEnsurePersonas(room.items || []);
    if (!supabase) {
      dbState.playerStats = localPlayerStats();
      dbState.personaStats = localPersonaStats();
      writeDbCaches();
      return;
    }
    try {
      const personaMap = personaIdMap();
      await supabase.from('games').upsert({
        id: room.id,
        title: room.historyTitle || null,
        theme_mode: room.themeMode === 'box' ? 'idea_box' : 'manual',
        theme_text: room.theme,
        status: 'results',
        allow_others: true,
        allow_likes: true,
        created_at: room.createdAt,
        started_at: room.startedAt || room.createdAt,
        ended_at: room.completedAt || nowIso()
      }, { onConflict: 'id' });

      await supabase.from('game_rounds').upsert({
        id: room.roundId,
        game_id: room.id,
        round_number: room.roundNumber || 1,
        theme_mode: room.themeMode === 'box' ? 'idea_box' : 'manual',
        theme_text: room.theme,
        status: 'results',
        created_at: room.createdAt,
        started_at: room.startedAt || room.createdAt,
        ended_at: room.completedAt || nowIso()
      }, { onConflict: 'id' });

      const playerRows = room.players.map((player) => ({
        id: player.id,
        game_id: room.id,
        guest_name: player.pseudo,
        player_name: player.pseudo,
        selected_color: player.color,
        linked_persona_id: personaMap.get(player.pseudo.toLowerCase()) || null,
        is_host: false,
        joined_at: player.joinedAt || room.createdAt,
        submitted_at: player.submittedAt || nowIso(),
        is_connected: !!player.connected
      }));
      if (playerRows.length) await supabase.from('game_players').upsert(playerRows, { onConflict: 'id' });

      if (room.themeBox?.length) {
        const themeRows = room.themeBox.map((entry) => ({
          id: entry.id,
          game_id: room.id,
          round_id: room.roundId,
          submitted_by_player_id: room.players.find((player) => player.id === entry.playerId)?.id || room.players[0]?.id,
          theme_text: entry.text,
          is_used: !!(room.usedThemeIds || []).includes(entry.id),
          used_in_round_id: !!(room.usedThemeIds || []).includes(entry.id) ? room.roundId : null,
          created_at: room.createdAt
        })).filter((row) => row.submitted_by_player_id && row.theme_text);
        if (themeRows.length) await supabase.from('idea_box_entries').upsert(themeRows, { onConflict: 'id' });
      }

      const rankingRows = [];
      Object.entries(room.rankings || {}).forEach(([playerId, ranking]) => {
        Object.entries(ranking || {}).forEach(([name, tier]) => {
          const personaId = personaMap.get(name.toLowerCase());
          if (!personaId) return;
          rankingRows.push({
            id: uid('ranking'),
            game_id: room.id,
            round_id: room.roundId,
            player_id: playerId,
            persona_id: personaId,
            tier,
            score_value: TIER_POINTS[tier] || 0,
            updated_at: nowIso()
          });
        });
      });
      if (rankingRows.length) await supabase.from('player_rankings').upsert(rankingRows, { onConflict: 'round_id,player_id,persona_id' });

      const resultRows = (room.finalResults || []).map((item, index) => ({
        id: uid('result'),
        game_id: room.id,
        round_id: room.roundId,
        persona_id: personaMap.get(item.name.toLowerCase()),
        total_points: item.sum,
        average_score: item.averagePoints,
        score_percent: item.score,
        final_tier: item.finalTier,
        rank_position: index + 1
      })).filter((row) => row.persona_id);
      if (resultRows.length) await supabase.from('round_results').upsert(resultRows, { onConflict: 'round_id,persona_id' });

      const historyId = payload?.id || room.currentHistoryId || uid('history');
      await supabase.from('history_entries').upsert({
        id: historyId,
        game_id: room.id,
        round_id: room.roundId,
        title: payload?.title || room.historyTitle || `Résultat — ${room.theme}`,
        theme_text: room.theme,
        players_count: room.players.length,
        created_at: room.createdAt,
        completed_at: room.completedAt || nowIso(),
        snapshot_json: {
          theme: room.theme,
          roundNumber: room.roundNumber || 1,
          players: room.players.map((player) => ({ id: player.id, pseudo: player.pseudo, color: player.color })),
          results: room.finalResults || []
        }
      }, { onConflict: 'id' });

      const hepRows = room.players.map((player) => ({
        id: uid('hep'),
        history_entry_id: historyId,
        player_id: player.id,
        is_host: false
      }));
      if (hepRows.length) await supabase.from('history_entry_players').upsert(hepRows, { onConflict: 'history_entry_id,player_id' });

      const reactionRows = Object.entries(room.feedback || {}).map(([playerId, reaction]) => ({
        id: uid('react'),
        round_id: room.roundId,
        player_id: playerId,
        reaction_type: reaction,
        created_at: nowIso()
      })).filter((row) => row.reaction_type === 'like' || row.reaction_type === 'dislike');
      if (reactionRows.length) await supabase.from('round_reactions').upsert(reactionRows, { onConflict: 'round_id,player_id' });

      await dbRefreshStats(false);
      dbState.lastSyncAt = nowIso();
      writeDbCaches();
      render();
    } catch (error) {
      dbState.error = error?.message || 'Échec de sync BDD';
      render();
    }
  }

  function localPlayerStats() {
    const games = historyStore();
    const byName = new Map();
    games.forEach((entry) => {
      (entry.players || []).forEach((player) => {
        const key = String(player.pseudo || '').trim();
        if (!key) return;
        if (!byName.has(key)) byName.set(key, { player_name: key, games_played: 0, likes_given: 0, dislikes_given: 0, last_seen_at: null });
        const current = byName.get(key);
        current.games_played += 1;
        current.last_seen_at = entry.completedAt || current.last_seen_at;
      });
    });
    return Array.from(byName.values()).sort((a, b) => b.games_played - a.games_played || a.player_name.localeCompare(b.player_name, 'fr'));
  }

  function localPersonaStats() {
    const games = historyStore();
    const byName = new Map();
    games.forEach((entry) => {
      (entry.results || []).forEach((result) => {
        const key = result.name;
        if (!byName.has(key)) byName.set(key, {
          persona_name: key,
          games_count: 0,
          avg_score_percent: 0,
          avg_rank_value: 0,
          s_count: 0, a_count: 0, b_count: 0, c_count: 0, d_count: 0, e_count: 0,
          best_score: null, worst_score: null, last_score: null, _sum: 0, _rank: 0
        });
        const cur = byName.get(key);
        cur.games_count += 1;
        cur._sum += Number(result.score || 0);
        const rankValue = ({ S:5, A:4, B:3, C:2, D:1, E:0 })[result.finalTier] || 0;
        cur._rank += rankValue;
        cur[`${result.finalTier.toLowerCase()}_count`] += 1;
        cur.best_score = cur.best_score === null ? result.score : Math.max(cur.best_score, result.score);
        cur.worst_score = cur.worst_score === null ? result.score : Math.min(cur.worst_score, result.score);
        cur.last_score = result.score;
      });
    });
    return Array.from(byName.values()).map((cur) => ({
      persona_name: cur.persona_name,
      games_count: cur.games_count,
      avg_score_percent: Number((cur._sum / cur.games_count).toFixed(2)),
      avg_rank_value: Number((cur._rank / cur.games_count).toFixed(2)),
      s_count: cur.s_count, a_count: cur.a_count, b_count: cur.b_count, c_count: cur.c_count, d_count: cur.d_count, e_count: cur.e_count,
      best_score: cur.best_score, worst_score: cur.worst_score, last_score: cur.last_score
    })).sort((a, b) => b.games_count - a.games_count || a.persona_name.localeCompare(b.persona_name, 'fr'));
  }

  function dominantTierLabel(detail) {
    const counts = detail?.tierCounts || {};
    return TIERS.slice().sort((a, b) => (counts[b] || 0) - (counts[a] || 0))[0] || 'E';
  }

  function buildPersonaDetail(personaName) {
    const target = String(personaName || '').trim().toLowerCase();
    const source = (dbState.personaStats && dbState.personaStats.length ? dbState.personaStats : localPersonaStats());
    const summary = source.find((entry) => String(entry.persona_name || '').trim().toLowerCase() === target) || null;
    const history = historyStore();
    const themeMap = new Map();
    const recent = [];
    const tierCounts = { S: 0, A: 0, B: 0, C: 0, D: 0, E: 0 };

    history.forEach((entry) => {
      const result = (entry.results || []).find((item) => String(item.name || '').trim().toLowerCase() === target);
      if (!result) return;
      const theme = String(entry.theme || 'Sans thème').trim() || 'Sans thème';
      if (!themeMap.has(theme)) {
        themeMap.set(theme, {
          theme,
          plays: 0,
          totalScore: 0,
          bestScore: null,
          lastTier: 'E',
          lastPlayedAt: null,
          counts: { S: 0, A: 0, B: 0, C: 0, D: 0, E: 0 }
        });
      }
      const current = themeMap.get(theme);
      current.plays += 1;
      current.totalScore += Number(result.score || 0);
      current.bestScore = current.bestScore === null ? Number(result.score || 0) : Math.max(current.bestScore, Number(result.score || 0));
      current.lastTier = result.finalTier || current.lastTier;
      current.lastPlayedAt = entry.completedAt || current.lastPlayedAt;
      current.counts[result.finalTier] = (current.counts[result.finalTier] || 0) + 1;
      tierCounts[result.finalTier] = (tierCounts[result.finalTier] || 0) + 1;
      recent.push({
        title: entry.title,
        theme,
        completedAt: entry.completedAt,
        score: Number(result.score || 0),
        finalTier: result.finalTier,
        position: (entry.results || []).findIndex((row) => row.name === result.name) + 1
      });
    });

    const themes = Array.from(themeMap.values()).map((item) => ({
      theme: item.theme,
      plays: item.plays,
      avgScore: Number((item.totalScore / item.plays).toFixed(2)),
      bestScore: item.bestScore,
      dominantTier: TIERS.slice().sort((a, b) => (item.counts[b] || 0) - (item.counts[a] || 0))[0] || item.lastTier,
      lastPlayedAt: item.lastPlayedAt
    })).sort((a, b) => b.avgScore - a.avgScore || b.plays - a.plays || a.theme.localeCompare(b.theme, 'fr'));

    recent.sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));

    return {
      personaName,
      summary,
      tierCounts,
      dominantTier: dominantTierLabel({ tierCounts }),
      themes,
      recent
    };
  }

  function renderPersonaStatsDetail(personaName) {
    setWaitingTicker(null);
    const detail = buildPersonaDetail(personaName);
    if (!detail.summary && !detail.recent.length) {
      layout('Stats persona', `
        <div class="center-stack">
          <div class="card" style="text-align:center;">
            <h2 class="title-big">Stats introuvables</h2>
            <div class="subtle">Aucune donnée trouvée pour ${escapeHtml(personaName)}.</div>
            <button class="btn" data-action="go-stats">Retour aux stats</button>
          </div>
        </div>
      `);
      return;
    }
    const summary = detail.summary || {
      games_count: detail.recent.length,
      avg_score_percent: detail.recent.length ? detail.recent.reduce((sum, row) => sum + row.score, 0) / detail.recent.length : 0,
      best_score: detail.recent.length ? Math.max(...detail.recent.map((row) => row.score)) : null,
      worst_score: detail.recent.length ? Math.min(...detail.recent.map((row) => row.score)) : null,
      last_score: detail.recent[0]?.score ?? null
    };
    layout('Stats persona', `
      <div class="topbar history-topbar">
        <button class="btn" data-action="go-stats">Retour</button>
        ${brand({ compact: true })}
        <div class="meta-side">
          <div class="network-status"><span class="network-dot ${dbState.enabled ? 'ok' : ''}"></span><span>${escapeHtml(dbStatusText())}</span></div>
          <div class="subtle">${dbState.lastSyncAt ? 'Dernière sync : ' + formatDate(dbState.lastSyncAt) : 'Aucune sync distante'}</div>
        </div>
      </div>

      <div class="stats-detail-shell">
        <div class="stats-detail-hero">
          <div>
            <div class="label-top">Persona</div>
            <h2 class="title-big">${escapeHtml(detail.personaName)}</h2>
            <div class="subtle">Stats détaillées sauvegardées via les résultats de manches et l'historique.</div>
          </div>
          <div class="stats-metrics">
            <span>${summary.games_count || 0} manches</span>
            <span>Moyenne ${Number(summary.avg_score_percent || 0).toFixed(2)}%</span>
            <span>Tier dominant ${detail.dominantTier}</span>
          </div>
        </div>

        <div class="stats-detail-grid">
          <div class="stats-panel">
            <div class="label-top">Répartition des tiers</div>
            <div class="tier-distribution">
              ${TIERS.map((tier) => `
                <div class="tier-stat-card">
                  <div class="tier-stat-badge" style="background:${TIER_COLORS[tier]};">${tier}</div>
                  <strong>${detail.tierCounts[tier] || 0}</strong>
                  <div class="subtle-2">fois</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="stats-panel">
            <div class="label-top">Résumé</div>
            <div class="stats-detail-kpis">
              <div class="detail-kpi"><span>Meilleur score</span><strong>${summary.best_score ?? '—'}%</strong></div>
              <div class="detail-kpi"><span>Pire score</span><strong>${summary.worst_score ?? '—'}%</strong></div>
              <div class="detail-kpi"><span>Dernier score</span><strong>${summary.last_score ?? '—'}%</strong></div>
              <div class="detail-kpi"><span>Rang moyen</span><strong>${Number(detail.summary?.avg_rank_value || 0).toFixed(2)}</strong></div>
            </div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stats-panel">
            <div class="row" style="justify-content:space-between;">
              <div>
                <div class="label-top">Meilleurs thèmes</div>
                <h3 class="title-big" style="font-size:clamp(22px,2.4vw,32px);">Catégories où ${escapeHtml(detail.personaName)} performe</h3>
              </div>
              <div class="subtle">${detail.themes.length} thème${detail.themes.length > 1 ? 's' : ''}</div>
            </div>
            <div class="stats-list">
              ${detail.themes.length ? detail.themes.slice(0, 8).map((entry) => `
                <div class="stats-row detail-row">
                  <div>
                    <strong>${escapeHtml(entry.theme)}</strong>
                    <div class="subtle-2">${entry.plays} manche${entry.plays > 1 ? 's' : ''} · Dernière apparition : ${formatDate(entry.lastPlayedAt)}</div>
                  </div>
                  <div class="stats-metrics">
                    <span>${entry.avgScore}% moyen</span>
                    <span>Best ${entry.bestScore}%</span>
                    <span>Tier dominant ${entry.dominantTier}</span>
                  </div>
                </div>
              `).join('') : '<div class="empty-small">Aucun thème joué pour ce persona.</div>'}
            </div>
          </div>

          <div class="stats-panel">
            <div class="row" style="justify-content:space-between;">
              <div>
                <div class="label-top">Derniers résultats</div>
                <h3 class="title-big" style="font-size:clamp(22px,2.4vw,32px);">Historique récent</h3>
              </div>
              <div class="subtle">${detail.recent.length} entrée${detail.recent.length > 1 ? 's' : ''}</div>
            </div>
            <div class="stats-list">
              ${detail.recent.length ? detail.recent.slice(0, 10).map((entry) => `
                <div class="stats-row detail-row">
                  <div>
                    <strong>${escapeHtml(entry.theme)}</strong>
                    <div class="subtle-2">${escapeHtml(entry.title || 'Résultat')} · ${formatDate(entry.completedAt)}</div>
                  </div>
                  <div class="stats-metrics">
                    <span>Tier ${entry.finalTier}</span>
                    <span>${entry.score}%</span>
                    <span>#${entry.position}</span>
                  </div>
                </div>
              `).join('') : '<div class="empty-small">Aucun historique pour ce persona.</div>'}
            </div>
          </div>
        </div>
      </div>
    `);
  }

  function renderStats() {
    setWaitingTicker(null);
    const playerStats = (dbState.playerStats && dbState.playerStats.length ? dbState.playerStats : localPlayerStats());
    const personaStats = (dbState.personaStats && dbState.personaStats.length ? dbState.personaStats : localPersonaStats());
    layout('Stats', `
      <div class="topbar history-topbar">
        <button class="btn" data-action="go-home">Retour</button>
        ${brand({ compact: true })}
        <div class="meta-side">
          <div class="network-status"><span class="network-dot ${dbState.enabled ? 'ok' : ''}"></span><span>${escapeHtml(dbStatusText())}</span></div>
          <div class="subtle">${dbState.lastSyncAt ? 'Dernière sync : ' + formatDate(dbState.lastSyncAt) : 'Aucune sync distante'}</div>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stats-panel">
          <div class="row" style="justify-content:space-between;">
            <div>
              <div class="label-top">Joueurs</div>
              <h2 class="title-big" style="font-size:clamp(24px,3vw,38px);">Stats par pseudo</h2>
            </div>
            <div class="subtle">${playerStats.length} entrées</div>
          </div>
          <div class="stats-list">
            ${playerStats.length ? playerStats.map((entry) => `
              <div class="stats-row">
                <div>
                  <strong>${escapeHtml(entry.player_name)}</strong>
                  <div class="subtle-2">Dernière apparition : ${formatDate(entry.last_seen_at)}</div>
                </div>
                <div class="stats-metrics">
                  <span>${entry.games_played} partie${entry.games_played > 1 ? 's' : ''}</span>
                  <span>${entry.likes_given || 0} likes</span>
                  <span>${entry.dislikes_given || 0} dislikes</span>
                </div>
              </div>
            `).join('') : '<div class="empty-small">Aucune stat joueur pour le moment.</div>'}
          </div>
        </div>

        <div class="stats-panel">
          <div class="row" style="justify-content:space-between;">
            <div>
              <div class="label-top">Personas</div>
              <h2 class="title-big" style="font-size:clamp(24px,3vw,38px);">Stats de tier list</h2>
            </div>
            <div class="subtle">${personaStats.length} entrées</div>
          </div>
          <div class="stats-list">
            ${personaStats.length ? personaStats.map((entry) => `
              <button class="stats-row stats-clickable" data-persona-open="${encodeURIComponent(entry.persona_name || entry.persona_id)}">
                <div>
                  <strong>${escapeHtml(entry.persona_name || entry.persona_id)}</strong>
                  <div class="subtle-2">Moyenne : ${Number(entry.avg_score_percent || 0).toFixed(2)}% · Clique pour voir le détail</div>
                </div>
                <div class="stats-metrics">
                  <span>${entry.games_count} manches</span>
                  <span>Best ${entry.best_score ?? '—'}%</span>
                  <span>S ${entry.s_count || 0}</span>
                </div>
              </button>
            `).join('') : '<div class="empty-small">Aucune stat persona pour le moment.</div>'}
          </div>
        </div>
      </div>
    `);
  }

  function render() {
    const route = getRoute();

    if (!(route.roomId && (route.adminToken || route.playerId)) && state.role) {
      resetNetwork();
    }

    if (route.roomId && route.adminToken) {
      const room = loadActiveRoom(route.roomId);
      if (!room || room.adminToken !== route.adminToken) {
        renderInvalidAdmin();
        return;
      }
      ensureAdminHosting(room);
      if (route.hash === '#player-lists' && state.room.status === 'results') {
        renderAdminAllPlayerLists(state.room);
        return;
      }
      if (state.room.status === 'lobby') renderAdminLobby(state.room);
      else if (state.room.status === 'ranking') renderAdminWaiting(state.room);
      else renderAdminResults(state.room);
      return;
    }

    if (route.roomId && route.playerId) {
      const session = loadPlayerSession(route.roomId);
      if (!session || session.playerId !== route.playerId) {
        layout('Connexion', `
          <div class="center-stack">
            <div class="card" style="text-align:center;">
              <h2 class="title-big">Session joueur introuvable</h2>
              <div class="subtle">Ce lien joueur n’est pas disponible dans ce navigateur.</div>
              <button class="btn" data-action="go-home">Retour</button>
            </div>
          </div>
        `);
        return;
      }

      ensurePlayerConnection(route);
      const snapshot = state.snapshot;
      if (!snapshot) {
        renderConnectingPlayer(route, session);
        return;
      }
      const player = snapshot.players.find((entry) => entry.id === route.playerId) || { ...session, submittedAt: null, connected: true };
      if (snapshot.status === 'lobby') {
        renderPlayerLobby(snapshot, player);
        return;
      }
      if (snapshot.status === 'ranking') {
        renderPlayerRanking(snapshot, player, route.roomId);
        return;
      }
      renderPlayerResults(snapshot, player);
      return;
    }

    if (route.joinId) {
      renderJoin(route);
      return;
    }

    if (route.hash.startsWith('#history/')) {
      const entryId = route.hash.replace('#history/', '');
      renderHistoryDetail(historyStore().find((entry) => entry.id === entryId));
      return;
    }

    if (route.hash === '#history') {
      renderHistory();
      return;
    }

    if (route.hash.startsWith('#stats/persona/')) {
      renderPersonaStatsDetail(decodeURIComponent(route.hash.replace('#stats/persona/', '')));
      return;
    }

    if (route.hash === '#stats') {
      renderStats();
      return;
    }

    if (route.hash === '#create') {
      renderCreate();
      return;
    }

    renderHome();
  }

  function setupDnD() {
    const route = getRoute();
    if (!route.roomId || !route.playerId || !document.querySelector('.dropzone')) return;
    const clearHover = () => document.querySelectorAll('.dropzone').forEach((zone) => zone.classList.remove('drag-over'));

    document.querySelectorAll('.person-card').forEach((card) => {
      card.addEventListener('dragstart', () => {
        state.ui.draggingItem = card.dataset.item;
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => {
        state.ui.draggingItem = null;
        card.classList.remove('dragging');
        clearHover();
      });

      card.addEventListener('touchstart', () => {
        state.ui.touchDrag = { item: card.dataset.item };
        card.classList.add('dragging');
      }, { passive: true });

      card.addEventListener('touchmove', (event) => {
        if (!state.ui.touchDrag) return;
        const touch = event.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        clearHover();
        const zone = target?.closest('.dropzone');
        if (zone) zone.classList.add('drag-over');
        event.preventDefault();
      }, { passive: false });

      card.addEventListener('touchend', (event) => {
        if (!state.ui.touchDrag) return;
        const touch = event.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const zone = target?.closest('.dropzone');
        if (zone) moveDraftItem(route.roomId, route.playerId, state.ui.touchDrag.item, zone.dataset.tier);
        state.ui.touchDrag = null;
        card.classList.remove('dragging');
        clearHover();
      });

      card.addEventListener('touchcancel', () => {
        state.ui.touchDrag = null;
        card.classList.remove('dragging');
        clearHover();
      });
    });
    document.querySelectorAll('.dropzone').forEach((zone) => {
      zone.addEventListener('dragover', (event) => {
        event.preventDefault();
        zone.classList.add('drag-over');
      });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
      zone.addEventListener('drop', (event) => {
        event.preventDefault();
        zone.classList.remove('drag-over');
        if (!state.ui.draggingItem) return;
        moveDraftItem(route.roomId, route.playerId, state.ui.draggingItem, zone.dataset.tier);
      });
    });
  }

  document.addEventListener('input', (event) => {
    if (event.target.id === 'theme-input') {
      state.ui.theme = event.target.value;
      if (state.role === 'admin' && state.room && state.room.status === 'lobby' && state.room.themeMode === 'direct') {
        state.room.theme = event.target.value;
        saveActiveRoom(state.room);
        broadcastSnapshot();
      }
    }
    if (event.target.id === 'history-title-input') state.ui.historyTitle = event.target.value;
    if (event.target.id === 'join-pseudo') state.ui.joinPseudo = event.target.value;
    if (event.target.id === 'new-item-input') state.ui.newItemName = event.target.value;
    if (event.target.id === 'set-name-input') state.ui.newSetName = event.target.value;
    if (event.target.id === 'room-history-input') state.ui.roomHistoryDraft = event.target.value;
    if (event.target.id === 'history-rename-input') state.ui.editHistoryValue = event.target.value;
    if (event.target.id === 'admin-theme-box-input') state.ui.adminThemeBoxInput = event.target.value;
    if (event.target.id === 'player-theme-input') state.ui.playerThemeInput = event.target.value;
    if (event.target.dataset.itemNameIndex !== undefined) {
      state.ui.itemEditor[Number(event.target.dataset.itemNameIndex)] = event.target.value;
    }
  });

  document.addEventListener('click', (event) => {
    const colorButton = event.target.closest('[data-color]');
    if (colorButton) {
      state.ui.joinColor = colorButton.dataset.color;
      render();
      return;
    }

    const moveButton = event.target.closest('[data-move-item]');
    if (moveButton) {
      const route = getRoute();
      if (!route.roomId || !route.playerId) return;
      moveDraftItem(route.roomId, route.playerId, moveButton.dataset.moveItem, moveButton.dataset.targetTier);
      return;
    }

    const historyOpen = event.target.closest('[data-history-open]');
    if (historyOpen) {
      setRoute({}, `#history/${historyOpen.dataset.historyOpen}`);
      render();
      return;
    }

    const personaOpen = event.target.closest('[data-persona-open]');
    if (personaOpen) {
      setRoute({}, `#stats/persona/${personaOpen.dataset.personaOpen}`);
      render();
      return;
    }

    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const route = getRoute();

    if (action === 'go-home') {
      setRoute({}, '');
      render();
      return;
    }
    if (action === 'music-toggle') {
      toggleMusic();
      return;
    }
    if (action === 'go-create') {
      setRoute({}, '#create');
      render();
      return;
    }
    if (action === 'go-history') {
      setRoute({}, '#history');
      render();
      return;
    }
    if (action === 'go-stats') {
      setRoute({}, '#stats');
      render();
      return;
    }
    if (action === 'go-player-lists') {
      setRoute({ room: route.roomId, admin: route.adminToken }, '#player-lists');
      render();
      return;
    }
    if (action === 'back-to-results') {
      setRoute({ room: route.roomId, admin: route.adminToken }, '');
      render();
      return;
    }
    if (action === 'relaunch-same-players') {
      relaunchSamePlayers();
      return;
    }
    if (action === 'set-theme-mode-direct') {
      state.ui.themeMode = 'direct';
      if (state.role === 'admin' && state.room && state.room.status === 'lobby') {
        state.room.themeMode = 'direct';
        state.room.theme = state.ui.theme || state.room.theme || '';
        saveActiveRoom(state.room);
        broadcastSnapshot();
      }
      render();
      return;
    }
    if (action === 'set-theme-mode-box') {
      state.ui.themeMode = 'box';
      if (state.role === 'admin' && state.room && state.room.status === 'lobby') {
        state.room.themeMode = 'box';
        state.room.theme = '';
        saveActiveRoom(state.room);
        broadcastSnapshot();
      }
      render();
      return;
    }
    if (action === 'create-room') {
      const theme = (state.ui.theme || '').trim();
      if (state.ui.themeMode === 'direct' && !theme) {
        setNotice('Entre un thème pour la tier list.', 'warn');
        return;
      }
      createRoom(theme, state.ui.historyTitle || '', state.ui.themeMode);
      return;
    }
    if (action === 'copy-link') {
      const value = document.getElementById('share-url')?.value || '';
      navigator.clipboard?.writeText(value)
        .then(() => setNotice('Lien copié.', 'ok'))
        .catch(() => {
          const input = document.getElementById('share-url');
          if (input) {
            input.select();
            document.execCommand('copy');
          }
          setNotice('Lien copié.', 'ok');
        });
      return;
    }
    if (action === 'join-room') {
      const taken = usedColors(state.ui.joinPreview);
      if (taken.has(state.ui.joinColor)) {
        setNotice('Cette couleur est déjà prise.', 'warn');
        return;
      }
      joinRoom(route);
      return;
    }
    if (action === 'leave-room') {
      leavePlayerRoom();
      return;
    }
    if (action === 'start-room') {
      startRoom();
      return;
    }
    if (action === 'submit-ranking') {
      submitRanking(route.roomId, route.playerId, state.snapshot?.items || state.room?.items || DEFAULT_ITEMS);
      return;
    }
    if (action === 'save-room-history-title') {
      updateRoomHistoryTitle(state.ui.roomHistoryDraft || '');
      return;
    }
    if (action === 'save-current-set') {
      saveCurrentItemsAsSet();
      return;
    }
    if (action === 'load-set') {
      loadSetIntoEditor(button.dataset.setId);
      return;
    }
    if (action === 'delete-set') {
      deleteItemSet(button.dataset.setId);
      return;
    }
    if (action === 'edit-history-inline') {
      const entry = historyStore().find((item) => item.id === button.dataset.entryId);
      if (!entry) return;
      state.ui.editHistoryId = entry.id;
      state.ui.editHistoryValue = entry.title;
      render();
      return;
    }
    if (action === 'cancel-history-inline') {
      state.ui.editHistoryId = null;
      state.ui.editHistoryValue = '';
      render();
      return;
    }
    if (action === 'save-history-inline') {
      const entryId = button.dataset.entryId;
      updateHistoryTitle(entryId, state.ui.editHistoryValue || '');
      state.ui.editHistoryId = null;
      state.ui.editHistoryValue = '';
      return;
    }
    if (action === 'vote-like') {
      sendFeedbackVote(feedbackSummary(state.snapshot, route.playerId).mine === 'like' ? 'none' : 'like');
      return;
    }
    if (action === 'vote-dislike') {
      sendFeedbackVote(feedbackSummary(state.snapshot, route.playerId).mine === 'dislike' ? 'none' : 'dislike');
      return;
    }
    if (action === 'save-items') {
      saveItemEditorToRoom();
      return;
    }
    if (action === 'reset-default-items') {
      state.ui.itemEditor = [...DEFAULT_ITEMS];
      state.ui.selectedSetId = null;
      render();
      return;
    }
    if (action === 'add-item') {
      const name = String(state.ui.newItemName || '').trim();
      if (!name) return;
      state.ui.itemEditor.push(name);
      state.ui.newItemName = '';
      render();
      return;
    }
    if (action === 'delete-item') {
      const index = Number(button.dataset.deleteIndex);
      state.ui.itemEditor.splice(index, 1);
      render();
      return;
    }
    if (action === 'remove-player') {
      adminRemovePlayer(button.dataset.playerId);
      return;
    }
    if (action === 'admin-add-theme') {
      submitThemeSuggestionFromAdmin(state.ui.adminThemeBoxInput);
      state.ui.adminThemeBoxInput = '';
      return;
    }
    if (action === 'player-submit-theme') {
      submitThemeSuggestionFromPlayer(route, state.ui.playerThemeInput);
      return;
    }
    if (action === 'skip-reveal') {
      skipReveal();
      return;
    }
  });

  window.addEventListener('hashchange', render);
  window.addEventListener('beforeunload', () => {
    if (state.room && state.role === 'admin') saveActiveRoom(state.room);
    if (state.ui.waitingTicker) clearInterval(state.ui.waitingTicker);
    if (state.ui.resultTimer) clearTimeout(state.ui.resultTimer);
  });
  window.addEventListener('storage', (event) => {
    if (event.key === HISTORY_KEY || event.key?.startsWith(ACTIVE_ROOM_PREFIX)) render();
  });

  dbBoot();
  render();
})();
