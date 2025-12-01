import { jest } from "@jest/globals";
import {
  emitCoachingBoardComment,
  emitCoachingBoardReply,
  emitCoachingBoardNotification,
  emitCommentDeleted,
  emitReplyDeleted,
  findNewComment,
  findNewReply,
} from "../utils/coachingBoard/socketHelpers.js";
import User from "../entities/User.js";

describe("socketHelpers", () => {
  let mockSocketInstance;
  let mockReq;

  beforeEach(() => {
    mockSocketInstance = {
      emitCoachingBoardComment: jest.fn(),
      emitCoachingBoardReply: jest.fn(),
      emitCoachingBoardNotification: jest.fn(),
      emitCoachingBoardCommentDeleted: jest.fn(),
      emitCoachingBoardReplyDeleted: jest.fn(),
    };

    mockReq = {
      app: {
        get: jest.fn((key) => {
          if (key === "socketInstance") return mockSocketInstance;
          return null;
        }),
      },
    };

    jest.spyOn(User, "getUsernameById");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("emitCoachingBoardComment", () => {
    test("should emit comment with author name", async () => {
      User.getUsernameById.mockResolvedValue("alice");

      const comment = {
        id: "c1",
        author: "user1",
        comment: "Test comment",
      };

      await emitCoachingBoardComment(mockReq, "board1", comment);

      expect(User.getUsernameById).toHaveBeenCalledWith("user1");
      expect(mockSocketInstance.emitCoachingBoardComment).toHaveBeenCalledWith("board1", {
        ...comment,
        authorName: "alice",
      });
    });

    test("should use 'Unknown' when getUsernameById fails", async () => {
      User.getUsernameById.mockRejectedValue(new Error("User not found"));

      const comment = {
        id: "c1",
        author: "user1",
        comment: "Test comment",
      };

      await emitCoachingBoardComment(mockReq, "board1", comment);

      expect(mockSocketInstance.emitCoachingBoardComment).toHaveBeenCalledWith("board1", {
        ...comment,
        authorName: "Unknown",
      });
    });

    test("should use 'Unknown' when getUsernameById returns null", async () => {
      User.getUsernameById.mockResolvedValue(null);

      const comment = {
        id: "c1",
        author: "user1",
        comment: "Test comment",
      };

      await emitCoachingBoardComment(mockReq, "board1", comment);

      expect(mockSocketInstance.emitCoachingBoardComment).toHaveBeenCalledWith("board1", {
        ...comment,
        authorName: "Unknown",
      });
    });

    test("should not emit when socketInstance is null", async () => {
      mockReq.app.get.mockReturnValue(null);

      const comment = {
        id: "c1",
        author: "user1",
        comment: "Test comment",
      };

      await emitCoachingBoardComment(mockReq, "board1", comment);

      expect(mockSocketInstance.emitCoachingBoardComment).not.toHaveBeenCalled();
    });

    test("should not emit when comment is null", async () => {
      await emitCoachingBoardComment(mockReq, "board1", null);

      expect(mockSocketInstance.emitCoachingBoardComment).not.toHaveBeenCalled();
    });

    test("should handle error gracefully", async () => {
      mockSocketInstance.emitCoachingBoardComment.mockImplementation(() => {
        throw new Error("Socket error");
      });

      const comment = {
        id: "c1",
        author: "user1",
        comment: "Test comment",
      };

      await expect(emitCoachingBoardComment(mockReq, "board1", comment)).resolves.not.toThrow();
    });

    test("should handle req.app being null", async () => {
      const reqWithoutApp = {};
      const comment = { id: "c1", author: "user1" };

      await expect(emitCoachingBoardComment(reqWithoutApp, "board1", comment)).resolves.not.toThrow();
    });
  });

  describe("emitCoachingBoardReply", () => {
    test("should emit reply with author name", async () => {
      User.getUsernameById.mockResolvedValue("bob");

      const reply = {
        id: "r1",
        author: "user2",
        reply: "Test reply",
      };

      await emitCoachingBoardReply(mockReq, "board1", "comment1", reply);

      expect(User.getUsernameById).toHaveBeenCalledWith("user2");
      expect(mockSocketInstance.emitCoachingBoardReply).toHaveBeenCalledWith("board1", "comment1", {
        ...reply,
        authorName: "bob",
      });
    });

    test("should use 'Unknown' when getUsernameById fails", async () => {
      User.getUsernameById.mockRejectedValue(new Error("User not found"));

      const reply = {
        id: "r1",
        author: "user2",
        reply: "Test reply",
      };

      await emitCoachingBoardReply(mockReq, "board1", "comment1", reply);

      expect(mockSocketInstance.emitCoachingBoardReply).toHaveBeenCalledWith("board1", "comment1", {
        ...reply,
        authorName: "Unknown",
      });
    });

    test("should not emit when socketInstance is null", async () => {
      mockReq.app.get.mockReturnValue(null);

      const reply = {
        id: "r1",
        author: "user2",
        reply: "Test reply",
      };

      await emitCoachingBoardReply(mockReq, "board1", "comment1", reply);

      expect(mockSocketInstance.emitCoachingBoardReply).not.toHaveBeenCalled();
    });

    test("should not emit when reply is null", async () => {
      await emitCoachingBoardReply(mockReq, "board1", "comment1", null);

      expect(mockSocketInstance.emitCoachingBoardReply).not.toHaveBeenCalled();
    });

    test("should handle error gracefully", async () => {
      mockSocketInstance.emitCoachingBoardReply.mockImplementation(() => {
        throw new Error("Socket error");
      });

      const reply = {
        id: "r1",
        author: "user2",
        reply: "Test reply",
      };

      await expect(emitCoachingBoardReply(mockReq, "board1", "comment1", reply)).resolves.not.toThrow();
    });
  });

  describe("emitCoachingBoardNotification", () => {
    test("should emit notification to user IDs", async () => {
      const userIds = ["user1", "user2"];
      const notification = { type: "new_comment", message: "New comment" };

      await emitCoachingBoardNotification(mockReq, userIds, notification);

      expect(mockSocketInstance.emitCoachingBoardNotification).toHaveBeenCalledWith(userIds, notification);
    });

    test("should not emit when socketInstance is null", async () => {
      mockReq.app.get.mockReturnValue(null);

      const userIds = ["user1"];
      const notification = { type: "new_comment" };

      await emitCoachingBoardNotification(mockReq, userIds, notification);

      expect(mockSocketInstance.emitCoachingBoardNotification).not.toHaveBeenCalled();
    });

    test("should not emit when userIds is null", async () => {
      const notification = { type: "new_comment" };

      await emitCoachingBoardNotification(mockReq, null, notification);

      expect(mockSocketInstance.emitCoachingBoardNotification).not.toHaveBeenCalled();
    });

    test("should not emit when userIds is empty array", async () => {
      const notification = { type: "new_comment" };

      await emitCoachingBoardNotification(mockReq, [], notification);

      expect(mockSocketInstance.emitCoachingBoardNotification).not.toHaveBeenCalled();
    });

    test("should handle error gracefully", async () => {
      mockSocketInstance.emitCoachingBoardNotification.mockImplementation(() => {
        throw new Error("Socket error");
      });

      const userIds = ["user1"];
      const notification = { type: "new_comment" };

      await expect(emitCoachingBoardNotification(mockReq, userIds, notification)).resolves.not.toThrow();
    });
  });

  describe("emitCommentDeleted", () => {
    test("should emit comment deleted notification", () => {
      emitCommentDeleted(mockReq, "board1", "comment1");

      expect(mockSocketInstance.emitCoachingBoardCommentDeleted).toHaveBeenCalledWith("board1", "comment1");
    });

    test("should not emit when socketInstance is null", () => {
      mockReq.app.get.mockReturnValue(null);

      emitCommentDeleted(mockReq, "board1", "comment1");

      expect(mockSocketInstance.emitCoachingBoardCommentDeleted).not.toHaveBeenCalled();
    });

    test("should handle error gracefully", () => {
      mockSocketInstance.emitCoachingBoardCommentDeleted.mockImplementation(() => {
        throw new Error("Socket error");
      });

      expect(() => emitCommentDeleted(mockReq, "board1", "comment1")).not.toThrow();
    });

    test("should handle req.app being null", () => {
      const reqWithoutApp = {};

      expect(() => emitCommentDeleted(reqWithoutApp, "board1", "comment1")).not.toThrow();
    });
  });

  describe("emitReplyDeleted", () => {
    test("should emit reply deleted notification", () => {
      emitReplyDeleted(mockReq, "board1", "comment1", "reply1");

      expect(mockSocketInstance.emitCoachingBoardReplyDeleted).toHaveBeenCalledWith("board1", "comment1", "reply1");
    });

    test("should not emit when socketInstance is null", () => {
      mockReq.app.get.mockReturnValue(null);

      emitReplyDeleted(mockReq, "board1", "comment1", "reply1");

      expect(mockSocketInstance.emitCoachingBoardReplyDeleted).not.toHaveBeenCalled();
    });

    test("should handle error gracefully", () => {
      mockSocketInstance.emitCoachingBoardReplyDeleted.mockImplementation(() => {
        throw new Error("Socket error");
      });

      expect(() => emitReplyDeleted(mockReq, "board1", "comment1", "reply1")).not.toThrow();
    });
  });

  describe("findNewComment", () => {
    test("should find newly created comment", () => {
      const now = Date.now();
      const board = {
        comments: [
          {
            id: "c1",
            author: "user1",
            comment: "New comment",
            timestamp: new Date(now - 1000),
          },
          {
            id: "c2",
            author: "user2",
            comment: "Old comment",
            timestamp: new Date(now - 10000),
          },
        ],
      };

      const result = findNewComment(board, "user1", "New comment");

      expect(result).not.toBeNull();
      expect(result.id).toBe("c1");
      expect(result.comment).toBe("New comment");
    });

    test("should return null when comment not found", () => {
      const board = {
        comments: [
          {
            id: "c1",
            author: "user1",
            comment: "Different comment",
            timestamp: new Date(),
          },
        ],
      };

      const result = findNewComment(board, "user1", "New comment");

      expect(result).toBeUndefined();
    });

    test("should return null when author does not match", () => {
      const board = {
        comments: [
          {
            id: "c1",
            author: "user2",
            comment: "New comment",
            timestamp: new Date(),
          },
        ],
      };

      const result = findNewComment(board, "user1", "New comment");

      expect(result).toBeUndefined();
    });

    test("should return null when timestamp is too old", () => {
      const board = {
        comments: [
          {
            id: "c1",
            author: "user1",
            comment: "New comment",
            timestamp: new Date(Date.now() - 10000),
          },
        ],
      };

      const result = findNewComment(board, "user1", "New comment");

      expect(result).toBeUndefined();
    });

    test("should return null when board is null", () => {
      const result = findNewComment(null, "user1", "New comment");

      expect(result).toBeNull();
    });

    test("should return null when comments is not an array", () => {
      const board = {
        comments: null,
      };

      const result = findNewComment(board, "user1", "New comment");

      expect(result).toBeNull();
    });

    test("should handle string author IDs", () => {
      const board = {
        comments: [
          {
            id: "c1",
            author: "123",
            comment: "New comment",
            timestamp: new Date(),
          },
        ],
      };

      const result = findNewComment(board, "123", "New comment");

      expect(result).not.toBeNull();
      expect(result.id).toBe("c1");
    });
  });

  describe("findNewReply", () => {
    test("should find newly created reply", () => {
      const now = Date.now();
      const board = {
        comments: [
          {
            id: "c1",
            replies: [
              {
                id: "r1",
                author: "user1",
                reply: "New reply",
                timestamp: new Date(now - 1000),
              },
            ],
          },
        ],
      };

      const result = findNewReply(board, "c1", "user1", "New reply");

      expect(result).not.toBeNull();
      expect(result.id).toBe("r1");
      expect(result.reply).toBe("New reply");
    });

    test("should return null when comment not found", () => {
      const board = {
        comments: [
          {
            id: "c2",
            replies: [],
          },
        ],
      };

      const result = findNewReply(board, "c1", "user1", "New reply");

      expect(result).toBeNull();
    });

    test("should return null when reply not found", () => {
      const board = {
        comments: [
          {
            id: "c1",
            replies: [
              {
                id: "r1",
                author: "user1",
                reply: "Different reply",
                timestamp: new Date(),
              },
            ],
          },
        ],
      };

      const result = findNewReply(board, "c1", "user1", "New reply");

      expect(result).toBeUndefined();
    });

    test("should return null when author does not match", () => {
      const board = {
        comments: [
          {
            id: "c1",
            replies: [
              {
                id: "r1",
                author: "user2",
                reply: "New reply",
                timestamp: new Date(),
              },
            ],
          },
        ],
      };

      const result = findNewReply(board, "c1", "user1", "New reply");

      expect(result).toBeUndefined();
    });

    test("should return null when timestamp is too old", () => {
      const board = {
        comments: [
          {
            id: "c1",
            replies: [
              {
                id: "r1",
                author: "user1",
                reply: "New reply",
                timestamp: new Date(Date.now() - 10000),
              },
            ],
          },
        ],
      };

      const result = findNewReply(board, "c1", "user1", "New reply");

      expect(result).toBeUndefined();
    });

    test("should return null when board is null", () => {
      const result = findNewReply(null, "c1", "user1", "New reply");

      expect(result).toBeNull();
    });

    test("should return null when comments is not an array", () => {
      const board = {
        comments: null,
      };

      const result = findNewReply(board, "c1", "user1", "New reply");

      expect(result).toBeNull();
    });

    test("should return null when comment has no replies", () => {
      const board = {
        comments: [
          {
            id: "c1",
          },
        ],
      };

      const result = findNewReply(board, "c1", "user1", "New reply");

      expect(result).toBeNull();
    });

    test("should return null when replies is not an array", () => {
      const board = {
        comments: [
          {
            id: "c1",
            replies: null,
          },
        ],
      };

      const result = findNewReply(board, "c1", "user1", "New reply");

      expect(result).toBeNull();
    });

    test("should handle _id instead of id", () => {
      const board = {
        comments: [
          {
            _id: "c1",
            replies: [
              {
                _id: "r1",
                author: "user1",
                reply: "New reply",
                timestamp: new Date(),
              },
            ],
          },
        ],
      };

      const result = findNewReply(board, "c1", "user1", "New reply");

      expect(result).not.toBeNull();
      expect(result._id).toBe("r1");
    });
  });
});

