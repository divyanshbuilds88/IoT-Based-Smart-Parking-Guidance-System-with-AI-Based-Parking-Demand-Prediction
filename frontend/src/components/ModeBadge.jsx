export default function ModeBadge({ mode }) {
  if (mode === "simulation") {
    return <span className="badge yellow">🧪 SIMULATION MODE (no real hardware)</span>;
  }
  if (mode === "hardware") {
    return <span className="badge green">🔌 REAL HARDWARE MODE (ESP32)</span>;
  }
  return <span className="badge blue">Mode unknown</span>;
}