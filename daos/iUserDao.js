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

    async getAllUsers() {
        throw new Error("To be implemented!");
    }

    async updateStatusById(id, newStatus) {
        throw new Error("To be implemented!");
    }
}
