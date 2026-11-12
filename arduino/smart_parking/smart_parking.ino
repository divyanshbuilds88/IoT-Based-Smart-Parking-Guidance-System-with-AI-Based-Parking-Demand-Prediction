#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ================= CHANGE THESE =================
const char* WIFI_SSID     = "ASUS 0589";
const char* WIFI_PASSWORD = "P71678*e";
const char* SERVER_IP     = " 10.38.105.49";   // your computer's IPv4 address
const int   SERVER_PORT   = 5000;
const char* API_KEY       = "smartparking123"; // same as DEVICE_API_KEY in backend/.env
// ================================================

// Pins
#define ENTRY_IR 18
#define EXIT_IR  19
#define SERVO_PIN 25
#define RED_LED 26
#define YELLOW_LED 14
#define GREEN_LED 27

// IR sensors usually output LOW when they detect an object. Change to HIGH if yours is opposite.
#define IR_DETECTED LOW

#define GATE_CLOSED 90
#define GATE_OPEN 0

LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo gate;

int totalSlots = 4;
int occupied = 0;
bool backendOnline = false;

const unsigned long DEBOUNCE_MS = 1500;
const unsigned long HEARTBEAT_MS = 5000;
const unsigned long WIFI_RETRY_MS = 10000;
unsigned long lastEntry = 0, lastExit = 0, lastHeartbeat = 0, lastWifiTry = 0;

String serverUrl(const char* path) {
  return String("http://") + SERVER_IP + ":" + SERVER_PORT + path;
}

void setLeds() {
  int available = totalSlots - occupied;
  digitalWrite(RED_LED, available <= 0);
  digitalWrite(YELLOW_LED, available > 0 && available <= 1);
  digitalWrite(GREEN_LED, available > 1);
}

void showLcd(const char* line2 = nullptr) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Free:");
  lcd.print(totalSlots - occupied);
  lcd.print(" Used:");
  lcd.print(occupied);
  lcd.setCursor(0, 1);
  if (line2) lcd.print(line2);
  else if (WiFi.status() != WL_CONNECTED) lcd.print("WiFi lost");
  else if (!backendOnline) lcd.print("Server offline");
  else lcd.print(totalSlots - occupied <= 0 ? "PARKING FULL" : "Welcome");
}

void openGate() {
  gate.write(GATE_OPEN);
  delay(2500);
  gate.write(GATE_CLOSED);
}

// Read the status JSON the backend returns
void readStatus(const String& body) {
  JsonDocument doc;
  if (deserializeJson(doc, body)) return;
  JsonObject s = doc["status"].isNull() ? doc.as<JsonObject>() : doc["status"].as<JsonObject>();
  if (!s["totalSlots"].isNull()) totalSlots = s["totalSlots"];
  if (!s["occupiedSlots"].isNull()) occupied = s["occupiedSlots"];
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lcd.clear();
  lcd.print("Connecting WiFi");
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(300);
  }
  Serial.println(WiFi.status() == WL_CONNECTED
                   ? "WiFi OK, IP: " + WiFi.localIP().toString()
                   : "WiFi failed, will retry");
}

void syncStatus() {
  if (WiFi.status() != WL_CONNECTED) { backendOnline = false; return; }
  HTTPClient http;
  http.setTimeout(4000);
  http.begin(serverUrl("/api/parking/status"));
  int code = http.GET();
  backendOnline = (code == 200);
  Serial.printf("GET status -> %d\n", code);
  if (backendOnline) {
    String body = http.getString();
    readStatus(body);
    Serial.printf("totalSlots=%d occupied=%d\n", totalSlots, occupied);
  }
  http.end();
}

// Returns: 1 = saved, 0 = rejected (full/empty) , -1 = network failure
int sendEvent(const char* type) {
  if (WiFi.status() != WL_CONNECTED) { backendOnline = false; return -1; }
  HTTPClient http;
  http.setTimeout(4000);
  http.begin(serverUrl("/api/parking/event"));
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  String body = String("{\"eventType\":\"") + type + "\",\"source\":\"hardware\"}";
  int code = http.POST(body);
  Serial.printf("POST %s -> %d\n", type, code);

  int result = -1;
  if (code == 201 || code == 200 || code == 409) {
    backendOnline = true;
    String resp = http.getString();
    if (code == 409) {
      result = 0;
      syncStatus();
    } else {
      readStatus(resp);
      result = 1;
    }
  } else {
    backendOnline = false;
  }
  http.end();
  return result;
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.setTimeout(3000);
  http.begin(serverUrl("/api/parking/heartbeat"));
  http.addHeader("x-api-key", API_KEY);
  int code = http.POST("");
  backendOnline = (code == 200);
  http.end();
}

void handleEntry() {
  if (occupied >= totalSlots) {
    showLcd("Full - no entry");
    delay(1500);
    showLcd();
    return;
  }
  int r = sendEvent("entry");
  if (r == 1) {
    showLcd("Gate opening");
    openGate();
  } else if (r == 0) {
    showLcd("Full - no entry");
    delay(1500);
  } else {
    showLcd("Server offline");
    delay(1500);   // gate stays closed when we cannot record the vehicle
  }
  setLeds();
  showLcd();
}

void handleExit() {
  int r = sendEvent("exit");
  if (r == 1) {
    showLcd("Goodbye");
    openGate();
  } else if (r == 0) {
    showLcd("Already empty");
    delay(1500);
  } else {
    showLcd("Server offline");
    delay(1500);
  }
  setLeds();
  showLcd();
}

void setup() {
  Serial.begin(115200);
  Serial.println("Connecting to: " + String(WIFI_SSID));
  pinMode(ENTRY_IR, INPUT);
  pinMode(EXIT_IR, INPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);

  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();

  gate.setPeriodHertz(50);
  gate.attach(SERVO_PIN, 500, 2400);
  gate.write(GATE_CLOSED);

  connectWifi();
  syncStatus();
  setLeds();
  showLcd();
}

void loop() {
  unsigned long now = millis();
  
  // Reconnect Wi-Fi if it dropped
  if (WiFi.status() != WL_CONNECTED && now - lastWifiTry > WIFI_RETRY_MS) {
    lastWifiTry = now;
    Serial.println("Reconnecting WiFi...");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    showLcd();
  }

  // Entry sensor (debounced)
  if (digitalRead(ENTRY_IR) == IR_DETECTED && now - lastEntry > DEBOUNCE_MS) {
    lastEntry = now;
    handleEntry();
    lastEntry = millis();
  }

  // Exit sensor (debounced)
  if (digitalRead(EXIT_IR) == IR_DETECTED && now - lastExit > DEBOUNCE_MS) {
    lastExit = now;
    handleExit();
    lastExit = millis();
  }

  // Heartbeat and refresh numbers (also picks up changes made from the website)
  if (now - lastHeartbeat > HEARTBEAT_MS) {
    lastHeartbeat = now;
    sendHeartbeat();
    syncStatus();
    setLeds();
    showLcd();
  }

  // DEBUG: print raw sensor values once per second
  static unsigned long lastPrint = 0;
  if (millis() - lastPrint > 1000) {
    lastPrint = millis();
    Serial.printf("ENTRY(18)=%d  EXIT(19)=%d\n", digitalRead(ENTRY_IR), digitalRead(EXIT_IR));
  }
}