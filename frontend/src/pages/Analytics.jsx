import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import useFetch from "../hooks/useFetch";

function ChartCard({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div style={{ width: "100%", height: 280 }}>{children}</div>
    </div>
  );
}

export default function Analytics() {
  const { data, error, loading } = useFetch("/api/parking/analytics", 15000);

  const hourly = data?.hourly || [];
  const daily = data?.daily || [];
  const trend = data?.demandTrend || [];

  return (
    <div>
      <h1 className="page-title">Analytics</h1>
      <p className="page-subtitle">Graphs built from real database records</p>

      {error && (
        <div className="banner error">⚠️ Backend not connected: {error}</div>
      )}
      {loading && !data && <div className="banner info">Loading analytics...</div>}

      {data && (
        <>
          <ChartCard title="Vehicles Entering and Exiting per Hour">
            <ResponsiveContainer>
              <BarChart data={hourly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="entries" name="Entering" fill="#2f80ed" />
                <Bar dataKey="exits" name="Exiting" fill="#f2994a" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Daily Parking Usage">
            <ResponsiveContainer>
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="entries" name="Entries" fill="#2f80ed" />
                <Bar dataKey="exits" name="Exits" fill="#f2994a" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Parking Demand Trend (average occupied slots)">
            <ResponsiveContainer>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="avgOccupied"
                  name="Avg occupied"
                  stroke="#2f80ed"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  );
}