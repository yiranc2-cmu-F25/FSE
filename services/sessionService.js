export async function disconnectUser(req) {
    const io = req.app.get("io");
    const socketInstance = req.app.get("socketInstance");
    const username = req.username;

    if (io && socketInstance && username) {
        const room = socketInstance.roomFor(
            socketInstance.normUsername(username)
        );
        io.in(room).disconnectSockets(true);
    }
}
