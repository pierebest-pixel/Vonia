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
