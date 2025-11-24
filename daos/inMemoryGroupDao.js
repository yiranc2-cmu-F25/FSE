export class inMemoryGroupDao {
    constructor() {
        this.groups = [];
        this.nextId = 1;
    }

    async create({ groupName, owner, members }) {
        const group = {
            _id: String(this.nextId++),
            groupName,
            owner,
            members: members || [],
            timestamp: null
        };
        this.groups.push(group);
        return group;
    }

    async findById(groupId) {
        const group = this.groups.find(g => String(g._id) === String(groupId));
        return group ? { ...group } : null;
    }

    async findByGroupName(groupName) {
        const group = this.groups.find(g => g.groupName === groupName);
        return group ? { ...group } : null;
    }

    async findGroupsByUserId(userId) {
        return this.groups
            .filter(g =>
                String(g.owner) === String(userId) ||
                g.members.some(m => String(m) === String(userId))
            )
            .map(g => ({ ...g }))
            .sort((a, b) => {
                if (!a.timestamp) return 1;
                if (!b.timestamp) return -1;
                return new Date(b.timestamp) - new Date(a.timestamp);
            });
    }

    async addMembers(groupId, userIds) {
        const group = this.groups.find(g => String(g._id) === String(groupId));
        if (!group) return null;

        userIds.forEach(userId => {
            if (!group.members.some(m => String(m) === String(userId))) {
                group.members.push(userId);
            }
        });

        return { ...group };
    }

    async removeMembers(groupId, userIds) {
        const group = this.groups.find(g => String(g._id) === String(groupId));
        if (!group) return null;

        group.members = group.members.filter(
            m => !userIds.some(uid => String(uid) === String(m))
        );

        return { ...group };
    }

    async deleteGroup(groupId) {
        const index = this.groups.findIndex(g => String(g._id) === String(groupId));
        if (index === -1) return null;

        const deleted = this.groups[index];
        this.groups.splice(index, 1);
        return deleted;
    }

    async updateTimestamp(groupId, timestamp) {
        const group = this.groups.find(g => String(g._id) === String(groupId));
        if (!group) return null;

        group.timestamp = timestamp;
        return { ...group };
    }

    async isUserInGroup(groupId, userId) {
        const group = this.groups.find(g => String(g._id) === String(groupId));
        if (!group) return false;

        const ownerIdStr = String(group.owner);
        const userIdStr = String(userId);

        if (ownerIdStr === userIdStr) return true;

        return group.members.some(memberId => String(memberId) === userIdStr);
    }

    async isUserOwner(groupId, userId) {
        const group = this.groups.find(g => String(g._id) === String(groupId));
        if (!group) return false;
        return String(group.owner) === String(userId);
    }
}
