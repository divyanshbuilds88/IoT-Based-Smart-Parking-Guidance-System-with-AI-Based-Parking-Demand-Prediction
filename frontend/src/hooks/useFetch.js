import { useEffect, useState, useCallback } from "react";
import { apiGet } from "../api";

export default function useFetch(path, refreshMs = 0) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await apiGet(path);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
    if (refreshMs > 0) {
      const timer = setInterval(load, refreshMs);
      return () => clearInterval(timer);
    }
  }, [load, refreshMs]);

  return { data, error, loading, reload: load };
}