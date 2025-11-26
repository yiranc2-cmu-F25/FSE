import { iMsgDao } from "./iMsgDao.js";
import mongoose from "mongoose";
import {buildSubstringRegex} from "../utils/search/search.js";
import { searchByModel } from "../utils/search/searchCommon.js";
import { pushCursorClause } from "../utils/search/cursor.js";
import { filterInactiveUsers } from "../utils/filterInactiveUsers.js";
import { USER_STATUS } from "../constants/userStatus.js";

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
            .populate("sender", "username status")
            .populate("receiver", "username status")
            .lean();
        const mapped = docs.map((doc) => ({
            id: doc._id,
            sender: doc.sender,
            receiver: doc.receiver,
            timestamp: doc.timestamp,
            status: doc.status,
            content: doc.content,
        }));
        return filterInactiveUsers(mapped, ['sender', 'receiver']);
    }

    async getPublicMsg() {
        const docs = await this.MessageModel.find({ receiver: null })
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
            receiver: doc.receiver,
            timestamp: doc.timestamp,
            status: doc.status,
            content: doc.content,
        }));
        // Filter out messages where populate returned null (inactive sender)
        return mapped.filter(doc => doc.sender !== null);
    }
    
    async searchPublicMsg({ terms = [], phrase = "", limit = 10, cursor } = {}) {
        const regex = buildSubstringRegex(terms, phrase);
        const result = await searchByModel({
            Model: this.MessageModel,
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
        // Filter out messages where populate returned null (inactive sender)
        result.items = result.items.filter(item => item.sender !== null);
        return result;
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
                select: "username status",
                match: { status: USER_STATUS.ACTIVE }
            });
            // Filter out messages where populate returned null (inactive sender)
            return results.filter(r => r.sender !== null);

        } catch (err) {
            console.error("[MessageDAO] Failed to get latest unread messages:", err);
            throw err;
        }
    }
    async markMessagesAsRead(senderId, receiverId) {
        const result = await this.MessageModel.updateMany(
            { sender: senderId, receiver: receiverId, isRead: false },
            { $set: { isRead: true } }
        );
        return result.modifiedCount;
    }

    async searchPrivateMsg({ terms, senderId, peerId, phrase, limit = 10, cursor }) {
        const regex = buildSubstringRegex(terms, phrase);

        const convoOr = { $or: [
            { sender: senderId, receiver: peerId },
            { sender: peerId, receiver: senderId },
        ]};

        const contentCond = { content: { $regex: regex } };

        const andConds = [convoOr, contentCond];
        pushCursorClause(andConds, cursor, { tsField: "timestamp", idField: "_id" });

        const query = { $and: andConds };
        const sort = { timestamp: -1, _id: -1 };
        const safeLimit = Math.min(Math.max(1, +limit || 10), 100);

        const itemsPlusOne = await this.MessageModel.find(query)
            .sort(sort)
            .limit(safeLimit + 1)
            .select("sender receiver content timestamp status")
            .populate({
                path: "sender",
                select: "username status",
                match: { status: USER_STATUS.ACTIVE }
            })
            .lean();

        const hasMore   = itemsPlusOne.length > safeLimit;
        const pageItems = hasMore ? itemsPlusOne.slice(0, safeLimit) : itemsPlusOne;
        
        // Filter out messages where populate returned null (inactive sender)
        const filteredItems = pageItems.filter(item => item.sender !== null);

        const last = filteredItems.length > 0 ? filteredItems[filteredItems.length - 1] : pageItems[pageItems.length - 1];
        const nextCursor = hasMore && filteredItems.length > 0
            ? `${new Date(last.timestamp).toISOString()}|${String(last._id)}`
            : null;

        const baseQuery = { $and: [convoOr, contentCond] };
        const count = await this.MessageModel.countDocuments(baseQuery);

        return { items: filteredItems, nextCursor, count };
    }
}
