import { jest } from "@jest/globals";
import { EmergencyProfileDao } from "../daos/EmergencyProfileDao.js";
import { USER_STATUS } from "../constants/userStatus.js";
import { PROFILE_VISIBILITY } from "../constants/profileVisibility.js";
import { BLOOD_TYPE } from "../constants/bloodType.js";

describe("EmergencyProfileDao", () => {
  let dao;
  let mockEmergencyProfileModel;
  let mockProfilePhotoModel;
  let mockUserModel;
  let mockBookmarkModel;

  beforeEach(() => {
    mockEmergencyProfileModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
    };

    mockProfilePhotoModel = {};

    mockUserModel = {
      findById: jest.fn(),
    };

    mockBookmarkModel = {
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
    };

    dao = new EmergencyProfileDao({
      EmergencyProfileModel: mockEmergencyProfileModel,
      ProfilePhotoModel: mockProfilePhotoModel,
      UserModel: mockUserModel,
      BookmarkModel: mockBookmarkModel,
    });

  });

  describe("getAllEmergencyProfiles", () => {
    test("should return empty array when no profiles", async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      mockEmergencyProfileModel.find.mockReturnValue(mockQuery);

      const result = await dao.getAllEmergencyProfiles();

      expect(result).toHaveLength(0);
    });
  });

  describe("getBookmarkedEmergencyProfiles", () => {
    test("should return empty array when no bookmarks", async () => {
      const userId = "user1";

      const mockBookmarkQuery = {
        lean: jest.fn().mockResolvedValue([]),
      };
      mockBookmarkModel.find.mockReturnValue(mockBookmarkQuery);

      const result = await dao.getBookmarkedEmergencyProfiles(userId);

      expect(result).toHaveLength(0);
    });
  });

  describe("bookmarkEmergencyProfile", () => {
    test("should bookmark an emergency profile", async () => {
      const userId = "user1";
      const profileId = "profile1";

      const mockBookmark = {
        _id: "bookmark1",
        ownId: userId,
        profileId: profileId,
      };

      mockBookmarkModel.findOneAndUpdate.mockResolvedValue(mockBookmark);

      await dao.bookmarkEmergencyProfile(userId, profileId);

      expect(mockBookmarkModel.findOneAndUpdate).toHaveBeenCalledWith(
        { ownId: userId, profileId: profileId },
        { ownId: userId, profileId: profileId },
        { upsert: true, new: true }
      );
    });
  });

  describe("unbookmarkEmergencyProfile", () => {
    test("should unbookmark an emergency profile", async () => {
      const userId = "user1";
      const profileId = "profile1";

      mockBookmarkModel.findOneAndDelete.mockResolvedValue({ deletedCount: 1 });

      await dao.unbookmarkEmergencyProfile(userId, profileId);

      expect(mockBookmarkModel.findOneAndDelete).toHaveBeenCalledWith({
        ownId: userId,
        profileId: profileId,
      });
    });
  });

  describe("getPersonalEmergencyProfile", () => {
    test("should return personal emergency profile for active user", async () => {
      const userId = "user1";
      const mockProfile = {
        _id: "profile1",
        userId: userId,
        facePhotoId: { _id: "photo1" },
      };

      const mockUser = {
        _id: userId,
        status: USER_STATUS.ACTIVE,
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProfile),
      };

      const mockUserQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUser),
      };

      mockEmergencyProfileModel.findOne.mockReturnValue(mockQuery);
      mockUserModel.findById.mockReturnValue(mockUserQuery);

      const result = await dao.getPersonalEmergencyProfile(userId);

      expect(mockEmergencyProfileModel.findOne).toHaveBeenCalledWith({ userId });
      expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockProfile);
    });

    test("should return null when profile not found", async () => {
      const userId = "user1";

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };

      mockEmergencyProfileModel.findOne.mockReturnValue(mockQuery);

      const result = await dao.getPersonalEmergencyProfile(userId);

      expect(result).toBeNull();
    });

    test("should return null when user is inactive", async () => {
      const userId = "user1";
      const mockProfile = {
        _id: "profile1",
        userId: userId,
        facePhotoId: { _id: "photo1" },
      };

      const mockUser = {
        _id: userId,
        status: USER_STATUS.INACTIVE,
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProfile),
      };

      const mockUserQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUser),
      };

      mockEmergencyProfileModel.findOne.mockReturnValue(mockQuery);
      mockUserModel.findById.mockReturnValue(mockUserQuery);

      const result = await dao.getPersonalEmergencyProfile(userId);

      expect(result).toBeNull();
    });
  });

  describe("updatePersonalEmergencyProfile", () => {
    test("should update personal emergency profile", async () => {
      const userId = "user1";
      const profileData = {
        weight: 70,
        height: 175,
        bloodType: "A_POSITIVE",
        allergies: ["peanuts"],
        currentMedications: ["aspirin"],
        chronicConditions: ["diabetes"],
        emergencyContacts: [{ name: "John", phone: "123-456-7890" }],
        visibility: {
          weight: PROFILE_VISIBILITY.EMERGENCYONLY,
          height: PROFILE_VISIBILITY.EMERGENCYONLY,
        },
        facePhotoId: "photo1",
      };

      const mockUpdatedProfile = {
        _id: "profile1",
        userId: userId,
        ...profileData,
        facePhotoId: { _id: "photo1" },
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUpdatedProfile),
      };

      mockEmergencyProfileModel.findOneAndUpdate.mockReturnValue(mockQuery);

      const result = await dao.updatePersonalEmergencyProfile(userId, profileData);

      expect(mockEmergencyProfileModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId },
        expect.objectContaining({
          weight: 70,
          height: 175,
        }),
        { new: true, upsert: true }
      );
      expect(result).toBeDefined();
    });

    test("should create profile if it doesn't exist (upsert)", async () => {
      const userId = "user1";
      const profileData = {
        weight: 70,
        height: 175,
        bloodType: "A_POSITIVE",
      };

      const mockNewProfile = {
        _id: "profile1",
        userId: userId,
        ...profileData,
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockNewProfile),
      };

      mockEmergencyProfileModel.findOneAndUpdate.mockReturnValue(mockQuery);

      const result = await dao.updatePersonalEmergencyProfile(userId, profileData);

      expect(mockEmergencyProfileModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId },
        expect.any(Object),
        { new: true, upsert: true }
      );
      expect(result).toBeDefined();
    });
  });

  describe("deletePersonalEmergencyProfile", () => {
    test("should delete personal emergency profile", async () => {
      const userId = "user1";

      mockEmergencyProfileModel.findOneAndDelete.mockResolvedValue({
        deletedCount: 1,
      });

      await dao.deletePersonalEmergencyProfile(userId);

      expect(mockEmergencyProfileModel.findOneAndDelete).toHaveBeenCalledWith({
        userId,
      });
    });
  });
});

