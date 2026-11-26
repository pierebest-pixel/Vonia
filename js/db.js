// Stockage local de Vonia (IndexedDB) : morceaux, fichiers audio, playlists, écoutes.
"use strict";

const DB = (() => {
  let ready;

  function open() {
    if (!ready) {
      ready = new Promise((resolve, reject) => {
        const req = indexedDB.open("vonia", 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          db.createObjectStore("tracks", { keyPath: "id" });      // infos d'un morceau
          db.createObjectStore("files");                           // le fichier audio (clé = id du morceau)
          db.createObjectStore("playlists", { keyPath: "id" });
          const plays = db.createObjectStore("plays", { keyPath: "id" }); // une écoute = une séance sur un morceau
          plays.createIndex("at", "at");
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return ready;
  }

  async function run(store, mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = action(tx.objectStore(store));
      let result;
      if (req) req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  return {
    all: (store) => run(store, "readonly", (s) => s.getAll()),
    get: (store, key) => run(store, "readonly", (s) => s.get(key)),
    put: (store, value, key) => run(store, "readwrite", (s) => (key === undefined ? s.put(value) : s.put(value, key))),
    del: (store, key) => run(store, "readwrite", (s) => s.delete(key)),
    since: (store, time) => run(store, "readonly", (s) => s.index("at").getAll(IDBKeyRange.lowerBound(time))),
  };
})();

// Demande à l'iPhone de ne pas effacer la musique quand l'espace manque.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
