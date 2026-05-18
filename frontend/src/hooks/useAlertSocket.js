import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_WS_URL || "http://localhost:4000";

export function useAlertSocket(vehicleId) {
  const socketRef = useRef(null);
  const [connected, setConnected]   = useState(false);
  const [alerts, setAlerts]         = useState([]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      if (vehicleId) socket.emit("subscribe:vehicle", vehicleId);
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("alert", (alert) => {
      setAlerts((prev) => [{ ...alert, _new: true }, ...prev].slice(0, 50));
      // Mark as "seen" after 300 ms so animation triggers once
      setTimeout(() => {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alert.id ? { ...a, _new: false } : a))
        );
      }, 300);
    });

    return () => socket.disconnect();
  }, [vehicleId]);

  const dismissAlert = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { connected, alerts, dismissAlert };
}
