import { io } from "socket.io-client";

// Connects through the Vite proxy to the backend (port 5000)
export const socket = io({
  path: "/socket.io",
  autoConnect: true,
  reconnection: true,
});