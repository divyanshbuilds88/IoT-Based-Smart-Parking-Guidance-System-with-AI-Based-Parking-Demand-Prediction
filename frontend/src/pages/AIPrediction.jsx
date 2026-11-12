import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import StatCard from "../components/StatCard";
import useFetch from "../hooks/useFetch";

function demandBadge(level) {
  if (level === "High") return "badge red";
  if (level === "Medium") return "badge yellow";
  return "badge green";
}

export default function AIPrediction() {
  const { data, error, loading, reload } = useFetch("/api/ai/prediction", 30000);

  return (
    <div>
      <h1 className="page-title">AI Parking Demand Prediction</h1>
      <p className="page-subtitle">Random Forest model running in Python</p>

      {error && (
        <div className="banner error">⚠️ AI service not available: {error}</div>
      )}
      {loading && !data && <div className="banner info">Loading prediction...</div>}

      {data && (
        <>
          {data.dataSource === "sample" ? (
            <div className="banner info" style={{ background: "#fff6df", color: "#b7791f" }}>
              🧪 <b>SAMPLE DATA:</b> This model was trained on artificial sample data.
              These numbers are NOT a real forecast. Collect real parking events and
              retrain the model to get real predictions.
            </div>
          ) : (
            <div className="banner info">
              ✅ <b>REAL DATA:</b> This model was trained on {data.trainingRecords} actual
              parking records.
            </div>
          )}

          <div className="row" style={{ marginBottom: 16 }}>
            <span className={demandBadge(data.demandLevel)}>
              Expected Demand: {data.demandLevel}
            </span>
            <button className="btn" onClick={reload}>🔄 Refresh prediction</button>
          </div>

          <div className="grid">
            <StatCard label="Predicted Occupied Slots (next hour)" value={data.predictedOccupied} />
            <StatCard label="Predicted Available Slots" value={data.predictedAvailable} />
            <StatCard label="Current Occupied Slots" value={data.currentOccupied} />
            <StatCard
              label="Peak Parking Hours"
              value={(data.peakHours || []).join(", ") || "-"}
            />
          </div>

          <div className="card" style={{ marginTop: 20 }}>
            <h3 style={{ marginTop: 0 }}>Predicted Occupied Slots (next hours)</h3>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={data.forecast || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="predictedOccupied"
                    name="Predicted occupied"
                    stroke="#2f80ed"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}