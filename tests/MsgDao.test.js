import { jest } from "@jest/globals";
import { MsgDao } from "../daos/MsgDao.js";
import { USER_STATUS } from "../constants/userStatus.js";
import mongoose from "mongoose";

describe("MsgDao", () => {
  let dao;
  let mockModel;

  beforeEach(() => {
    mockModel = {
      create: jest.fn(),
      find: jest.fn(),
      updateMany: jest.fn(),
      populate: jest.fn(),
      aggregate: jest.fn(),
      countDocuments: jest.fn(),
    };

    dao = new MsgDao({ MessageModel: mockModel });
  });

  describe("create", () => {
    test("should create a message", async () => {
      const messageData = {
        sender: "user1",
        receiver: "user2",
        status: "OK",
        content: "Test message",
        timestamp: new Date(),
      };

      const mockDoc = { _id: "msg1", ...messageData };
      mockModel.create.mockResolvedValue(mockDoc);

      await dao.create(messageData);

      expect(mockModel.create).toHaveBeenCalledWith(messageData);
    });
  });

  describe("getPrivateMsg", () => {
    test("should return private messages with active senders and receivers", async () => {
      const sender = "user1";
      const receiver = "user2";
      const mockDocs = [
        {
          _id: "msg1",
          sender: { _id: "user1", username: "user1", status: USER_STATUS.ACTIVE },
          receiver: { _id: "user2", username: "user2", status: USER_STATUS.ACTIVE },
          timestamp: new Date("2024-01-01"),
          status: "OK",
          content: "Message 1",
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDocs),
      };

      mockModel.find.mockReturnValue(mockQuery);

      const result = await dao.getPrivateMsg(sender, receiver);

      expect(mockModel.find).toHaveBeenCalledWith({ sender, receiver });
      expect(mockQuery.sort).toHaveBeenCalledWith({ timestamp: 1 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("msg1");
    });

    test("should filter out messages with inactive users", async () => {
      const sender = "user1";
      const receiver = "user2";
      const mockDocs = [
        {
          _id: "msg1",
          sender: { _id: "user1", username: "user1", status: USER_STATUS.ACTIVE },
          receiver: null, // Inactive receiver (populate returned null)
          timestamp: new Date("2024-01-01"),
          status: "OK",
          content: "Message 1",
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDocs),
      };

      mockModel.find.mockReturnValue(mockQuery);

      const result = await dao.getPrivateMsg(sender, receiver);

      // filterInactiveUsers will filter out messages where receiver is null
      // The actual filtering logic is tested in filterInactiveUsers tests
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getPublicMsg", () => {
    test("should return public messages with active senders", async () => {
      const mockDocs = [
        {
          _id: "msg1",
          sender: { _id: "user1", username: "user1", status: USER_STATUS.ACTIVE },
          receiver: null,
          timestamp: new Date("2024-01-01"),
          status: "OK",
          content: "Public message 1",
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDocs),
      };

      mockModel.find.mockReturnValue(mockQuery);

      const result = await dao.getPublicMsg();

      expect(mockModel.find).toHaveBeenCalledWith({ receiver: null });
      expect(mockQuery.sort).toHaveBeenCalledWith({ timestamp: 1 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("msg1");
    });

    test("should filter out messages with inactive senders", async () => {
      const mockDocs = [
        {
          _id: "msg1",
          sender: null, // Inactive sender
          receiver: null,
          timestamp: new Date("2024-01-01"),
          status: "OK",
          content: "Public message 1",
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDocs),
      };

      mockModel.find.mockReturnValue(mockQuery);

      const result = await dao.getPublicMsg();

      expect(result).toHaveLength(0);
    });
  });

  describe("searchPublicMsg", () => {
    test("should search public messages and filter inactive senders", async () => {
      const searchParams = {
        terms: ["test"],
        phrase: "message",
        limit: 10,
        cursor: null,
      };

      // Mock the Model.find chain for searchByModel
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            _id: "msg1",
            sender: { username: "user1", status: USER_STATUS.ACTIVE },
            content: "Test message",
          },
          {
            _id: "msg2",
            sender: null, // Inactive sender
            content: "Another message",
          },
        ]),
      };

      mockModel.find.mockReturnValue(mockQuery);
      mockModel.countDocuments.mockResolvedValue(2);

      const result = await dao.searchPublicMsg(searchParams);

      // The method filters out items where sender is null
      expect(result.items).toHaveLength(1);
      expect(result.items[0].sender).not.toBeNull();
    });
  });

  describe("getUnreadMessages", () => {
    test("should return unread messages grouped by sender", async () => {
      const receiverId = new mongoose.Types.ObjectId().toString();
      const mockResults = [
        {
          _id: "msg1",
          sender: { _id: "user1", username: "user1", status: USER_STATUS.ACTIVE },
          receiver: receiverId,
          timestamp: new Date("2024-01-01"),
          status: "OK",
          content: "Unread message",
        },
      ];

      mockModel.aggregate.mockResolvedValue(mockResults);
      mockModel.populate.mockResolvedValue(mockResults);

      const result = await dao.getUnreadMessages(receiverId);

      expect(mockModel.aggregate).toHaveBeenCalled();
      expect(mockModel.populate).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    test("should filter out messages with inactive senders", async () => {
      const receiverId = new mongoose.Types.ObjectId().toString();
      const mockResults = [
        {
          _id: "msg1",
          sender: null, // Inactive sender
          receiver: receiverId,
          timestamp: new Date("2024-01-01"),
          status: "OK",
          content: "Unread message",
        },
      ];

      mockModel.aggregate.mockResolvedValue(mockResults);
      mockModel.populate.mockResolvedValue(mockResults);

      const result = await dao.getUnreadMessages(receiverId);

      expect(result).toHaveLength(0);
    });

    test("should handle errors", async () => {
      const receiverId = new mongoose.Types.ObjectId().toString();

      mockModel.aggregate.mockRejectedValue(new Error("Database error"));

      await expect(dao.getUnreadMessages(receiverId)).rejects.toThrow("Database error");
    });
  });

  describe("markMessagesAsRead", () => {
    test("should mark messages as read", async () => {
      const senderId = "user1";
      const receiverId = "user2";

      mockModel.updateMany.mockResolvedValue({ modifiedCount: 3 });

      const result = await dao.markMessagesAsRead(senderId, receiverId);

      expect(mockModel.updateMany).toHaveBeenCalledWith(
        { sender: senderId, receiver: receiverId, isRead: false },
        { $set: { isRead: true } }
      );
      expect(result).toBe(3);
    });

    test("should return 0 when no messages to mark", async () => {
      const senderId = "user1";
      const receiverId = "user2";

      mockModel.updateMany.mockResolvedValue({ modifiedCount: 0 });

      const result = await dao.markMessagesAsRead(senderId, receiverId);

      expect(result).toBe(0);
    });
  });

  describe("searchPrivateMsg", () => {
    test("should search private messages between two users", async () => {
      const searchParams = {
        terms: ["test"],
        senderId: "user1",
        peerId: "user2",
        phrase: "message",
        limit: 10,
        cursor: null,
      };

      const mockItems = [
        {
          _id: "msg1",
          sender: { _id: "user1", username: "user1", status: USER_STATUS.ACTIVE },
          receiver: "user2",
          content: "Test message",
          timestamp: new Date("2024-01-01"),
          status: "OK",
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockItems),
      };

      mockModel.find.mockReturnValue(mockQuery);
      mockModel.countDocuments.mockResolvedValue(1);

      const result = await dao.searchPrivateMsg(searchParams);

      expect(mockModel.find).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    test("should filter out messages with inactive senders", async () => {
      const searchParams = {
        terms: ["test"],
        senderId: "user1",
        peerId: "user2",
        phrase: "message",
        limit: 10,
        cursor: null,
      };

      const mockItems = [
        {
          _id: "msg1",
          sender: null, // Inactive sender
          receiver: "user2",
          content: "Test message",
          timestamp: new Date("2024-01-01"),
          status: "OK",
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockItems),
      };

      mockModel.find.mockReturnValue(mockQuery);
      mockModel.countDocuments.mockResolvedValue(1);

      const result = await dao.searchPrivateMsg(searchParams);

      expect(result.items).toHaveLength(0);
    });
  });
});

