import useFetch from "../hooks/useFetch";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString();
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString();
}

export default function History() {
  const { data, error, loading, reload } = useFetch("/api/parking/history", 10000);
  const records = data?.records || [];

  return (
    <div>
      <h1 className="page-title">Parking History</h1>
      <p className="page-subtitle">Every entry and exit saved in the database</p>

      {error && (
        <div className="banner error">⚠️ Backend not connected: {error}</div>
      )}
      {loading && !data && <div className="banner info">Loading history...</div>}

      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn" onClick={reload}>🔄 Refresh</button>
        <span className="badge blue">{records.length} records</span>
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Vehicle Entry</th>
              <th>Vehicle Exit</th>
              <th>Occupied Slots</th>
              <th>Available Slots</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", color: "#6b7a8c" }}>
                  No records yet
                </td>
              </tr>
            )}
            {records.map((r) => (
              <tr key={r._id}>
                <td>{formatDate(r.timestamp)}</td>
                <td>{formatTime(r.timestamp)}</td>
                <td>{r.eventType === "entry" ? "✅ Yes" : "-"}</td>
                <td>{r.eventType === "exit" ? "✅ Yes" : "-"}</td>
                <td>{r.occupiedSlots}</td>
                <td>{r.availableSlots}</td>
                <td>
                  <span className={r.source === "simulation" ? "badge yellow" : "badge green"}>
                    {r.source}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}