// dacs/statusDao.js
import mongoose from "mongoose";
import { SHARED_STATUS } from "../constants/sharedStatus.js";
import { iStatusDao } from "./iStatusDao.js";
const ALLOWED = new Set(Object.values(SHARED_STATUS));

export class StatusDao extends iStatusDao {
  constructor({ StatusModel, UserModel }) {
    super();
    this.StatusModel = StatusModel;
    this.UserModel = UserModel;
  }

  async recordChange({ userId, newStatus, at = new Date() }) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid userId");
    }
    const normalized = String(newStatus).trim().toLowerCase();

    if (!ALLOWED.has(normalized)) {
        throw new Error(`invalid status: ${normalized}`);
    }
    const entry = await this.StatusModel.create({
      user: userId,
      status: normalized,
      timestamp: at,
    });
    return entry.toObject();
  }

  async getHistory({ userId, limit = 10, cursor }) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid userId");
    }
    const uid = userId;
    const baseQuery = { user: uid };

    const andConds = [baseQuery];
    if (cursor) {
      const [tsStr, idStr] = String(cursor).split("|");
      const ts = new Date(tsStr);
      if (!Number.isNaN(ts.getTime()) && idStr) {
        andConds.push({
          $or: [
            { timestamp: { $lt: ts } },
            { timestamp: ts, _id: { $lt: idStr } },
          ],
        });
      }
    }

    const query = andConds.length > 1 ? { $and: andConds } : baseQuery;
    const sort = { timestamp: -1, _id: -1 };
    const safeLimit = Math.min(Math.max(1, +limit || 10), 100);

    const itemsPlusOne = await this.StatusModel.find(query)
      .sort(sort)
      .limit(safeLimit + 1)
      .select("status timestamp")
      .lean();

    const hasMore   = itemsPlusOne.length > safeLimit;
    const pageItems = hasMore ? itemsPlusOne.slice(0, safeLimit) : itemsPlusOne;

    const last = pageItems[pageItems.length - 1];
    const nextCursor = hasMore
      ? `${new Date(last.timestamp).toISOString()}|${String(last._id)}`
      : null;

    const total = await this.StatusModel.countDocuments(baseQuery);

    return { total, items: pageItems, nextCursor };
  }

}
