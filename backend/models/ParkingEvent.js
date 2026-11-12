import mongoose from "mongoose";

const parkingEventSchema = new mongoose.Schema(
  {
    eventType: { type: String, enum: ["entry", "exit"], required: true },
    occupiedSlots: { type: Number, required: true, min: 0 },
    availableSlots: { type: Number, required: true, min: 0 },
    totalSlots: { type: Number, required: true, min: 1 },
    source: { type: String, enum: ["hardware", "simulation"], required: true },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { collection: "parking_events" }
);

export default mongoose.model("ParkingEvent", parkingEventSchema);