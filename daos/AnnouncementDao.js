import { iAnnouncementDao } from "./iAnnouncementDao.js";
import {buildSubstringRegex} from "../utils/search/search.js";

export class AnnouncementDao extends iAnnouncementDao {
    constructor({ AnnouncementModel }) {
        super();
        this.AnnouncementModel = AnnouncementModel;
    }

    async create({ sender, status, content, timestamp }) {
        const doc = await this.AnnouncementModel.create({
            sender,
            status,
            content,
            timestamp,
        });
    }

    async getAnnouncement() {
        const docs = await this.AnnouncementModel.find({})
            .sort({ timestamp: 1 })
            .populate("sender", "username")
            .lean();
        return docs.map((doc) => ({
            id: doc._id,
            sender: doc.sender,
            timestamp: doc.timestamp,
            status: doc.status,
            content: doc.content,
        }));
    }

    async searchAnnouncement({ terms = [], phrase = "", limit = 10, cursor } = {}) {
        const regex = buildSubstringRegex(terms, phrase);
        return searchByModel({
            Model: this.AnnouncementModel,
            baseFilter: { receiver: null },
            regex,
            limit,
            cursor,
        });
    }
}
