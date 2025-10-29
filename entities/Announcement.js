import AnnouncementDac from "../dacs/announcementDac.js";

class Announcement {
    constructor({ sender, timestamp, status, content }) {
        this.sender = sender;
        this.timestamp = timestamp;
        this.status = status;
        this.content = content;
    }

    static get DAO() {
        return AnnouncementDac.DAO;
    }

    async create() {
        await Announcement.DAO.create({
            sender: this.sender,
            timestamp: this.timestamp,
            status: this.status,
            content: this.content,
        });
    }

    static async getAnnouncement() {
        return await Announcement.DAO.getAnnouncement();
    }
}

export default Announcement;
