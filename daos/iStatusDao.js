export class iStatusDao {
    async recordChange({ userId, newStatus, at = new Date() }) {
        throw new Error("To be implemented!");
    }
    
    async getHistory({ userId, limit = 10, cursor }) {
        throw new Error("To be implemented!");
    }
}