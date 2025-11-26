import { USER_STATUS } from "../constants/userStatus.js";

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
            .populate({
                path: "sender",
                select: "username status",
                match: { status: USER_STATUS.ACTIVE }
            })
            .lean();
        const mapped = docs.map((doc) => ({
            id: doc._id,
            sender: doc.sender,
            group: doc.group,
            timestamp: doc.timestamp,
            status: doc.status,
            content: doc.content
        }));
        // Filter out messages where populate returned null (inactive sender)
        return mapped.filter(doc => doc.sender !== null);
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
