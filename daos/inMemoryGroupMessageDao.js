export class inMemoryGroupMessageDao {
    constructor() {
        this.messages = [];
        this.nextId = 1;
    }

    async create({ sender, group, status, content, timestamp }) {
        const message = {
            _id: String(this.nextId++),
            sender,
            group,
            status,
            content,
            timestamp: timestamp || new Date()
        };
        this.messages.push(message);
        return message;
    }

    async findByGroupId(groupId) {
        return this.messages
            .filter(m => String(m.group) === String(groupId))
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .map(m => ({
                id: m._id,
                sender: m.sender,
                group: m.group,
                timestamp: m.timestamp,
                status: m.status,
                content: m.content
            }));
    }

    async getLatestMessageTimestamp(groupId) {
        const groupMessages = this.messages
            .filter(m => String(m.group) === String(groupId))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return groupMessages.length > 0 ? groupMessages[0].timestamp : null;
    }

    async deleteByGroupId(groupId) {
        const initialLength = this.messages.length;
        this.messages = this.messages.filter(
            m => String(m.group) !== String(groupId)
        );
        return initialLength - this.messages.length;
    }
}
