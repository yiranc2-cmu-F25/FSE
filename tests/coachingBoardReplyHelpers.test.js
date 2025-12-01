import { jest } from "@jest/globals";
import {
  parseReplyFormat,
  findTargetReplyById,
  findTargetCommentById,
  findTargetByUsername,
  findCascadedReplyIds,
} from "../utils/coachingBoard/replyHelpers.js";
import User from "../entities/User.js";

describe("replyHelpers", () => {
  describe("parseReplyFormat", () => {
    test("should parse reply with username and text", () => {
      const comment = "@username: This is a reply";
      const result = parseReplyFormat(comment);

      expect(result).toEqual({
        username: "username",
        targetId: undefined,
        replyText: "This is a reply",
      });
    });

    test("should parse reply with username, targetId, and text", () => {
      const comment = "@username#targetId123: This is a reply";
      const result = parseReplyFormat(comment);

      expect(result).toEqual({
        username: "username",
        targetId: "targetId123",
        replyText: "This is a reply",
      });
    });

    test("should parse reply with reply: prefix in targetId", () => {
      const comment = "@username#reply:targetId123: This is a reply";
      const result = parseReplyFormat(comment);

      expect(result).toEqual({
        username: "username",
        targetId: "reply:targetId123",
        replyText: "This is a reply",
      });
    });

    test("should return null for invalid format", () => {
      const comment = "This is not a reply format";
      const result = parseReplyFormat(comment);

      expect(result).toBeNull();
    });

    test("should return null for missing @ symbol", () => {
      const comment = "username: This is a reply";
      const result = parseReplyFormat(comment);

      expect(result).toBeNull();
    });

    test("should handle username with special characters", () => {
      const comment = "@user_name123: Reply text";
      const result = parseReplyFormat(comment);

      expect(result).toEqual({
        username: "user_name123",
        targetId: undefined,
        replyText: "Reply text",
      });
    });

    test("should handle empty reply text", () => {
      const comment = "@username: ";
      const result = parseReplyFormat(comment);

      expect(result).toEqual({
        username: "username",
        targetId: undefined,
        replyText: " ", // Regex captures the space after colon
      });
    });
  });

  describe("findTargetReplyById", () => {
    test("should find target reply and comment", () => {
      const board = {
        comments: [
          {
            id: "c1",
            replies: [
              { id: "r1", reply: "First reply" },
              { id: "r2", reply: "Second reply" },
            ],
          },
          {
            id: "c2",
            replies: [{ id: "r3", reply: "Third reply" }],
          },
        ],
      };

      const result = findTargetReplyById(board, "r2");

      expect(result.targetReply.id).toBe("r2");
      expect(result.targetComment.id).toBe("c1");
    });

    test("should handle _id instead of id", () => {
      const board = {
        comments: [
          {
            _id: "c1",
            replies: [{ _id: "r1", reply: "First reply" }],
          },
        ],
      };

      const result = findTargetReplyById(board, "r1");

      expect(result.targetReply._id).toBe("r1");
      expect(result.targetComment._id).toBe("c1");
    });

    test("should return null when reply not found", () => {
      const board = {
        comments: [
          {
            id: "c1",
            replies: [{ id: "r1", reply: "First reply" }],
          },
        ],
      };

      const result = findTargetReplyById(board, "r999");

      expect(result.targetReply).toBeNull();
      expect(result.targetComment).toBeNull();
    });

    test("should return null when board is null", () => {
      const result = findTargetReplyById(null, "r1");

      expect(result.targetReply).toBeNull();
      expect(result.targetComment).toBeNull();
    });

    test("should return null when comments is not an array", () => {
      const board = {
        comments: null,
      };

      const result = findTargetReplyById(board, "r1");

      expect(result.targetReply).toBeNull();
      expect(result.targetComment).toBeNull();
    });

    test("should handle comments without replies", () => {
      const board = {
        comments: [{ id: "c1" }],
      };

      const result = findTargetReplyById(board, "r1");

      expect(result.targetReply).toBeNull();
      expect(result.targetComment).toBeNull();
    });

    test("should handle empty replies array", () => {
      const board = {
        comments: [{ id: "c1", replies: [] }],
      };

      const result = findTargetReplyById(board, "r1");

      expect(result.targetReply).toBeNull();
      expect(result.targetComment).toBeNull();
    });
  });

  describe("findTargetCommentById", () => {
    test("should find target comment", () => {
      const board = {
        comments: [
          { id: "c1", comment: "First comment" },
          { id: "c2", comment: "Second comment" },
        ],
      };

      const result = findTargetCommentById(board, "c2");

      expect(result.id).toBe("c2");
      expect(result.comment).toBe("Second comment");
    });

    test("should handle _id instead of id", () => {
      const board = {
        comments: [{ _id: "c1", comment: "First comment" }],
      };

      const result = findTargetCommentById(board, "c1");

      expect(result._id).toBe("c1");
    });

    test("should return null when comment not found", () => {
      const board = {
        comments: [{ id: "c1", comment: "First comment" }],
      };

      const result = findTargetCommentById(board, "c999");

      expect(result).toBeNull();
    });

    test("should return null when board is null", () => {
      const result = findTargetCommentById(null, "c1");

      expect(result).toBeNull();
    });

    test("should return null when comments is not an array", () => {
      const board = {
        comments: null,
      };

      const result = findTargetCommentById(board, "c1");

      expect(result).toBeNull();
    });
  });

  describe("findTargetByUsername", () => {
    beforeEach(() => {
      jest.spyOn(User, "getUsernameById");
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test("should find target reply when username matches in replies", async () => {
      User.getUsernameById.mockImplementation((id) => {
        if (id === "user1") return Promise.resolve("alice");
        if (id === "user2") return Promise.resolve("bob");
        return Promise.resolve(null);
      });

      const board = {
        comments: [
          {
            id: "c1",
            author: "user2",
            replies: [{ id: "r1", author: "user1", reply: "Reply from alice" }],
          },
        ],
      };

      const result = await findTargetByUsername(board, "alice");

      expect(result.targetReply.id).toBe("r1");
      expect(result.targetComment.id).toBe("c1");
      expect(result.targetReply.author).toBe("user1");
    });

    test("should find target comment when username matches in comments", async () => {
      User.getUsernameById.mockImplementation((id) => {
        if (id === "user1") return Promise.resolve("alice");
        return Promise.resolve(null);
      });

      const board = {
        comments: [
          {
            id: "c1",
            author: "user1",
            comment: "Comment from alice",
          },
        ],
      };

      const result = await findTargetByUsername(board, "alice");

      expect(result.targetReply).toBeNull();
      expect(result.targetComment.id).toBe("c1");
      expect(result.targetComment.author).toBe("user1");
    });

    test("should prioritize replies over comments", async () => {
      User.getUsernameById.mockImplementation((id) => {
        if (id === "user1") return Promise.resolve("alice");
        return Promise.resolve(null);
      });

      const board = {
        comments: [
          {
            id: "c1",
            author: "user1",
            comment: "Comment from alice",
            replies: [{ id: "r1", author: "user1", reply: "Reply from alice" }],
          },
        ],
      };

      const result = await findTargetByUsername(board, "alice");

      expect(result.targetReply.id).toBe("r1");
      expect(result.targetComment.id).toBe("c1");
    });

    test("should return null when username not found", async () => {
      User.getUsernameById.mockResolvedValue(null);

      const board = {
        comments: [
          {
            id: "c1",
            author: "user1",
            replies: [{ id: "r1", author: "user2" }],
          },
        ],
      };

      const result = await findTargetByUsername(board, "nonexistent");

      expect(result.targetReply).toBeNull();
      expect(result.targetComment).toBeNull();
    });

    test("should return null when board is null", async () => {
      const result = await findTargetByUsername(null, "alice");

      expect(result.targetReply).toBeNull();
      expect(result.targetComment).toBeNull();
    });

    test("should return null when comments is not an array", async () => {
      const board = {
        comments: null,
      };

      const result = await findTargetByUsername(board, "alice");

      expect(result.targetReply).toBeNull();
      expect(result.targetComment).toBeNull();
    });

    test("should handle comments without replies", async () => {
      User.getUsernameById.mockResolvedValue("alice");

      const board = {
        comments: [
          {
            id: "c1",
            author: "user1",
          },
        ],
      };

      const result = await findTargetByUsername(board, "alice");

      expect(result.targetReply).toBeNull();
      expect(result.targetComment.id).toBe("c1");
    });

    test("should handle getUsernameById returning null", async () => {
      User.getUsernameById.mockResolvedValue(null);

      const board = {
        comments: [
          {
            id: "c1",
            author: "user1",
            replies: [{ id: "r1", author: "user2" }],
          },
        ],
      };

      const result = await findTargetByUsername(board, "alice");

      expect(result.targetReply).toBeNull();
      expect(result.targetComment).toBeNull();
    });
  });

  describe("findCascadedReplyIds", () => {
    test("should find all cascaded reply IDs", () => {
      const comment = {
        replies: [
          { id: "r1", replyTo: null },
          { id: "r2", replyTo: "r1" },
          { id: "r3", replyTo: "r2" },
          { id: "r4", replyTo: "r1" },
          { id: "r5", replyTo: null },
        ],
      };

      const result = findCascadedReplyIds(comment, "r1");

      expect(result).toContain("r1");
      expect(result).toContain("r2");
      expect(result).toContain("r3");
      expect(result).toContain("r4");
      expect(result.size).toBe(4);
      expect(result.has("r5")).toBe(false);
    });

    test("should handle _id instead of id", () => {
      const comment = {
        replies: [
          { _id: "r1", replyTo: null },
          { _id: "r2", replyTo: "r1" },
        ],
      };

      const result = findCascadedReplyIds(comment, "r1");

      expect(result).toContain("r1");
      expect(result).toContain("r2");
      expect(result.size).toBe(2);
    });

    test("should return only the deleted reply ID when no cascaded replies", () => {
      const comment = {
        replies: [
          { id: "r1", replyTo: null },
          { id: "r2", replyTo: null },
        ],
      };

      const result = findCascadedReplyIds(comment, "r1");

      expect(result).toContain("r1");
      expect(result.size).toBe(1);
    });

    test("should handle deep cascading", () => {
      const comment = {
        replies: [
          { id: "r1", replyTo: null },
          { id: "r2", replyTo: "r1" },
          { id: "r3", replyTo: "r2" },
          { id: "r4", replyTo: "r3" },
        ],
      };

      const result = findCascadedReplyIds(comment, "r1");

      expect(result).toContain("r1");
      expect(result).toContain("r2");
      expect(result).toContain("r3");
      expect(result).toContain("r4");
      expect(result.size).toBe(4);
    });

    test("should handle multiple branches", () => {
      const comment = {
        replies: [
          { id: "r1", replyTo: null },
          { id: "r2", replyTo: "r1" },
          { id: "r3", replyTo: "r1" },
          { id: "r4", replyTo: "r2" },
          { id: "r5", replyTo: "r3" },
        ],
      };

      const result = findCascadedReplyIds(comment, "r1");

      expect(result.size).toBe(5);
      expect(result.has("r1")).toBe(true);
      expect(result.has("r2")).toBe(true);
      expect(result.has("r3")).toBe(true);
      expect(result.has("r4")).toBe(true);
      expect(result.has("r5")).toBe(true);
    });

    test("should handle replies without replyTo field", () => {
      const comment = {
        replies: [
          { id: "r1", replyTo: null },
          { id: "r2" },
        ],
      };

      const result = findCascadedReplyIds(comment, "r1");

      expect(result).toContain("r1");
      expect(result.size).toBe(1);
    });

    test("should handle empty replies array", () => {
      const comment = {
        replies: [],
      };

      const result = findCascadedReplyIds(comment, "r1");

      expect(result).toContain("r1");
      expect(result.size).toBe(1);
    });

    test("should handle missing replies property", () => {
      const comment = {};

      const result = findCascadedReplyIds(comment, "r1");

      expect(result).toContain("r1");
      expect(result.size).toBe(1);
    });
  });
});

