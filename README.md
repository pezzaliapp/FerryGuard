# 🛟 FerryGuard

**FerryGuard** è un sistema di sicurezza progettato per assistere persone con disabilità durante i viaggi in traghetto, permettendo la **localizzazione e l’invio di un SOS** al ponte di comando anche **senza Internet**, grazie alla comunicazione via **LoRa a 868 MHz**.

---

## 🎯 Obiettivo
Fornire ai passeggeri fragili un dispositivo affidabile e indossabile che, in caso di emergenza:
- invii un messaggio SOS
- trasmetta l’ID univoco e la posizione GPS (se disponibile)
- comunichi direttamente con la centrale della nave

---

## 🔧 Hardware utilizzato
- ESP32 (con Wi-Fi/Bluetooth)
- Modulo **LoRa SX1276** – 868 MHz
- Modulo GPS **u-blox NEO-6M**
- Pulsante fisico SOS
- LED di stato
- Batteria LiPo ricaricabile
- Case stampabile in 3D

---

## 📁 Contenuto della repository

| File                   | Descrizione                                       |
|------------------------|---------------------------------------------------|
| `ferryguard_tag.ino`   | Sketch ESP32: trasmette ID, GPS e SOS via LoRa   |
| `index.html`           | Dashboard PWA per il ponte di comando            |
| `firebase-config.js`   | Configurazione Firebase Firestore                |
| `elenco_tag.csv`       | Elenco dispositivi registrati (ID + nome)        |
| `logo_ferryguard.png`  | Icona ufficiale della PWA                         |
| `schema_collegamento.pdf` | Wiring semplificato del circuito hardware     |

---

## 🌐 Funzionamento

1. Ogni utente indossa un dispositivo con **ID univoco**
2. In caso di emergenza, può premere il **pulsante SOS**
3. Il segnale viene inviato via **LoRa** al ponte di comando
4. La dashboard riceve e visualizza l’alert, con **ora, ID, posizione**

---

## 📜 Licenza

Questo progetto è open-source e condivisibile per fini etici, educativi e di pubblica utilità.  
💡 Per collaborazioni, contattare [pezzaliAPP.com](https://www.pezzaliapp.com)

---

## 🚢 Pensato per traghetti. Pronto per il futuro.
