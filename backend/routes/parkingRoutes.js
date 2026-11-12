import { Router } from "express";
import { isDbConnected } from "../db.js";
import {
  getStatus,
  postEvent,
  postHeartbeat,
  updateConfig,
  getHistory,
  getAnalytics,
} from "../controllers/parkingController.js";

const router = Router();

// Stop early with a clear message if MongoDB is down
router.use((req, res, next) => {
  if (!isDbConnected()) {
    return res.status(503).json({ message: "Database is not connected" });
  }
  next();
});

router.get("/status", getStatus);
router.post("/event", postEvent);
router.post("/heartbeat", postHeartbeat);
router.put("/config", updateConfig);
router.get("/history", getHistory);
router.get("/analytics", getAnalytics);

export default router;