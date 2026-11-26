// Bibliothèque (morceaux, vidéos, playlists), import des fichiers, onglet Écouter et lecteurs.
"use strict";

const Lib = {
  tracks: [],
  playlists: [],
  byId: {},
  async load() {
    const [t, p] = await Promise.all([DB.all("tracks"), DB.all("playlists")]);
    this.tracks = t.sort((a, b) => b.addedAt - a.addedAt);
    this.playlists = p.sort((a, b) => b.createdAt - a.createdAt);
    this.byId = Object.fromEntries(t.map((x) => [x.id, x]));
  },
  files() { return this.tracks.filter((t) => t.source !== "youtube"); },
  videos() { return this.tracks.filter((t) => t.source === "youtube"); },
  lists(kind) { return this.playlists.filter((p) => (p.kind || "audio") === kind); },
  listTracks(p) { return p.trackIds.map((id) => this.byId[id]).filter(Boolean); },
  async saveTrack(t) { await DB.put("tracks", t); await this.load(); },
  async deleteTrack(id) {
    await DB.del("tracks", id);
    await DB.del("files", id);
    for (const p of this.playlists) {
      if (p.trackIds.includes(id)) { p.trackIds = p.trackIds.filter((x) => x !== id); await DB.put("playlists", p); }
    }
    coverCache.delete(id);
    await this.load();
  },
  async savePlaylist(p) { await DB.put("playlists", p); await this.load(); },
  async deletePlaylist(id) { await DB.del("playlists", id); await this.load(); },
};

const newId = (prefix) => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- Import des fichiers audio ----------
const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = "audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus";
fileInput.multiple = true;
fileInput.hidden = true;
document.body.appendChild(fileInput);

function pickFiles() { fileInput.value = ""; fileInput.click(); }

fileInput.addEventListener("change", async () => {
  const files = [...fileInput.files];
  if (!files.length) return;
  let added = 0, skipped = 0;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    toast(`Import ${i + 1} / ${files.length}…`, 60000);
    if (Lib.tracks.some((t) => t.fileName === f.name && t.size === f.size)) { skipped++; continue; }
    const tags = await Tags.read(f);
    const guess = Tags.fromName(f.name);
    const track = {
      id: newId("t"),
      source: "file",
      title: tags.title || guess.title || f.name,
      artist: tags.artist || guess.artist || "",
      album: tags.album || "",
      genre: tags.genre || "",
      cover: tags.cover || null,
      duration: await Tags.duration(f),
      fileName: f.name,
      size: f.size,
      addedAt: Date.now() + i,
    };
    try {
      await DB.put("files", f, track.id);
      await DB.put("tracks", track);
      added++;
    } catch (e) {
      toast("Plus assez de place sur l'iPhone");
      break;
    }
  }
  await Lib.load();
  toast(added ? `${added} morceau${added > 1 ? "x" : ""} ajouté${added > 1 ? "s" : ""}` + (skipped ? ` · ${skipped} déjà là` : "") : "Ces morceaux sont déjà dans Vonia");
  render(true);
});

// ---------- Menus sur un morceau ----------
async function addToPlaylist(track) {
  const kind = track.source === "youtube" ? "video" : "audio";
  const lists = Lib.lists(kind);
  const choice = await sheet("Ajouter à une playlist", [...lists.map((p) => ({ key: p.id, label: p.name })), { key: "__new", label: "+ Nouvelle playlist" }]);
  if (!choice) return;
  let p;
  if (choice === "__new") {
    p = await createPlaylist(kind);
    if (!p) return;
  } else p = Lib.playlists.find((x) => x.id === choice);
  if (p.trackIds.includes(track.id)) return toast("Déjà dans « " + p.name + " »");
  p.trackIds.push(track.id);
  await Lib.savePlaylist(p);
  toast("Ajouté à « " + p.name + " »");
}

async function createPlaylist(kind) {
  const r = await ask("Nouvelle playlist", [{ name: "name", label: "Nom", placeholder: kind === "video" ? "Mes clips" : "Riddim du samedi" }], "Créer");
  if (!r || !r.name) return null;
  const p = { id: newId("p"), kind, name: r.name, trackIds: [], createdAt: Date.now() };
  await Lib.savePlaylist(p);
  return p;
}

async function trackMenu(track, playlist) {
  const actions = [{ key: "pl", label: "Ajouter à une playlist" }];
  if (track.source === "youtube") actions.push({ key: "fav", label: track.fav ? "Retirer des favoris" : "Ajouter aux favoris" });
  actions.push({ key: "edit", label: "Modifier le titre et l'artiste" });
  if (playlist) actions.push({ key: "out", label: "Retirer de la playlist", danger: true });
  actions.push({ key: "del", label: track.source === "youtube" ? "Supprimer la vidéo" : "Supprimer de Vonia", danger: true });
  const k = await sheet(track.title, actions);
  if (k === "pl") return addToPlaylist(track);
  if (k === "fav") { track.fav = !track.fav; await Lib.saveTrack(track); toast(track.fav ? "Ajouté aux favoris" : "Retiré des favoris"); return render(true); }
  if (k === "edit") {
    const r = await ask("Modifier", [{ name: "title", label: "Titre", value: track.title }, { name: "artist", label: "Artiste", value: track.artist }], "Enregistrer");
    if (!r) return;
    track.title = r.title || track.title;
    track.artist = r.artist;
    await Lib.saveTrack(track);
    Player.updateTrack(track);
    return render(true);
  }
  if (k === "out") {
    playlist.trackIds = playlist.trackIds.filter((x) => x !== track.id);
    await Lib.savePlaylist(playlist);
    return render(true);
  }
  if (k === "del" && (await confirmBox("Supprimer « " + track.title + " » ?"))) {
    await Lib.deleteTrack(track.id);
    toast("Supprimé");
    return render(true);
  }
}

async function playlistMenu(p) {
  const k = await sheet(p.name, [{ key: "rename", label: "Renommer" }, { key: "del", label: "Supprimer la playlist", danger: true }]);
  if (k === "rename") {
    const r = await ask("Renommer", [{ name: "name", label: "Nom", value: p.name }], "Enregistrer");
    if (r && r.name) { p.name = r.name; await Lib.savePlaylist(p); render(true); }
  }
  if (k === "del" && (await confirmBox("Supprimer « " + p.name + " » ? Les morceaux restent dans Vonia."))) {
    await Lib.deletePlaylist(p.id);
    location.hash = p.kind === "video" ? "#/youtube" : "#/ecouter";
  }
}

// ---------- Morceaux à l'écran ----------
function trackRow(t, ctx) {
  const isYT = t.source === "youtube";
  const tag = isYT ? `<span class="tag yt">YOUTUBE</span>` : `<span class="tag off">HORS LIGNE</span>`;
  const sub = [t.artist, t.duration ? fmtTime(t.duration) : ""].filter(Boolean).join(" · ");
  const on = (isYT ? YTPlayer.current && YTPlayer.current.id === t.id : Player.track && Player.track.id === t.id) ? " playing" : "";
  return `<div class="trk${on}" data-id="${t.id}" data-ctx="${esc(ctx)}">${art(t)}
    <div class="info"><div class="t">${esc(t.title)}</div><div class="s">${tag}<span>${esc(sub)}</span></div></div>
    <div class="eq"><i></i><i></i><i></i></div>
    <button class="more" data-more aria-label="Options">${ICON.more}</button></div>`;
}

function mosaic(p) {
  const ts = Lib.listTracks(p).slice(0, 4);
  if (!ts.length) return `<div class="mosaic" style="background:${gradientFor(p.id)}">${ICON.list}</div>`;
  if (ts.length < 4) return art(ts[0], "mosaic");
  return `<div class="mosaic grid">${ts.map((t) => art(t, "m")).join("")}</div>`;
}

function playlistCard(p) {
  const n = p.trackIds.length;
  return `<a class="plc" href="#/${p.kind === "video" ? "youtube" : "ecouter"}/playlist/${p.id}">${mosaic(p)}<div class="t">${esc(p.name)}</div><div class="s">${n} ${p.kind === "video" ? "vidéo" : "titre"}${n > 1 ? "s" : ""}</div></a>`;
}

// Liste de lecture correspondant à l'endroit où l'on a touché le morceau.
function contextTracks(ctx) {
  if (ctx.startsWith("pl:")) {
    const p = Lib.playlists.find((x) => x.id === ctx.slice(3));
    return p ? Lib.listTracks(p) : [];
  }
  if (ctx === "videos") return Lib.videos();
  if (ctx === "favs") return Lib.videos().filter((v) => v.fav);
  if (ctx === "history") return YTHistory();
  if (ctx === "search") return YTSearchResults;
  return Lib.files();
}

function heroHTML() {
  const t = Player.track;
  if (!t) return "";
  const p = Player.duration ? (Player.time / Player.duration) * 100 : 0;
  return `<div class="hero" id="hero">${art(t, "hart")}
    <div class="hinfo"><span class="k">${Player.playing ? "EN COURS" : "REPRENDRE"}</span><div class="ht">${esc(t.title)}</div><div class="hs">${esc(t.artist || "Mon fichier")} · hors connexion</div><div class="hbar"><i style="width:${p}%"></i></div></div>
    <button class="hplay" data-toggle aria-label="Lecture">${Player.playing ? ICON.pause : ICON.play}</button>
    </div>`;
}

let listenFilter = "tout";

Screens.ecouter = (sub) => {
  if (sub[0] === "playlist") return playlistScreen(sub[1], "audio");
  const files = Lib.files();
  const lists = Lib.lists("audio");
  const chips = [["tout", "Tout"], ["fichiers", "Mes fichiers"], ["youtube", "YouTube"], ["playlists", "Playlists"]]
    .map(([k, l]) => `<button class="chip${listenFilter === k ? " on" : ""}" data-filter="${k}">${l}</button>`).join("");
  let body = "";

  const empty = `<div class="empty"><div class="art-big" style="background:linear-gradient(135deg,#1fb25a,#0b6b31)">${ICON.note}</div>
    <h3>Ta musique ici</h3><p>Ajoute tes fichiers audio depuis l'app Fichiers de l'iPhone : ils se liront même sans connexion.</p>
    <button class="btn" data-import>${ICON.plus} Ajouter de la musique</button></div>`;

  if (listenFilter === "tout") {
    if (!files.length && !Lib.videos().length) body = empty;
    else {
      body = heroHTML();
      if (lists.length) body += `<div class="section"><h2>Playlists</h2><button data-filter="playlists">Tout voir</button></div><div class="hscroll">${lists.map(playlistCard).join("")}</div>`;
      const favs = Lib.videos().filter((v) => v.fav).slice(0, 3);
      if (favs.length) body += `<div class="section"><h2>Favoris YouTube</h2><a href="#/youtube">Tout voir</a></div><div class="list">${favs.map((t) => trackRow(t, "favs")).join("")}</div>`;
      body += `<div class="section"><h2>Ma musique</h2><button data-import>+ Ajouter</button></div>`;
      body += files.length ? `<div class="list">${files.map((t) => trackRow(t, "files")).join("")}</div>` : `<p class="lead">Aucun fichier pour l'instant.</p>`;
    }
  } else if (listenFilter === "fichiers") {
    if (!files.length) body = empty;
    else {
      const total = files.reduce((s, t) => s + (t.duration || 0), 0);
      body = `<div class="actions"><button class="btn" data-playall="files">${ICON.play} Tout lire</button><button class="btn ghost" data-shuffle="files">${ICON.shuffle} Aléatoire</button></div>
        <div class="section"><h2>${files.length} titre${files.length > 1 ? "s" : ""}</h2><span class="muted">${fmtDuration(total)}</span></div>
        <div class="list">${files.slice().sort((a, b) => a.title.localeCompare(b.title, "fr")).map((t) => trackRow(t, "files")).join("")}</div>
        <div class="center"><button class="btn ghost" data-import>${ICON.plus} Ajouter des fichiers</button></div>`;
    }
  } else if (listenFilter === "youtube") {
    const favs = Lib.videos().filter((v) => v.fav);
    body = favs.length
      ? `<div class="section"><h2>Favoris YouTube</h2><a href="#/youtube">Ouvrir YouTube</a></div><div class="list">${favs.map((t) => trackRow(t, "favs")).join("")}</div>`
      : `<div class="empty"><div class="art-big" style="background:linear-gradient(135deg,#e63a2e,#7d120c)">${ICON.video}</div><h3>Pas encore de favoris</h3><p>Dans l'onglet YouTube, touche le cœur d'une vidéo pour la retrouver ici.</p><a class="btn" href="#/youtube">${ICON.video} Aller sur YouTube</a></div>`;
  } else {
    body = `<div class="actions"><button class="btn" data-newlist="audio">${ICON.plus} Nouvelle playlist</button></div>`;
    body += lists.length ? `<div class="grid2">${lists.map(playlistCard).join("")}</div>` : `<p class="lead">Crée ta première playlist, puis ajoute des morceaux avec le bouton ⋯ à côté de chaque titre.</p>`;
  }
  return `${header("Vonia")}<div class="chips">${chips}</div>${body}`;
};

function playlistScreen(id, kind) {
  const p = Lib.playlists.find((x) => x.id === id);
  if (!p) return `${header(kind === "video" ? "YouTube" : "Vonia")}<p class="lead">Cette playlist n'existe plus.</p>`;
  const ts = Lib.listTracks(p);
  const total = ts.reduce((s, t) => s + (t.duration || 0), 0);
  const backHref = kind === "video" ? "#/youtube" : "#/ecouter";
  return `<div class="topbar"><a class="backlink" href="${backHref}">${ICON.back} Retour</a><button class="iconbtn" data-plmenu="${p.id}">${ICON.more}</button></div>
    <div class="plhead">${mosaic(p)}<div><div class="k">PLAYLIST ${kind === "video" ? "YOUTUBE" : ""}</div><h1 class="pltitle">${esc(p.name)}</h1><div class="s">${ts.length} ${kind === "video" ? "vidéo" : "titre"}${ts.length > 1 ? "s" : ""}${total ? " · " + fmtDuration(total) : ""}</div></div></div>
    ${ts.length ? `<div class="actions"><button class="btn" data-playall="pl:${p.id}">${ICON.play} Lire</button><button class="btn ghost" data-shuffle="pl:${p.id}">${ICON.shuffle} Aléatoire</button></div>
    <div class="list">${ts.map((t) => trackRow(t, "pl:" + p.id)).join("")}</div>`
    : `<p class="lead">Playlist vide. Ajoute des ${kind === "video" ? "vidéos" : "morceaux"} avec le bouton ⋯ à côté de chaque titre.</p>`}`;
}
Screens.playlistScreen = playlistScreen;

// ---------- Clics dans les listes ----------
function playFrom(ctx, id, opts = {}) {
  const list = contextTracks(ctx);
  if (!list.length) return;
  if (list[0].source === "youtube") {
    if (opts.shuffle) return YTPlayer.open(list.slice().sort(() => Math.random() - 0.5), 0);
    return YTPlayer.open(list, Math.max(0, list.findIndex((t) => t.id === id)));
  }
  YTPlayer.stop();
  const i = Math.max(0, list.findIndex((t) => t.id === id));
  Player.playList(list, i, opts);
}

document.getElementById("view").addEventListener("click", async (e) => {
  const el = (s) => e.target.closest(s);
  let b;
  if ((b = el("[data-filter]"))) { listenFilter = b.dataset.filter; return render(); }
  if (el("[data-import]")) return pickFiles();
  if ((b = el("[data-newlist]"))) { const p = await createPlaylist(b.dataset.newlist); if (p) render(true); return; }
  if ((b = el("[data-plmenu]"))) return playlistMenu(Lib.playlists.find((x) => x.id === b.dataset.plmenu));
  if ((b = el("[data-playall]"))) return playFrom(b.dataset.playall, null, { shuffle: false });
  if ((b = el("[data-shuffle]"))) return playFrom(b.dataset.shuffle, null, { shuffle: true });
  if (el("[data-toggle]")) return Player.toggle();
  if (el("#hero")) return FullPlayer.open();
  const row = el(".trk");
  if (row) {
    const track = Lib.byId[row.dataset.id] || contextTracks(row.dataset.ctx).find((t) => t.id === row.dataset.id);
    if (!track) return;
    const ctx = row.dataset.ctx;
    if (el("[data-more]")) {
      const pl = ctx.startsWith("pl:") ? Lib.playlists.find((x) => x.id === ctx.slice(3)) : null;
      if (ctx === "search" && !Lib.byId[track.id]) return YTube.resultMenu(track);
      return trackMenu(track, pl);
    }
    if (track.source !== "youtube" && Player.track && Player.track.id === track.id) return FullPlayer.open();
    return playFrom(ctx, track.id);
  }
});

// ---------- Petit lecteur ----------
const mini = document.createElement("div");
mini.className = "mini";
mini.hidden = true;
mini.innerHTML = `<div class="mbar"><i></i></div><div class="mart"></div><div class="minfo"><div class="t"></div><div class="s"></div></div>
  <button class="mbtn" data-mtoggle aria-label="Lecture"></button><button class="mbtn sm" data-mnext aria-label="Suivant">${ICON.next}</button>`;
document.body.appendChild(mini);
mini.addEventListener("click", (e) => {
  if (e.target.closest("[data-mtoggle]")) return Player.toggle();
  if (e.target.closest("[data-mnext]")) return Player.next();
  FullPlayer.open();
});

function updateMini(type) {
  const t = Player.track;
  mini.hidden = !t;
  document.body.classList.toggle("has-mini", !!t);
  if (!t) return;
  if (type !== "time") {
    mini.querySelector(".mart").outerHTML = art(t, "mart");
    mini.querySelector(".t").textContent = t.title;
    mini.querySelector(".s").textContent = t.artist || "Mon fichier";
    mini.querySelector("[data-mtoggle]").innerHTML = Player.playing ? ICON.pause : ICON.play;
  }
  const p = Player.duration ? (Player.time / Player.duration) * 100 : 0;
  mini.querySelector(".mbar i").style.width = p + "%";
}

// ---------- Lecteur plein écran ----------
const FullPlayer = (() => {
  const el = document.createElement("div");
  el.className = "full";
  el.innerHTML = `<div class="full-bg"></div><div class="full-in">
    <div class="full-top"><button class="iconbtn" data-close aria-label="Fermer">${ICON.down}</button><span>EN LECTURE</span><button class="iconbtn" data-fmore aria-label="Options">${ICON.more}</button></div>
    <div class="full-art"></div>
    <div class="full-meta"><div class="ft"></div><div class="fa"></div></div>
    <input type="range" class="seek" min="0" max="1000" value="0" aria-label="Position">
    <div class="times"><span class="tc">0:00</span><span class="td">0:00</span></div>
    <div class="ctrls"><button class="cbtn sm" data-shuf aria-label="Aléatoire">${ICON.shuffle}</button><button class="cbtn" data-prev aria-label="Précédent">${ICON.prev}</button>
    <button class="cbtn big" data-play aria-label="Lecture"></button><button class="cbtn" data-next aria-label="Suivant">${ICON.next}</button><button class="cbtn sm" data-rep aria-label="Répéter">${ICON.repeat}<b></b></button></div>
  </div>`;
  document.body.appendChild(el);
  const seek = el.querySelector(".seek");
  let dragging = false;
  seek.addEventListener("input", () => { dragging = true; el.querySelector(".tc").textContent = fmtTime((seek.value / 1000) * Player.duration); seek.style.setProperty("--p", seek.value / 10 + "%"); });
  seek.addEventListener("change", () => { Player.seek((seek.value / 1000) * Player.duration); dragging = false; });
  el.addEventListener("click", (e) => {
    const b = (s) => e.target.closest(s);
    if (b("[data-close]")) return close();
    if (b("[data-play]")) return Player.toggle();
    if (b("[data-next]")) return Player.next();
    if (b("[data-prev]")) return Player.prev();
    if (b("[data-shuf]")) return Player.toggleShuffle();
    if (b("[data-rep]")) return Player.cycleRepeat();
    if (b("[data-fmore]") && Player.track) return trackMenu(Player.track);
  });
  // Glisser vers le bas pour fermer.
  let y0 = null;
  el.addEventListener("touchstart", (e) => { if (!e.target.closest(".seek")) y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener("touchend", (e) => { if (y0 != null && e.changedTouches[0].clientY - y0 > 110) close(); y0 = null; });

  function open() { if (!Player.track) return; update("track"); el.classList.add("open"); }
  function close() { el.classList.remove("open"); }
  function update(type) {
    const t = Player.track;
    if (!t) return close();
    if (type !== "time") {
      const url = coverURL(t);
      el.querySelector(".full-art").outerHTML = art(t, "full-art");
      el.querySelector(".full-bg").style.background = url ? `center/cover url('${url}')` : gradientFor(t.id);
      el.querySelector(".ft").textContent = t.title;
      el.querySelector(".fa").textContent = t.artist || "Mon fichier";
      el.querySelector("[data-play]").innerHTML = Player.playing ? ICON.pause : ICON.play;
      el.querySelector("[data-shuf]").classList.toggle("on", Player.shuffle);
      el.querySelector("[data-rep]").classList.toggle("on", Player.repeat !== "off");
      el.querySelector("[data-rep] b").textContent = Player.repeat === "one" ? "1" : "";
      el.classList.toggle("playing", Player.playing);
    }
    if (!dragging) {
      const d = Player.duration;
      seek.value = d ? (Player.time / d) * 1000 : 0;
      seek.style.setProperty("--p", seek.value / 10 + "%");
      el.querySelector(".tc").textContent = fmtTime(Player.time);
      el.querySelector(".td").textContent = d ? "-" + fmtTime(d - Player.time) : "0:00";
    }
  }
  return { open, close, update };
})();

Player.on((type) => {
  updateMini(type);
  FullPlayer.update(type);
  if (type === "time") {
    const bar = document.querySelector("#hero .hbar i");
    if (bar && Player.duration) bar.style.width = (Player.time / Player.duration) * 100 + "%";
    return;
  }
  if (type === "track" || type === "state") {
    document.querySelectorAll(".trk").forEach((r) => r.classList.toggle("playing", !!Player.track && r.dataset.id === Player.track.id && !Lib.byId[r.dataset.id]?.source?.startsWith("youtube")));
    const hero = document.getElementById("hero");
    if (hero) hero.outerHTML = heroHTML();
    else if (type === "track" && currentRoute().join("/") === "ecouter" && listenFilter === "tout") render(true);
    if (type === "state") document.body.classList.toggle("is-playing", Player.playing);
  }
  if (type === "saved" && currentRoute()[0] === "recap") Recap.refreshLive();
  if (type === "error") toast("Fichier introuvable");
});
