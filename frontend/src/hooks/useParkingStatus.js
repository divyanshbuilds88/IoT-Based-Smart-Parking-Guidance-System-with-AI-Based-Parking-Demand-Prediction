import { useEffect, useState, useCallback } from "react";
import { apiGet } from "../api";
import { socket } from "../socket";

export default function useParkingStatus() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiGet("/api/parking/status");
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Live update from backend (Socket.IO)
    const onUpdate = (data) => {
      setStatus(data);
      setError(null);
    };
    socket.on("parking:update", onUpdate);

    // Backup: refresh every 10 seconds
    const timer = setInterval(load, 10000);

    return () => {
      socket.off("parking:update", onUpdate);
      clearInterval(timer);
    };
  }, [load]);

  return { status, error, loading, reload: load };
}