import mongoose from "mongoose";

const parkingStatusSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    totalSlots: { type: Number, required: true, min: 1 },
    occupiedSlots: { type: Number, default: 0, min: 0 },
    totalEntered: { type: Number, default: 0 },
    totalExited: { type: Number, default: 0 },
    mode: { type: String, enum: ["hardware", "simulation"], default: "simulation" },
    lastEsp32Seen: { type: Date, default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "parking_status" }
);

export default mongoose.model("ParkingStatus", parkingStatusSchema);