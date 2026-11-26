// Lecteur audio de Vonia : file d'attente, aléatoire, répétition, écran verrouillé, suivi des écoutes.
"use strict";

const Player = (() => {
  const audio = new Audio();
  audio.preload = "auto";

  let queue = [];   // morceaux dans l'ordre d'origine
  let order = [];   // ordre de lecture (indices dans queue)
  let pos = -1;     // position dans order
  let shuffle = false;
  let repeat = "off"; // off | all | one
  let fileURL = null;
  let session = null; // écoute en cours (pour le Récap)
  let lastTime = 0, lastSave = 0, lastResume = 0;

  const subs = new Set();
  const emit = (type) => subs.forEach((fn) => fn(type));
  const current = () => (pos >= 0 ? queue[order[pos]] : null);

  // ---------- Suivi des écoutes ----------
  function startSession(track) {
    session = { id: Date.now() * 1000 + Math.floor(Math.random() * 1000), trackId: track.id, title: track.title, artist: track.artist || "", genre: track.genre || "", source: track.source || "file", at: Date.now(), seconds: 0, counted: false };
  }
  async function saveSession() {
    if (!session || session.seconds < 1) return;
    const t = current();
    // Comme Spotify : une écoute compte après 30 s (ou la moitié d'un morceau court).
    session.counted = session.seconds >= 30 || (t && t.duration > 0 && session.seconds >= t.duration * 0.5);
    session.seconds = Math.round(session.seconds);
    lastSave = Date.now();
    await DB.put("plays", { ...session });
    emit("saved");
  }

  // ---------- Reprise après fermeture de l'appli ----------
  function saveResume() {
    lastResume = Date.now();
    try {
      localStorage.setItem("vonia.resume", JSON.stringify({ ids: queue.map((t) => t.id), order, pos, time: audio.currentTime || 0, shuffle, repeat }));
    } catch (e) {}
  }

  async function restore(tracksById) {
    let saved;
    try { saved = JSON.parse(localStorage.getItem("vonia.resume") || "null"); } catch (e) {}
    if (!saved || !saved.ids) return;
    const q = saved.ids.map((id) => tracksById[id]).filter(Boolean);
    if (!q.length || q.length !== saved.ids.length) return;
    queue = q; order = saved.order; shuffle = !!saved.shuffle; repeat = saved.repeat || "off";
    await load(Math.min(saved.pos, order.length - 1), false, saved.time || 0);
  }

  // ---------- Chargement ----------
  async function load(p, autoplay = true, at = 0) {
    if (session) await saveSession();
    session = null;
    pos = p;
    const track = current();
    if (!track) return;
    const blob = await DB.get("files", track.id);
    if (!blob) { if (autoplay && pos + 1 < order.length) return load(pos + 1); emit("error"); return; }
    if (fileURL) URL.revokeObjectURL(fileURL);
    fileURL = URL.createObjectURL(blob);
    audio.src = fileURL;
    lastTime = at;
    if (at > 0) audio.addEventListener("loadedmetadata", () => { audio.currentTime = at; }, { once: true });
    startSession(track);
    updateMediaSession(track);
    emit("track");
    saveResume();
    if (autoplay) { try { await audio.play(); } catch (e) { emit("state"); } }
  }

  function makeOrder(startIndex) {
    const idx = queue.map((_, i) => i);
    if (!shuffle) return idx;
    const rest = idx.filter((i) => i !== startIndex);
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    return startIndex >= 0 ? [startIndex, ...rest] : rest;
  }

  // ---------- Commandes ----------
  function playList(tracks, startIndex = 0, opts = {}) {
    if (!tracks.length) return;
    queue = tracks.slice();
    if (opts.shuffle !== undefined) shuffle = opts.shuffle;
    const start = opts.shuffle ? Math.floor(Math.random() * tracks.length) : startIndex;
    order = makeOrder(start);
    return load(shuffle ? 0 : start);
  }

  function toggle() {
    if (!current()) return;
    if (audio.paused) audio.play().catch(() => {}); else audio.pause();
  }

  function next(auto = false) {
    if (!current()) return;
    if (auto && repeat === "one") { audio.currentTime = 0; audio.play().catch(() => {}); return; }
    if (pos + 1 < order.length) return load(pos + 1);
    if (repeat === "all" || !auto) return load(0, !auto || repeat === "all");
    emit("state");
  }

  function prev() {
    if (!current()) return;
    if (audio.currentTime > 3 || pos === 0) { audio.currentTime = 0; return; }
    return load(pos - 1);
  }

  function seek(t) { if (current() && isFinite(t)) { audio.currentTime = t; lastTime = t; } }

  function toggleShuffle() {
    const track = current();
    shuffle = !shuffle;
    if (track) {
      const i = queue.indexOf(track);
      order = makeOrder(i);
      pos = order.indexOf(i);
    }
    saveResume(); emit("mode");
  }

  function cycleRepeat() {
    repeat = repeat === "off" ? "all" : repeat === "all" ? "one" : "off";
    saveResume(); emit("mode");
  }

  // Un morceau a été modifié ou supprimé dans la bibliothèque.
  function updateTrack(track) {
    queue = queue.map((t) => (t.id === track.id ? track : t));
    if (current() && current().id === track.id) { updateMediaSession(track); emit("track"); }
  }

  // ---------- Écran verrouillé et Centre de contrôle ----------
  function updateMediaSession(track) {
    if (!("mediaSession" in navigator)) return;
    const art = track.cover ? URL.createObjectURL(track.cover) : new URL("icons/icon-512.png", location.href).href;
    navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.artist || "Vonia", album: track.album || "Vonia", artwork: [{ src: art, sizes: "512x512" }] });
  }
  if ("mediaSession" in navigator) {
    const ms = navigator.mediaSession;
    const set = (a, f) => { try { ms.setActionHandler(a, f); } catch (e) {} };
    set("play", () => audio.play());
    set("pause", () => audio.pause());
    set("previoustrack", () => prev());
    set("nexttrack", () => next());
    set("seekto", (d) => seek(d.seekTime));
  }

  // ---------- Événements audio ----------
  audio.addEventListener("timeupdate", () => {
    const t = audio.currentTime;
    const d = t - lastTime;
    lastTime = t;
    if (session && !audio.paused && d > 0 && d < 2) session.seconds += d;
    if (Date.now() - lastSave > 15000) saveSession();
    if (Date.now() - lastResume > 5000) saveResume();
    emit("time");
  });
  audio.addEventListener("seeked", () => { lastTime = audio.currentTime; });
  audio.addEventListener("play", () => emit("state"));
  audio.addEventListener("pause", () => { saveSession(); saveResume(); emit("state"); });
  audio.addEventListener("ended", async () => { await saveSession(); if (current()) startSession(current()); next(true); });
  window.addEventListener("pagehide", () => { saveSession(); saveResume(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { saveSession(); saveResume(); } });

  return {
    audio, playList, toggle, next, prev, seek, toggleShuffle, cycleRepeat, restore, updateTrack,
    on: (fn) => subs.add(fn),
    get track() { return current(); },
    get playing() { return !audio.paused && !!current(); },
    get shuffle() { return shuffle; },
    get repeat() { return repeat; },
    get time() { return audio.currentTime || 0; },
    get duration() { return audio.duration || (current() && current().duration) || 0; },
  };
})();
