import ParkingStatus from "../models/ParkingStatus.js";
import ParkingAnalytics from "../models/ParkingAnalytics.js";

const AI_URL = () => process.env.AI_URL || "http://127.0.0.1:8000";

// Calls the Python service with a time limit, so the website never hangs
async function callAi(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(`${AI_URL()}${path}`, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// Used by /api/health
export async function checkAiHealth() {
  try {
    const r = await callAi("/health");
    if (!r.ok) return { connected: false, detail: `AI service error (${r.status})` };
    const d = await r.json();
    return {
      connected: true,
      detail: `Model loaded (trained on ${d.dataSource} data)`,
    };
  } catch (err) {
    return {
      connected: false,
      detail: "Python AI service is not running on " + AI_URL(),
    };
  }
}

// GET /api/ai/prediction
export async function getPrediction(req, res) {
  const status = await ParkingStatus.findOne({ key: "main" }).lean();
  if (!status) {
    return res.status(404).json({ message: "Parking status not created yet" });
  }

  // Occupancy at the end of the previous hour (from real records)
  const hourStart = new Date();
  hourStart.setMinutes(0, 0, 0);
  const prevHourStart = new Date(hourStart.getTime() - 60 * 60 * 1000);
  const prev = await ParkingAnalytics.findOne({ hourStart: prevHourStart }).lean();

  const body = {
    currentOccupied: status.occupiedSlots,
    totalSlots: status.totalSlots,
    previousDemand: prev ? prev.maxOccupied : status.occupiedSlots,
  };

  let response;
  try {
    response = await callAi("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return res.status(503).json({
      message: "AI service is not reachable. Start it with: python -m uvicorn main:app --port 8000",
    });
  }

  if (!response.ok) {
    const text = await response.text();
    return res.status(502).json({ message: `AI service error: ${text}` });
  }

  res.json(await response.json());
}

// POST /api/ai/retrain  (train again with the newest MongoDB data)
export async function retrainModel(req, res) {
  try {
    const response = await callAi("/train", { method: "POST" });
    if (!response.ok) {
      return res.status(502).json({ message: "AI service could not retrain" });
    }
    res.json(await response.json());
  } catch (err) {
    res.status(503).json({ message: "AI service is not reachable" });
  }
}