class Socket {
  constructor(io) {
    this.io = io;
    this.users = new Map(); // socket.id -> { username, norm, room }
    this.setupEventHandlers();
  }
  // ---- getOnlineUsers ------------------------------------------------------------
  getOnline() {
    const seen = new Set();
    const list = [];
    for (const u of this.users.values()) {
      if (!seen.has(u.norm)) {
        seen.add(u.norm);
        list.push(u.username);
      }
    }
    return list;
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
      console.log("=== [CONNECT] ===");
      console.log("sid =", socket.id);
      console.log("transport =", socket.conn?.transport?.name);
      console.log("handshake.auth =", socket.handshake?.auth);
      console.log("handshake.query =", socket.handshake?.query);
      console.log("headers.origin =", socket.handshake?.headers?.origin);
      console.log("headers.cookie =", socket.handshake?.headers?.cookie ? "(present)" : "(none)");


      const username = socket.handshake.auth?.username;
      if (username) {
        const norm = this.normUsername(username);
        const room = this.roomFor(norm);
        console.log("[JOIN auto]", {
          sid: socket.id,
          username,
          norm,
          room,
          usersSizeBefore: this.users.size,
        });
        this.users.set(socket.id, { username, norm, room });
        socket.join(room);
        this.broadcastUserJoin(username);
        this.broadcastUserList();
      }
      
      socket.on("disconnect", () => {
        const info = this.users.get(socket.id);
        console.log("[disconnect] socket.id=", socket.id);
        console.log("[disconnect] info=", info);
        console.log("[disconnect] current users map=", Array.from(this.users.entries()));
        this.users.delete(socket.id);
        if (info) socket.leave(info.room);

        setTimeout(() => {
          const room = info?.room;
          const bucket = room ? this.io.sockets.adapter.rooms.get(room) : null;
          const stillOnline = !!(bucket && bucket.size > 0);

          console.log(
            "disconnect check:",
            info?.username,
            "stillOnline=",
            stillOnline,
            "room size=",
            bucket ? bucket.size : 0,
            "active sockets=",
            this.users.size
          );

          if (!stillOnline && info?.username) {
            this.broadcastUserLeave(info.username);
          }
          this.broadcastUserList();
        }, 800);
      });
    });
  }

  // ---- messaging ----------------------------------------------------------

  broadcastMessage(message) {
    this.io.emit("message", message);
  }
  emitMessageFrom(authorUsername, base) {
    const room = this.roomFor(authorUsername);
    this.io.to(room).emit("public_message", { ...base, isOwn: true });
    this.io.except(room).emit("public_message", { ...base, isOwn: false });
  }

  emitMessageFromAndTo(senderUsername, receiverUsername, base) {
    const senderRoom = this.roomFor(senderUsername);
    const receiverRoom = this.roomFor(receiverUsername);
    this.io.to(senderRoom).emit("private_message", { ...base, isOwn: true });
    this.io.to(receiverRoom).emit("private_message", { ...base, isOwn: false });
  }

  emitGroupMessage(senderUsername, groupMembers, base) {
    // groupMembers is an array of usernames (including owner and all members)
    const senderRoom = this.roomFor(senderUsername);

    // Emit to sender with isOwn: true
    this.io.to(senderRoom).emit("group_message", { ...base, isOwn: true });

    // Emit to all other group members with isOwn: false
    groupMembers.forEach((memberUsername) => {
      const normMember = this.normUsername(memberUsername);
      const normSender = this.normUsername(senderUsername);

      // Skip the sender
      if (normMember !== normSender) {
        const memberRoom = this.roomFor(memberUsername);
        this.io.to(memberRoom).emit("group_message", { ...base, isOwn: false });
      }
    });
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

  broadcastNewStatus(username , status){
    this.io.emit("new_status", { username, status });
    console.log("Broadcasting new status:", { username, status });
  }
  // 1. backend will call this function when user change their status
  // 2.fronted will listen to this event to update the status of the user in userprofile and memberlist


  disconnectUser(username) {
    if (!username) return;
    const norm = this.normUsername(username);
    const room = this.roomFor(norm);
    this.io.in(room).disconnectSockets(true);
  }
}

export default Socket;
