/* FerryGuard · app.js — © Alessandro Pezzali (pezzaliAPP) · MIT
   Zero server, zero costi: demo locale, Web Serial opzionale, dati solo sul dispositivo. */
"use strict";

const APP_VERSION = "2.0.13";
const $ = (id) => document.getElementById(id);

/* ══════════ Navigazione a tab ══════════ */
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("is-active", t === tab);
      t.setAttribute("aria-selected", t === tab ? "true" : "false");
    });
    document.querySelectorAll(".panel").forEach((p) => {
      const on = p.id === "panel-" + tab.dataset.panel;
      p.classList.toggle("is-active", on);
      p.hidden = !on;
    });
  });
});

// Scorciatoia dal manifest: apre direttamente la demo
if (location.hash === "#demo") {
  const t = document.querySelector('.tab[data-panel="demo"]');
  if (t) t.click();
}

/* ══════════ Orologio di plancia ══════════ */
setInterval(() => {
  $("clock").textContent = new Date().toLocaleTimeString("it-IT");
}, 1000);
$("appVersion").textContent = "v" + APP_VERSION;

/* ══════════ Stato ══════════ */
const state = {
  tags: new Map(),     // id -> {id,nome,zona,lat,lng,x,y,status,ts}
  log: [],             // righe registro (max 200)
  demoTimer: null,
  audioCtx: null,
};

const DEMO_TAGS = [
  { id: "TAG_001", nome: "Maria R.",   zona: "Ponte A" },
  { id: "TAG_002", nome: "Giovanni B.", zona: "Ponte A" },
  { id: "TAG_003", nome: "Lucia F.",   zona: "Ponte B" },
  { id: "TAG_004", nome: "Ahmed K.",   zona: "Ponte B" },
  { id: "TAG_005", nome: "Elena T.",   zona: "Poppa"   },
  { id: "TAG_006", nome: "Paolo M.",   zona: "Prua"    },
];
const ZONES = {
  "Prua":    { x: [110, 180], y: [150, 235] },
  "Ponte A": { x: [250, 410], y: [ 85, 295] },
  "Ponte B": { x: [450, 610], y: [ 85, 295] },
  "Poppa":   { x: [650, 820], y: [100, 280] },
};
const BASE = { lat: 41.2, lng: 9.4 }; // Bocche di Bonifacio, rotta tipica

const rnd = (a, b) => a + Math.random() * (b - a);

/* ══════════ Rendering sicuro (niente innerHTML con dati) ══════════ */
function td(text, cls) {
  const c = document.createElement("td");
  c.textContent = text;
  if (cls) c.className = cls;
  return c;
}

function renderLog() {
  const body = $("logBody");
  body.replaceChildren();
  state.log.slice(0, 200).forEach((r) => {
    const tr = document.createElement("tr");
    if (r.status === "SOS") tr.className = "row-sos";
    tr.append(
      td(r.id, "mono"), td(r.nome), td(r.zona),
      td(r.lat.toFixed(5), "mono"), td(r.lng.toFixed(5), "mono"),
      td(new Date(r.ts).toLocaleTimeString("it-IT"), "mono"),
    );
    const st = td(r.status === "GESTITO" ? "✔ Gestito" : r.status,
      r.status === "SOS" ? "st-sos" : r.status === "GESTITO" ? "st-done" : "st-ok");
    tr.append(st);
    const act = document.createElement("td");
    if (r.status === "SOS") {
      const b = document.createElement("button");
      b.className = "btn btn-mini";
      b.textContent = "Gestito";
      b.addEventListener("click", () => acknowledge(r.id));
      act.append(b);
    }
    tr.append(act);
    body.append(tr);
  });
  $("logEmpty").hidden = state.log.length > 0;
}

function renderDeck() {
  const layer = $("tagLayer");
  layer.replaceChildren();
  for (const t of state.tags.values()) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    pulse.setAttribute("cx", t.x); pulse.setAttribute("cy", t.y);
    pulse.setAttribute("class", "pulse" + (t.status === "SOS" ? " on" : ""));
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", t.x); dot.setAttribute("cy", t.y); dot.setAttribute("r", 7);
    dot.setAttribute("class", "tagdot" + (t.status === "SOS" ? " sos" : ""));
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", t.x); label.setAttribute("y", t.y - 13);
    label.setAttribute("class", "taglabel");
    label.textContent = t.id.replace("TAG_0", "T");
    g.append(pulse, dot, label);
    layer.append(g);
  }
}

function renderStats() {
  $("statTags").textContent = state.tags.size;
  const sos = [...state.tags.values()].filter((t) => t.status === "SOS").length;
  $("statSos").textContent = sos;
  const badge = $("modeBadge");
  if (sos > 0) { badge.textContent = "SOS"; badge.className = "badge badge-sos"; }
  else if (state.tags.size > 0) { badge.textContent = "LIVE"; badge.className = "badge badge-live"; }
  else { badge.textContent = "STANDBY"; badge.className = "badge badge-idle"; }
}

function renderAll() { renderDeck(); renderStats(); renderLog(); }

/* ══════════ Ricezione pacchetti (demo o gateway) ══════════ */
function receivePacket(p) {
  // p: {id, nome?, zona?, lat, lng, status}
  const prev = state.tags.get(p.id);
  const zona = p.zona || (prev && prev.zona) || "Ponte A";
  const z = ZONES[zona] || ZONES["Ponte A"];
  const tag = {
    id: p.id,
    nome: p.nome || (prev && prev.nome) || "—",
    zona,
    lat: p.lat, lng: p.lng,
    x: prev && p.keepPos ? prev.x : rnd(z.x[0], z.x[1]),
    y: prev && p.keepPos ? prev.y : rnd(z.y[0], z.y[1]),
    status: p.status,
    ts: Date.now(),
  };
  // Un SOS resta attivo finché non viene gestito dalla plancia
  if (prev && prev.status === "SOS" && p.status !== "GESTITO") tag.status = "SOS";
  state.tags.set(p.id, tag);
  state.log.unshift({ ...tag });
  if (state.log.length > 200) state.log.length = 200;
  $("statLast").textContent = `${tag.id} · ${tag.status} · ${new Date(tag.ts).toLocaleTimeString("it-IT")}`;
  if (p.status === "SOS" && (!prev || prev.status !== "SOS")) sosAlert(tag);
  renderAll();
}

function acknowledge(id) {
  const t = state.tags.get(id);
  if (!t) return;
  t.status = "GESTITO";
  state.log.unshift({ ...t, ts: Date.now() });
  renderAll();
}

/* ══════════ Allarme SOS: toast + suono + vibrazione ══════════ */
function sosAlert(tag) {
  const toast = $("sosToast");
  toast.textContent = `🆘 SOS da ${tag.nome} (${tag.id}) · ${tag.zona}`;
  toast.hidden = false;
  clearTimeout(sosAlert._t);
  sosAlert._t = setTimeout(() => { toast.hidden = true; }, 6000);
  if (navigator.vibrate) navigator.vibrate([200, 80, 200]);
  try {
    state.audioCtx = state.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = state.audioCtx;
    [0, 0.35].forEach((t0) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.12, ctx.currentTime + t0);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t0 + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + 0.3);
    });
  } catch { /* audio non disponibile: nessun problema */ }
}

/* ══════════ Motore demo ══════════ */
function demoTick() {
  DEMO_TAGS.forEach((d, i) => {
    if (Math.random() < 0.55 || !state.tags.has(d.id)) {
      const cur = state.tags.get(d.id);
      receivePacket({
        id: d.id, nome: d.nome, zona: d.zona,
        lat: BASE.lat + Math.sin(Date.now() / 60000 + i) * 0.01 + rnd(-0.0005, 0.0005),
        lng: BASE.lng + Date.now() / 3e9 + rnd(-0.0005, 0.0005),
        status: cur && cur.status === "SOS" ? "SOS" : "OK",
      });
    }
  });
}

function startDemo() {
  if (state.demoTimer) return;
  demoTick();
  state.demoTimer = setInterval(demoTick, 4000);
  $("btnDemoStart").disabled = true;
  $("btnDemoSos").disabled = false;
  $("btnDemoQuick").hidden = true;
  $("btnStopDemo").hidden = false;
}

function stopDemo() {
  clearInterval(state.demoTimer);
  state.demoTimer = null;
  $("btnDemoStart").disabled = false;
  $("btnDemoSos").disabled = true;
  $("btnDemoQuick").hidden = false;
  $("btnStopDemo").hidden = true;
}

function resetDemo() {
  stopDemo();
  state.tags.clear();
  state.log = [];
  $("statLast").textContent = "—";
  renderAll();
}

function randomSos() {
  const alive = [...state.tags.values()].filter((t) => t.status !== "SOS");
  const pick = alive[Math.floor(Math.random() * alive.length)] || DEMO_TAGS[0];
  receivePacket({ id: pick.id, nome: pick.nome, zona: pick.zona,
    lat: pick.lat || BASE.lat, lng: pick.lng || BASE.lng, status: "SOS", keepPos: true });
}

$("btnDemoStart").addEventListener("click", startDemo);
$("btnDemoQuick").addEventListener("click", () => {
  startDemo();
  setTimeout(randomSos, 6000); // nella demo rapida, un SOS arriva dopo pochi secondi
});
$("btnStopDemo").addEventListener("click", stopDemo);
$("btnDemoSos").addEventListener("click", randomSos);
$("btnDemoReset").addEventListener("click", resetDemo);
$("btnClearLog").addEventListener("click", () => { state.log = []; renderLog(); });

/* ══════════ Gateway LoRa reale via Web Serial (opzionale, gratuito) ══════════ */
if ("serial" in navigator) {
  const btn = $("btnGateway");
  btn.hidden = false;
  btn.addEventListener("click", async () => {
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      btn.textContent = "🔌 Gateway collegato";
      btn.disabled = true;
      const decoder = new TextDecoderStream();
      port.readable.pipeTo(decoder.writable).catch(() => {});
      const reader = decoder.readable.getReader();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          // Formato pacchetto: ID,lat,lng,STATO
          const p = line.split(",");
          if (p.length === 4 && p[0].startsWith("TAG_")) {
            receivePacket({
              id: p[0],
              lat: parseFloat(p[1]) || 0,
              lng: parseFloat(p[2]) || 0,
              status: p[3] === "SOS" ? "SOS" : "OK",
            });
          }
        }
      }
    } catch (e) {
      console.warn("Gateway non collegato:", e.message);
    }
  });
}

/* ══════════ Sostenitori: solo localStorage, zero server ══════════ */
const SUP_KEY = "ferryguard_sostenitori";
const loadSup = () => { try { return JSON.parse(localStorage.getItem(SUP_KEY)) || []; } catch { return []; } };
const saveSup = (arr) => localStorage.setItem(SUP_KEY, JSON.stringify(arr));

function renderSup() {
  const arr = loadSup();
  const body = $("supBody");
  body.replaceChildren();
  arr.forEach((s) => {
    const tr = document.createElement("tr");
    tr.append(td(s.nome), td(s.email, "mono"), td(s.ruolo),
      td(new Date(s.ts).toLocaleDateString("it-IT"), "mono"));
    body.append(tr);
  });
  $("supEmpty").hidden = arr.length > 0;
}

$("supForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const arr = loadSup();
  arr.unshift({
    nome: f.nome.value.trim(),
    email: f.email.value.trim(),
    ruolo: f.ruolo.value,
    messaggio: f.messaggio.value.trim(),
    ts: Date.now(),
  });
  saveSup(arr);
  f.reset();
  renderSup();
});

$("btnSupMail").addEventListener("click", () => {
  const f = $("supForm");
  const subject = encodeURIComponent("Voglio sostenere FerryGuard");
  const body = encodeURIComponent(
    `Nome: ${f.nome.value}\nEmail: ${f.email.value}\nContributo: ${f.ruolo.value}\n\n${f.messaggio.value}\n\n— Inviato dalla PWA FerryGuard`);
  location.href = `mailto:pezzaliapp@gmail.com?subject=${subject}&body=${body}`;
});

$("btnSupShare").addEventListener("click", async () => {
  const data = {
    title: "FerryGuard",
    text: "FerryGuard: SOS via LoRa per passeggeri fragili sui traghetti. Progetto aperto e gratuito di Alessandro Pezzali.",
    url: location.href.split("#")[0],
  };
  if (navigator.share) { try { await navigator.share(data); } catch { /* annullato */ } }
  else {
    await navigator.clipboard.writeText(`${data.text} ${data.url}`);
    alert("Link copiato negli appunti.");
  }
});

$("btnSupCsv").addEventListener("click", () => {
  const arr = loadSup();
  if (!arr.length) return;
  const esc = (v) => `"${String(v).replaceAll('"', '""')}"`;
  const csv = "nome,email,ruolo,messaggio,data\n" + arr.map((s) =>
    [s.nome, s.email, s.ruolo, s.messaggio, new Date(s.ts).toISOString()].map(esc).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "ferryguard_sostenitori.csv";
  a.click();
  URL.revokeObjectURL(a.href);
});

$("btnSupClear").addEventListener("click", () => {
  if (confirm("Eliminare tutte le adesioni salvate su questo dispositivo?")) {
    localStorage.removeItem(SUP_KEY);
    renderSup();
  }
});
renderSup();

/* ══════════ Service worker: registrazione e aggiornamento automatico ══════════ */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      // URL versionato: a ogni release cambia la cache key, così anche il service
      // worker nuovo scavalca la copia trattenuta dall'edge.
      const reg = await navigator.serviceWorker.register("service-worker.js?v=" + APP_VERSION);

      // Aggiornamento silenzioso: appena una nuova versione è pronta le si dice
      // di attivarsi, senza mostrare nulla e senza chiedere niente all'utente.
      const applyUpdate = (worker) => {
        if (worker) worker.postMessage({ type: "SKIP_WAITING" });
      };
      if (reg.waiting) applyUpdate(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const w = reg.installing;
        w && w.addEventListener("statechange", () => {
          if (w.state === "installed" && navigator.serviceWorker.controller) applyUpdate(w);
        });
      });

      // Controllo aggiornamenti: all'apertura, al ritorno in primo piano e ogni 30 minuti
      const check = () => reg.update().catch(() => {});
      document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
      setInterval(check, 30 * 60 * 1000);

      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return;
        // Demo in corso: non interrompere la simulazione a metà. Il nuovo service
        // worker è già attivo, la nuova interfaccia arriva alla prossima apertura.
        if (state.demoTimer) return;
        reloading = true;
        location.reload();
      });
    } catch (e) {
      console.warn("Service worker non registrato:", e.message);
    }
  });
}
