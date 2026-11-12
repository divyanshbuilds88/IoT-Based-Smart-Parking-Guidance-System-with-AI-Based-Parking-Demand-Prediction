import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { connectDB, isDbConnected } from "./db.js";
import ParkingStatus from "./models/ParkingStatus.js";
import parkingRoutes from "./routes/parkingRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import { checkAiHealth } from "./controllers/aiController.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.set("io", io);

app.use(cors());
app.use(express.json());

// Health check (real checks)
app.get("/api/health", async (req, res) => {
  const dbOk = isDbConnected();

  let esp32 = { connected: false, detail: "No device has sent data yet" };
  if (dbOk) {
    const s = await ParkingStatus.findOne({ key: "main" }).lean();
    if (s?.lastEsp32Seen) {
      const sec = Math.round((Date.now() - new Date(s.lastEsp32Seen)) / 1000);
      esp32 = {
        connected: sec <= 30,
        detail: `Last signal ${sec} seconds ago`,
      };
    }
  }

  res.json({
    backend: { connected: true, detail: "Express server is running" },
    mongodb: {
      connected: dbOk,
      detail: dbOk ? "Database smart_parking is connected" : "MongoDB is not reachable",
    },
      ai: await checkAiHealth(),
    esp32,
  });
});

app.use("/api/parking", parkingRoutes);
app.use("/api/ai", aiRoutes);

// Unknown routes return clear JSON
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.url}` });
});

// Any crash inside a route returns clear JSON instead of hanging
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);
  res.status(500).json({ message: "Internal server error: " + err.message });
});

io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);
});

async function createInitialStatus() {
  const existing = await ParkingStatus.findOne({ key: "main" });
  if (existing) {
    console.log(
      `Parking status found: ${existing.occupiedSlots}/${existing.totalSlots} occupied`
    );
    return;
  }
  await ParkingStatus.create({
    key: "main",
    totalSlots: Number(process.env.TOTAL_SLOTS) || 4,
    mode: process.env.MODE === "hardware" ? "hardware" : "simulation",
  });
  console.log("Created first parking_status document");
}

async function start() {
  await connectDB();
  if (isDbConnected()) {
    await createInitialStatus();
  }
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

start();