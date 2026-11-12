import StatCard from "../components/StatCard";
import SlotCard from "../components/SlotCard";
import ModeBadge from "../components/ModeBadge";
import useParkingStatus from "../hooks/useParkingStatus";

function statusBadgeClass(text) {
  if (text === "Full") return "badge red";
  if (text === "Almost Full") return "badge yellow";
  return "badge green";
}

export default function Dashboard() {
  const { status, error, loading } = useParkingStatus();

  return (
    <div>
      <h1 className="page-title">Smart Parking Management System</h1>
      <p className="page-subtitle">Live overview of your parking area</p>

      {error && (
        <div className="banner error">
          ⚠️ Backend not connected: {error}
        </div>
      )}

      {loading && !status && <div className="banner info">Loading data...</div>}

      {status && (
        <>
          <div className="row" style={{ marginBottom: 18 }}>
            <ModeBadge mode={status.mode} />
            <span className={statusBadgeClass(status.status)}>
              Parking Status: {status.status}
            </span>
          </div>

          <div className="grid">
            <StatCard label="Total Parking Slots" value={status.totalSlots} />
            <StatCard label="Occupied Slots" value={status.occupiedSlots} />
            <StatCard label="Available Slots" value={status.availableSlots} />
            <StatCard label="Total Vehicles Entered" value={status.totalEntered} />
            <StatCard label="Total Vehicles Exited" value={status.totalExited} />
          </div>

          <h2 className="section-title">Parking Slots</h2>
          <div className="grid">
            {status.slots.map((slot) => (
              <SlotCard
                key={slot.slotNumber}
                slotNumber={slot.slotNumber}
                status={slot.status}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}