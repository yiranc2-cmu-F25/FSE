import { jest } from "@jest/globals";
import { AnnouncementDao } from "../daos/AnnouncementDao.js";
import { USER_STATUS } from "../constants/userStatus.js";

describe("AnnouncementDao", () => {
  let dao;
  let mockModel;

  beforeEach(() => {
    mockModel = {
      create: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };

    dao = new AnnouncementDao({ AnnouncementModel: mockModel });
  });

  describe("create", () => {
    test("should create an announcement", async () => {
      const announcementData = {
        sender: "user1",
        status: "OK",
        content: "Test announcement",
        timestamp: new Date(),
      };

      const mockDoc = { _id: "announcement1", ...announcementData };
      mockModel.create.mockResolvedValue(mockDoc);

      await dao.create(announcementData);

      expect(mockModel.create).toHaveBeenCalledWith(announcementData);
    });
  });

  describe("getAnnouncement", () => {
    test("should return announcements with active senders", async () => {
      const mockDocs = [
        {
          _id: "ann1",
          sender: { _id: "user1", username: "user1", status: USER_STATUS.ACTIVE },
          timestamp: new Date("2024-01-01"),
          status: "OK",
          content: "Announcement 1",
        },
        {
          _id: "ann2",
          sender: { _id: "user2", username: "user2", status: USER_STATUS.ACTIVE },
          timestamp: new Date("2024-01-02"),
          status: "OK",
          content: "Announcement 2",
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDocs),
      };

      mockModel.find.mockReturnValue(mockQuery);

      const result = await dao.getAnnouncement();

      expect(mockModel.find).toHaveBeenCalledWith({});
      expect(mockQuery.sort).toHaveBeenCalledWith({ timestamp: 1 });
      expect(mockQuery.populate).toHaveBeenCalledWith({
        path: "sender",
        select: "username status",
        match: { status: USER_STATUS.ACTIVE },
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("ann1");
      expect(result[0].sender.username).toBe("user1");
    });

    test("should filter out announcements with inactive senders", async () => {
      const mockDocs = [
        {
          _id: "ann1",
          sender: { _id: "user1", username: "user1", status: USER_STATUS.ACTIVE },
          timestamp: new Date("2024-01-01"),
          status: "OK",
          content: "Announcement 1",
        },
        {
          _id: "ann2",
          sender: null, // Inactive sender
          timestamp: new Date("2024-01-02"),
          status: "OK",
          content: "Announcement 2",
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDocs),
      };

      mockModel.find.mockReturnValue(mockQuery);

      const result = await dao.getAnnouncement();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("ann1");
    });

    test("should return empty array when no announcements", async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      mockModel.find.mockReturnValue(mockQuery);

      const result = await dao.getAnnouncement();

      expect(result).toHaveLength(0);
    });
  });

  describe("searchAnnouncement", () => {
    test("should call searchByModel with correct parameters", async () => {
      const searchParams = {
        terms: ["test"],
        phrase: "announcement",
        limit: 10,
        cursor: null,
      };

      // Mock the Model.find chain for searchByModel
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      mockModel.find.mockReturnValue(mockQuery);
      mockModel.countDocuments.mockResolvedValue(0);

      // searchAnnouncement calls searchByModel which uses Model.find
      const result = await dao.searchAnnouncement(searchParams);

      // The result should have items, nextCursor, and count properties
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
    });
  });
});

