// Onglet Vidéos : import de fichiers MP4, lecteur vidéo et playlists de vidéos.
"use strict";

let videoFilter = "toutes";

// ---------- Import ----------
function videoInfo(blob) {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(blob);
    let settled = false;
    const done = (info) => { if (settled) return; settled = true; URL.revokeObjectURL(url); v.removeAttribute("src"); resolve(info); };
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.onloadedmetadata = () => { v.currentTime = Math.min(1.5, (v.duration || 3) / 3); };
    v.onseeked = () => {
      let thumb = null;
      try {
        const w = 480, h = Math.round((w * (v.videoHeight || 9)) / (v.videoWidth || 16));
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(v, 0, 0, w, h);
        c.toBlob((b) => done({ duration: v.duration || 0, thumb: b }), "image/jpeg", 0.8);
        return;
      } catch (e) {}
      done({ duration: v.duration || 0, thumb });
    };
    v.onerror = () => done({ duration: 0, thumb: null });
    setTimeout(() => done({ duration: v.duration || 0, thumb: null }), 8000);
    v.src = url;
  });
}

const videoInput = document.createElement("input");
videoInput.type = "file";
videoInput.accept = "video/*,.mp4,.mov,.m4v";
videoInput.multiple = true;
videoInput.hidden = true;
document.body.appendChild(videoInput);
function pickVideos() { videoInput.value = ""; videoInput.click(); }

videoInput.addEventListener("change", async () => {
  const files = [...videoInput.files];
  if (!files.length) return;
  let added = 0;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    toast(`Import ${i + 1} / ${files.length}…`, 60000);
    if (Lib.tracks.some((t) => t.fileName === f.name && t.size === f.size)) continue;
    const info = await videoInfo(f);
    const guess = Tags.fromName(f.name);
    const t = { id: newId("v"), source: "mp4", title: guess.title || f.name, artist: guess.artist || "", cover: info.thumb, frameCover: !!info.thumb, duration: info.duration, fileName: f.name, size: f.size, addedAt: Date.now() + i };
    try {
      await DB.put("files", f, t.id);
      await DB.put("tracks", t);
      added++;
    } catch (e) { toast("Plus assez de place sur l'iPhone"); break; }
  }
  await Lib.load();
  toast(added ? `${added} vidéo${added > 1 ? "s" : ""} ajoutée${added > 1 ? "s" : ""}` : "Ces vidéos sont déjà dans Vonia");
  render(true);
});

// ---------- Écran ----------
function videoCard(t, ctx) {
  const on = VideoPlayer.current && VideoPlayer.current.id === t.id ? " playing" : "";
  return `<div class="vcard${on}" data-vid="${t.id}" data-ctx="${esc(ctx)}"><div class="vbox">${art(t, "vthumb")}<span class="vdur">${t.duration ? fmtTime(t.duration) : "MP4"}</span></div>
    <div class="vrow"><div class="vt">${esc(t.title)}</div><button class="more" data-vmenu aria-label="Options">${ICON.more}</button></div></div>`;
}

Screens.videos = (sub) => {
  if (sub[0] === "playlist") return Screens.playlistScreen(sub[1], "mp4");
  const vids = Lib.mp4s();
  const lists = Lib.lists("mp4");
  const chips = [["toutes", "Toutes"], ["playlists", "Playlists"]].map(([k, l]) => `<button class="chip${videoFilter === k ? " on" : ""}" data-vfilter="${k}">${l}</button>`).join("");
  let body;
  if (videoFilter === "playlists") {
    body = `<div class="actions"><button class="btn" data-newlist="mp4">${ICON.plus} Nouvelle playlist</button></div>` +
      (lists.length ? `<div class="grid2">${lists.map(playlistCard).join("")}</div>` : `<p class="lead">Crée une playlist de vidéos, puis ajoute des vidéos avec le bouton ⋯.</p>`);
  } else if (!vids.length) {
    body = `<div class="empty"><div class="art-big" style="background:linear-gradient(135deg,#ffd61f,#f2a900);color:#141000">${ICON.film}</div>
      <h3>Tes vidéos MP4</h3><p>Ajoute des vidéos depuis Photos ou l'app Fichiers : elles se liront ici, même sans connexion.</p>
      <button class="btn" data-vimport>${ICON.plus} Ajouter des vidéos</button></div>`;
  } else {
    const total = vids.reduce((s, t) => s + (t.duration || 0), 0);
    body = `<div class="actions"><button class="btn" data-playall="mp4">${ICON.play} Tout lire</button><button class="btn ghost" data-shuffle="mp4">${ICON.shuffle} Aléatoire</button></div>
      <div class="section"><h2>${vids.length} vidéo${vids.length > 1 ? "s" : ""}</h2><button data-vimport>+ Ajouter</button></div>
      <div class="vgrid">${vids.map((t) => videoCard(t, "mp4")).join("")}</div><div class="center"><span class="muted">${fmtDuration(total)} au total</span></div>`;
  }
  return `${header("Vidéos")}<div class="chips">${chips}</div>${body}`;
};

document.getElementById("view").addEventListener("click", (e) => {
  let b;
  if ((b = e.target.closest("[data-vfilter]"))) { videoFilter = b.dataset.vfilter; return render(); }
  if (e.target.closest("[data-vimport]")) return pickVideos();
  const card = e.target.closest(".vcard");
  if (card) {
    const t = Lib.byId[card.dataset.vid];
    if (!t) return;
    if (e.target.closest("[data-vmenu]")) return trackMenu(t);
    return playFrom(card.dataset.ctx, t.id);
  }
});

// ---------- Lecteur vidéo ----------
const VideoPlayer = (() => {
  let list = [], pos = 0, url = null, session = null, lastT = 0, lastSave = 0;
  const el = document.createElement("div");
  el.className = "vsheet";
  el.innerHTML = `<div class="full-top"><button class="iconbtn" data-close aria-label="Fermer">${ICON.down}</button><span>VIDÉO</span><button class="iconbtn" data-more aria-label="Options">${ICON.more}</button></div>
    <div class="vframe"><video playsinline controls preload="auto"></video></div>
    <div class="vmeta"><div><div class="ft"></div><div class="fa"></div></div></div>
    <div class="ctrls"><button class="cbtn" data-prev aria-label="Précédent">${ICON.prev}</button><button class="cbtn big" data-play aria-label="Lecture">${ICON.pause}</button><button class="cbtn" data-next aria-label="Suivant">${ICON.next}</button></div>
    <div class="section"><h2>À suivre</h2></div><div class="list vqueue"></div>`;
  document.body.appendChild(el);
  const video = el.querySelector("video");

  async function saveSession() {
    if (!session || session.seconds < 1) return;
    const t = list[pos];
    session.counted = session.seconds >= 30 || (t && t.duration > 0 && session.seconds >= t.duration * 0.5);
    session.seconds = Math.round(session.seconds);
    lastSave = Date.now();
    await DB.put("plays", { ...session });
    if (currentRoute()[0] === "recap") Recap.refreshLive();
  }

  async function play(p) {
    await saveSession();
    pos = p;
    const t = list[pos];
    if (!t) return;
    const blob = await DB.get("files", t.id);
    if (!blob) return toast("Fichier introuvable");
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(blob);
    Player.audio.pause();
    YTPlayer.stop();
    session = { id: Date.now() * 1000 + Math.floor(Math.random() * 1000), trackId: t.id, title: t.title, artist: t.artist || "", genre: "", source: "mp4", at: Date.now(), seconds: 0, counted: false };
    lastT = 0;
    video.src = url;
    show();
    video.play().catch(() => {});
  }

  function show() {
    const t = list[pos];
    el.querySelector(".ft").textContent = t.title;
    el.querySelector(".fa").textContent = [t.artist, t.duration ? fmtTime(t.duration) : ""].filter(Boolean).join(" · ") || "Vidéo MP4";
    const rest = list.slice(pos + 1);
    el.querySelector(".vqueue").innerHTML = rest.length ? rest.map((x) => `<div class="trk" data-q="${x.id}">${art(x)}<div class="info"><div class="t">${esc(x.title)}</div><div class="s"><span>${x.duration ? fmtTime(x.duration) : "MP4"}</span></div></div></div>`).join("") : `<p class="lead">Fin de la liste.</p>`;
    el.classList.add("open");
  }

  video.addEventListener("timeupdate", () => {
    const d = video.currentTime - lastT;
    lastT = video.currentTime;
    if (session && !video.paused && d > 0 && d < 2) session.seconds += d;
    if (Date.now() - lastSave > 15000) saveSession();
  });
  video.addEventListener("seeked", () => { lastT = video.currentTime; });
  video.addEventListener("play", () => { el.querySelector("[data-play]").innerHTML = ICON.pause; Player.audio.pause(); });
  video.addEventListener("pause", () => { el.querySelector("[data-play]").innerHTML = ICON.play; saveSession(); });
  video.addEventListener("ended", () => { if (pos + 1 < list.length) play(pos + 1); else saveSession(); });

  el.addEventListener("click", (e) => {
    const b = (s) => e.target.closest(s);
    if (b("[data-close]")) return stop();
    if (b("[data-play]")) return video.paused ? video.play().catch(() => {}) : video.pause();
    if (b("[data-next]")) return pos + 1 < list.length ? play(pos + 1) : null;
    if (b("[data-prev]")) { if (video.currentTime > 3 || pos === 0) { video.currentTime = 0; return; } return play(pos - 1); }
    if (b("[data-more]")) return trackMenu(Lib.byId[list[pos].id]);
    const q = b("[data-q]");
    if (q) return play(list.findIndex((x) => x.id === q.dataset.q));
  });

  async function stop() {
    if (!el.classList.contains("open")) return;
    video.pause();
    await saveSession();
    session = null;
    el.classList.remove("open");
    render(true);
  }

  return {
    open(videos, start = 0) { list = videos.slice(); play(start); },
    stop,
    get current() { return el.classList.contains("open") ? list[pos] : null; },
  };
})();

// La musique qui démarre met la vidéo en pause.
Player.on((type) => { if (type === "state" && Player.playing) document.querySelector(".vsheet video")?.pause(); });
