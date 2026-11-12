import os
import json
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split

BASE = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE, "..", "backend", ".env"))

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/smart_parking")
TIMEZONE = os.getenv("TIMEZONE", "Asia/Kolkata")
TOTAL_SLOTS = int(os.getenv("TOTAL_SLOTS", "4"))
MIN_REAL_HOURS = int(os.getenv("MIN_REAL_HOURS", "48"))

MODEL_FILE = os.path.join(BASE, "model.joblib")
META_FILE = os.path.join(BASE, "model_meta.json")

FEATURES = ["hour", "day_of_week", "current_occupied", "previous_demand"]


def load_real_hourly():
    """Read real hourly records (from the ESP32 only) out of MongoDB."""
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        db = client.get_default_database()
        docs = list(
            db["parking_analytics"].find(
                {"source": "hardware"},
                {"_id": 0, "hourStart": 1, "lastOccupied": 1, "maxOccupied": 1},
            )
        )
    except Exception as err:
        print("Could not read MongoDB:", err)
        return None

    if not docs:
        return None

    df = pd.DataFrame(docs)
    df["hourStart"] = pd.to_datetime(df["hourStart"], utc=True)
    df = df.set_index("hourStart").sort_index()

    # Fill hours with no events: occupancy stays the same
    full_range = pd.date_range(df.index.min(), df.index.max(), freq="h", tz="UTC")
    df = df.reindex(full_range)
    df["lastOccupied"] = df["lastOccupied"].ffill()
    df["maxOccupied"] = df["maxOccupied"].fillna(df["lastOccupied"])
    return df


def make_sample_hourly(total_slots, days=60):
    """SAMPLE data only. Rush hours around 9:00 and 18:00, quieter weekends."""
    rng = np.random.default_rng(42)
    end = pd.Timestamp.now(tz="UTC").floor("h")
    idx = pd.date_range(end=end, periods=days * 24, freq="h")
    local = idx.tz_convert(TIMEZONE)
    hour = local.hour.to_numpy()
    dow = local.dayofweek.to_numpy()

    morning = np.exp(-((hour - 9) ** 2) / 6.0)
    evening = np.exp(-((hour - 18) ** 2) / 6.0)
    level = 0.15 + 0.75 * np.maximum(morning, evening)
    level = np.where(dow >= 5, level * 0.6, level)

    noise = rng.normal(0, 0.6, len(idx))
    occupied = np.clip(np.round(level * total_slots + noise), 0, total_slots)
    peak = np.clip(occupied + rng.integers(0, 2, len(idx)), 0, total_slots)
    return pd.DataFrame({"lastOccupied": occupied, "maxOccupied": peak}, index=idx)


def make_features(hourly):
    """Each row: situation now -> demand in the NEXT hour."""
    local = hourly.index.tz_convert(TIMEZONE)
    next_local = local + pd.Timedelta(hours=1)

    data = pd.DataFrame(index=hourly.index)
    data["hour"] = np.array(next_local.hour)
    data["day_of_week"] = np.array(next_local.dayofweek)
    data["current_occupied"] = hourly["lastOccupied"]
    data["previous_demand"] = hourly["maxOccupied"].shift(1)
    data["target"] = hourly["maxOccupied"].shift(-1)
    return data.dropna()


def train():
    real = load_real_hourly()
    if real is not None and len(real) >= MIN_REAL_HOURS:
        data_source = "real"
        hourly = real
        print(f"Training on REAL data: {len(real)} hourly records")
    else:
        data_source = "sample"
        hourly = make_sample_hourly(TOTAL_SLOTS)
        have = 0 if real is None else len(real)
        print(f"Not enough real data ({have} of {MIN_REAL_HOURS} hours).")
        print("Training on SAMPLE data. These are NOT real forecasts.")

    data = make_features(hourly)
    X = data[FEATURES]
    y = data["target"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    model = RandomForestRegressor(n_estimators=150, random_state=42)
    model.fit(X_train, y_train)
    mae = float(mean_absolute_error(y_test, model.predict(X_test)))

    # Train again on all data for the final model
    model.fit(X, y)

    # Busiest hours of the day
    local_hours = np.array(hourly.index.tz_convert(TIMEZONE).hour)
    by_hour = hourly["maxOccupied"].groupby(local_hours).mean()
    top = by_hour.sort_values(ascending=False).head(3).index.tolist()
    peak_hours = [f"{int(h):02d}:00" for h in sorted(top)]

    meta = {
        "dataSource": data_source,
        "trainingRecords": int(len(data)),
        "meanAbsoluteError": round(mae, 3),
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "peakHours": peak_hours,
        "trainedForSlots": TOTAL_SLOTS,
    }

    joblib.dump(model, MODEL_FILE)
    with open(META_FILE, "w") as f:
        json.dump(meta, f, indent=2)

    print("Model saved:", MODEL_FILE)
    print("Meta:", meta)
    return meta


if __name__ == "__main__":
    train()