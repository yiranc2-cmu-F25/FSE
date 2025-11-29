import { io } from "/socket.io/socket.io.esm.min.js";

let socket = null;
let socketUsername = null; // Track the username used to create the socket

export function getSocket() {
  const currentUsername = (window.__CURRENT_USER__ || "").trim();
  
  // If socket exists but username has changed, disconnect and recreate
  if (socket && socketUsername !== currentUsername) {
    console.log(`[socket] Username changed from "${socketUsername}" to "${currentUsername}", reconnecting...`);
    socket.disconnect();
    socket = null;
    socketUsername = null;
  }
  
  if (!socket) {
    socketUsername = currentUsername;
    socket = io({
      withCredentials: true, 
      auth: { username: socketUsername || "" },
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    
    // Log connection events for debugging
    socket.on("connect", () => {
      console.log(`[socket] Connected with username: "${socketUsername}"`);
    });
    
    socket.on("disconnect", (reason) => {
      console.log(`[socket] Disconnected: ${reason}`);
    });
    
    socket.on("connect_error", (error) => {
      console.warn(`[socket] Connection error:`, error.message);
    });
  }
  
  return socket;
}
