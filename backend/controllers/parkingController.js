import ParkingStatus from "../models/ParkingStatus.js";
import ParkingEvent from "../models/ParkingEvent.js";
import ParkingAnalytics from "../models/ParkingAnalytics.js";

const DEBOUNCE_MS = 1500;
const lastEventTime = {}; // remembers the last event time per source+type

// Turns a database document into what the website needs
export function buildStatus(doc) {
  const available = doc.totalSlots - doc.occupiedSlots;

  let text = "Available";
  if (available <= 0) text = "Full";
  else if (available <= Math.ceil(doc.totalSlots * 0.25)) text = "Almost Full";

  // Slots 1..occupied are shown as Occupied, the rest as Available
  const slots = [];
  for (let i = 1; i <= doc.totalSlots; i++) {
    slots.push({
      slotNumber: i,
      status: i <= doc.occupiedSlots ? "Occupied" : "Available",
    });
  }

  return {
    totalSlots: doc.totalSlots,
    occupiedSlots: doc.occupiedSlots,
    availableSlots: available,
    totalEntered: doc.totalEntered,
    totalExited: doc.totalExited,
    status: text,
    mode: doc.mode,
    lastUpdated: doc.updatedAt,
    slots,
  };
}

function checkDeviceKey(req) {
  return req.get("x-api-key") === process.env.DEVICE_API_KEY;
}

// GET /api/parking/status
export async function getStatus(req, res) {
  const doc = await ParkingStatus.findOne({ key: "main" });
  if (!doc) {
    return res.status(404).json({ message: "Parking status not created yet" });
  }
  res.json(buildStatus(doc));
}

// POST /api/parking/event
export async function postEvent(req, res) {
  const { eventType, source } = req.body || {};

  // 1. Validate
  if (!["entry", "exit"].includes(eventType)) {
    return res
      .status(400)
      .json({ message: 'eventType must be "entry" or "exit"' });
  }
  if (!["hardware", "simulation"].includes(source)) {
    return res
      .status(400)
      .json({ message: 'source must be "hardware" or "simulation"' });
  }
  if (source === "hardware" && !checkDeviceKey(req)) {
    return res.status(401).json({ message: "Wrong or missing x-api-key" });
  }

  // 2. Debounce (ignore duplicate events that come too fast)
  const key = `${source}:${eventType}`;
  const now = Date.now();
  if (now - (lastEventTime[key] || 0) < DEBOUNCE_MS) {
    return res.json({ ignored: true, message: "Duplicate event ignored (debounce)" });
  }
  lastEventTime[key] = now;

  // 3. Update the count safely (never above total, never below 0)
  const filter =
    eventType === "entry"
      ? { key: "main", $expr: { $lt: ["$occupiedSlots", "$totalSlots"] } }
      : { key: "main", occupiedSlots: { $gt: 0 } };

  const inc =
    eventType === "entry"
      ? { occupiedSlots: 1, totalEntered: 1 }
      : { occupiedSlots: -1, totalExited: 1 };

  const set = { mode: source, updatedAt: new Date() };
  if (source === "hardware") set.lastEsp32Seen = new Date();

  const doc = await ParkingStatus.findOneAndUpdate(
    filter,
    { $inc: inc, $set: set },
    { returnDocument: "after" }
  );

  if (!doc) {
    const message =
      eventType === "entry"
        ? "Parking is full. Entry rejected."
        : "Parking is already empty. Exit rejected.";
    return res.status(409).json({ message });
  }

  // 4. Save the event
  await ParkingEvent.create({
    eventType,
    occupiedSlots: doc.occupiedSlots,
    availableSlots: doc.totalSlots - doc.occupiedSlots,
    totalSlots: doc.totalSlots,
    source,
  });

  // 5. Update the hourly analytics document
  const hourStart = new Date();
  hourStart.setMinutes(0, 0, 0);
  await ParkingAnalytics.updateOne(
    { hourStart },
    {
      $inc: {
        entries: eventType === "entry" ? 1 : 0,
        exits: eventType === "exit" ? 1 : 0,
      },
      $max: { maxOccupied: doc.occupiedSlots },
      $set: { lastOccupied: doc.occupiedSlots, source },
      $setOnInsert: {
        hour: hourStart.getHours(),
        dayOfWeek: hourStart.getDay(),
      },
    },
    { upsert: true }
  );

  // 6. Tell all open dashboards immediately
  const status = buildStatus(doc);
  req.app.get("io").emit("parking:update", status);

  res.status(201).json({ message: `${eventType} saved`, status });
}

// POST /api/parking/heartbeat  (ESP32 sends this every few seconds)
export async function postHeartbeat(req, res) {
  if (!checkDeviceKey(req)) {
    return res.status(401).json({ message: "Wrong or missing x-api-key" });
  }
  await ParkingStatus.updateOne(
    { key: "main" },
    { $set: { lastEsp32Seen: new Date() } }
  );
  res.json({ message: "Heartbeat received" });
}

// PUT /api/parking/config  (change total slots)
export async function updateConfig(req, res) {
  const { totalSlots } = req.body || {};

  if (!Number.isInteger(totalSlots) || totalSlots < 1 || totalSlots > 100) {
    return res
      .status(400)
      .json({ message: "totalSlots must be a whole number from 1 to 100" });
  }

  const doc = await ParkingStatus.findOneAndUpdate(
    { key: "main", occupiedSlots: { $lte: totalSlots } },
    { $set: { totalSlots, updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!doc) {
    return res.status(409).json({
      message: "Cannot set total slots below the number of occupied slots",
    });
  }

  const status = buildStatus(doc);
  req.app.get("io").emit("parking:update", status);
  res.json({ message: "Total slots updated", status });
}

// GET /api/parking/history
export async function getHistory(req, res) {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const records = await ParkingEvent.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
  res.json({ records });
}

// GET /api/parking/analytics
export async function getAnalytics(req, res) {
  const tz = process.env.TIMEZONE || "Asia/Kolkata";

  // Per hour of the day (0-23), all days together
  const hourAgg = await ParkingAnalytics.aggregate([
    {
      $group: {
        _id: "$hour",
        entries: { $sum: "$entries" },
        exits: { $sum: "$exits" },
        avgOccupied: { $avg: "$maxOccupied" },
      },
    },
  ]);
  const byHour = {};
  hourAgg.forEach((h) => (byHour[h._id] = h));

  const hourly = [];
  const demandTrend = [];
  for (let h = 0; h < 24; h++) {
    const label = `${String(h).padStart(2, "0")}:00`;
    const row = byHour[h];
    hourly.push({
      hour: label,
      entries: row ? row.entries : 0,
      exits: row ? row.exits : 0,
    });
    demandTrend.push({
      hour: label,
      avgOccupied: row ? Math.round(row.avgOccupied * 10) / 10 : 0,
    });
  }

  // Per day (last 14 days that have data)
  const dailyAgg = await ParkingAnalytics.aggregate([
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$hourStart", timezone: tz },
        },
        entries: { $sum: "$entries" },
        exits: { $sum: "$exits" },
      },
    },
    { $sort: { _id: -1 } },
    { $limit: 14 },
  ]);
  const daily = dailyAgg
    .reverse()
    .map((d) => ({ date: d._id, entries: d.entries, exits: d.exits }));

  res.json({ hourly, daily, demandTrend });
}