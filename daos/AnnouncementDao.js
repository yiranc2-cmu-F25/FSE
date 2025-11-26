import { iAnnouncementDao } from "./iAnnouncementDao.js";
import {buildSubstringRegex} from "../utils/search/search.js";
import { searchByModel } from "../utils/search/searchCommon.js";
import { USER_STATUS } from "../constants/userStatus.js";

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
            .populate({
                path: "sender",
                select: "username status",
                match: { status: USER_STATUS.ACTIVE }
            })
            .lean();
        const mapped = docs.map((doc) => ({
            id: doc._id,
            sender: doc.sender,
            timestamp: doc.timestamp,
            status: doc.status,
            content: doc.content,
        }));
        // Filter out announcements where populate returned null (inactive sender)
        return mapped.filter(doc => doc.sender !== null);
    }

    async searchAnnouncement({ terms = [], phrase = "", limit = 10, cursor } = {}) {
        const regex = buildSubstringRegex(terms, phrase);
        return searchByModel({
            Model: this.AnnouncementModel,
            baseFilter: { receiver: null },
            regex,
            limit,
            cursor,
            populate: {
                path: "sender",
                select: "username status",
                match: { status: USER_STATUS.ACTIVE }
            }
        });
    }
}
