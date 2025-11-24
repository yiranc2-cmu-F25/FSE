import GroupMessageDac from "../dacs/groupMessageDac.js";

class GroupMessage {
    constructor({ sender, group, timestamp, status, content }) {
        this.sender = sender;
        this.group = group;
        this.timestamp = timestamp;
        this.status = status;
        this.content = content;
    }

    static get DAO() {
        return GroupMessageDac.DAO;
    }

    async create() {
        const result = await GroupMessage.DAO.create({
            sender: this.sender,
            group: this.group,
            timestamp: this.timestamp,
            status: this.status,
            content: this.content
        });
        return result;
    }

    static async findByGroupId(groupId) {
        return await GroupMessage.DAO.findByGroupId(groupId);
    }

    static async getLatestMessageTimestamp(groupId) {
        return await GroupMessage.DAO.getLatestMessageTimestamp(groupId);
    }

    static async deleteByGroupId(groupId) {
        return await GroupMessage.DAO.deleteByGroupId(groupId);
    }
}

export default GroupMessage;
