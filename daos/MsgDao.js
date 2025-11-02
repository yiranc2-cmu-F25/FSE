import { iMsgDao } from "./iMsgDao.js";
import mongoose from "mongoose";
import {buildSubstringRegex} from "../utils/search/search.js";

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

    async searchPublicMsg({ terms = [], phrase = "", limit = 10, cursor }) {
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
        console.log("[searchPrivateMsg] query:", JSON.stringify(query));
        const sort = { timestamp: -1, _id: -1 };
        const safeLimit = Math.min(Math.max(1, +limit || 10), 100);

        const itemsPlusOne = await this.MessageModel.find(query)
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

        const count = await this.MessageModel.countDocuments(baseQuery);

        return { count, items: pageItems, nextCursor };
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

    async searchPrivateMsg({ terms, senderId, peerId, phrase, limit = 10, cursor }) {
        const regex = buildSubstringRegex(terms, phrase);

        const convoOr = { $or: [
            { sender: senderId, receiver: peerId },
            { sender: peerId, receiver: senderId },
        ]};

        const contentCond = { content: { $regex: regex } };

        const andConds = [convoOr, contentCond];
        if (cursor) {
            const [tsStr, idStr] = String(cursor).split("|");
            const ts  = new Date(tsStr);
            if (!Number.isNaN(ts.getTime()) && idStr) {
            andConds.push({
                $or: [
                { timestamp: { $lt: ts } },
                { timestamp: ts, _id: { $lt: idStr } },
                ],
            });
            }
        }

        const query = { $and: andConds };
        const sort = { timestamp: -1, _id: -1 };
        const safeLimit = Math.min(Math.max(1, +limit || 10), 100);

        const itemsPlusOne = await this.MessageModel.find(query)
            .sort(sort)
            .limit(safeLimit + 1)
            .select("sender receiver content timestamp status")
            .populate("sender", "username")
            .lean();

        const hasMore   = itemsPlusOne.length > safeLimit;
        const pageItems = hasMore ? itemsPlusOne.slice(0, safeLimit) : itemsPlusOne;

        const last = pageItems[pageItems.length - 1];
        const nextCursor = hasMore
            ? `${new Date(last.timestamp).toISOString()}|${String(last._id)}`
            : null;

        const baseQuery = { $and: [convoOr, contentCond] };
        const count = await this.MessageModel.countDocuments(baseQuery);

        return { items: pageItems, nextCursor, count };
    }
}
