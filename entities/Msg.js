import MsgDac from "../dacs/msgDac.js";

class Msg {
    constructor({ sender, receiver, timestamp, status, content }) {
        this.sender = sender;
        this.receiver = receiver;
        this.timestamp = timestamp;
        this.status = status;
        this.content = content;
    }

    isPublic() {
        return this.receiver === null;
    }

    isPrivate() {
        return this.receiver !== null;
    }

    static get DAO() {
        return MsgDac.DAO;
    }

    async create() {
        await Msg.DAO.create({
            sender: this.sender,
            receiver: this.receiver,
            timestamp: this.timestamp,
            status: this.status,
            content: this.content,
        });
    }

    static async getPrivateMsg(sender, receiver) {
        return await Msg.DAO.getPrivateMsg(sender, receiver);
    }

    static async getPublicMsg() {
        return await Msg.DAO.getPublicMsg();
    }

    static async markMessagesAsRead(senderId, receiverId) {
        return await Msg.DAO.markMessagesAsRead(senderId, receiverId);
    }

    static async getUnreadMessages(receiverId) {
        return await Msg.DAO.getUnreadMessages(receiverId);
    }

    static async getAnnouncement() {
        return await Msg.DAO.getAnnouncement();
    }
    static async searchPublicMsg(params) {
        return await Msg.DAO.searchPublicMsg(params);
    }

    static async searchPrivateMsg(params) {
        return await Msg.DAO.searchPrivateMsg(params);
    }

}

export default Msg;
