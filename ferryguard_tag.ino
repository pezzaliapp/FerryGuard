/*
  FerryGuard TAG · ESP32 + LoRa SX1276 (868 MHz) + GPS NEO-6M
  © Alessandro Pezzali (pezzaliAPP) · Licenza MIT

  Correzioni rispetto alla versione originale:
  - SOS trasmesso IMMEDIATAMENTE alla pressione (non più in attesa dell'heartbeat)
  - SOS con latch: resta attivo finché la plancia non lo gestisce (pressione lunga 3 s per annullare)
  - Debounce del pulsante
  - Nessun delay() bloccante: la lettura GPS non si interrompe mai
  - Tentativi ripetuti di inizializzazione LoRa invece di blocco infinito
  - Sync word dedicata per non interferire con altre reti LoRa
*/

#include <SPI.h>
#include <LoRa.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>

// ==== CONFIGURAZIONE ====
#define DEVICE_ID   "TAG_001"     // ID univoco per ogni dispositivo
#define LORA_FREQ   868E6
#define LORA_SYNC   0xF3          // stessa sync word sul ricevitore di plancia

#define LORA_SS     18
#define LORA_RST    14
#define LORA_DIO0   26

HardwareSerial GPSserial(2);
#define GPS_RX      16
#define GPS_TX      17

#define SOS_BUTTON  13            // verso GND, INPUT_PULLUP
#define LED_PIN     12

TinyGPSPlus gps;

const unsigned long HEARTBEAT_MS   = 15000;  // pacchetto periodico
const unsigned long SOS_REPEAT_MS  = 5000;   // in SOS trasmette più spesso
const unsigned long DEBOUNCE_MS    = 40;
const unsigned long CANCEL_HOLD_MS = 3000;   // pressione lunga = annulla SOS

bool sosLatched = false;
unsigned long lastSend = 0;
unsigned long btnChangedAt = 0;
unsigned long btnHeldSince = 0;
int  btnStable = HIGH, btnLastRead = HIGH;
unsigned long ledUntil = 0;

void setup() {
  Serial.begin(115200);
  GPSserial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  pinMode(SOS_BUTTON, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);

  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  while (!LoRa.begin(LORA_FREQ)) {          // riprova invece di bloccarsi per sempre
    Serial.println("LoRa non pronta, riprovo...");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    delay(500);
  }
  LoRa.setSyncWord(LORA_SYNC);
  LoRa.enableCrc();
  Serial.println("LoRa OK");
  digitalWrite(LED_PIN, LOW);
}

void loop() {
  unsigned long now = millis();

  // GPS sempre in ascolto (nessun delay bloccante nel loop)
  while (GPSserial.available()) gps.encode(GPSserial.read());

  // Pulsante con debounce
  int raw = digitalRead(SOS_BUTTON);
  if (raw != btnLastRead) { btnLastRead = raw; btnChangedAt = now; }
  if (now - btnChangedAt > DEBOUNCE_MS && raw != btnStable) {
    btnStable = raw;
    if (btnStable == LOW) {                 // premuto
      btnHeldSince = now;
      if (!sosLatched) {
        sosLatched = true;                  // latch: SOS attivo
        sendPacket();                       // trasmissione IMMEDIATA
        lastSend = now;
      }
    }
  }
  // Pressione lunga: annulla SOS (falso allarme)
  if (sosLatched && btnStable == LOW && now - btnHeldSince > CANCEL_HOLD_MS) {
    sosLatched = false;
    sendPacket();
    lastSend = now;
    btnHeldSince = now + 60000;             // evita retrigger nella stessa pressione
  }

  // Heartbeat periodico (più frequente durante un SOS)
  unsigned long interval = sosLatched ? SOS_REPEAT_MS : HEARTBEAT_MS;
  if (now - lastSend > interval) {
    lastSend = now;
    sendPacket();
  }

  // LED non bloccante: acceso breve dopo ogni invio, lampeggio continuo in SOS
  if (sosLatched) digitalWrite(LED_PIN, (now / 300) % 2);
  else digitalWrite(LED_PIN, now < ledUntil ? HIGH : LOW);
}

void sendPacket() {
  String packet = String(DEVICE_ID) + ",";
  packet += gps.location.isValid() ? String(gps.location.lat(), 6) : "0.0";
  packet += ",";
  packet += gps.location.isValid() ? String(gps.location.lng(), 6) : "0.0";
  packet += ",";
  packet += sosLatched ? "SOS" : "OK";

  LoRa.beginPacket();
  LoRa.print(packet);
  LoRa.endPacket();

  Serial.println(packet);                   // il ricevitore di plancia stampa lo stesso formato via USB
  ledUntil = millis() + 150;
}
