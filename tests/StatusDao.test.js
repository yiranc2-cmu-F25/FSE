import { jest } from "@jest/globals";
import { StatusDao } from "../daos/StatusDao.js";
import { SHARED_STATUS } from "../constants/sharedStatus.js";
import mongoose from "mongoose";

describe("StatusDao", () => {
  let dao;
  let mockStatusModel;
  let mockUserModel;

  beforeEach(() => {
    mockStatusModel = {
      create: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };

    mockUserModel = {};

    dao = new StatusDao({
      StatusModel: mockStatusModel,
      UserModel: mockUserModel,
    });
  });

  describe("recordChange", () => {
    test("should record status change with valid userId and status", async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const newStatus = SHARED_STATUS.OK;
      const at = new Date("2024-01-01");

      const mockEntry = {
        _id: "status1",
        user: userId,
        status: newStatus,
        timestamp: at,
        toObject: jest.fn().mockReturnValue({
          _id: "status1",
          user: userId,
          status: newStatus,
          timestamp: at,
        }),
      };

      mockStatusModel.create.mockResolvedValue(mockEntry);

      const result = await dao.recordChange({ userId, newStatus, at });

      expect(mockStatusModel.create).toHaveBeenCalledWith({
        user: userId,
        status: newStatus,
        timestamp: at,
      });
      expect(result).toEqual({
        _id: "status1",
        user: userId,
        status: newStatus,
        timestamp: at,
      });
    });

    test("should use current date when at is not provided", async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const newStatus = SHARED_STATUS.OK;

      const mockEntry = {
        _id: "status1",
        user: userId,
        status: newStatus,
        timestamp: new Date(),
        toObject: jest.fn().mockReturnValue({
          _id: "status1",
          user: userId,
          status: newStatus,
          timestamp: expect.any(Date),
        }),
      };

      mockStatusModel.create.mockResolvedValue(mockEntry);

      const result = await dao.recordChange({ userId, newStatus });

      expect(mockStatusModel.create).toHaveBeenCalledWith({
        user: userId,
        status: newStatus,
        timestamp: expect.any(Date),
      });
      expect(result).toBeDefined();
    });

    test("should normalize status to lowercase", async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const newStatus = "OK"; // Uppercase

      const mockEntry = {
        _id: "status1",
        user: userId,
        status: "ok",
        timestamp: new Date(),
        toObject: jest.fn().mockReturnValue({
          _id: "status1",
          user: userId,
          status: "ok",
          timestamp: expect.any(Date),
        }),
      };

      mockStatusModel.create.mockResolvedValue(mockEntry);

      const result = await dao.recordChange({ userId, newStatus });

      expect(mockStatusModel.create).toHaveBeenCalledWith({
        user: userId,
        status: "ok",
        timestamp: expect.any(Date),
      });
    });

    test("should throw error for invalid userId", async () => {
      const userId = "invalid-id";
      const newStatus = SHARED_STATUS.OK;

      await expect(dao.recordChange({ userId, newStatus })).rejects.toThrow("Invalid userId");
    });

    test("should throw error for invalid status", async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const newStatus = "INVALID_STATUS";

      await expect(dao.recordChange({ userId, newStatus })).rejects.toThrow("invalid status");
    });
  });

  describe("getHistory", () => {
    test("should return status history with default limit", async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const mockItems = [
        {
          _id: "status1",
          status: SHARED_STATUS.OK,
          timestamp: new Date("2024-01-01"),
        },
        {
          _id: "status2",
          status: SHARED_STATUS.HELP,
          timestamp: new Date("2024-01-02"),
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockItems),
      };

      mockStatusModel.find.mockReturnValue(mockQuery);
      mockStatusModel.countDocuments.mockResolvedValue(2);

      const result = await dao.getHistory({ userId });

      expect(mockStatusModel.find).toHaveBeenCalledWith({ user: userId });
      expect(mockQuery.sort).toHaveBeenCalledWith({ timestamp: -1, _id: -1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(11); // limit + 1
      expect(mockQuery.select).toHaveBeenCalledWith("status timestamp");
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    test("should return status history with custom limit", async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const limit = 5;
      const mockItems = [
        {
          _id: "status1",
          status: SHARED_STATUS.OK,
          timestamp: new Date("2024-01-01"),
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockItems),
      };

      mockStatusModel.find.mockReturnValue(mockQuery);
      mockStatusModel.countDocuments.mockResolvedValue(1);

      const result = await dao.getHistory({ userId, limit });

      expect(mockQuery.limit).toHaveBeenCalledWith(6); // limit + 1
      expect(result.items).toHaveLength(1);
    });

    test("should handle cursor pagination", async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const cursor = "2024-01-01T00:00:00.000Z|status1";
      const mockItems = [
        {
          _id: "status2",
          status: SHARED_STATUS.HELP,
          timestamp: new Date("2024-01-02"),
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockItems),
      };

      mockStatusModel.find.mockReturnValue(mockQuery);
      mockStatusModel.countDocuments.mockResolvedValue(1);

      const result = await dao.getHistory({ userId, cursor });

      expect(mockStatusModel.find).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
    });

    test("should return nextCursor when hasMore is true", async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const limit = 2;
      const mockItems = [
        {
          _id: "status1",
          status: SHARED_STATUS.OK,
          timestamp: new Date("2024-01-01"),
        },
        {
          _id: "status2",
          status: SHARED_STATUS.HELP,
          timestamp: new Date("2024-01-02"),
        },
        {
          _id: "status3",
          status: SHARED_STATUS.EMERGENCY,
          timestamp: new Date("2024-01-03"),
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockItems),
      };

      mockStatusModel.find.mockReturnValue(mockQuery);
      mockStatusModel.countDocuments.mockResolvedValue(3);

      const result = await dao.getHistory({ userId, limit });

      expect(result.nextCursor).toBeDefined();
      expect(result.items).toHaveLength(2);
    });

    test("should throw error for invalid userId", async () => {
      const userId = "invalid-id";

      await expect(dao.getHistory({ userId })).rejects.toThrow("Invalid userId");
    });

    test("should clamp limit to valid range", async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const limit = 200; // Exceeds max of 100

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      mockStatusModel.find.mockReturnValue(mockQuery);
      mockStatusModel.countDocuments.mockResolvedValue(0);

      await dao.getHistory({ userId, limit });

      expect(mockQuery.limit).toHaveBeenCalledWith(101); // 100 + 1
    });
  });
});

