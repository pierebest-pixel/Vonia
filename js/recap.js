// Onglet Récap : statistiques d'écoute, carte « Actuellement » et récaps animés (semaine, mois, année).
"use strict";

const Recap = (() => {
  const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

  function startOf(period) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (period === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    if (period === "month") d.setDate(1);
    if (period === "year") d.setMonth(0, 1);
    return d.getTime();
  }

  // ---------- Calcul des statistiques ----------
  async function stats(period) {
    const start = startOf(period);
    const all = await DB.all("plays");
    const plays = all.filter((p) => p.at >= start);
    const before = new Set(all.filter((p) => p.at < start).map((p) => p.trackId));
    const s = { period, start, plays, seconds: 0, listens: 0, tracks: {}, artists: {}, genres: {}, hours: Array(24).fill(0), weekdays: Array(7).fill(0), months: Array(12).fill(0), days: {} };
    for (const p of plays) {
      s.seconds += p.seconds;
      if (p.counted) s.listens++;
      const tr = (s.tracks[p.trackId] = s.tracks[p.trackId] || { id: p.trackId, title: p.title, artist: p.artist, source: p.source, plays: 0, seconds: 0 });
      tr.seconds += p.seconds;
      if (p.counted) tr.plays++;
      const name = (p.artist || "").trim() || "Artiste inconnu";
      const ar = (s.artists[name] = s.artists[name] || { name, plays: 0, seconds: 0, trackIds: new Set() });
      ar.seconds += p.seconds;
      ar.trackIds.add(p.trackId);
      if (p.counted) ar.plays++;
      if (p.genre) s.genres[p.genre] = (s.genres[p.genre] || 0) + p.seconds;
      const d = new Date(p.at);
      s.hours[d.getHours()] += p.seconds;
      s.weekdays[d.getDay()] += p.seconds;
      s.months[d.getMonth()] += p.seconds;
      s.days[dayKey(p.at)] = (s.days[dayKey(p.at)] || 0) + p.seconds;
    }
    const by = (o, k) => Object.values(o).sort((a, b) => b[k] - a[k] || b.seconds - a.seconds);
    s.topTracks = by(s.tracks, "plays").filter((t) => t.seconds > 0);
    s.topArtists = by(s.artists, "seconds").filter((a) => a.name !== "Artiste inconnu" || Object.keys(s.artists).length === 1);
    s.topGenre = Object.entries(s.genres).sort((a, b) => b[1] - a[1])[0];
    s.favHour = s.hours.indexOf(Math.max(...s.hours));
    s.favDay = s.weekdays.indexOf(Math.max(...s.weekdays));
    s.discoveries = Object.keys(s.tracks).filter((id) => !before.has(id)).length;
    // Plus longue série de jours consécutifs avec de la musique.
    let best = 0, run = 0;
    for (let t = start; t <= Date.now(); t += 86400000) {
      if (s.days[dayKey(t)]) { run++; best = Math.max(best, run); } else run = 0;
    }
    s.streak = best;
    const record = Object.entries(s.days).sort((a, b) => b[1] - a[1])[0];
    s.recordDay = record ? { key: record[0], seconds: record[1] } : null;
    // Comparaisons estimées à partir d'une écoute moyenne d'environ une heure par jour.
    const elapsedDays = Math.max(1, (Date.now() - start) / 86400000);
    const perDay = s.seconds / 60 / elapsedDays;
    s.betterThan = clamp(Math.round(10 * (1 - Math.exp(-perDay / 20))), 6, 9);
    if (s.topArtists[0]) s.fanTop = clamp(Math.round(40 * Math.exp(-s.topArtists[0].seconds / 3600 / 2.5)), 1, 40);
    s.profile = profile(s);
    return s;
  }

  function profile(s) {
    const h = s.favHour;
    let name = h >= 22 || h < 4 ? ["Selector", "de minuit"] : h < 11 ? ["Lève-tôt", "du riddim"] : h < 18 ? ["Soleil de", "l'après-midi"] : ["Roi du", "warm-up"];
    const top = s.topTracks[0];
    if (top && s.listens > 10 && top.plays / s.listens > 0.25) name = ["Fidèle", "du rewind"];
    else if (Object.keys(s.artists).length >= 25) name = ["Explorateur", "sound system"];
    return name;
  }

  // ---------- Carte « Actuellement » ----------
  async function liveHTML() {
    const st = await stats("day");
    const min = st.seconds / 60;
    const titles = st.topTracks.filter((t) => t.plays > 0 || t.seconds >= 30).length;
    const last = st.plays.reduce((m, p) => Math.max(m, p.at + p.seconds * 1000), 0);
    const ago = last ? Math.round((Date.now() - last) / 60000) : null;
    const upd = ago == null ? "en attente" : ago < 1 ? "à l'instant" : `il y a ${ago < 60 ? ago + " min" : Math.round(ago / 60) + " h"}`;
    const top = min >= 1 ? `Top ${clamp(Math.round(45 * Math.exp(-min / 45)), 1, 45)}%` : "—";
    const now = YTPlayer.current || Player.track;
    const playing = YTPlayer.current || Player.playing;
    const count = now && st.tracks[now.id] ? st.tracks[now.id].plays : 0;
    return `<div class="live" id="live"><div class="hd"><span class="dot"></span>ACTUELLEMENT</div><div class="upd">${upd}</div>
      <div class="tt">Aujourd'hui</div>
      ${now ? `<div class="now">${art(now, "a")}<div><b>${esc(now.title)}</b><span>${esc(now.artist || "")}${count ? ` · ${count === 1 ? "1re" : count + "e"} écoute` : ""}</span></div>${playing ? `<div class="eqa"><i></i><i></i><i></i><i></i><i></i></div>` : ""}</div>` : ""}
      <div class="mini3"><div><b>${fmtDuration(st.seconds)}</b><span>écoutées</span></div><div><b>${titles}</b><span>titre${titles > 1 ? "s" : ""}</span></div><div><b>${top}</b><span>des auditeurs</span></div></div></div>`;
  }

  async function refreshLive() {
    const el = document.getElementById("live");
    if (el) el.outerHTML = await liveHTML();
  }

  // ---------- Onglet ----------
  async function screen() {
    const [w, m, y] = await Promise.all([stats("week"), stats("month"), stats("year")]);
    const sub = (s, empty) => (s.seconds >= 60 ? `${fmtDuration(s.seconds)} d'écoute · ${s.listens} écoute${s.listens > 1 ? "s" : ""}` : empty);
    const now = new Date();
    let deco = "";
    for (let i = 0; i < 36; i++) deco += `<rect x="-1.5" y="${-(34 + (i % 5) * 4)}" width="3" height="${10 + (i % 5) * 4}" rx="1.5" fill="${i < 12 ? "#1fb25a" : i < 24 ? "#ffd61f" : "#e63a2e"}" transform="rotate(${i * 10})"/>`;
    const record = w.recordDay ? DAYS[new Date(...w.recordDay.key.split("-").map(Number)).getDay()] : "";
    return `${header("Récap")}
      <p class="lead">Créés automatiquement à partir de ce que tu écoutes dans Vonia.</p>
      ${await liveHTML()}
      <button class="rcard month" data-recap="month"><div class="vinyl3d"></div><div class="k">CE MOIS-CI · ${MONTHS[now.getMonth()].toUpperCase()}</div><div><div class="t">Mon mois</div><div class="s">${sub(m, "Écoute de la musique pour le remplir")}</div></div><div class="go">${ICON.arrow("#1fb25a")}</div></button>
      <button class="rcard week" data-recap="week"><svg class="deco" viewBox="0 0 100 100"><g fill="rgba(11,11,12,.13)">${[10, 22, 34, 40, 30, 18, 8].map((h, i) => `<rect x="${20 + i * 10}" y="${50 - h}" width="6" height="${h * 2}" rx="3"/>`).join("")}</g></svg><div class="k">CETTE SEMAINE</div><div><div class="t">Ma semaine</div><div class="s">${w.seconds >= 60 ? `${fmtDuration(w.seconds)}${record ? " · record le " + record : ""}` : "Prêt dès ta première écoute"}</div></div><div class="go">${ICON.arrow("#ffd61f")}</div></button>
      <button class="rcard year" data-recap="year"><svg class="deco" viewBox="-60 -60 120 120">${deco}</svg><div class="k">${now.getFullYear()} · LE GRAND RÉCAP</div><div><div class="t">Mon année</div><div class="s" style="color:#bbb">${sub(y, "Avec toutes tes statistiques")}</div></div><div class="go">${ICON.arrow("#0b0b0c")}</div></button>`;
  }

  // ---------- Récap animé (façon stories) ----------
  function sunSVG(center) {
    let b = "";
    for (let i = 0; i < 48; i++) {
      const t = i / 48;
      const h = 10 + Math.abs(Math.sin(i * 1.7)) * 14 + Math.abs(Math.sin(i * 0.45)) * 12;
      b += `<rect x="-2" y="${-(70 + h).toFixed(1)}" width="4" height="${h.toFixed(1)}" rx="2" fill="${t < 1 / 3 ? "#1fb25a" : t < 2 / 3 ? "#ffd61f" : "#e63a2e"}" transform="rotate(${t * 360})"/>`;
    }
    return `<svg class="sun" viewBox="-145 -145 290 290"><g class="rays">${b}</g><circle r="64" fill="#18181a" stroke="#e8b93e" stroke-width="2"/><text y="18" text-anchor="middle" font-family="Anton" font-size="${center.length > 4 ? 38 : 50}" fill="#ffd61f">${esc(center)}</text></svg>`;
  }

  function bars(values, labels, highlight) {
    const max = Math.max(1, ...values);
    return `<div class="chart">${values.map((v, i) => `<div class="col${i === highlight ? " hi" : ""}"><i style="--h:${Math.max(3, (v / max) * 100)}%;--d:${i * 40}ms"></i><span>${labels[i]}</span></div>`).join("")}</div>`;
  }

  function slides(s) {
    const label = { week: "MA SEMAINE", month: "MON MOIS", year: "MON ANNÉE " + new Date().getFullYear() }[s.period];
    const word = { week: "cette semaine", month: "ce mois-ci", year: "cette année" }[s.period];
    const minutes = Math.round(s.seconds / 60);
    const out = [];
    out.push({ cls: "sl-intro", html: `<div class="big-k">${label}</div><div class="intro-sun">${sunSVG("VONIA")}</div><h2 class="drop">Ton récap<br><span>est prêt</span></h2><p class="fade">Touche pour avancer →</p>` });
    out.push({ cls: "sl-minutes", html: `<div class="orb"></div><div class="ring"></div><div class="bigbox"><div class="n" data-count="${minutes}">0</div><div class="u">MINUTES D'ÉCOUTE</div>
      <div class="x fade">Soit <b>${minutes >= 1440 ? fmtNum(minutes / 1440) + " jour" + (minutes >= 2880 ? "s" : "") : fmtDuration(s.seconds)}</b> de musique ${word}.</div><div class="cmp pop">Tu écoutes plus que ${s.betterThan} personne${s.betterThan > 1 ? "s" : ""} sur 10</div></div>` });
    const ta = s.topArtists[0];
    if (ta) {
      const tTrack = s.topTracks.find((t) => (t.artist || "Artiste inconnu") === ta.name);
      const cover = tTrack && Lib.byId[tTrack.id] ? coverURL(Lib.byId[tTrack.id]) : "";
      out.push({ cls: "sl-artist", html: `<div class="k">TON ARTISTE N°1</div><div class="name">${esc(ta.name).split("").map((c, i) => `<span style="--i:${i}">${c === " " ? "&nbsp;" : c}</span>`).join("")}</div>
        <div class="photo" style="${cover ? `background-image:url('${cover}')` : `background:${gradientFor(ta.name)}`}">${cover ? "" : '<div class="silhouette"></div>'}</div>
        <div class="stats3"><div class="pop" style="--d:0s"><b>${ta.plays}</b><span>écoutes</span></div><div class="pop" style="--d:.15s"><b>${fmtDuration(ta.seconds)}</b><span>ensemble</span></div><div class="pop" style="--d:.3s"><b>Top ${s.fanTop}%</b><span>de ses fans</span></div></div>` });
    }
    if (s.topArtists.length > 1) {
      out.push({ cls: "sl-list sl-artists", html: `<div class="k">TES ARTISTES</div><h2 class="h">Top ${Math.min(5, s.topArtists.length)}</h2><div class="rows">${s.topArtists.slice(0, 5).map((a, i) => `<div class="row" style="--d:${(4 - i) * 0.12}s"><div class="n">${i + 1}</div><div class="av" style="background:${gradientFor(a.name)}">${esc(a.name.charAt(0).toUpperCase())}</div><div class="tx"><div class="t">${esc(a.name)}</div><div class="s">${a.trackIds.size} titre${a.trackIds.size > 1 ? "s" : ""}</div></div><div class="p">${fmtDuration(a.seconds)}</div></div>`).join("")}</div>` });
    }
    if (s.topTracks.length) {
      out.push({ cls: "sl-list sl-tracks", html: `<div class="k">TES TITRES</div><h2 class="h">Top ${Math.min(5, s.topTracks.length)}</h2><div class="rows">${s.topTracks.slice(0, 5).map((t, i) => `<div class="row" style="--d:${(4 - i) * 0.12}s">${art(Lib.byId[t.id] || t, "a")}<div class="n">${i + 1}</div><div class="tx"><div class="t">${esc(t.title)}</div><div class="s">${esc(t.artist || "")}</div></div><div class="p">${t.plays}×</div></div>`).join("")}</div>` });
    }
    const hLabels = Array.from({ length: 24 }, (_, i) => (i % 6 === 0 ? i + "h" : ""));
    out.push({ cls: "sl-moments", html: `<div class="k">TES MOMENTS</div><h2 class="h">À ${s.favHour} h<br><span>tu montes le son</span></h2>${bars(s.hours, hLabels, s.favHour)}
      <div class="chips2 fade"><div>Jour favori <b>${DAYS[s.favDay]}</b></div>${s.recordDay ? `<div>Record <b>${fmtDuration(s.recordDay.seconds)}</b> en un jour</div>` : ""}</div>` });
    if (s.period === "year") {
      out.push({ cls: "sl-moments", html: `<div class="k">TON ANNÉE</div><h2 class="h">${MONTHS[s.months.indexOf(Math.max(...s.months))]}<br><span>ton mois le plus chaud</span></h2>${bars(s.months, MONTHS.map((m) => m.charAt(0).toUpperCase()), s.months.indexOf(Math.max(...s.months)))}` });
    } else {
      out.push({ cls: "sl-moments", html: `<div class="k">TA SEMAINE TYPE</div><h2 class="h">Le ${DAYS[s.favDay]}<br><span>c'est ton jour</span></h2>${bars([1, 2, 3, 4, 5, 6, 0].map((d) => s.weekdays[d]), ["L", "M", "M", "J", "V", "S", "D"], (s.favDay + 6) % 7)}` });
    }
    out.push({ cls: "sl-numbers", html: `<div class="k">EN CHIFFRES</div><h2 class="h">Ton ${s.period === "week" ? "semaine" : s.period === "month" ? "mois" : "année"}<br><span>en vrac</span></h2>
      <div class="grid4">${[[s.discoveries, "découvertes"], [s.streak, "jours de série"], [Object.keys(s.artists).length, "artistes"], [s.listens, "écoutes"]].map(([n, l], i) => `<div class="pop" style="--d:${i * 0.12}s"><b data-count="${n}">0</b><span>${l}</span></div>`).join("")}</div>
      ${s.topGenre ? `<div class="genre fade">Genre n°1 : <b>${esc(s.topGenre[0])}</b></div>` : ""}` });
    out.push({ cls: "sl-profile", html: `<div class="pro-sun">${sunSVG(s.period === "year" ? String(new Date().getFullYear()) : s.period === "month" ? MONTHS[new Date().getMonth()].slice(0, 4).toUpperCase() : "SEM.")}</div><div class="k">TON PROFIL D'ÉCOUTE</div><div class="p drop">${esc(s.profile[0])}<br><span>${esc(s.profile[1])}</span></div>
      <div class="chips2">${[["Heure favorite", s.favHour + " h"], ["Jour favori", DAYS[s.favDay]], ["Série", s.streak + " jour" + (s.streak > 1 ? "s" : "")], ["Découvertes", s.discoveries]].map(([a, b], i) => `<div class="pop" style="--d:${0.4 + i * 0.12}s">${a} <b>${esc(b)}</b></div>`).join("")}</div>
      <button class="share" data-share>${ICON.share} Partager mon récap</button>` });
    return { label, list: out };
  }

  function shareText(s) {
    const lines = [`Mon récap Vonia (${{ week: "semaine", month: "mois", year: "année " + new Date().getFullYear() }[s.period]})`, `${fmtNum(s.seconds / 60)} minutes d'écoute`];
    if (s.topArtists[0]) lines.push(`Artiste n°1 : ${s.topArtists[0].name}`);
    if (s.topTracks[0]) lines.push(`Titre n°1 : ${s.topTracks[0].title}`);
    lines.push(`Profil : ${s.profile.join(" ")}`);
    return lines.join("\n");
  }

  async function open(period) {
    const s = await stats(period);
    if (s.seconds < 60) return toast("Pas encore assez d'écoutes pour ce récap");
    const { label, list } = slides(s);
    const o = overlay(`<div class="story"><div class="bars">${list.map(() => "<i><b></b></i>").join("")}</div>
      <div class="stop"><span>${label}</span><button data-sclose aria-label="Fermer">${ICON.close}</button></div><div class="stage"></div></div>`, "ov-story");
    const stage = o.querySelector(".stage");
    const barEls = [...o.querySelectorAll(".bars i")];
    let i = -1, timer = null, startAt = 0, elapsed = 0, paused = false;
    const DURATION = 7000;

    function show(n) {
      if (n < 0) n = 0;
      if (n >= list.length) return close();
      i = n;
      elapsed = 0;
      startAt = performance.now();
      stage.className = "stage " + list[i].cls;
      stage.innerHTML = `<div class="slide">${list[i].html}</div>`;
      barEls.forEach((b, k) => { b.className = k < i ? "d" : ""; b.firstChild.style.width = k < i ? "100%" : "0"; });
      stage.querySelectorAll("[data-count]").forEach(countUp);
    }
    function countUp(el) {
      const to = +el.dataset.count, t0 = performance.now(), dur = 1400;
      const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = fmtNum(to * (1 - Math.pow(1 - k, 3))); if (k < 1 && el.isConnected) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
    function tick() {
      if (!o.isConnected) return;
      if (!paused) {
        const p = Math.min(1, (elapsed + performance.now() - startAt) / DURATION);
        if (barEls[i]) barEls[i].firstChild.style.width = p * 100 + "%";
        if (p >= 1 && i < list.length - 1) show(i + 1);
      }
      timer = requestAnimationFrame(tick);
    }
    function close() { cancelAnimationFrame(timer); closeOverlay(o); }

    o.addEventListener("click", async (e) => {
      if (e.target.closest("[data-sclose]")) return close();
      if (e.target.closest("[data-share]")) {
        const text = shareText(s);
        try {
          if (navigator.share) await navigator.share({ title: "Mon récap Vonia", text });
          else { await navigator.clipboard.writeText(text); toast("Récap copié"); }
        } catch (err) {}
        return;
      }
      if (e.target.closest(".stop")) return;
      if (e.clientX < window.innerWidth / 3) show(i - 1); else show(i + 1);
    });
    // Rester appuyé met en pause, comme les stories.
    o.addEventListener("pointerdown", () => { paused = true; elapsed += performance.now() - startAt; });
    o.addEventListener("pointerup", () => { paused = false; startAt = performance.now(); });
    o.addEventListener("pointercancel", () => { paused = false; startAt = performance.now(); });
    show(0);
    tick();
  }

  document.getElementById("view").addEventListener("click", (e) => {
    const b = e.target.closest("[data-recap]");
    if (b) open(b.dataset.recap);
  });

  return { screen, refreshLive, stats, open };
})();

Screens.recap = () => Recap.screen();
