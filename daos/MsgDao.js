import Message from "../entities/Msg.js";
import { iMsgDao } from "./iMsgDao.js";

export class MsgDao extends iMsgDao {
    constructor({ MessageModel }) {
        super();
        this.MessageModel = MessageModel;
    }

    async create({ sender, receiver, status, content, timestamp }) {
        const doc = await this.MessageModel.create({
            sender,
            receiver,
            status,
            content,
            timestamp,
        });
    }

    async getPrivateMsg(sender, receiver) {
        const docs = await this.MessageModel.find({ sender, receiver })
            .sort({ timestamp: 1 })
            .populate("sender", "username")
            .populate("receiver", "username")
            .lean();
        return docs.map((doc) => ({
            id: doc._id,
            sender: doc.sender,
            receiver: doc.receiver,
            timestamp: doc.timestamp,
            status: doc.status,
            content: doc.content,
        }));
    }

    async getPublicMsg() {
        const docs = await this.MessageModel.find({ receiver: null })
            .sort({ timestamp: 1 })
            .populate("sender", "username")
            .lean();
        return docs.map((doc) => ({
            id: doc._id,
            sender: doc.sender,
            receiver: doc.receiver,
            timestamp: doc.timestamp,
            status: doc.status,
            content: doc.content,
        }));
    }
}
