import { Router } from "express";
import { isDbConnected } from "../db.js";
import { getPrediction, retrainModel } from "../controllers/aiController.js";

const router = Router();

router.use((req, res, next) => {
  if (!isDbConnected()) {
    return res.status(503).json({ message: "Database is not connected" });
  }
  next();
});

router.get("/prediction", getPrediction);
router.post("/retrain", retrainModel);

export default router;