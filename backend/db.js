import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("MongoDB connected: smart_parking");
  } catch (err) {
    console.error("MongoDB connection FAILED:", err.message);
    console.error("Is MongoDB running? Backend will keep trying.");
  }
}

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected");
});

// 1 = connected
export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}