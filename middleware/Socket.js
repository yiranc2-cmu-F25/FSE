class Socket {
  constructor(io) {
    this.io = io;
    this.users = new Map(); // socket.id -> { username, norm, room }
    this.setupEventHandlers();
  }

  // ---- helpers ------------------------------------------------------------
  normUsername(username) {
    return (username || "").toString().trim().toLowerCase();
  }

  roomFor(username) {
    return `user:${this.normUsername(username)}`;
  }

  // ---- lifecycle / presence ----------------------------------------------
  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log("New client connected:", socket.id);

      socket.on("join", (username) => {
        const norm = this.normUsername(username);
        const room = this.roomFor(norm);
        // remember who this socket belongs to
        this.users.set(socket.id, { username, norm, room });

        // put this socket into the user's personal room (supports multi-tab)
        socket.join(room);

        this.broadcastUserJoin(username);
        console.log(`${username} joined the chat.`);
        this.broadcastUserList();
      });

      socket.on("disconnect", () => {
        const info = this.users.get(socket.id);
        if (info) {
          this.users.delete(socket.id);
          // socket leaves all rooms automatically, but leaving is harmless
          socket.leave(info.room);
          console.log("Client disconnected:", socket.id);
          this.broadcastUserLeave(info.username);
          this.broadcastUserList();
        } else {
          console.log("Unknown client disconnected:", socket.id);
        }
      });
    });
  }

  // ---- messaging ----------------------------------------------------------

  broadcastMessage(message) {
    this.io.emit("message", message);
  }
  emitMessageFrom(authorUsername, base) {
    const room = this.roomFor(authorUsername);
    this.io.to(room).emit("message", { ...base, isOwn: true });
    this.io.except(room).emit("message", { ...base, isOwn: false });
  }

  broadcastUserJoin(username) {
    this.io.emit("user_join", { username, timestamp: new Date() });
  }

  broadcastUserLeave(username) {
    this.io.emit("user_leave", { username, timestamp: new Date() });
  }

  broadcastUserList() {
    // emit list of display usernames
    const userList = Array.from(this.users.values()).map((u) => u.username);
    this.io.emit("user_list", userList);
  }
}

export default Socket;
