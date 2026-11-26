// Lecture du titre, de l'artiste et de la pochette d'un fichier audio (étiquettes ID3 des MP3).
"use strict";

const Tags = (() => {
  const syncsafe = (b, i) => ((b[i] & 0x7f) << 21) | ((b[i + 1] & 0x7f) << 14) | ((b[i + 2] & 0x7f) << 7) | (b[i + 3] & 0x7f);
  const be32 = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;

  function decode(bytes, enc) {
    try {
      if (enc === 0) return new TextDecoder("latin1").decode(bytes);
      if (enc === 1) return new TextDecoder("utf-16").decode(bytes);
      if (enc === 2) return new TextDecoder("utf-16be").decode(bytes);
      return new TextDecoder("utf-8").decode(bytes);
    } catch (e) { return ""; }
  }
  const clean = (s) => s.replace(/\u0000/g, " ").replace(/\s+/g, " ").trim();
  const text = (data) => clean(decode(data.subarray(1), data[0]));

  // Fin d'une chaîne terminée par zéro (deux zéros alignés en UTF-16).
  function endOfString(data, start, enc) {
    if (enc === 1 || enc === 2) {
      for (let i = start; i + 1 < data.length; i += 2) if (data[i] === 0 && data[i + 1] === 0) return i;
      return data.length;
    }
    const i = data.indexOf(0, start);
    return i < 0 ? data.length : i;
  }

  function picture(data) {
    const enc = data[0];
    const mimeEnd = data.indexOf(0, 1);
    let mime = new TextDecoder("latin1").decode(data.subarray(1, mimeEnd)).toLowerCase();
    if (!mime.includes("/")) mime = mime === "png" ? "image/png" : "image/jpeg";
    const descStart = mimeEnd + 2; // octet du type d'image sauté
    const descEnd = endOfString(data, descStart, enc);
    const imgStart = descEnd + (enc === 1 || enc === 2 ? 2 : 1);
    if (imgStart >= data.length) return null;
    return new Blob([data.slice(imgStart)], { type: mime });
  }

  async function read(file) {
    const out = {};
    try {
      const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
      if (head[0] !== 0x49 || head[1] !== 0x44 || head[2] !== 0x33) return out; // pas d'ID3
      const version = head[3];
      if (version < 3) return out;
      const size = syncsafe(head, 6);
      const buf = new Uint8Array(await file.slice(10, 10 + size).arrayBuffer());
      let i = 0;
      if (head[5] & 0x40) i += version === 4 ? syncsafe(buf, 0) : be32(buf, 0) + 4;
      while (i + 10 <= buf.length) {
        const id = String.fromCharCode(buf[i], buf[i + 1], buf[i + 2], buf[i + 3]);
        if (!/^[A-Z0-9]{4}$/.test(id)) break;
        const len = version === 4 ? syncsafe(buf, i + 4) : be32(buf, i + 4);
        const data = buf.subarray(i + 10, i + 10 + len);
        if (id === "TIT2") out.title = text(data);
        else if (id === "TPE1") out.artist = text(data).split("/")[0].trim();
        else if (id === "TALB") out.album = text(data);
        else if (id === "TCON") out.genre = text(data).replace(/^\(\d+\)/, "").trim();
        else if (id === "APIC" && !out.cover) out.cover = picture(data);
        i += 10 + len;
      }
    } catch (e) { /* fichier illisible : on garde le nom du fichier */ }
    return out;
  }

  // « Artiste - Titre (Official Video).mp3 » → { artist, title }
  function fromName(name) {
    let base = name.replace(/\.[a-z0-9]{2,4}$/i, "").replace(/_/g, " ");
    base = base.replace(/\s*[([](official|video|audio|lyrics?|clip|visualizer|hd|hq)[^)\]]*[)\]]/gi, "").trim();
    const parts = base.split(/\s+[-–—]\s+/);
    if (parts.length >= 2) return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() };
    return { title: base };
  }

  function duration(blob) {
    return new Promise((resolve) => {
      const a = new Audio();
      const url = URL.createObjectURL(blob);
      const done = (d) => { URL.revokeObjectURL(url); resolve(isFinite(d) ? d : 0); };
      a.preload = "metadata";
      a.onloadedmetadata = () => done(a.duration);
      a.onerror = () => done(0);
      setTimeout(() => done(a.duration || 0), 6000);
      a.src = url;
    });
  }

  return { read, fromName, duration };
})();
