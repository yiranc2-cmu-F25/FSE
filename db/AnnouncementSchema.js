import mongoose from "mongoose";
import { SHARED_STATUS } from "../constants/sharedStatus.js";


export function makeAnnouncementModel(conn) {
    const AnnouncementSchema = new mongoose.Schema({
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        timestamp: { 
            type: Date,
            required: true,
            default: Date.now
        },
        status: {
            type: String,
            enum: Object.values(SHARED_STATUS),
            required: true,
            default: SHARED_STATUS.UNDEFINED
        },
        content: {
            type: String,
            required: true,
        },
    });
    
    AnnouncementSchema.index({ content: "text" });
    AnnouncementSchema.index({ timestamp: -1, _id: -1 });

    return conn.model("Announcement", AnnouncementSchema);
}
