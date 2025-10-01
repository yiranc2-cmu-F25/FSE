import mongoose from "mongoose";
import { SHARED_STATUS } from "../constants/sharedStatus.js";
import Message from "../entities/Msg.js";

const MessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receiver: {
        type: String,
        required: true,
        default: "public",
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
    }
});

const MessageModel = mongoose.model("Message", MessageSchema);

class MsgDao {
    static async create ({ sender, receiver, status, content, timestamp}) {
        const doc = await MessageModel.create({ sender, receiver, status, content, timestamp });
        return new Message({
            id: doc._id,
            sender: doc.sender,
            receiver: doc.receiver,
            timestamp: doc.timestamp,
            status: doc.status,
            content: doc.content
        });
    }
    
    static async getPrivateMsg(receiver) {
        const docs = await MessageModel.find({ receiver }).sort({ timestamp: 1 });
        return docs.map(doc => new Message({
            id: doc._id,
            sender: doc.sender,
            receiver: doc.receiver,
            timestamp: doc.timestamp,
            status: doc.status,
            content: doc.content
        }));
    }

    static async getPublicMsg() {
        const docs = await MessageModel.find({ receiver: "public" }).sort({ timestamp: 1 }).populate("sender", "username").lean();
        return docs.map(doc => new Message({
            id: doc._id,
            sender: doc.sender,
            receiver: doc.receiver,
            timestamp: doc.timestamp,
            status: doc.status,
            content: doc.content
        }));
    }
}

export default MsgDao;

