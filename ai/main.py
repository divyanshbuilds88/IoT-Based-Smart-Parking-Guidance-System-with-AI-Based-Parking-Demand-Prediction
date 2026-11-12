import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

import train as trainer

state = {"model": None, "meta": None}


def load_model():
    if not (os.path.exists(trainer.MODEL_FILE) and os.path.exists(trainer.META_FILE)):
        trainer.train()
    state["model"] = joblib.load(trainer.MODEL_FILE)
    with open(trainer.META_FILE) as f:
        state["meta"] = json.load(f)


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    yield


app = FastAPI(title="Smart Parking AI", lifespan=lifespan)


class PredictRequest(BaseModel):
    currentOccupied: int = Field(ge=0)
    totalSlots: int = Field(ge=1)
    previousDemand: Optional[int] = Field(default=None, ge=0)


def demand_level(predicted, total):
    ratio = predicted / total
    if ratio < 0.4:
        return "Low"
    if ratio < 0.75:
        return "Medium"
    return "High"


@app.get("/health")
def health():
    return {
        "status": "ok",
        "modelLoaded": state["model"] is not None,
        "dataSource": state["meta"]["dataSource"],
        "trainedAt": state["meta"]["trainedAt"],
    }


@app.post("/train")
def retrain():
    """Train again using the newest data in MongoDB."""
    state["meta"] = trainer.train()
    state["model"] = joblib.load(trainer.MODEL_FILE)
    return {"message": "Model retrained", "meta": state["meta"]}


@app.post("/predict")
def predict(req: PredictRequest):
    if state["model"] is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    total = req.totalSlots
    current = float(min(req.currentOccupied, total))
    previous = float(
        min(req.previousDemand, total) if req.previousDemand is not None else current
    )

    now = datetime.now(ZoneInfo(trainer.TIMEZONE)).replace(
        minute=0, second=0, microsecond=0
    )

    forecast = []
    for step in range(1, 7):
        target = now + timedelta(hours=step)
        row = pd.DataFrame(
            [[target.hour, target.weekday(), current, previous]],
            columns=trainer.FEATURES,
        )
        pred = float(state["model"].predict(row)[0])
        pred = max(0.0, min(pred, float(total)))
        forecast.append(
            {"hour": f"{target.hour:02d}:00", "predictedOccupied": round(pred)}
        )
        previous = current
        current = pred

    next_hour = forecast[0]["predictedOccupied"]
    meta = state["meta"]
    return {
        "predictedOccupied": next_hour,
        "predictedAvailable": total - next_hour,
        "currentOccupied": req.currentOccupied,
        "demandLevel": demand_level(next_hour, total),
        "peakHours": meta["peakHours"],
        "forecast": forecast,
        "dataSource": meta["dataSource"],
        "trainingRecords": meta["trainingRecords"],
        "meanAbsoluteError": meta["meanAbsoluteError"],
        "trainedAt": meta["trainedAt"],
    }