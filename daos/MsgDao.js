import { iMsgDao } from "./iMsgDao.js";
import userDac from "../dacs/userDac.js";
import mongoose from "mongoose";

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

    async markMessagesAsRead(senderId, receiverId) {
        const result = await this.MessageModel.updateMany(
            { sender: senderId, receiver: receiverId, isRead: false },
            { $set: { isRead: true } }
        );
        return result.modifiedCount;
    }

    /** instead of getting all unread messages, 
     * we just what to iterate all other users who have unread messages for a specific receiver,
     *  and get the latest message from each of them */
    async getUnreadMessages(receiverId) {
        try {
            const results = await this.MessageModel.aggregate([
            { 
                $match: { 
                receiver: mongoose.Types.ObjectId.createFromHexString(receiverId), 
                isRead: false 
                } 
            },
            { $sort: { timestamp: -1 } },
            { 
                $group: {
                _id:           "$sender",
                latestMessage: { $first: "$$ROOT" }
                } 
            },
            { 
                $project: {
                    _id:       "$latestMessage._id",
                    sender:    "$latestMessage.sender",
                    receiver:  "$latestMessage.receiver",
                    timestamp: "$latestMessage.timestamp",
                    status:    "$latestMessage.status",
                    content:   "$latestMessage.content"
                }
            }
            ]);
            await this.MessageModel.populate(results, {
                path: "sender",
                select: "username"
            });
            return results;

        } catch (err) {
            console.error("[MessageDAO] Failed to get latest unread messages:", err);
            throw err;
        }
    }

}
