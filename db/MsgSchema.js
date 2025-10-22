import mongoose from "mongoose";
import { SHARED_STATUS } from "../constants/sharedStatus.js";


export function makeMsgModel(conn) {
    const MessageSchema = new mongoose.Schema({
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
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
        isRead: {
            type: Boolean,
            default: false
        }
    });

    return conn.model("Message", MessageSchema);
}
