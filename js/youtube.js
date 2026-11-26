// Onglet YouTube : coller un lien, rechercher (avec une clé API), favoris, playlists et lecteur vidéo.
"use strict";

let YTSearchResults = [];
let ytQuery = "";
let ytFilter = "recents";

const YTHistory = () => Lib.videos().slice().sort((a, b) => (b.lastPlayed || b.addedAt) - (a.lastPlayed || a.addedAt));

const YTube = {
  parseId(text) {
    const s = String(text || "").trim();
    const m = s.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    return /^[A-Za-z0-9_-]{11}$/.test(s) ? s : null;
  },

  splitTitle(title, channel) {
    const parts = title.split(/\s+[-–—]\s+/);
    let artist = channel || "", name = title;
    if (parts.length >= 2) { artist = parts[0]; name = parts.slice(1).join(" - "); }
    name = name.replace(/\s*[([](official|video|audio|lyrics?|clip|visualizer|hd|4k)[^)\]]*[)\]]/gi, "").trim() || title;
    artist = artist.replace(/\s*-\s*Topic$/i, "").replace(/VEVO$/i, "").trim();
    return { title: name, artist };
  },

  async info(videoId) {
    const watch = encodeURIComponent("https://www.youtube.com/watch?v=" + videoId);
    for (const url of [`https://www.youtube.com/oembed?url=${watch}&format=json`, `https://noembed.com/embed?url=${watch}`]) {
      try {
        const r = await fetch(url);
        if (!r.ok) continue;
        const j = await r.json();
        if (j.title) return { title: j.title, channel: j.author_name || "" };
      } catch (e) {}
    }
    return null;
  },

  video(videoId, title, channel) {
    const s = YTube.splitTitle(title || "Vidéo YouTube", channel);
    return { id: "yt:" + videoId, source: "youtube", videoId, title: s.title, artist: s.artist, fullTitle: title, thumb: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, addedAt: Date.now(), fav: false, duration: 0 };
  },

  // Ajoute (ou retrouve) une vidéo dans la bibliothèque.
  async keep(v) {
    const existing = Lib.byId[v.id];
    if (existing) return existing;
    await Lib.saveTrack(v);
    return Lib.byId[v.id];
  },

  async addLink(text) {
    const id = YTube.parseId(text);
    if (!id) return toast("Ce n'est pas un lien YouTube");
    if (Lib.byId["yt:" + id]) { toast("Déjà dans tes vidéos"); return YTPlayer.open([Lib.byId["yt:" + id]], 0); }
    const t = toast("Recherche de la vidéo…", 20000);
    const info = await YTube.info(id);
    t.remove();
    const v = await YTube.keep(YTube.video(id, info ? info.title : "Vidéo YouTube", info ? info.channel : ""));
    toast("Vidéo ajoutée");
    ytFilter = "recents";
    render(true);
    YTPlayer.open([v], 0);
  },

  async search(q) {
    const key = settings.get("ytkey");
    if (!key) return toast("Ajoute une clé API dans Réglages");
    ytQuery = q;
    const t = toast("Recherche…", 20000);
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`;
      const r = await fetch(url);
      const j = await r.json();
      if (j.error) throw new Error(j.error.message);
      const div = document.createElement("div");
      const dec = (s) => { div.innerHTML = s; return div.textContent; };
      YTSearchResults = (j.items || []).map((it) => Lib.byId["yt:" + it.id.videoId] || YTube.video(it.id.videoId, dec(it.snippet.title), dec(it.snippet.channelTitle)));
      t.remove();
    } catch (e) {
      t.remove();
      YTSearchResults = [];
      toast("Recherche impossible : vérifie la clé ou la connexion");
    }
    render(true);
  },

  url(v) { return "https://www.youtube.com/watch?v=" + v.videoId; },

  // Copie le lien de la vidéo ; avec withNotube, ouvre aussi Notube pour le coller.
  copyLink(v, withNotube) {
    const link = YTube.url(v);
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = link;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;opacity:0;top:0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, link.length);
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      ta.remove();
      return ok;
    };
    const copied = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(link).then(() => true, fallback) : Promise.resolve(fallback());
    if (withNotube) {
      const w = window.open(NOTUBE_URL, "_blank");
      if (w) { try { w.opener = null; } catch (e) {} }
      copied.then((ok) => toast(ok ? (w === null ? "Lien copié · ouvre Notube dans Réglages" : "Lien copié : colle-le dans Notube") : "Copie impossible"));
    } else {
      copied.then((ok) => toast(ok ? "Lien copié" : "Copie impossible"));
    }
  },

  async resultMenu(v) {
    const k = await sheet(v.title, [{ key: "copy", label: "Copier le lien" }, { key: "notube", label: "Copier le lien et ouvrir Notube" }, { key: "fav", label: "Ajouter aux favoris" }, { key: "pl", label: "Ajouter à une playlist" }]);
    if (!k) return;
    if (k === "copy" || k === "notube") return YTube.copyLink(v, k === "notube");
    const kept = await YTube.keep(v);
    if (k === "fav") { kept.fav = true; await Lib.saveTrack(kept); toast("Ajouté aux favoris"); render(true); }
    if (k === "pl") addToPlaylist(kept);
  },
};

Screens.youtube = (sub) => {
  if (sub[0] === "playlist") return Screens.playlistScreen(sub[1], "video");
  const hasKey = !!settings.get("ytkey");
  const vids = YTHistory();
  const favs = vids.filter((v) => v.fav);
  const lists = Lib.lists("video");
  let body = "";
  if (ytQuery) {
    body = `<div class="section"><h2>Résultats</h2><button data-ytclear>Effacer</button></div>` +
      (YTSearchResults.length ? `<div class="list">${YTSearchResults.map((t) => trackRow(t, "search")).join("")}</div>` : `<p class="lead">Aucun résultat pour « ${esc(ytQuery)} ».</p>`);
  } else {
    const chips = [["recents", "Récents"], ["favoris", "Favoris"], ["playlists", "Playlists"]]
      .map(([k, l]) => `<button class="chip${ytFilter === k ? " on" : ""}" data-ytfilter="${k}">${l}</button>`).join("");
    body = `<div class="chips">${chips}</div>`;
    if (ytFilter === "recents") {
      body += vids.length ? `<div class="list" style="margin-top:10px">${vids.map((t) => trackRow(t, "history")).join("")}</div>`
        : `<div class="empty"><div class="art-big" style="background:linear-gradient(135deg,#e63a2e,#7d120c)">${ICON.video}</div><h3>Colle un lien</h3><p>Copie le lien d'une vidéo dans l'app YouTube (Partager → Copier le lien), puis touche « Coller » ci-dessus.</p></div>`;
    } else if (ytFilter === "favoris") {
      body += favs.length ? `<div class="list" style="margin-top:10px">${favs.map((t) => trackRow(t, "favs")).join("")}</div>`
        : `<p class="lead">Touche le cœur pendant une vidéo pour l'ajouter à tes favoris.</p>`;
    } else {
      body += `<div class="actions"><button class="btn" data-newlist="video">${ICON.plus} Nouvelle playlist</button></div>`;
      body += lists.length ? `<div class="grid2">${lists.map(playlistCard).join("")}</div>` : `<p class="lead">Crée une playlist de vidéos, puis ajoute des vidéos avec le bouton ⋯.</p>`;
    }
  }
  return `${header("YouTube")}
    <form class="field-bar" id="yt-link"><span class="fi">${ICON.link}</span><input name="url" placeholder="Colle un lien YouTube" autocomplete="off" inputmode="url"><button type="button" class="pill" data-paste>Coller</button></form>
    ${hasKey ? `<form class="field-bar" id="yt-search"><span class="fi">${ICON.search}</span><input name="q" type="search" placeholder="Rechercher sur YouTube" value="${esc(ytQuery)}" autocomplete="off"><button class="pill">OK</button></form>`
      : `<a class="hint" href="#/reglages">${ICON.search}<span>Pour chercher des vidéos dans Vonia, ajoute une clé API Google dans Réglages.</span></a>`}
    ${body}`;
};

document.getElementById("view").addEventListener("submit", (e) => {
  if (e.target.id === "yt-link") { e.preventDefault(); YTube.addLink(e.target.elements.url.value); }
  if (e.target.id === "yt-search") { e.preventDefault(); const q = e.target.elements.q.value.trim(); if (q) { document.activeElement.blur(); YTube.search(q); } }
});
document.getElementById("view").addEventListener("click", async (e) => {
  let b;
  if ((b = e.target.closest("[data-ytfilter]"))) { ytFilter = b.dataset.ytfilter; return render(); }
  if (e.target.closest("[data-ytclear]")) { ytQuery = ""; YTSearchResults = []; return render(); }
  if (e.target.closest("[data-paste]")) {
    try {
      const text = await navigator.clipboard.readText();
      if (text) return YTube.addLink(text);
    } catch (err) {}
    const input = document.querySelector("#yt-link input");
    if (input && input.value) return YTube.addLink(input.value);
    toast("Colle le lien dans le champ");
    if (input) input.focus();
  }
});

// ---------- Lecteur vidéo ----------
const YTPlayer = (() => {
  let apiReady = null, yt = null, list = [], pos = 0, timer = null, session = null;
  const el = document.createElement("div");
  el.className = "vsheet";
  el.innerHTML = `<div class="full-top"><button class="iconbtn" data-vclose aria-label="Fermer">${ICON.down}</button><span>YOUTUBE</span><button class="iconbtn" data-vmore aria-label="Options">${ICON.more}</button></div>
    <div class="vframe"><div id="yt-frame"></div></div>
    <div class="vmeta"><div><div class="ft"></div><div class="fa"></div></div><button class="iconbtn fav" data-vfav aria-label="Favori"></button></div>
    <div class="ctrls"><button class="cbtn" data-vprev aria-label="Précédent">${ICON.prev}</button><button class="cbtn big" data-vplay aria-label="Lecture">${ICON.pause}</button><button class="cbtn" data-vnext aria-label="Suivant">${ICON.next}</button></div>
    <div class="section"><h2>À suivre</h2></div><div class="list vqueue"></div>`;
  document.body.appendChild(el);

  function loadAPI() {
    if (!apiReady) apiReady = new Promise((resolve, reject) => {
      window.onYouTubeIframeAPIReady = () => resolve();
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.onerror = () => { apiReady = null; reject(); };
      document.head.appendChild(s);
    });
    return apiReady;
  }

  async function saveSession() {
    if (!session || session.seconds < 1) return;
    session.counted = session.seconds >= 30;
    session.seconds = Math.round(session.seconds);
    await DB.put("plays", { ...session });
    if (currentRoute()[0] === "recap") Recap.refreshLive();
  }

  function startTimer() {
    clearInterval(timer);
    let n = 0;
    timer = setInterval(() => {
      if (!yt || !yt.getPlayerState || !session) return;
      if (yt.getPlayerState() === 1) { session.seconds += 1; if (++n % 15 === 0) saveSession(); }
    }, 1000);
  }

  async function play(p) {
    await saveSession();
    pos = p;
    let v = list[pos];
    if (!v) return;
    v = await YTube.keep(v);
    list[pos] = v;
    v.lastPlayed = Date.now();
    await Lib.saveTrack(v);
    session = { id: Date.now() * 1000 + Math.floor(Math.random() * 1000), trackId: v.id, title: v.title, artist: v.artist, genre: "", source: "youtube", at: Date.now(), seconds: 0, counted: false };
    Player.audio.pause();
    VideoPlayer.stop();
    show();
    if (yt && yt.loadVideoById) yt.loadVideoById(v.videoId);
    else {
      try { await loadAPI(); } catch (e) { toast("Connexion nécessaire pour YouTube"); return; }
      yt = new YT_API_Player(v.videoId);
    }
    startTimer();
  }

  // Création du lecteur officiel YouTube.
  function YT_API_Player(videoId) {
    return new window.YT.Player("yt-frame", {
      videoId,
      playerVars: { playsinline: 1, autoplay: 1, rel: 0, modestbranding: 1 },
      events: {
        onStateChange: (e) => {
          el.querySelector("[data-vplay]").innerHTML = e.data === 1 ? ICON.pause : ICON.play;
          if (e.data === 1) {
            const v = list[pos];
            const d = yt.getDuration ? yt.getDuration() : 0;
            if (v && d && !v.duration) { v.duration = d; Lib.saveTrack(v); }
          }
          if (e.data === 0) { if (pos + 1 < list.length) play(pos + 1); else saveSession(); }
        },
      },
    });
  }

  function show() {
    const v = list[pos];
    el.querySelector(".ft").textContent = v.title;
    el.querySelector(".fa").textContent = v.artist || "YouTube";
    const kept = Lib.byId[v.id] || v;
    el.querySelector("[data-vfav]").innerHTML = kept.fav ? ICON.heartFull : ICON.heart;
    el.querySelector("[data-vfav]").classList.toggle("on", !!kept.fav);
    const rest = list.slice(pos + 1);
    el.querySelector(".vqueue").innerHTML = rest.length ? rest.map((t) => `<div class="trk" data-vq="${t.id}">${art(t)}<div class="info"><div class="t">${esc(t.title)}</div><div class="s"><span>${esc(t.artist || "YouTube")}</span></div></div></div>`).join("") : `<p class="lead">Fin de la liste.</p>`;
    el.classList.add("open");
  }

  el.addEventListener("click", async (e) => {
    const b = (s) => e.target.closest(s);
    if (b("[data-vclose]")) return stop();
    if (b("[data-vnext]")) return pos + 1 < list.length ? play(pos + 1) : null;
    if (b("[data-vprev]")) return pos > 0 ? play(pos - 1) : yt && yt.seekTo && yt.seekTo(0);
    if (b("[data-vplay]") && yt && yt.getPlayerState) return yt.getPlayerState() === 1 ? yt.pauseVideo() : yt.playVideo();
    if (b("[data-vfav]")) {
      const v = Lib.byId[list[pos].id];
      v.fav = !v.fav;
      await Lib.saveTrack(v);
      show();
      return toast(v.fav ? "Ajouté aux favoris" : "Retiré des favoris");
    }
    if (b("[data-vmore]")) return trackMenu(Lib.byId[list[pos].id]);
    const q = b("[data-vq]");
    if (q) return play(list.findIndex((t) => t.id === q.dataset.vq));
  });

  async function stop() {
    if (!el.classList.contains("open")) return;
    clearInterval(timer);
    await saveSession();
    session = null;
    if (yt && yt.stopVideo) yt.stopVideo();
    el.classList.remove("open");
    render(true);
  }

  return {
    open(videos, start = 0) { list = videos.slice(); play(start); },
    stop,
    get current() { return el.classList.contains("open") ? list[pos] : null; },
  };
})();
