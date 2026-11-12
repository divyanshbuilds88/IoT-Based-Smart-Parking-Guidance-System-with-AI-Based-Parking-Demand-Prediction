# IoT-Based Smart Parking Guidance System with AI-Based Parking Demand Prediction

A B.Tech CSE project. An ESP32 reads entry and exit IR sensors, controls a servo gate,
an LCD and traffic LEDs, and sends events over Wi-Fi to a Node.js backend. Data is saved
in MongoDB. A Python Random Forest model predicts parking demand. A React dashboard shows
everything live.

## Architecture

ESP32 sensors -> Wi-Fi -> Node.js (Express + Socket.IO) -> MongoDB -> Python AI (FastAPI) -> React dashboard

## Folder structure

- frontend/ : React + Vite dashboard
- backend/  : Express API, Socket.IO, MongoDB models
- ai/       : train.py, main.py (FastAPI), requirements.txt
- arduino/smart_parking/smart_parking.ino : ESP32 code

## Software needed

Node.js, Python 3.10+, MongoDB Community Server + Compass, Arduino IDE 2.x, Postman.

## Setup

1. Copy `.env.example` to `backend/.env` and set `DEVICE_API_KEY`.
2. Backend:   cd backend && npm install && npm run dev
3. AI:        cd ai && python -m pip install -r requirements.txt
              python -m uvicorn main:app --port 8000 --reload
4. Frontend:  cd frontend && npm install && npm run dev
5. Open http://localhost:5173

## ESP32 setup

1. Install ESP32 board package, and libraries ESP32Servo, LiquidCrystal I2C, ArduinoJson 7.x.
2. In smart_parking.ino set WIFI_SSID, WIFI_PASSWORD, SERVER_IP (computer's IPv4), API_KEY.
3. Use the 2.4 GHz network. Do not use localhost as the server address.
4. Allow port 5000 in the Windows firewall.

## Pins

Entry IR 18, Exit IR 19, Servo 25, Red LED 26, Yellow LED 14, Green LED 27,
LCD SDA 21, SCL 22 (I2C address 0x27).

## API

- GET  /api/health
- GET  /api/parking/status
- POST /api/parking/event
- POST /api/parking/heartbeat
- PUT  /api/parking/config
- GET  /api/parking/history
- GET  /api/parking/analytics
- GET  /api/ai/prediction
- POST /api/ai/retrain

## Modes

- Real hardware mode: ESP32 sent a signal in the last 30 seconds.
- Simulation mode: no ESP32. Use the Controls page. Events are saved as "simulation".

## AI note

The Random Forest trains on clearly labelled SAMPLE data until 48 hours of real
hardware records exist. Click "Retrain AI model" afterwards to train on real data.

## Safety

Power the servo from an external 5V supply with common ground. Use 3.3V logic on ESP32
inputs. Use a 220 ohm resistor with each LED.