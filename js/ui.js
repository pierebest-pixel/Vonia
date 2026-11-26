// Outils d'interface partagés : icônes, pochettes, messages, menus et formulaires.
"use strict";

const Screens = {};

function header(title, withAvatar = true) {
  const name = settings.get("pseudo");
  const initial = (name || "V").charAt(0).toUpperCase();
  return `<div class="header"><div><h1 class="title">${esc(title)}</h1><div class="rasta"><i></i><i></i><i></i></div></div>${withAvatar ? `<a class="avatar" href="#/reglages">${esc(initial)}</a>` : ""}</div>`;
}

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m >= 60) return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtDuration(sec) {
  const min = Math.round((sec || 0) / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

const fmtNum = (n) => Math.round(n).toLocaleString("fr-FR");

const ICON = {
  arrow: (c) => `<svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  note: `<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="17" cy="16" r="3" fill="currentColor"/></svg>`,
  video: `<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>`,
  plus: `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  link: `<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  out: `<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  info: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  play: `<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>`,
  pause: `<svg viewBox="0 0 24 24"><rect x="6" y="4.5" width="4.2" height="15" rx="1.3" fill="currentColor"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.3" fill="currentColor"/></svg>`,
  next: `<svg viewBox="0 0 24 24"><path d="M4 5v14l10-7zM14 5v14l8-7z" fill="currentColor"/></svg>`,
  prev: `<svg viewBox="0 0 24 24"><path d="M20 5v14L10 12zM10 5v14l-8-7z" fill="currentColor"/></svg>`,
  shuffle: `<svg viewBox="0 0 24 24"><path d="M3 7h3.5c2 0 3.2 1 4.3 2.6l2.4 3.8c1.1 1.6 2.3 2.6 4.3 2.6H21M3 17h3.5c1.5 0 2.5-.5 3.3-1.4M14.2 8.4c.8-.9 1.8-1.4 3.3-1.4H21M18 4l3 3-3 3M18 14l3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  repeat: `<svg viewBox="0 0 24 24"><path d="M4 11V9a3 3 0 013-3h12M16 3l3 3-3 3M20 13v2a3 3 0 01-3 3H5M8 21l-3-3 3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  down: `<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  back: `<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  more: `<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.9" fill="currentColor"/><circle cx="12" cy="12" r="1.9" fill="currentColor"/><circle cx="19" cy="12" r="1.9" fill="currentColor"/></svg>`,
  heart: `<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-9.3-9.2C1.4 7.4 3.6 4 7 4c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8C19.5 15.4 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/></svg>`,
  heartFull: `<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-9.3-9.2C1.4 7.4 3.6 4 7 4c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8C19.5 15.4 12 20 12 20z" fill="currentColor"/></svg>`,
  search: `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  list: `<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  trash: `<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  key: `<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  user: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M4 21a8 8 0 0116 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  disk: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="8" ry="3" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>`,
  share: `<svg viewBox="0 0 24 24"><path d="M12 3v13M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  film: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2.1"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" stroke="currentColor" stroke-width="2"/></svg>`,
  image: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2.1"/><circle cx="9" cy="10" r="2" fill="currentColor"/><path d="M4 18l5-5 4 4 3-3 4 4" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/></svg>`,
  close: `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  edit: `<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>`,
};

// Pochettes : image du fichier, miniature YouTube, ou dégradé aux couleurs reggae.
const GRADIENTS = [
  "linear-gradient(135deg,#1fb25a,#0b6b31)", "linear-gradient(135deg,#e63a2e,#7d120c)",
  "linear-gradient(135deg,#ffd61f,#f2a900)", "linear-gradient(135deg,#0b6b31,#ffd61f)",
  "linear-gradient(135deg,#e63a2e,#ffd61f)", "linear-gradient(135deg,#1fb25a,#e63a2e)",
];
function gradientFor(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}
const coverCache = new Map();
function coverURL(track) {
  if (!track) return "";
  if (track.thumb && !track.customCover) return track.thumb;
  if (!track.cover) return "";
  if (!coverCache.has(track.id)) coverCache.set(track.id, URL.createObjectURL(track.cover));
  return coverCache.get(track.id);
}
function art(track, cls = "art") {
  const url = coverURL(track);
  if (url) return `<div class="${cls}" style="background-image:url('${url}')"></div>`;
  if (track && track.source === "mp4") return `<div class="${cls} has-cov">${filmCover()}</div>`;
  if (track && !track.trackIds && track.source !== "youtube" && track.title) return `<div class="${cls} has-cov">${paintedCover(track.title, track.artist)}</div>`;
  return `<div class="${cls}" style="background:${gradientFor(track ? track.id : "x")}">${track && track.source === "youtube" ? ICON.video : track && track.source === "mp4" ? ICON.film : track && track.trackIds ? ICON.list : ICON.note}</div>`;
}

function toast(text, ms = 2400) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = text;
  t.style.animationDuration = ms + "ms";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms + 100);
  return t;
}

function overlay(html, cls) {
  const o = document.createElement("div");
  o.className = "overlay " + cls;
  o.innerHTML = html;
  document.body.appendChild(o);
  requestAnimationFrame(() => o.classList.add("in"));
  return o;
}
function closeOverlay(o) {
  o.classList.remove("in");
  setTimeout(() => o.remove(), 260);
}

// Menu d'actions façon iOS. actions = [{ key, label, danger? }]
function sheet(title, actions) {
  return new Promise((resolve) => {
    const o = overlay(`<div class="sheet">${title ? `<div class="sheet-title">${esc(title)}</div>` : ""}
      ${actions.map((a) => `<button class="sheet-btn${a.danger ? " danger" : ""}" data-k="${esc(a.key)}">${esc(a.label)}</button>`).join("")}
      <button class="sheet-btn cancel" data-k="">Annuler</button></div>`, "ov-sheet");
    o.addEventListener("click", (e) => {
      const b = e.target.closest("[data-k]");
      if (!b && e.target.closest(".sheet")) return;
      closeOverlay(o);
      resolve(b && b.dataset.k ? b.dataset.k : null);
    });
  });
}

// Petit formulaire. fields = [{ name, label, value, placeholder }]
function ask(title, fields, okLabel = "OK") {
  return new Promise((resolve) => {
    const o = overlay(`<form class="dialog"><div class="dialog-title">${esc(title)}</div>
      ${fields.map((f) => `<label class="field"><span>${esc(f.label)}</span><input name="${esc(f.name)}" value="${esc(f.value || "")}" placeholder="${esc(f.placeholder || "")}" autocomplete="off" ${f.type ? `type="${f.type}"` : ""}></label>`).join("")}
      <div class="dialog-btns"><button type="button" class="btn ghost" data-cancel>Annuler</button><button class="btn">${esc(okLabel)}</button></div></form>`, "ov-dialog");
    const form = o.querySelector("form");
    setTimeout(() => { const i = form.querySelector("input"); if (i) i.focus(); }, 280);
    const done = (val) => { closeOverlay(o); resolve(val); };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const out = {};
      fields.forEach((f) => { out[f.name] = form.elements[f.name].value.trim(); });
      done(out);
    });
    o.addEventListener("click", (e) => { if (e.target.closest("[data-cancel]") || e.target === o) done(null); });
  });
}

async function confirmBox(title, label = "Supprimer") {
  return (await sheet(title, [{ key: "ok", label, danger: true }])) === "ok";
}

const settings = {
  get(k, d = "") { try { const v = localStorage.getItem("vonia." + k); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("vonia." + k, v); } catch (e) {} },
};

// Choisir une image (Photos ou Fichiers), recadrée en carré et allégée.
function pickImage() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.hidden = true;
    document.body.appendChild(input);
    let done = false;
    const finish = (v) => { if (done) return; done = true; input.remove(); resolve(v); };
    input.addEventListener("cancel", () => finish(null));
    input.addEventListener("change", async () => {
      const f = input.files[0];
      if (!f) return finish(null);
      try { finish(await squareImage(f, 600)); } catch (e) { toast("Image illisible"); finish(null); }
    });
    input.click();
  });
}

async function squareImage(blob, size) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const c = document.createElement("canvas");
    c.width = c.height = Math.min(size, side);
    c.getContext("2d").drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob(res, "image/jpeg", 0.85));
  } finally { URL.revokeObjectURL(url); }
}

// ---------- Pochettes par défaut ----------
// Musique sans pochette : coucher de soleil peint, musicien en ombre chinoise, titre écrit au pinceau.
// Vidéo sans image : pellicule avec le soleil vert, or et rouge.
let coverSeq = 0;
const coverHash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const coverFit = (t, max, base, k) => Math.min(base, max / (Math.max(5, t.length) * k));
const coverRough = (id, seed, f, sc) => `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="${f}" numOctaves="3" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="${sc}"/></filter>`;
const coverPaper = (id, seed) => `<filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="3" seed="${seed}"/><feColorMatrix values="0 0 0 0 .25  0 0 0 0 .2  0 0 0 0 .12  0 0 0 .55 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;

function paintedCover(title, artist) {
  const k = "pc" + coverSeq++;
  const h = coverHash(title), s = h % 89;
  const sky = [["#f6c35b", "#e8743b", "#a33a4f", "#3b2a4f"], ["#f9d77e", "#ef8f4a", "#c9483f", "#4a2238"], ["#f4b860", "#d9603b", "#7d2e57", "#22304f"]][h % 3];
  const ink = "#0f1f1a";
  return `<svg class="cov" viewBox="0 0 100 100" aria-hidden="true"><defs>${coverRough("r" + k, s, 0.03, 7)}${coverRough("rr" + k, s + 5, 0.08, 3)}${coverPaper("p" + k, s)}
    <linearGradient id="s${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[3]}"/><stop offset=".35" stop-color="${sky[2]}"/><stop offset=".62" stop-color="${sky[1]}"/><stop offset=".72" stop-color="${sky[0]}"/></linearGradient>
    <filter id="soft${k}"><feGaussianBlur stdDeviation="1.6"/></filter></defs>
    <rect width="100" height="100" fill="url(#s${k})"/>
    <g filter="url(#r${k})">${[12, 20, 28, 36, 44].map((y, i) => `<path d="M-5 ${y + (h % 5)} C20 ${y - 3} 45 ${y + 4} 70 ${y} S100 ${y + 3} 106 ${y - 1}" stroke="${sky[i % 2 ? 2 : 1]}" stroke-width="${3 + (i % 3)}" fill="none" opacity=".35" stroke-linecap="round"/>`).join("")}</g>
    <circle cx="${30 + (h % 14)}" cy="60" r="13" fill="#fff1c4" filter="url(#soft${k})" opacity=".95"/>
    <g filter="url(#r${k})"><path d="M-5 66 C25 63 75 64 105 66 L105 105 L-5 105Z" fill="#163c4d"/>
      ${[70, 75, 81, 88].map((y, i) => `<path d="M${24 + i * 3 + (h % 8)} ${y} h${26 - i * 5}" stroke="#f6c35b" stroke-width="${1.3 - i * 0.2}" opacity=".8" stroke-linecap="round"/>`).join("")}
      <path d="M-5 70 C10 60 22 58 34 66 C26 66 14 68 -5 76Z" fill="${ink}"/></g>
    <g filter="url(#rr${k})" fill="${ink}" stroke="${ink}" stroke-linecap="round">
      <path d="M67 78 L49 63" stroke-width="1.9" fill="none"/><path d="M48 62.2 l-3 -2.2 l1 -1.6 l3.2 2.2z" stroke-width=".6"/>
      <ellipse cx="66" cy="80" rx="7" ry="5.3" transform="rotate(-38 66 80)" stroke="none"/><ellipse cx="70.5" cy="84" rx="8" ry="6.2" transform="rotate(-38 70.5 84)" stroke="none"/>
      <path d="M70 58 C66 62 61 66 57 69" stroke-width="2.6" fill="none"/>
      <path d="M71 57 C73 53 84 53 86 57 L89 72 L91 106 L67 106 L68.5 72Z" stroke="none"/>
      <rect x="76" y="48" width="5" height="6" rx="1.5" stroke="none"/><circle cx="78.5" cy="45.5" r="4.3" stroke="none"/>
      <path d="M71.5 44 C69.5 36.5 78 32.5 84.5 34.5 C90 36.5 90 42 87 44.5 C82 42.5 76 42.3 71.5 44Z" stroke="none"/>
      <path d="M73 44 C71.5 49 71 54 71.8 60 M75.5 46 C74.5 51 74.4 56 75.2 61 M82.5 46 C83.6 51 84 56 83.4 61 M85.3 44.5 C87 49 87.6 54 87 59.5" stroke-width="1.7" fill="none"/>
    </g>
    <text x="50" y="92" text-anchor="middle" font-family="Brush, Rubik, sans-serif" font-size="${coverFit(title, 90, 15, 0.42).toFixed(1)}" fill="#fff8e6" opacity=".95">${esc(title)}</text>
    ${artist ? `<text x="50" y="12" text-anchor="middle" font-family="Brush, Rubik, sans-serif" font-size="7" fill="#fff8e6" opacity=".85">${esc(artist)}</text>` : ""}
    <rect width="100" height="100" filter="url(#p${k})" opacity=".55"/></svg>`;
}

function filmCover() {
  const k = "fc" + coverSeq++;
  const G = "#1fb25a", Y = "#ffd61f", R = "#e63a2e";
  let rays = "";
  for (let i = 0; i < 24; i++) {
    const t = i / 24, h = 5 * (0.55 + 0.45 * Math.abs(Math.sin(i * 1.7)));
    rays += `<rect x="-.6" y="${-(6 + h)}" width="1.2" height="${h}" rx=".6" fill="${t < 1 / 3 ? G : t < 2 / 3 ? Y : R}" transform="rotate(${t * 360})"/>`;
  }
  const holes = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${12 + i * 10.2}" y="29" width="5" height="4" rx="1" fill="#3a3a3e"/><rect x="${12 + i * 10.2}" y="67" width="5" height="4" rx="1" fill="#3a3a3e"/>`).join("");
  return `<svg class="cov" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><radialGradient id="bg${k}" cx=".5" cy="0" r="1.1"><stop offset="0" stop-color="#2c2c30"/><stop offset=".75" stop-color="#0b0b0c"/></radialGradient>
    <linearGradient id="gd${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff5cc"/><stop offset=".3" stop-color="#f3c64f"/><stop offset=".55" stop-color="#a8740c"/><stop offset=".8" stop-color="#f7d675"/><stop offset="1" stop-color="#7a5006"/></linearGradient></defs>
    <rect x="-30" width="160" height="100" fill="url(#bg${k})"/>
    <g transform="rotate(-8 50 50)"><rect x="8" y="26" width="84" height="48" rx="4" fill="#141416" stroke="#2c2c30"/>${holes}
      <rect x="14" y="36" width="20" height="28" rx="2" fill="#222226"/><rect x="66" y="36" width="20" height="28" rx="2" fill="#222226"/>
      <rect x="38" y="36" width="24" height="28" rx="2" fill="#2a2010"/><g transform="translate(50 50)">${rays}<circle r="5" fill="url(#gd${k})"/></g></g></svg>`;
}
