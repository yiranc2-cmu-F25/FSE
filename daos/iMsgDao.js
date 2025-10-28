export class iMsgDao {
    async create({ sender, receiver, status, content, timestamp }) {
        throw new Error("To be implemented!");
    }

    async getPrivateMsg(sender, receiver) {
        throw new Error("To be implemented!");
    }

    async getPublicMsg() {
        throw new Error("To be implemented!");
    }

    async getAnnouncement() {
        throw new Error("To be implemented!");
    }
}
