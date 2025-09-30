import { io } from "/socket.io/socket.io.esm.min.js";

let socket = null;

export function getSocket() {
  if (!socket) {
    const me = (window.__CURRENT_USER__ || "").trim();
    socket = io({
      withCredentials: true, 
      auth: { username: me || "" },
      transports: ["websocket", "polling"],
      reconnection: true,
    });
  }
  return socket;
}
