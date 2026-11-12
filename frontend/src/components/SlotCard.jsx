export default function SlotCard({ slotNumber, status }) {
  const isOccupied = status === "Occupied";
  return (
    <div className={`card slot-card ${isOccupied ? "occupied" : "available"}`}>
      <div className="slot-name">Slot {slotNumber}</div>
      <div className="slot-state">{isOccupied ? "🔴 Occupied" : "🟢 Available"}</div>
    </div>
  );
}