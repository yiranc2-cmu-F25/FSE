import GroupDac from "../dacs/groupDac.js";

class Group {
    constructor({ groupName, owner, members, timestamp }) {
        this.groupName = groupName;
        this.owner = owner;
        this.members = members || [];
        this.timestamp = timestamp || null;
    }

    static get DAO() {
        return GroupDac.DAO;
    }

    async create() {
        const result = await Group.DAO.create({
            groupName: this.groupName,
            owner: this.owner,
            members: this.members
        });
        return result;
    }

    static async findById(groupId) {
        return await Group.DAO.findById(groupId);
    }

    static async findByGroupName(groupName) {
        return await Group.DAO.findByGroupName(groupName);
    }

    static async findGroupsByUserId(userId) {
        return await Group.DAO.findGroupsByUserId(userId);
    }

    static async addMembers(groupId, userIds) {
        return await Group.DAO.addMembers(groupId, userIds);
    }

    static async removeMembers(groupId, userIds) {
        return await Group.DAO.removeMembers(groupId, userIds);
    }

    static async deleteGroup(groupId) {
        return await Group.DAO.deleteGroup(groupId);
    }

    static async updateTimestamp(groupId, timestamp) {
        return await Group.DAO.updateTimestamp(groupId, timestamp);
    }

    static async isUserInGroup(groupId, userId) {
        return await Group.DAO.isUserInGroup(groupId, userId);
    }

    static async isUserOwner(groupId, userId) {
        return await Group.DAO.isUserOwner(groupId, userId);
    }
}

export default Group;
