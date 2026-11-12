import { useState } from "react";
import { apiPost } from "../api";
import ModeBadge from "../components/ModeBadge";
import useParkingStatus from "../hooks/useParkingStatus";

export default function Controls() {
  const { status, error } = useParkingStatus();
  const [message, setMessage] = useState(null);
  const [isError, setIsError] = useState(false);
  const [slots, setSlots] = useState("");
  const [busy, setBusy] = useState(false);

  function show(text, bad) {
    setMessage(text);
    setIsError(bad);
  }

  async function sendEvent(eventType) {
    setBusy(true);
    try {
      const data = await apiPost("/api/parking/event", {
        eventType,
        source: "simulation",
      });
      show(data.message, !!data.ignored);
    } catch (err) {
      show(err.message, true);
    } finally {
      setBusy(false);
    }
  }

  async function saveSlots() {
    const n = Number(slots);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      show("Enter a whole number from 1 to 100", true);
      return;
    }
    try {
      const res = await fetch("/api/parking/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalSlots: n }),
      });
      const data = await res.json();
      show(data.message, !res.ok);
      if (res.ok) setSlots("");
    } catch (err) {
      show("Cannot reach the backend server. Is it running?", true);
    }
  }

  async function retrain() {
    setBusy(true);
    show("Retraining the AI model... please wait", false);
    try {
      const data = await apiPost("/api/ai/retrain", {});
      show(
        `Model retrained. Data source: ${data.meta.dataSource} (${data.meta.trainingRecords} records)`,
        false
      );
    } catch (err) {
      show(err.message, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Controls</h1>
      <p className="page-subtitle">Test the system without hardware and change settings</p>

      {error && <div className="banner error">⚠️ Backend not connected: {error}</div>}

      {message && (
        <div className={isError ? "banner error" : "banner info"}>{message}</div>
      )}

      {status && (
        <div className="row" style={{ marginBottom: 18 }}>
          <ModeBadge mode={status.mode} />
          <span className="badge blue">
            {status.occupiedSlots} / {status.totalSlots} occupied
          </span>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>🧪 Simulate a vehicle (Simulation Mode)</h3>
        <p style={{ color: "#6b7a8c" }}>
          These buttons act like the IR sensors. Events are saved as
          "simulation", never as real hardware data.
        </p>
        <div className="row">
          <button className="btn" disabled={busy} onClick={() => sendEvent("entry")}>
            🚗 Vehicle Entry
          </button>
          <button className="btn secondary" disabled={busy} onClick={() => sendEvent("exit")}>
            🚙 Vehicle Exit
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>⚙️ Total parking slots</h3>
        <div className="row">
          <input
            className="input"
            type="number"
            min="1"
            max="100"
            placeholder={status ? `Current: ${status.totalSlots}` : "Number of slots"}
            value={slots}
            onChange={(e) => setSlots(e.target.value)}
          />
          <button className="btn" onClick={saveSlots}>Save</button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>🤖 AI model</h3>
        <p style={{ color: "#6b7a8c" }}>
          Train the Random Forest again using the newest records in MongoDB.
        </p>
        <button className="btn" disabled={busy} onClick={retrain}>
          Retrain AI model
        </button>
      </div>
    </div>
  );
}