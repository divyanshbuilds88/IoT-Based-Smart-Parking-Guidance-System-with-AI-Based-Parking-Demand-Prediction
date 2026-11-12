import mongoose from "mongoose";

const parkingAnalyticsSchema = new mongoose.Schema(
  {
    hourStart: { type: Date, required: true, unique: true },
    hour: { type: Number, required: true },
    dayOfWeek: { type: Number, required: true },
    entries: { type: Number, default: 0 },
    exits: { type: Number, default: 0 },
    maxOccupied: { type: Number, default: 0 },
    lastOccupied: { type: Number, default: 0 },
    source: { type: String, enum: ["hardware", "simulation"], required: true },
  },
  { collection: "parking_analytics" }
);

export default mongoose.model("ParkingAnalytics", parkingAnalyticsSchema);