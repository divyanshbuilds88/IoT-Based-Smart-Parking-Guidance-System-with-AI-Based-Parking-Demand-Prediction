import SlotCard from "../components/SlotCard";
import ModeBadge from "../components/ModeBadge";
import useParkingStatus from "../hooks/useParkingStatus";

export default function LiveSlots() {
  const { status, error, loading } = useParkingStatus();

  return (
    <div>
      <h1 className="page-title">Live Parking Slots</h1>
      <p className="page-subtitle">
        🟢 Green = Available &nbsp;&nbsp; 🔴 Red = Occupied
      </p>

      {error && (
        <div className="banner error">⚠️ Backend not connected: {error}</div>
      )}

      {loading && !status && <div className="banner info">Loading slots...</div>}

      {status && (
        <>
          <div className="row" style={{ marginBottom: 18 }}>
            <ModeBadge mode={status.mode} />
            <span className="badge blue">
              {status.availableSlots} of {status.totalSlots} slots available
            </span>
          </div>

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