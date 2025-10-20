import { iMsgDao } from "./iMsgDao.js";
import userDac from "../dacs/userDac.js";

export class inMemoryMsgDao extends iMsgDao {
    constructor() {
        super();
        this.messages = [];
        this.delay = 100;
    }

    async create({ sender, receiver, status, content, timestamp }) {
        const senderUsername = await userDac.DAO.getUsernameById(sender);
        const receiverUsername = await userDac.DAO.getUsernameById(receiver);
        this.messages.push({
            id: this.messages.length + 1,
            sender: { id: sender, username: senderUsername },
            receiver: { id: receiver, username: receiverUsername },
            status,
            content,
            timestamp: timestamp || new Date(),
        });
    }

    async getPrivateMsg(sender, receiver) {
        return this.messages
            .filter(
                (msg) =>
                    msg.sender.id === sender && msg.receiver.id === receiver,
            )
            .sort((a, b) => a.timestamp - b.timestamp);
    }

    async getPublicMsg() {
        return this.messages
            .filter((msg) => msg.receiver === null)
            .sort((a, b) => a.timestamp - b.timestamp);
    }
}
