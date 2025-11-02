import { iAnnouncementDao } from "./iAnnouncementDao.js";
import {buildSubstringRegex} from "../utils/search/search.js";
import userDac from "../dacs/userDac.js";
import mongoose from "mongoose";

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

    async searchAnnouncement({ terms = [], phrase = "", limit = 10, cursor }) {
        const regex = buildSubstringRegex(terms, phrase);
        const baseQuery = { receiver: null, content: { $regex: regex } };
        const query = { ...baseQuery };

        if (cursor) {
            const [tsStr, idStr] = String(cursor).split("|");
            const ts = new Date(tsStr);
            if (!Number.isNaN(ts.getTime()) && idStr) {
            query.$or = [
                { timestamp: { $lt: ts } },
                { timestamp: ts, _id: { $lt: idStr} },
            ];
            }
        }
        const sort = { timestamp: -1, _id: -1 };
        const safeLimit = Math.min(Math.max(1, +limit || 10), 100);

        const itemsPlusOne = await this.AnnouncementModel.find(query)
            .sort(sort)
            .limit(safeLimit + 1)
            .select("sender content timestamp status")
            .populate("sender", "username")
            .lean();

        const hasMore = itemsPlusOne.length > safeLimit;
        const pageItems = hasMore ? itemsPlusOne.slice(0, safeLimit) : itemsPlusOne;

        const last = pageItems[pageItems.length - 1];
        const nextCursor = hasMore
            ? `${new Date(last.timestamp).toISOString()}|${String(last._id)}`
            : null;

        const count = await this.AnnouncementModel.countDocuments(baseQuery);

        return { count, items: pageItems, nextCursor };
    }
}
