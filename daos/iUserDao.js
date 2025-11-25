export class iUserDao {
    async create({ username, password, sharedstatus, status, role }) {
        throw new Error("To be implemented!");
    }

    async validatePassword(username, plainPassword) {
        throw new Error("To be implemented!");
    }

    async getUsernameById(id) {
        throw new Error("To be implemented!");
    }

    async findByUsername(username) {
        throw new Error("To be implemented!");
    }

    async findById(id) {
        throw new Error("To be implemented!");
    }

    async getAllUsers() {
        throw new Error("To be implemented!");
    }

    async updateStatusById(id, newStatus) {
        throw new Error("To be implemented!");
    }

    async getSkillsById(id) {
        throw new Error("To be implemented!");
    }

    async updateSkillsById(id, skills) {
        throw new Error("To be implemented!");
    }

    async updateAccountStatusById(id, newStatus) {
        throw new Error("To be implemented!");
    }

    async updatePrivilegeLevelById(id, newPrivilegeLevel) {
        throw new Error("To be implemented!");
    }

    async updateUsernameById(id, newUsername) {
        throw new Error("To be implemented!");
    }

    async updatePasswordById(id, newPassword) {
        throw new Error("To be implemented!");
    }

    async usernameExists(username, excludeUserId = null) {
        throw new Error("To be implemented!");
    }

    async getUserProfileByUsername(username) {
        throw new Error("To be implemented!");
    }

    async getUserProfileById(id) {
        throw new Error("To be implemented!");
    }
}
