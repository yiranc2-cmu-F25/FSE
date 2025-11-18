export class GroupMessageDao {
    constructor({ GroupMessageModel }) {
        this.GroupMessageModel = GroupMessageModel;
    }

    async create({ sender, group, status, content, timestamp }) {
        const doc = await this.GroupMessageModel.create({
            sender,
            group,
            status,
            content,
            timestamp
        });
        return doc;
    }

    async findByGroupId(groupId) {
        const docs = await this.GroupMessageModel.find({ group: groupId })
            .sort({ timestamp: 1 })
            .populate("sender", "username")
            .lean();
        return docs.map((doc) => ({
            id: doc._id,
            sender: doc.sender,
            group: doc.group,
            timestamp: doc.timestamp,
            status: doc.status,
            content: doc.content
        }));
    }

    async getLatestMessageTimestamp(groupId) {
        const doc = await this.GroupMessageModel.findOne({ group: groupId })
            .sort({ timestamp: -1 })
            .select("timestamp")
            .lean();
        return doc ? doc.timestamp : null;
    }

    async deleteByGroupId(groupId) {
        const result = await this.GroupMessageModel.deleteMany({ group: groupId });
        return result.deletedCount;
    }
}
