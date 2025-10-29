import { iAnnouncementDao } from "./iAnnouncementDao.js";
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

}
