export class iAnnouncementDao {
    async create({ sender, status, content, timestamp }) {
        throw new Error("To be implemented!");
    }

    async getAnnouncement() {
        throw new Error("To be implemented!");
    }

    async searchAnnouncement({ terms, phrase, limit, cursor }) {
        throw new Error("To be implemented!");
    }
}
