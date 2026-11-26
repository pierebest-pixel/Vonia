// Vonia : navigation, onglet Réglages (avec le lien Notube), démarrage.
"use strict";

const APP_VERSION = "1.2";
const NOTUBE_URL = "https://notube.lol/fr/youtube-app-467";
const ANIME_URL = "https://voiranime.rip/";
const TABS = ["ecouter", "youtube", "videos", "recap", "reglages"];
const view = document.getElementById("view");

function currentRoute() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (!TABS.includes(parts[0])) parts[0] = "ecouter";
  return parts;
}

let renderToken = 0;
async function render(keepScroll = false) {
  const token = ++renderToken;
  const [tab, ...sub] = currentRoute();
  const y = window.scrollY;
  let html;
  try { html = await Screens[tab](sub); } catch (e) { console.error(e); html = `${header("Vonia")}<p class="lead">Une erreur est survenue.</p>`; }
  if (token !== renderToken) return;
  view.innerHTML = `<div class="page${keepScroll ? " still" : ""}">${html}</div>`;
  document.querySelectorAll(".tab").forEach((a) => a.classList.toggle("on", a.dataset.tab === tab));
  window.scrollTo(0, keepScroll ? y : 0);
}
window.addEventListener("hashchange", () => render());

// ---------- Notube (depuis Réglages) ----------
function openNotube() { window.open(NOTUBE_URL, "_blank", "noopener"); }

// ---------- Réglages ----------
Screens.reglages = async () => {
  let used = "";
  try {
    const est = await navigator.storage.estimate();
    used = est.usage ? (est.usage / 1048576 >= 1024 ? (est.usage / 1073741824).toFixed(1) + " Go" : Math.round(est.usage / 1048576) + " Mo") : "";
  } catch (e) {}
  const plays = await DB.all("plays");
  const pseudo = settings.get("pseudo");
  const key = settings.get("ytkey");
  return `${header("Réglages", false)}
    <div class="group-title">Profil</div>
    <div class="group"><button class="cell" data-set="pseudo"><span class="ic" style="background:var(--gold);color:#141000">${ICON.user}</span>Pseudo<span class="val">${esc(pseudo || "Non défini")}</span></button></div>

    <div class="group-title">YouTube</div>
    <div class="group">
      <button class="cell" data-set="ytkey"><span class="ic" style="background:var(--red)">${ICON.key}</span>Clé API pour la recherche<span class="val">${key ? "Ajoutée" : "Aucune"}</span></button>
      <button class="cell" data-set="ythelp"><span class="ic" style="background:#3a3a3e">${ICON.info}</span>Comment obtenir une clé</button>
    </div>

    <div class="group-title">Liens</div>
    <div class="group">
      <button class="cell" data-notube><span class="ic" style="background:#fff;color:#0b0b0c">${ICON.out}</span>Notube<span class="val">Ouvrir dans Safari</span></button>
    </div>
    <div class="group">
          <button class="cell" data-link="${ANIME_URL}"><span class="ic" style="background:#fff">${ICON.out}</span>AnimeSama<span class="val">Ouvrir dans Safari</span></button>
    </div>
    <p class="group-note">Télécharge sur Notube, puis ajoute le fichier dans Écouter (MP3) ou Vidéos (MP4).</p>

    <div class="group-title">Bibliothèque</div>
    <div class="group">
      <div class="cell"><span class="ic" style="background:var(--green)">${ICON.note}</span>Morceaux<span class="val">${Lib.files().length}</span></div>
      <div class="cell"><span class="ic" style="background:var(--red)">${ICON.video}</span>Vidéos YouTube<span class="val">${Lib.videos().length}</span></div>
      <div class="cell"><span class="ic" style="background:var(--gold);color:#141000">${ICON.film}</span>Vidéos MP4<span class="val">${Lib.mp4s().length}</span></div>
      <div class="cell"><span class="ic" style="background:#3a3a3e">${ICON.disk}</span>Espace utilisé<span class="val">${used || "—"}</span></div>
      <div class="cell"><span class="ic" style="background:#3a3a3e">${ICON.list}</span>Écoutes enregistrées<span class="val">${fmtNum(plays.length)}</span></div>
    </div>
    <div class="group">
      <button class="cell danger" data-set="clearplays"><span class="ic" style="background:#3a1512;color:#ff5a4f">${ICON.trash}</span>Effacer l'historique d'écoute</button>
      <button class="cell danger" data-set="clearall"><span class="ic" style="background:#3a1512;color:#ff5a4f">${ICON.trash}</span>Tout effacer</button>
    </div>

    <div class="group-title">Application</div>
    <div class="group">
      <button class="cell" data-set="update"><span class="ic" style="background:var(--green)">${ICON.refresh}</span>Rechercher des mises à jour</button>
      <div class="cell"><span class="ic" style="background:#3a3a3e">${ICON.info}</span>Version<span class="val">${APP_VERSION}</span></div>
    </div>
    <div class="about"><img src="icons/icon-192.png" alt="">Vonia ${APP_VERSION}<br>Ta musique, tes vidéos, tes récaps.<br><span class="small">Les comparaisons avec les autres auditeurs sont des estimations.</span></div>`;
};

async function settingsAction(k) {
  if (k === "pseudo") {
    const r = await ask("Ton pseudo", [{ name: "v", label: "Pseudo", value: settings.get("pseudo"), placeholder: "Selecta" }], "Enregistrer");
    if (r) { settings.set("pseudo", r.v); render(true); }
  }
  if (k === "ytkey") {
    const r = await ask("Clé API YouTube", [{ name: "v", label: "Clé (commence par AIza…)", value: settings.get("ytkey"), placeholder: "AIza…" }], "Enregistrer");
    if (r) { settings.set("ytkey", r.v); toast(r.v ? "Recherche YouTube activée" : "Clé retirée"); render(true); }
  }
  if (k === "ythelp") {
    const o = overlay(`<div class="dialog"><div class="dialog-title">Obtenir une clé API YouTube</div><ol class="howto">
      <li>Sur un ordinateur, va sur <b>console.cloud.google.com</b> et connecte-toi avec ton compte Google.</li>
      <li>Crée un projet (par exemple « Vonia »).</li>
      <li>Dans « API et services → Bibliothèque », active <b>YouTube Data API v3</b>.</li>
      <li>Dans « Identifiants », clique sur <b>Créer des identifiants → Clé API</b> et copie la clé.</li>
      <li>Colle-la ici, dans « Clé API pour la recherche ».</li></ol>
      <p class="small">C'est gratuit : environ 100 recherches par jour.</p>
      <div class="dialog-btns"><button class="btn" data-cancel>Compris</button></div></div>`, "ov-dialog");
    o.addEventListener("click", (e) => { if (e.target.closest("[data-cancel]") || e.target === o) closeOverlay(o); });
  }
  if (k === "clearplays" && (await confirmBox("Effacer tout l'historique d'écoute ? Les récaps repartiront de zéro.", "Effacer"))) {
    const plays = await DB.all("plays");
    for (const p of plays) await DB.del("plays", p.id);
    toast("Historique effacé");
    render(true);
  }
  if (k === "clearall" && (await confirmBox("Tout effacer ? Ta musique, tes vidéos, tes playlists et tes écoutes seront supprimées.", "Tout effacer"))) {
    YTPlayer.stop();
    VideoPlayer.stop();
    Player.audio.pause();
    try { localStorage.removeItem("vonia.resume"); } catch (e) {}
    indexedDB.deleteDatabase("vonia");
    toast("Vonia est vide");
    setTimeout(() => location.reload(), 900);
  }
  if (k === "update") checkUpdate();
}

async function checkUpdate() {
  if (!("serviceWorker" in navigator)) return toast("Mises à jour indisponibles ici");
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return toast("Vonia est à jour");
  try { await reg.update(); } catch (e) { return toast("Pas de connexion"); }
  if (reg.installing || reg.waiting) {
    toast("Nouvelle version : redémarrage…");
    setTimeout(() => location.reload(), 1500);
  } else toast("Vonia est à jour");
}

view.addEventListener("click", (e) => {
  let b;
  if (e.target.closest("[data-notube]")) return openNotube();
  if ((b = e.target.closest("[data-link]"))) { const w = window.open(b.dataset.link, "_blank"); if (w) w.opener = null; return; }
  if ((b = e.target.closest("[data-set]"))) return settingsAction(b.dataset.set);
});

// ---------- Démarrage ----------
(async () => {
  if (!location.hash) history.replaceState(null, "", "#/ecouter");
  try {
    await Lib.load();
    await Player.restore(Lib.byId);
  } catch (e) { console.error(e); }
  await render();
  setTimeout(() => document.getElementById("splash").classList.add("out"), 500);
})();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
