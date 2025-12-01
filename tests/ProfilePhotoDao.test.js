import { jest } from "@jest/globals";
import ProfilePhotoDao from "../daos/ProfilePhotoDao.js";

describe("ProfilePhotoDao", () => {
  let dao;
  let mockModel;

  beforeEach(() => {
    mockModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      deleteOne: jest.fn(),
    };

    dao = new ProfilePhotoDao({ ProfilePhotoModel: mockModel });
  });

  describe("uploadProfilePhoto", () => {
    test("should create new profile photo when none exists", async () => {
      const profileId = "profile1";
      const photoData = Buffer.from("test photo data");
      const contentType = "image/jpeg";
      const visibility = "public";

      mockModel.findOne.mockResolvedValue(null);
      const mockDoc = {
        _id: "photo1",
        profileId,
        photoData,
        contentType,
        visibility,
        save: jest.fn().mockResolvedValue(true),
      };
      mockModel.create.mockResolvedValue(mockDoc);

      const result = await dao.uploadProfilePhoto(profileId, photoData, contentType, visibility);

      expect(mockModel.findOne).toHaveBeenCalledWith({ profileId });
      expect(mockModel.create).toHaveBeenCalledWith({
        profileId,
        photoData,
        contentType,
        visibility,
      });
      expect(result).toBe(mockDoc);
    });

    test("should update existing profile photo", async () => {
      const profileId = "profile1";
      const photoData = Buffer.from("new photo data");
      const contentType = "image/png";
      const visibility = "private";

      const existingDoc = {
        _id: "photo1",
        profileId,
        photoData: Buffer.from("old photo data"),
        contentType: "image/jpeg",
        visibility: "public",
        save: jest.fn(),
      };

      // Set up save to return the doc itself
      existingDoc.save.mockResolvedValue(existingDoc);

      mockModel.findOne.mockResolvedValue(existingDoc);

      const result = await dao.uploadProfilePhoto(profileId, photoData, contentType, visibility);

      expect(mockModel.findOne).toHaveBeenCalledWith({ profileId });
      expect(existingDoc.photoData).toBe(photoData);
      expect(existingDoc.contentType).toBe(contentType);
      expect(existingDoc.visibility).toBe(visibility);
      expect(existingDoc.save).toHaveBeenCalled();
      expect(result).toBe(existingDoc);
    });
  });

  describe("getProfilePhoto", () => {
    test("should return profile photo when found", async () => {
      const profileId = "profile1";
      const mockDoc = {
        _id: "photo1",
        profileId,
        photoData: Buffer.from("photo data"),
        contentType: "image/jpeg",
        visibility: "public",
      };

      mockModel.findOne.mockResolvedValue(mockDoc);

      const result = await dao.getProfilePhoto(profileId);

      expect(mockModel.findOne).toHaveBeenCalledWith({ profileId });
      expect(result).toBe(mockDoc);
    });

    test("should return null when profile photo not found", async () => {
      const profileId = "profile1";

      mockModel.findOne.mockResolvedValue(null);

      const result = await dao.getProfilePhoto(profileId);

      expect(mockModel.findOne).toHaveBeenCalledWith({ profileId });
      expect(result).toBeNull();
    });
  });

  describe("deleteProfilePhoto", () => {
    test("should delete profile photo", async () => {
      const profileId = "profile1";

      mockModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await dao.deleteProfilePhoto(profileId);

      expect(mockModel.deleteOne).toHaveBeenCalledWith({ profileId });
    });

    test("should handle deletion when photo does not exist", async () => {
      const profileId = "profile1";

      mockModel.deleteOne.mockResolvedValue({ deletedCount: 0 });

      await dao.deleteProfilePhoto(profileId);

      expect(mockModel.deleteOne).toHaveBeenCalledWith({ profileId });
    });
  });
});

