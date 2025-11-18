import mongoose from "mongoose";
import { parseQuery } from "../../utils/search/parseQuery.js";
import { SearchStrategy } from "./SearchStrategy.js";
import { buildSubstringRegex } from "../../utils/search/search.js";

export class BoardsStrategy extends SearchStrategy {
  async execute({ req }) {
    try {
      const parsed = parseQuery(req, { qKey: "content" });
      if (parsed.early) return parsed.early;
      const { raw, nonStop } = parsed;

      const limit = Math.min(Math.max(1, Number(req.query.limit) || 10), 100);
      const cursor =
        typeof req.query.cursor === "string" ? req.query.cursor : "";

      const Model = mongoose.connection.model("CoachingBoard");
      const regex = buildSubstringRegex(nonStop, raw);

      const query = {
        publicationState: "published",
        $or: [
          { title: { $regex: regex } },
          { category: { $regex: regex } },
          { relatedSkills: { $elemMatch: { $regex: regex } } },
        ],
      };

      const sort = { updatedAt: -1, _id: -1 };
      const itemsPlusOne = await Model.find(query)
        .sort(sort)
        .limit(limit + 1)
        .select({ title: 1, category: 1, updatedAt: 1 })
        .lean();

      const hasMore = itemsPlusOne.length > limit;
      const items = hasMore ? itemsPlusOne.slice(0, limit) : itemsPlusOne;
      const count = await Model.countDocuments(query);

      let nextCursor = null;
      if (hasMore && items.length > 0) {
        const last = items[items.length - 1];
        nextCursor = `${new Date(last.updatedAt).toISOString()}|${String(last._id)}`;
      }

      const results = items.map((b) => ({
        id: String(b._id),
        name: b.title,
        content: b.category,
        timestamp: b.updatedAt,
        status: null,
      }));

      return { code: 200, count, results, nextCursor };
    } catch (err) {
      return { code: 500, status: "error", message: "Server error" };
    }
  }
}

export const boardsStrategy = new BoardsStrategy();


