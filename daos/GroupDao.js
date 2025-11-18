export class GroupDao {
    constructor({ GroupModel }) {
        this.GroupModel = GroupModel;
    }

    async create({ groupName, owner, members }) {
        const doc = await this.GroupModel.create({
            groupName,
            owner,
            members,
            timestamp: null
        });
        return doc;
    }

    async findById(groupId) {
        const doc = await this.GroupModel.findById(groupId)
            .populate("owner", "username")
            .populate("members", "username")
            .lean();
        return doc;
    }

    async findByGroupName(groupName) {
        const doc = await this.GroupModel.findOne({ groupName }).lean();
        return doc;
    }

    async findGroupsByUserId(userId) {
        const docs = await this.GroupModel.find({
            $or: [
                { owner: userId },
                { members: userId }
            ]
        })
            .populate("owner", "username")
            .populate("members", "username")
            .sort({ timestamp: -1 })
            .lean();
        return docs;
    }

    async addMembers(groupId, userIds) {
        const result = await this.GroupModel.findByIdAndUpdate(
            groupId,
            { $addToSet: { members: { $each: userIds } } },
            { new: true }
        );
        return result;
    }

    async removeMembers(groupId, userIds) {
        const result = await this.GroupModel.findByIdAndUpdate(
            groupId,
            { $pull: { members: { $in: userIds } } },
            { new: true }
        );
        return result;
    }

    async deleteGroup(groupId) {
        const result = await this.GroupModel.findByIdAndDelete(groupId);
        return result;
    }

    async updateTimestamp(groupId, timestamp) {
        const result = await this.GroupModel.findByIdAndUpdate(
            groupId,
            { timestamp },
            { new: true }
        );
        return result;
    }

    async isUserInGroup(groupId, userId) {
        const group = await this.GroupModel.findById(groupId).lean();
        if (!group) return false;

        const ownerIdStr = String(group.owner);
        const userIdStr = String(userId);

        if (ownerIdStr === userIdStr) return true;

        return group.members.some(memberId => String(memberId) === userIdStr);
    }

    async isUserOwner(groupId, userId) {
        const group = await this.GroupModel.findById(groupId).lean();
        if (!group) return false;
        return String(group.owner) === String(userId);
    }
}
