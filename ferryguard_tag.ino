#include <SPI.h>
#include <LoRa.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>

// ==== CONFIGURAZIONE ====
// Imposta un ID univoco per ogni dispositivo
#define DEVICE_ID "TAG_001"

// Pin per LoRa
#define LORA_SS 18
#define LORA_RST 14
#define LORA_DIO0 26

// Pin GPS (UART2)
HardwareSerial GPSserial(2);
#define GPS_RX 16
#define GPS_TX 17

// Pin pulsante SOS
#define SOS_BUTTON 13

// LED per feedback
#define LED_PIN 12

// Oggetto GPS
TinyGPSPlus gps;

bool sosActive = false;
unsigned long lastSend = 0;
const unsigned long interval = 15000; // 15 secondi

void setup() {
  Serial.begin(115200);
  GPSserial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

  pinMode(SOS_BUTTON, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);

  // Inizializza LoRa
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(868E6)) {
    Serial.println("Errore LoRa");
    while (true);
  }
  Serial.println("LoRa OK");
  digitalWrite(LED_PIN, LOW);
}

void loop() {
  // Leggi dati GPS
  while (GPSserial.available()) {
    gps.encode(GPSserial.read());
  }

  // Controlla pulsante SOS
  sosActive = (digitalRead(SOS_BUTTON) == LOW);

  // Invia ogni intervallo
  if (millis() - lastSend > interval) {
    lastSend = millis();
    sendPacket();
  }
}

void sendPacket() {
  String packet = String(DEVICE_ID);
  packet += ",";
  packet += gps.location.isValid() ? String(gps.location.lat(), 6) : "0.0";
  packet += ",";
  packet += gps.location.isValid() ? String(gps.location.lng(), 6) : "0.0";
  packet += ",";
  packet += sosActive ? "SOS" : "OK";

  LoRa.beginPacket();
  LoRa.print(packet);
  LoRa.endPacket();

  Serial.println("Inviato: " + packet);
  digitalWrite(LED_PIN, HIGH);
  delay(200);
  digitalWrite(LED_PIN, LOW);
}
