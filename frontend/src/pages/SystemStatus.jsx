import useFetch from "../hooks/useFetch";

function StatusRow({ name, info }) {
  const connected = info?.connected;
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="slot-name" style={{ color: "#1f2d3d" }}>{name}</div>
          <div style={{ color: "#6b7a8c", fontSize: 14, marginTop: 4 }}>
            {info?.detail || "No information"}
          </div>
        </div>
        <span className={connected ? "badge green" : "badge red"}>
          {connected ? "🟢 Connected" : "🔴 Disconnected"}
        </span>
      </div>
    </div>
  );
}

export default function SystemStatus() {
  const { data, error, loading, reload } = useFetch("/api/health", 5000);

  return (
    <div>
      <h1 className="page-title">System Status</h1>
      <p className="page-subtitle">Live health checks (refreshes every 5 seconds)</p>

      {error && (
        <div className="banner error">
          ⚠️ Backend API is disconnected: {error}
        </div>
      )}
      {loading && !data && <div className="banner info">Checking system...</div>}

      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn" onClick={reload}>🔄 Check now</button>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <StatusRow
          name="Backend API"
          info={
            error
              ? { connected: false, detail: "Cannot reach the server" }
              : data?.backend
          }
        />
        <StatusRow name="MongoDB Database" info={error ? null : data?.mongodb} />
        <StatusRow name="AI Prediction Service" info={error ? null : data?.ai} />
        <StatusRow name="ESP32 Device" info={error ? null : data?.esp32} />
      </div>
    </div>
  );
}