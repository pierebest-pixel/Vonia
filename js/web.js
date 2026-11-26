// Navigateur intégré : ouvre un site dans Vonia quand il l'autorise, sinon propose Safari.
"use strict";

const Web = (() => {
  const blockedHosts = new Set(JSON.parse(settings.get("web.blocked", "[]") || "[]"));
  const hostOf = (url) => { try { return new URL(url).host; } catch (e) { return url; } };
  const saveBlocked = () => settings.set("web.blocked", JSON.stringify([...blockedHosts]));

  const el = document.createElement("div");
  el.className = "web";
  el.innerHTML = `<div class="web-top">
      <button class="iconbtn" data-wclose aria-label="Fermer">${ICON.down}</button>
      <div class="web-title"><b></b><span></span></div>
      <button class="iconbtn" data-wreload aria-label="Recharger">${ICON.refresh}</button>
      <button class="iconbtn" data-wsafari aria-label="Ouvrir dans Safari">${ICON.out}</button>
    </div>
    <div class="web-body">
      <div class="web-loading"><div class="spin"></div>Chargement…</div>
      <div class="web-hint" hidden><span>Page blanche ? Ce site refuse sans doute Vonia.</span><button class="pill" data-wblock>Safari</button></div>
      <div class="web-blocked" hidden>
        <div class="art-big">${ICON.out}</div>
        <h3>Pas affichable ici</h3>
        <p>Ce site n'autorise pas l'affichage dans une autre appli. Il s'ouvrira dans Safari.</p>
        <button class="btn" data-wsafari>${ICON.out} Ouvrir dans Safari</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  const body = el.querySelector(".web-body");
  let frame = null, current = null, slowTimer = null, hintTimer = null;

  function safari(url) {
    const w = window.open(url, "_blank");
    if (w) { try { w.opener = null; } catch (e) {} }
    return !!w;
  }

  function showBlocked() {
    el.querySelector(".web-loading").hidden = true;
    el.querySelector(".web-blocked").hidden = false;
    if (frame) frame.style.visibility = "hidden";
    blockedHosts.add(hostOf(current.url));
    saveBlocked();
  }

  function load() {
    if (frame) frame.remove();
    clearTimeout(slowTimer);
    el.querySelector(".web-loading").hidden = false;
    el.querySelector(".web-blocked").hidden = true;
    el.querySelector(".web-hint").hidden = true;
    frame = document.createElement("iframe");
    // Le site ne peut pas prendre le contrôle de Vonia (pas de redirection de l'appli),
    // ses liens « nouvelle fenêtre » s'ouvrent dans Safari.
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-downloads");
    frame.setAttribute("allow", "fullscreen; autoplay; encrypted-media; picture-in-picture; clipboard-read; clipboard-write");
    frame.setAttribute("referrerpolicy", "no-referrer");
    frame.addEventListener("load", () => {
      clearTimeout(slowTimer);
      el.querySelector(".web-loading").hidden = true;
      // Un site qui refuse l'affichage laisse une page vide lisible par Vonia ;
      // un vrai site chargé reste illisible (autre origine).
      let blocked = false;
      try {
        const d = frame.contentDocument;
        if (d && (!d.body || d.body.childElementCount === 0) && !(d.body && d.body.textContent.trim())) blocked = true;
      } catch (e) { blocked = false; }
      if (blocked) return showBlocked();
      // Certains navigateurs ne laissent pas voir qu'un site a refusé : on propose Safari quelques secondes.
      const hint = el.querySelector(".web-hint");
      hint.hidden = false;
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => { hint.hidden = true; }, 9000);
    });
    slowTimer = setTimeout(() => { el.querySelector(".web-loading").innerHTML = `<div class="spin"></div>Ça prend du temps…<button class="btn ghost" data-wsafari>${ICON.out} Ouvrir dans Safari</button>`; }, 12000);
    frame.src = current.url;
    body.appendChild(frame);
  }

  function open(url, name) {
    current = { url, name: name || hostOf(url) };
    if (blockedHosts.has(hostOf(url))) {
      if (!safari(url)) toast("Ouverture impossible");
      return "safari";
    }
    el.querySelector(".web-title b").textContent = current.name;
    el.querySelector(".web-title span").textContent = hostOf(url);
    el.querySelector(".web-loading").innerHTML = `<div class="spin"></div>Chargement…`;
    load();
    el.classList.add("open");
    return "vonia";
  }

  function close() {
    el.classList.remove("open");
    clearTimeout(slowTimer);
    setTimeout(() => { if (!el.classList.contains("open") && frame) { frame.remove(); frame = null; } }, 400);
  }

  el.addEventListener("click", (e) => {
    if (e.target.closest("[data-wclose]")) return close();
    if (e.target.closest("[data-wreload]")) return load();
    if (e.target.closest("[data-wsafari]")) { safari(current.url); return close(); }
    if (e.target.closest("[data-wblock]")) {
      blockedHosts.add(hostOf(current.url));
      saveBlocked();
      safari(current.url);
      toast("Ce site s'ouvrira désormais dans Safari");
      return close();
    }
  });

  // « Réessayer dans Vonia » : oublie les sites marqués comme non affichables.
  function reset() { blockedHosts.clear(); saveBlocked(); }

  return { open, close, safari, reset, get blockedCount() { return blockedHosts.size; } };
})();
