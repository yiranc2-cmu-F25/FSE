import User from "../entities/User.js";
import Msg from "../entities/Msg.js";

export async function getPrivateMessages(req, res) {
    // Req parameters:
    // Sender, Receiver (UID)
    // Res:
    // A list of private Messages
    const { sender, receiver } = req.body;
    try {
        const messages = await Msg.getPrivateMsg(sender, receiver);

        // const messages = await req.app.locals.msgDao.getPrivateMsg(
        //     sender,
        //     receiver,
        // );
        const data = messages.map((msg) => {
            let isOwn =
                (msg.sender.username || "") ===
                (req.username.toLowerCase() || "");
            return {
                content: msg.content,
                timestamp: msg.timestamp,
                status: msg.status,
                isOwn: isOwn,
            };
        });

        return res.status(200).json(data);
    } catch (err) {
        console.error("Error fetching private messages:", err);
        return res
            .status(500)
            .json({ status: "error", message: "Server error" });
    }
}

export async function sendPrivateMessage(req, res) {
    // Req parameters:
    // Sender, Receiver (UID)
    // Message Text, Timestamp
    // Sender Status (retrieved from user)
    // Res:
    // void with Status code
    // 201: "Message sent successfully"
    // 500: "Internal server error: Unable to create new private message to channel."
    try {
        const { sender, receiver, content, status, timestamp } = req.body;
        const msg = new Msg({
            sender,
            receiver,
            content: content.trim(),
            status,
            timestamp,
        });
        await msg.create();

        // await req.app.locals.msgDao.create({
        //     sender,
        //     receiver,
        //     content: content.trim(),
        //     status,
        //     timestamp,
        // });

        const senderUsername = await User.getUsernameById(sender);
        // await req.app.locals.userDao.getUsernameById(sender);
        const receiverUsername = await User.getUsernameById(receiver);
        // await req.app.locals.userDao.getUsernameById(receiver);
        if (!senderUsername || !receiverUsername) {
            return res
                .status(500)
                .json({
                    status: "error",
                    message: "Sender or receiver not found",
                });
        }

        const socketInstance = req.app.get("socketInstance");
        if (!socketInstance) {
            return res.status(500).json({
                status: "error",
                message: "Socket instance not found",
            });
        }
        socketInstance.emitMessageFromAndTo(senderUsername, receiverUsername, {
            sender: senderUsername,
            receiver: receiverUsername,
            content: content,
            timestamp: timestamp,
            status: status,
        });

        return res.status(201).json({ message: "Message sent successfully" });
    } catch (err) {
        console.error("Error sending private message:", err);
        return res
            .status(500)
            .json({ status: "error", message: "Server error" });
    }
}
