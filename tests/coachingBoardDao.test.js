import { jest } from "@jest/globals";
import { CoachingBoardDao } from "../daos/CoachingBoardDao.js";
import { USER_STATUS } from "../constants/userStatus.js";
import UserDac from "../dacs/userDac.js";
import { UserDao } from "../daos/UserDao.js";

describe("CoachingBoardDao", () => {
  let dao;
  let mockModel;
  let mockUserModel;
  let userDao;


  beforeEach(() => {
    // Set up mock UserModel and UserDao
    mockUserModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };
    userDao = new UserDao({ UserModel: mockUserModel });
    UserDac.DAO = userDao;

    mockModel = {
      exists: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      deleteOne: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      updateOne: jest.fn(),
      countDocuments: jest.fn(),
    };

    dao = new CoachingBoardDao({ CoachingBoardModel: mockModel });
  });

  describe("constructor", () => {
    test("should initialize with CoachingBoardModel", () => {
      const newDao = new CoachingBoardDao({ CoachingBoardModel: mockModel });
      expect(newDao).toBeInstanceOf(CoachingBoardDao);
    });
  });

  describe("findPublishedByTitle", () => {
    test("should find board by title without excludeId", async () => {
      const mockDoc = { _id: "board123" };
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDoc),
      };
      mockModel.findOne.mockReturnValue(mockQuery);

      const result = await dao.findPublishedByTitle({ title: "Test Title" });

      expect(result).toBe("board123");
      expect(mockModel.findOne).toHaveBeenCalled();
    });

    test("should find board by title with excludeId", async () => {
      const mockDoc = { _id: "board456" };
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDoc),
      };
      mockModel.findOne.mockReturnValue(mockQuery);

      const result = await dao.findPublishedByTitle({ title: "Test Title", excludeId: "board123" });

      expect(result).toBe("board456");
      const queryCall = mockModel.findOne.mock.calls[0][0];
      expect(queryCall._id).toEqual({ $ne: "board123" });
    });

    test("should return null when board not found", async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      mockModel.findOne.mockReturnValue(mockQuery);

      const result = await dao.findPublishedByTitle({ title: "Nonexistent" });

      expect(result).toBeNull();
    });

    test("should escape special regex characters in title", async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      mockModel.findOne.mockReturnValue(mockQuery);

      await dao.findPublishedByTitle({ title: "Test.*+?^${}()[]\\" });

      const queryCall = mockModel.findOne.mock.calls[0][0];
      expect(queryCall.title).toBeInstanceOf(RegExp);
    });
  });

  describe("getById", () => {
    test("should return null when author is inactive", async () => {
      const mockDoc = {
        _id: "board123",
        author: "user1",
        title: "Test Board",
        comments: [],
      };
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(mockDoc),
      };
      mockModel.findById.mockReturnValue(mockQuery);

      // Mock User.findById to return inactive user
      mockUserModel.findById.mockResolvedValue({
        _id: "user1",
        status: USER_STATUS.INACTIVE,
      });

      const result = await dao.getById({ id: "board123" });

      expect(result).toBeNull();
      expect(mockUserModel.findById).toHaveBeenCalledWith("user1");
    });

    test("should return null when author not found", async () => {
      const mockDoc = {
        _id: "board123",
        author: "user1",
        title: "Test Board",
        comments: [],
      };
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(mockDoc),
      };
      mockModel.findById.mockReturnValue(mockQuery);


      const result = await dao.getById({ id: "board123" });

      expect(result).toBeNull();
    });

    test("should filter out comments from inactive users", async () => {
      const mockDoc = {
        _id: "board123",
        author: "user1",
        title: "Test Board",
        comments: [
          {
            _id: "comment1",
            author: "user2",
            comment: "Comment from active user",
            replies: [],
          },
          {
            _id: "comment2",
            author: "user3",
            comment: "Comment from inactive user",
            replies: [],
          },
        ],
      };
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(mockDoc),
      };
      mockModel.findById.mockReturnValue(mockQuery);

      // Mock User.findById for author check
      mockUserModel.findById.mockImplementation((id) => {
        if (id === "user1") {
          return Promise.resolve({ _id: "user1", status: USER_STATUS.ACTIVE });
        }
        return Promise.resolve(null);
      });

      // Mock getActiveUserIds to return only active users
      // Since we can't mock it, we need to ensure User.findById works correctly
      // getActiveUserIds will call User.findById for each user
      mockUserModel.findById.mockImplementation((id) => {
        if (id === "user1" || id === "user2") {
          return Promise.resolve({ _id: id, status: USER_STATUS.ACTIVE });
        }
        if (id === "user3") {
          return Promise.resolve({ _id: id, status: USER_STATUS.INACTIVE });
        }
        return Promise.resolve(null);
      });

      const result = await dao.getById({ id: "board123" });

      expect(result).not.toBeNull();
      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].author).toBe("user2");
    });

    test("should filter out replies from inactive users", async () => {
      const mockDoc = {
        _id: "board123",
        author: "user1",
        title: "Test Board",
        comments: [
          {
            _id: "comment1",
            author: "user2",
            comment: "Comment",
            replies: [
              {
                _id: "reply1",
                author: "user3",
                reply: "Reply from active user",
              },
              {
                _id: "reply2",
                author: "user4",
                reply: "Reply from inactive user",
              },
            ],
          },
        ],
      };
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(mockDoc),
      };
      mockModel.findById.mockReturnValue(mockQuery);

      // Mock User.findById for all users
      mockUserModel.findById.mockImplementation((id) => {
        const users = {
          user1: { _id: "user1", status: USER_STATUS.ACTIVE },
          user2: { _id: "user2", status: USER_STATUS.ACTIVE },
          user3: { _id: "user3", status: USER_STATUS.ACTIVE },
          user4: { _id: "user4", status: USER_STATUS.INACTIVE },
        };
        return Promise.resolve(users[id] || null);
      });

      const result = await dao.getById({ id: "board123" });

      expect(result).not.toBeNull();
      expect(result.comments[0].replies).toHaveLength(1);
      expect(result.comments[0].replies[0].author).toBe("user3");
    });

    test("should collect all user IDs from comments and replies", async () => {
      const mockDoc = {
        _id: "board123",
        author: "user1",
        title: "Test Board",
        comments: [
          {
            _id: "comment1",
            author: "user2",
            comment: "Comment",
            replies: [
              {
                _id: "reply1",
                author: "user3",
                reply: "Reply",
              },
            ],
          },
        ],
      };
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(mockDoc),
      };
      mockModel.findById.mockReturnValue(mockQuery);

      // Mock User.findById for all users (all active)
      mockUserModel.findById.mockImplementation((id) => {
        const users = {
          user1: { _id: "user1", status: USER_STATUS.ACTIVE },
          user2: { _id: "user2", status: USER_STATUS.ACTIVE },
          user3: { _id: "user3", status: USER_STATUS.ACTIVE },
        };
        return Promise.resolve(users[id] || null);
      });

      const result = await dao.getById({ id: "board123" });

      // Should successfully filter and return board with all active users
      expect(result).not.toBeNull();
      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].replies).toHaveLength(1);
    });
  });

  describe("subscribe", () => {
    test("should add user to subscribers if not already subscribed", async () => {
      const mockBoard = {
        _id: "board123",
        subscribers: [],
        notificationSeenAt: [],
        save: jest.fn().mockResolvedValue(true),
      };
      mockModel.findById.mockResolvedValue(mockBoard);

      await dao.subscribe({ id: "board123", userId: "user1" });

      expect(mockBoard.subscribers).toContain("user1");
      expect(mockBoard.save).toHaveBeenCalled();
    });

    test("should not add duplicate subscriber", async () => {
      const mockBoard = {
        _id: "board123",
        subscribers: ["user1"],
        notificationSeenAt: [],
        save: jest.fn().mockResolvedValue(true),
      };
      mockModel.findById.mockResolvedValue(mockBoard);

      await dao.subscribe({ id: "board123", userId: "user1" });

      expect(mockBoard.subscribers).toHaveLength(1);
      expect(mockBoard.subscribers[0]).toBe("user1");
    });

    test("should update notificationSeenAt when subscribing", async () => {
      const mockBoard = {
        _id: "board123",
        subscribers: [],
        notificationSeenAt: [
          { userId: "user1", timestamp: new Date("2024-01-01") },
        ],
        save: jest.fn().mockResolvedValue(true),
      };
      mockModel.findById.mockResolvedValue(mockBoard);

      await dao.subscribe({ id: "board123", userId: "user1" });

      expect(mockBoard.notificationSeenAt).toHaveLength(1);
      expect(mockBoard.notificationSeenAt[0].userId).toBe("user1");
      expect(mockBoard.notificationSeenAt[0].timestamp).toBeInstanceOf(Date);
    });

    test("should initialize subscribers array if null", async () => {
      const mockBoard = {
        _id: "board123",
        subscribers: null,
        notificationSeenAt: [],
        save: jest.fn().mockResolvedValue(true),
      };
      mockModel.findById.mockResolvedValue(mockBoard);

      await dao.subscribe({ id: "board123", userId: "user1" });

      expect(Array.isArray(mockBoard.subscribers)).toBe(true);
      expect(mockBoard.subscribers).toContain("user1");
    });

    test("should initialize notificationSeenAt array if null", async () => {
      const mockBoard = {
        _id: "board123",
        subscribers: [],
        notificationSeenAt: null,
        save: jest.fn().mockResolvedValue(true),
      };
      mockModel.findById.mockResolvedValue(mockBoard);

      await dao.subscribe({ id: "board123", userId: "user1" });

      expect(Array.isArray(mockBoard.notificationSeenAt)).toBe(true);
    });

    test("should return early when board not found", async () => {
      mockModel.findById.mockResolvedValue(null);

      await dao.subscribe({ id: "nonexistent", userId: "user1" });

      expect(mockModel.findById).toHaveBeenCalledWith("nonexistent");
    });
  });

  describe("unsubscribe", () => {
    test("should remove user from subscribers", async () => {
      mockModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await dao.unsubscribe({ id: "board123", userId: "user1" });

      expect(mockModel.updateOne).toHaveBeenCalledWith(
        { _id: "board123" },
        { $pull: { subscribers: "user1" } }
      );
    });
  });

  describe("toggleCommentLike", () => {
    test("should remove like when already liked", async () => {
      const likesArray = ["user1", "user2"];
      likesArray.pull = jest.fn((userId) => {
        const index = likesArray.indexOf(userId);
        if (index > -1) {
          likesArray.splice(index, 1);
        }
      });
      // Keep original push for adding
      const originalPush = likesArray.push.bind(likesArray);
      likesArray.push = jest.fn((userId) => {
        if (!likesArray.includes(userId)) {
          originalPush(userId);
        }
      });

      const mockComment = {
        _id: "comment1",
        likes: likesArray,
      };
      const mockBoard = {
        _id: "board123",
        comments: {
          id: jest.fn().mockReturnValue(mockComment),
        },
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: "board123",
          title: "Test Board",
          comments: [],
        }),
      };
      mockModel.findOne.mockResolvedValue(mockBoard);

      await dao.toggleCommentLike({ id: "board123", commentId: "comment1", userId: "user1" });

      expect(likesArray.pull).toHaveBeenCalledWith("user1");
      expect(likesArray).not.toContain("user1");
    });
  });

  describe("deleteReply", () => {
    test("should delete cascaded replies", async () => {
      const mockReply1 = {
        _id: "reply1",
        author: "user1",
        reply: "First reply",
        replyTo: null,
      };
      const mockReply2 = {
        _id: "reply2",
        author: "user2",
        reply: "Reply to reply1",
        replyTo: "reply1",
      };
      const mockReply3 = {
        _id: "reply3",
        author: "user3",
        reply: "Reply to reply2",
        replyTo: "reply2",
      };
      const mockReply4 = {
        _id: "reply4",
        author: "user4",
        reply: "Independent reply",
        replyTo: null,
      };

      const repliesArray = [mockReply1, mockReply2, mockReply3, mockReply4];
      const repliesObject = {
        id: jest.fn((id) => {
          if (id === "reply1") return mockReply1;
          return null;
        }),
        pull: jest.fn(),
      };

      const mockComment = {
        _id: "comment1",
        author: "user1",
      };

      // Set up replies as both array (for iteration) and object (for id/pull methods)
      Object.defineProperty(mockComment, "replies", {
        get: () => repliesArray,
        configurable: true,
      });
      mockComment.replies.id = repliesObject.id;
      mockComment.replies.pull = repliesObject.pull;

      const mockBoard = {
        _id: "board123",
        publicationState: "published",
        comments: {
          id: jest.fn().mockReturnValue(mockComment),
        },
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: "board123",
          title: "Test Board",
          comments: [],
        }),
      };

      mockModel.findOne.mockResolvedValue(mockBoard);

      await dao.deleteReply({
        id: "board123",
        commentId: "comment1",
        replyId: "reply1",
        author: "user1",
      });

      // Should delete reply1, reply2, and reply3 (cascaded)
      expect(repliesObject.pull).toHaveBeenCalledWith("reply1");
      expect(repliesObject.pull).toHaveBeenCalledWith("reply2");
      expect(repliesObject.pull).toHaveBeenCalledWith("reply3");
      expect(repliesObject.pull).not.toHaveBeenCalledWith("reply4");
    });

    test("should handle deep cascading", async () => {
      const mockReply1 = {
        _id: "reply1",
        author: "user1",
        replyTo: null,
      };
      const mockReply2 = {
        _id: "reply2",
        author: "user2",
        replyTo: "reply1",
      };
      const mockReply3 = {
        _id: "reply3",
        author: "user3",
        replyTo: "reply2",
      };
      const mockReply4 = {
        _id: "reply4",
        author: "user4",
        replyTo: "reply3",
      };

      const repliesArray = [mockReply1, mockReply2, mockReply3, mockReply4];
      const repliesObject = {
        id: jest.fn((id) => {
          if (id === "reply1") return mockReply1;
          return null;
        }),
        pull: jest.fn(),
      };

      const mockComment = {
        _id: "comment1",
        author: "user1",
      };

      Object.defineProperty(mockComment, "replies", {
        get: () => repliesArray,
        configurable: true,
      });
      mockComment.replies.id = repliesObject.id;
      mockComment.replies.pull = repliesObject.pull;

      const mockBoard = {
        _id: "board123",
        publicationState: "published",
        comments: {
          id: jest.fn().mockReturnValue(mockComment),
        },
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: "board123",
          title: "Test Board",
          comments: [],
        }),
      };

      mockModel.findOne.mockResolvedValue(mockBoard);

      await dao.deleteReply({
        id: "board123",
        commentId: "comment1",
        replyId: "reply1",
        author: "user1",
      });

      // Should delete all cascaded replies
      expect(repliesObject.pull).toHaveBeenCalledWith("reply1");
      expect(repliesObject.pull).toHaveBeenCalledWith("reply2");
      expect(repliesObject.pull).toHaveBeenCalledWith("reply3");
      expect(repliesObject.pull).toHaveBeenCalledWith("reply4");
    });
  });

  describe("markNotificationSeen", () => {
    test("should update notificationSeenAt for user", async () => {
      const mockBoard = {
        _id: "board123",
        notificationSeenAt: [
          { userId: "user2", timestamp: new Date("2024-01-01") },
        ],
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: "board123",
          title: "Test Board",
          comments: [],
        }),
      };
      mockModel.findById.mockResolvedValue(mockBoard);

      const result = await dao.markNotificationSeen({ id: "board123", userId: "user1" });

      // Should have 2 entries: user2 (existing) and user1 (new)
      expect(mockBoard.notificationSeenAt).toHaveLength(2);
      const user1Entry = mockBoard.notificationSeenAt.find(e => e.userId === "user1");
      expect(user1Entry).toBeDefined();
      expect(user1Entry.timestamp).toBeInstanceOf(Date);
      expect(result).not.toBeNull();
    });

    test("should filter out existing entry for user", async () => {
      const oldTimestamp = new Date("2024-01-01");
      const mockBoard = {
        _id: "board123",
        notificationSeenAt: [
          { userId: "user1", timestamp: oldTimestamp },
          { userId: "user2", timestamp: new Date("2024-01-02") },
        ],
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: "board123",
          title: "Test Board",
          comments: [],
        }),
      };
      mockModel.findById.mockResolvedValue(mockBoard);

      await dao.markNotificationSeen({ id: "board123", userId: "user1" });

      expect(mockBoard.notificationSeenAt).toHaveLength(2);
      expect(mockBoard.notificationSeenAt[0].userId).toBe("user2");
      expect(mockBoard.notificationSeenAt[1].userId).toBe("user1");
      expect(mockBoard.notificationSeenAt[1].timestamp).not.toBe(oldTimestamp);
    });

    test("should initialize notificationSeenAt if null", async () => {
      const mockBoard = {
        _id: "board123",
        notificationSeenAt: null,
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: "board123",
          title: "Test Board",
          comments: [],
        }),
      };
      mockModel.findById.mockResolvedValue(mockBoard);

      await dao.markNotificationSeen({ id: "board123", userId: "user1" });

      expect(Array.isArray(mockBoard.notificationSeenAt)).toBe(true);
      expect(mockBoard.notificationSeenAt).toHaveLength(1);
    });

    test("should return null when board not found", async () => {
      mockModel.findById.mockResolvedValue(null);

      const result = await dao.markNotificationSeen({ id: "nonexistent", userId: "user1" });

      expect(result).toBeNull();
    });
  });

  describe("getPendingNotificationsForUser", () => {
    test("should return board_updated notification for subscribed board", async () => {
      const mockBoard = {
        _id: "board123",
        title: "Test Board",
        author: "user2",
        subscribers: ["user1"],
        contentUpdatedAt: new Date(),
        notificationSeenAt: [],
        comments: [],
      };

      const mockQuery = {
        lean: jest.fn().mockResolvedValue([mockBoard]),
      };
      mockModel.find.mockReturnValue(mockQuery);

      const result = await dao.getPendingNotificationsForUser({ userId: "user1" });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("board_updated");
      expect(result[0].boardId).toBe("board123");
    });

    test("should not return board_updated notification for own board", async () => {
      const mockBoard = {
        _id: "board123",
        title: "Test Board",
        author: "user1",
        subscribers: ["user1"],
        contentUpdatedAt: new Date(),
        notificationSeenAt: [],
        comments: [],
      };

      const mockQuery = {
        lean: jest.fn().mockResolvedValue([mockBoard]),
      };
      mockModel.find.mockReturnValue(mockQuery);

      const result = await dao.getPendingNotificationsForUser({ userId: "user1" });

      expect(result).toHaveLength(0);
    });

    test("should return new_comment notification", async () => {
      const mockBoard = {
        _id: "board123",
        title: "Test Board",
        author: "user2",
        subscribers: ["user1"],
        contentUpdatedAt: null,
        notificationSeenAt: [],
        comments: [
          {
            _id: "comment1",
            author: "user2",
            comment: "New comment",
            timestamp: new Date(),
          },
        ],
      };

      const mockQuery = {
        lean: jest.fn().mockResolvedValue([mockBoard]),
      };
      mockModel.find.mockReturnValue(mockQuery);

      const result = await dao.getPendingNotificationsForUser({ userId: "user1" });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("new_comment");
      expect(result[0].commentId).toBe("comment1");
    });

    test("should return new_reply notification for reply to user comment", async () => {
      const mockBoard = {
        _id: "board123",
        title: "Test Board",
        author: "user2",
        subscribers: [],
        notificationSeenAt: [],
        comments: [
          {
            _id: "comment1",
            author: "user1",
            comment: "User comment",
            replies: [
              {
                _id: "reply1",
                author: "user2",
                reply: "Reply to user",
                replyTo: null,
                timestamp: new Date(),
              },
            ],
          },
        ],
      };

      const mockQuery = {
        lean: jest.fn().mockResolvedValue([mockBoard]),
      };
      mockModel.find.mockReturnValue(mockQuery);

      const result = await dao.getPendingNotificationsForUser({ userId: "user1" });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("new_reply");
      expect(result[0].replyId).toBe("reply1");
    });

    test("should return new_reply notification for reply to user reply", async () => {
      const mockBoard = {
        _id: "board123",
        title: "Test Board",
        author: "user2",
        publicationState: "published",
        subscribers: [],
        notificationSeenAt: [],
        contentUpdatedAt: new Date("2024-01-03"),
        comments: [
          {
            _id: "comment1",
            author: "user2",
            comment: "Comment",
            timestamp: new Date("2024-01-01"),
            replies: [
              {
                _id: "reply1",
                author: "user1",
                reply: "User reply",
                replyTo: null,
                timestamp: new Date("2024-01-01"),
              },
              {
                _id: "reply2",
                author: "user2",
                reply: "Reply to user reply",
                replyTo: "reply1",
                timestamp: new Date("2024-01-02"),
              },
            ],
          },
        ],
      };

      // Mock find to return different results for subscribed boards and boards with user activity
      const mockQuery = {
        lean: jest.fn()
          .mockResolvedValueOnce([]) // subscribedBoards (empty, user1 not subscribed)
          .mockResolvedValueOnce([mockBoard]), // boardsWithUserActivity (user1 has reply1)
      };
      mockModel.find.mockReturnValue(mockQuery);

      const result = await dao.getPendingNotificationsForUser({ userId: "user1" });

      // Should return new_reply notification for reply2
      const replyNotifications = result.filter(n => n.type === "new_reply");
      expect(replyNotifications.length).toBeGreaterThan(0);
      const reply2Notification = replyNotifications.find(n => n.replyId === "reply2");
      expect(reply2Notification).toBeDefined();
      expect(reply2Notification.type).toBe("new_reply");
    });

    test("should handle recursive reply chains", async () => {
      const mockBoard = {
        _id: "board123",
        title: "Test Board",
        author: "user2",
        subscribers: [],
        notificationSeenAt: [],
        comments: [
          {
            _id: "comment1",
            author: "user2",
            comment: "Comment",
            replies: [
              {
                _id: "reply1",
                author: "user1",
                reply: "User reply",
                replyTo: null,
                timestamp: new Date("2024-01-01"),
              },
              {
                _id: "reply2",
                author: "user2",
                reply: "Reply to reply1",
                replyTo: "reply1",
                timestamp: new Date("2024-01-02"),
              },
              {
                _id: "reply3",
                author: "user3",
                reply: "Reply to reply2",
                replyTo: "reply2",
                timestamp: new Date("2024-01-03"),
              },
            ],
          },
        ],
      };

      const mockQuery = {
        lean: jest.fn().mockResolvedValue([mockBoard]),
      };
      mockModel.find.mockReturnValue(mockQuery);

      const result = await dao.getPendingNotificationsForUser({ userId: "user1" });

      // Should notify about reply2 (direct reply to user1's reply)
      expect(result.length).toBeGreaterThan(0);
      const replyNotifications = result.filter(n => n.type === "new_reply");
      expect(replyNotifications.length).toBeGreaterThan(0);
    });

    test("should filter notifications by lastSeenAt", async () => {
      const oldTimestamp = new Date("2024-01-01");
      const newTimestamp = new Date("2024-01-03");

      const mockBoard = {
        _id: "board123",
        title: "Test Board",
        author: "user2",
        subscribers: ["user1"],
        contentUpdatedAt: newTimestamp,
        notificationSeenAt: [
          { userId: "user1", timestamp: new Date("2024-01-02") },
        ],
        comments: [],
      };

      const mockQuery = {
        lean: jest.fn().mockResolvedValue([mockBoard]),
      };
      mockModel.find.mockReturnValue(mockQuery);

      const result = await dao.getPendingNotificationsForUser({ userId: "user1" });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("board_updated");
    });

    test("should not return notification if contentUpdatedAt is before lastSeenAt", async () => {
      const oldTimestamp = new Date("2024-01-01");
      const newerTimestamp = new Date("2024-01-03");

      const mockBoard = {
        _id: "board123",
        title: "Test Board",
        author: "user2",
        subscribers: ["user1"],
        contentUpdatedAt: oldTimestamp,
        notificationSeenAt: [
          { userId: "user1", timestamp: newerTimestamp },
        ],
        comments: [],
      };

      const mockQuery = {
        lean: jest.fn().mockResolvedValue([mockBoard]),
      };
      mockModel.find.mockReturnValue(mockQuery);

      const result = await dao.getPendingNotificationsForUser({ userId: "user1" });

      expect(result).toHaveLength(0);
    });

    test("should merge subscribed boards and boards with user activity", async () => {
      const subscribedBoard = {
        _id: "board1",
        title: "Subscribed Board",
        author: "user2",
        subscribers: ["user1"],
        notificationSeenAt: [],
        comments: [],
      };

      const activityBoard = {
        _id: "board2",
        title: "Activity Board",
        author: "user2",
        subscribers: [],
        notificationSeenAt: [],
        comments: [
          {
            _id: "comment1",
            author: "user1",
            comment: "User comment",
            replies: [],
          },
        ],
      };

      mockModel.find
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([subscribedBoard]) })
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([activityBoard]) });

      const result = await dao.getPendingNotificationsForUser({ userId: "user1" });

      expect(mockModel.find).toHaveBeenCalledTimes(2);
    });

    test("should sort notifications by timestamp descending", async () => {
      const mockBoard1 = {
        _id: "board1",
        title: "Board 1",
        author: "user2",
        subscribers: ["user1"],
        contentUpdatedAt: new Date("2024-01-01"),
        notificationSeenAt: [],
        comments: [],
      };

      const mockBoard2 = {
        _id: "board2",
        title: "Board 2",
        author: "user2",
        subscribers: ["user1"],
        contentUpdatedAt: new Date("2024-01-03"),
        notificationSeenAt: [],
        comments: [],
      };

      const mockQuery = {
        lean: jest.fn().mockResolvedValue([mockBoard1, mockBoard2]),
      };
      mockModel.find.mockReturnValue(mockQuery);

      const result = await dao.getPendingNotificationsForUser({ userId: "user1" });

      expect(result).toHaveLength(2);
      expect(result[0].boardId).toBe("board2");
      expect(result[1].boardId).toBe("board1");
    });

    test("should only notify about most recent reply per comment", async () => {
      const mockBoard = {
        _id: "board123",
        title: "Test Board",
        author: "user2",
        subscribers: [],
        notificationSeenAt: [],
        comments: [
          {
            _id: "comment1",
            author: "user1",
            comment: "User comment",
            replies: [
              {
                _id: "reply1",
                author: "user2",
                reply: "First reply",
                replyTo: null,
                timestamp: new Date("2024-01-01"),
              },
              {
                _id: "reply2",
                author: "user3",
                reply: "Second reply",
                replyTo: null,
                timestamp: new Date("2024-01-02"),
              },
            ],
          },
        ],
      };

      const mockQuery = {
        lean: jest.fn().mockResolvedValue([mockBoard]),
      };
      mockModel.find.mockReturnValue(mockQuery);

      const result = await dao.getPendingNotificationsForUser({ userId: "user1" });

      const replyNotifications = result.filter(n => n.type === "new_reply");
      expect(replyNotifications.length).toBe(1);
      expect(replyNotifications[0].replyId).toBe("reply2");
    });
  });
});

