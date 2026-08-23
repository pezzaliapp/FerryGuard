# 🛟 FerryGuard

**FerryGuard** è un sistema aperto e gratuito per la sicurezza dei passeggeri fragili sui traghetti: un tag indossabile con pulsante **SOS** trasmette identità, posizione GPS e stato via **LoRa 868 MHz** direttamente alla plancia — **senza internet, senza SIM, senza server, senza costi**.

Progetto di proprietà intellettuale di **Alessandro Pezzali** (pezzaliAPP) · Licenza MIT.

🔗 Demo live (PWA installabile): `https://www.alessandropezzali.it/FerryGuard/`

---

## ✨ Novità versione 2.0

- **Grafica completamente nuova** — tema "plancia notturna", pianta nave interattiva con posizione dei tag in tempo reale
- **Demo integrata** — simulazione locale di una traversata con 6 tag, SOS con allarme sonoro/vibrazione e presa in carico
- **Zero backend** — rimossi Firebase e tracker di terze parti: nessun costo, nessun dato che lascia il dispositivo
- **Gateway reale via Web Serial** — il ricevitore LoRa si collega via USB alla dashboard (Chrome/Edge desktop), sempre gratis
- **Auto-aggiornamento** — la PWA rileva ogni nuova release e propone «Aggiorna ora»; funziona offline
- **Sezione Sostenitori** — adesioni salvate solo in locale, invio via email/condivisione a scelta dell'utente
- **Compatibilità totale** — Android, iOS/iPadOS, Windows, macOS, Linux; layout ottimizzato per pieghevoli (schermo esterno stretto e schermo interno aperto)
- **Firmware corretto** — SOS immediato con latch e debounce, nessun blocco del loop, ripristino automatico LoRa

---

## 📁 Contenuto del repository

| File | Descrizione |
|---|---|
| `index.html` | PWA completa: plancia, demo, progetto, hardware, sostenitori |
| `app.css` | Tema grafico responsive |
| `app.js` | Logica: demo, Web Serial, sostenitori, auto-update |
| `service-worker.js` | Cache versionata, offline, auto-aggiornamento |
| `manifest.json` | Installazione su tutte le piattaforme |
| `ferryguard_tag.ino` | Firmware ESP32 del tag indossabile |
| `ferryguard-*.png` | Icone (normali e maskable) |

---

## 🚀 Pubblicazione gratuita (GitHub Pages)

1. Push del repository su GitHub
2. **Settings → Pages → Deploy from branch → `main` / root**
3. La PWA è online su `https://<utente>.github.io/FerryGuard/` — hosting a costo zero

**Per rilasciare un aggiornamento:** modifica i file, incrementa `VERSION` in `service-worker.js` (es. `fg-v2.0.1`), push. Tutti i dispositivi installati riceveranno il toast «Aggiorna ora».

---

## 🔧 Hardware del tag (≈ 25–35 €)

ESP32 DevKit · LoRa SX1276 868 MHz · GPS u-blox NEO-6M · pulsante SOS · LED · LiPo + TP4056 · case 3D.
Schema collegamenti e dettagli nella sezione **Hardware** della PWA.

Il **ricevitore di plancia** è lo stesso hardware senza GPS: riceve i pacchetti LoRa e li stampa sulla seriale USB nel formato `TAG_001,41.20000,9.40000,SOS`; la dashboard li legge con il pulsante «Collega gateway LoRa».

---

## 📜 Licenza

MIT © Alessandro Pezzali. Libero per usi etici, educativi e di pubblica utilità.
Contatti e collaborazioni: [pezzaliAPP.com](https://www.pezzaliapp.com)

## 🚢 Pensato per traghetti. Pronto per il futuro.
