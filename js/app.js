// Vonia : navigation entre les onglets et écrans de base.
"use strict";

const APP_VERSION = "0.1";
const NOTUBE_URL = "https://notube.lol/fr/youtube-app-467";
const TABS = ["ecouter", "youtube", "recap", "notube", "reglages"];

const view = document.getElementById("view");

// ---------- Petits outils ----------
const icons = {
  arrow: (c) => `<svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  note: `<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="17" cy="16" r="3" fill="currentColor"/></svg>`,
  play: `<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>`,
  plus: `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  link: `<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  out: `<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  info: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
};

function header(title, withAvatar = true) {
  return `<div class="header"><div><h1 class="title">${title}</h1><div class="rasta"><i></i><i></i><i></i></div></div>${withAvatar ? '<div class="avatar">V</div>' : ""}</div>`;
}

function toast(text) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function openNotube() {
  // Le site ne peut pas s'afficher dans l'appli : il s'ouvre dans Safari.
  window.open(NOTUBE_URL, "_blank", "noopener");
}

// ---------- Écrans ----------
const screens = {
  ecouter() {
    return `${header("Vonia")}
      <div class="chips"><div class="chip on">Tout</div><div class="chip">Mes fichiers</div><div class="chip">YouTube</div><div class="chip">Playlists</div></div>
      <div class="empty">
        <div class="art" style="background:linear-gradient(135deg,#1fb25a,#0b6b31)">${icons.note}</div>
        <div class="soon">ÉTAPE 2</div>
        <h3>Ta musique ici</h3>
        <p>Ajoute tes fichiers audio depuis l'iPhone : ils se liront même sans connexion, avec playlists et lecteur.</p>
        <button class="btn" data-soon="L'import de musique arrive à l'étape 2">${icons.plus} Ajouter de la musique</button>
      </div>`;
  },

  youtube() {
    return `${header("YouTube")}
      <div class="empty">
        <div class="art" style="background:linear-gradient(135deg,#e63a2e,#7d120c)">${icons.play}</div>
        <div class="soon">ÉTAPE 3</div>
        <h3>Colle un lien</h3>
        <p>Colle le lien d'une vidéo YouTube pour la regarder ici, l'ajouter à tes favoris ou à une playlist.</p>
        <button class="btn" data-soon="YouTube arrive à l'étape 3">${icons.link} Coller un lien</button>
      </div>`;
  },

  recap() {
    const deco = (() => {
      let b = "";
      for (let i = 0; i < 36; i++) {
        const c = i < 12 ? "#1fb25a" : i < 24 ? "#ffd61f" : "#e63a2e";
        b += `<rect x="-1.5" y="${-(34 + (i % 5) * 4)}" width="3" height="${10 + (i % 5) * 4}" rx="1.5" fill="${c}" transform="rotate(${i * 10})"/>`;
      }
      return `<svg class="deco" viewBox="-60 -60 120 120">${b}</svg>`;
    })();
    const now = new Date();
    const month = now.toLocaleDateString("fr-FR", { month: "long" }).toUpperCase();
    return `${header("Récap")}
      <p class="lead">Créés automatiquement à partir de ce que tu écoutes dans Vonia.</p>
      <div class="live">
        <div class="hd"><span class="dot"></span>ACTUELLEMENT</div><div class="upd">en attente</div>
        <div class="tt">Aujourd'hui</div>
        <div class="mini"><div><b>0 min</b><span>écoutées</span></div><div><b>0</b><span>titres</span></div><div><b>—</b><span>classement</span></div></div>
      </div>
      <a class="rcard month" data-soon="Les récaps animés arrivent à l'étape 5"><div class="vinyl3d"></div><div class="k">CE MOIS-CI · ${month}</div><div><div class="t">Mon mois</div><div class="s">Écoute de la musique pour le remplir</div></div><div class="go">${icons.arrow("#1fb25a")}</div></a>
      <a class="rcard week" data-soon="Les récaps animés arrivent à l'étape 5"><div class="k">CETTE SEMAINE</div><div><div class="t">Ma semaine</div><div class="s">Prêt dès ta première écoute</div></div><div class="go">${icons.arrow("#ffd61f")}</div></a>
      <a class="rcard year" data-soon="Les récaps animés arrivent à l'étape 5">${deco}<div class="k">${now.getFullYear()} · LE GRAND RÉCAP</div><div><div class="t">Mon année</div><div class="s" style="color:#bbb">Avec toutes tes statistiques</div></div><div class="go">${icons.arrow("#0b0b0c")}</div></a>`;
  },

  notube() {
    return `${header("Notube")}
      <div class="notube-hero">
        <span class="k">SITE EXTERNE</span>
        <h3>Ouvrir Notube</h3>
        <p>Le site s'ouvre dans Safari. Pour revenir, touche « Vonia » en haut à gauche de l'écran.</p>
        <button class="btn block" id="open-notube">${icons.out} Ouvrir dans Safari</button>
      </div>
      <div class="steps">
        <div class="step"><div class="n" style="background:var(--green)">1</div><p>Sur Notube, colle le lien de la vidéo et télécharge le fichier.</p></div>
        <div class="step"><div class="n" style="background:var(--gold)">2</div><p>Le fichier arrive dans l'app Fichiers de l'iPhone.</p></div>
        <div class="step"><div class="n" style="background:var(--red);color:#fff">3</div><p>Reviens dans Vonia, onglet Écouter, pour l'ajouter à ta musique.</p></div>
      </div>`;
  },

  reglages() {
    return `${header("Réglages", false)}
      <div class="group-title">Application</div>
      <div class="group">
        <button class="cell" id="check-update"><span class="ic" style="background:var(--green)">${icons.refresh}</span>Rechercher des mises à jour</button>
        <div class="cell"><span class="ic" style="background:#3a3a3e">${icons.info}</span>Version<span class="val">${APP_VERSION}</span></div>
      </div>
      <div class="about"><img src="icons/icon-192.png" alt="">Vonia ${APP_VERSION}<br>Ta musique, tes vidéos, tes récaps.</div>`;
  },
};

// ---------- Navigation ----------
function currentTab() {
  const t = location.hash.replace("#/", "");
  return TABS.includes(t) ? t : "ecouter";
}

function render() {
  const tab = currentTab();
  view.innerHTML = `<div class="page">${screens[tab]()}</div>`;
  document.querySelectorAll(".tab").forEach((a) => a.classList.toggle("on", a.dataset.tab === tab));
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", render);

// Toucher l'onglet Notube ouvre directement le site, en plus d'afficher l'écran Notube.
document.querySelector('.tab[data-tab="notube"]').addEventListener("click", () => openNotube());

view.addEventListener("click", (e) => {
  const soon = e.target.closest("[data-soon]");
  if (soon) return toast(soon.dataset.soon);
  if (e.target.closest("#open-notube")) return openNotube();
  if (e.target.closest("#check-update")) return checkUpdate();
});

async function checkUpdate() {
  if (!("serviceWorker" in navigator)) return toast("Mises à jour indisponibles ici");
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return toast("Vonia est à jour");
  await reg.update();
  if (reg.installing || reg.waiting) {
    toast("Nouvelle version : redémarrage…");
    setTimeout(() => location.reload(), 1200);
  } else {
    toast("Vonia est à jour");
  }
}

// ---------- Démarrage ----------
if (!location.hash) history.replaceState(null, "", "#/ecouter");
render();
setTimeout(() => document.getElementById("splash").classList.add("out"), 700);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
