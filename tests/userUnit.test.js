import { jest } from "@jest/globals";
import { UserDao } from "../daos/UserDao.js";
import { USER_STATUS } from "../constants/userStatus.js";
import { USER_ROLE } from "../constants/userRole.js";
import { SHARED_STATUS } from "../constants/sharedStatus.js";
import bcrypt from "bcrypt";

describe("UserDao", () => {
  let userDao;
  let mockUserModel;

  beforeEach(() => {
    // Create mock UserModel
    mockUserModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    userDao = new UserDao({ UserModel: mockUserModel });
  });

  describe("getUsernameById", () => {
    test("should return username when user exists", async () => {
      const mockDoc = {
        username: "testuser",
      };
      mockUserModel.findById.mockResolvedValue(mockDoc);

      const result = await userDao.getUsernameById("123");

      expect(result).toBe("testuser");
      expect(mockUserModel.findById).toHaveBeenCalledWith("123");
    });

    test("should return null when user does not exist", async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const result = await userDao.getUsernameById("123");

      expect(result).toBeNull();
      expect(mockUserModel.findById).toHaveBeenCalledWith("123");
    });
  });

  describe("findById", () => {
    test("should return user document when found", async () => {
      const mockDoc = {
        _id: "123",
        username: "testuser",
      };
      mockUserModel.findById.mockResolvedValue(mockDoc);

      const result = await userDao.findById("123");

      expect(result).toBe(mockDoc);
      expect(mockUserModel.findById).toHaveBeenCalledWith("123");
    });

    test("should return null when user not found", async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const result = await userDao.findById("123");

      expect(result).toBeNull();
    });

    test("should throw error when database error occurs", async () => {
      const dbError = new Error("Database connection failed");
      mockUserModel.findById.mockRejectedValue(dbError);

      await expect(userDao.findById("123")).rejects.toThrow("Database connection failed");
      expect(mockUserModel.findById).toHaveBeenCalledWith("123");
    });
  });

  describe("getAllUsers", () => {
    test("should return all active users sorted by username", async () => {
      const mockDocs = [
        { _id: "1", username: "alice", status: USER_STATUS.ACTIVE },
        { _id: "2", username: "bob", status: USER_STATUS.ACTIVE },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDocs),
      };
      mockUserModel.find.mockReturnValue(mockQuery);

      const result = await userDao.getAllUsers();

      expect(mockUserModel.find).toHaveBeenCalledWith({ status: USER_STATUS.ACTIVE });
      expect(mockQuery.sort).toHaveBeenCalledWith({ username: 1 });
      expect(mockQuery.lean).toHaveBeenCalled();
      expect(result).toEqual([
        { _id: "1", username: "alice", status: USER_STATUS.ACTIVE, id: "1" },
        { _id: "2", username: "bob", status: USER_STATUS.ACTIVE, id: "2" },
      ]);
    });

    test("should return empty array when no active users", async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockUserModel.find.mockReturnValue(mockQuery);

      const result = await userDao.getAllUsers();

      expect(result).toEqual([]);
    });
  });

  describe("updateStatusById", () => {
    test("should update user sharedstatus successfully", async () => {
      const mockDoc = {
        _id: "123",
        username: "testuser",
        sharedstatus: SHARED_STATUS.OK,
      };
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockDoc);

      await userDao.updateStatusById("123", SHARED_STATUS.OK);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "123",
        { sharedstatus: SHARED_STATUS.OK },
        { new: true }
      );
    });

    test("should throw error when update fails", async () => {
      const dbError = new Error("Update failed");
      mockUserModel.findByIdAndUpdate.mockRejectedValue(dbError);

      await expect(userDao.updateStatusById("123", SHARED_STATUS.OK)).rejects.toThrow("Update failed");
    });
  });

  describe("getSkillsById", () => {
    test("should return skills array when user exists", async () => {
      const mockDoc = {
        skills: ["skill1", "skill2"],
      };
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDoc),
      };
      mockUserModel.findById.mockReturnValue(mockQuery);

      const result = await userDao.getSkillsById("123");

      expect(result).toEqual(["skill1", "skill2"]);
      expect(mockUserModel.findById).toHaveBeenCalledWith("123");
      expect(mockQuery.select).toHaveBeenCalledWith("skills");
    });

    test("should return empty array when user does not exist", async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      mockUserModel.findById.mockReturnValue(mockQuery);

      const result = await userDao.getSkillsById("123");

      expect(result).toEqual([]);
    });

    test("should return empty array when user has no skills", async () => {
      const mockDoc = {
        skills: null,
      };
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDoc),
      };
      mockUserModel.findById.mockReturnValue(mockQuery);

      const result = await userDao.getSkillsById("123");

      expect(result).toEqual([]);
    });

    test("should throw error when database error occurs", async () => {
      const dbError = new Error("Database error");
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(dbError),
      };
      mockUserModel.findById.mockReturnValue(mockQuery);

      await expect(userDao.getSkillsById("123")).rejects.toThrow("Database error");
    });
  });

  describe("updateSkillsById", () => {
    test("should update skills successfully", async () => {
      const mockDoc = { _id: "123", skills: ["skill1", "skill2"] };
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockDoc);

      await userDao.updateSkillsById("123", ["skill1", "skill2"]);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "123",
        { skills: ["skill1", "skill2"] },
        { new: true }
      );
    });

    test("should convert non-array to empty array", async () => {
      const mockDoc = { _id: "123", skills: [] };
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockDoc);

      await userDao.updateSkillsById("123", "not-an-array");

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "123",
        { skills: [] },
        { new: true }
      );
    });

    test("should throw error when update fails", async () => {
      const dbError = new Error("Update failed");
      mockUserModel.findByIdAndUpdate.mockRejectedValue(dbError);

      await expect(userDao.updateSkillsById("123", ["skill1"])).rejects.toThrow("Update failed");
    });
  });

  describe("updateAccountStatusById", () => {
    test("should update account status successfully", async () => {
      const mockDoc = { _id: "123", status: USER_STATUS.INACTIVE };
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockDoc);

      await userDao.updateAccountStatusById("123", USER_STATUS.INACTIVE);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "123",
        { status: USER_STATUS.INACTIVE },
        { new: true }
      );
    });

    test("should throw error when update fails", async () => {
      const dbError = new Error("Update failed");
      mockUserModel.findByIdAndUpdate.mockRejectedValue(dbError);

      await expect(userDao.updateAccountStatusById("123", USER_STATUS.INACTIVE)).rejects.toThrow("Update failed");
    });
  });

  describe("updateRoleById", () => {
    test("should update role successfully", async () => {
      const mockDoc = { _id: "123", role: USER_ROLE.ADMIN };
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockDoc);

      await userDao.updateRoleById("123", USER_ROLE.ADMIN);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "123",
        { role: USER_ROLE.ADMIN },
        { new: true }
      );
    });

    test("should throw error when update fails", async () => {
      const dbError = new Error("Update failed");
      mockUserModel.findByIdAndUpdate.mockRejectedValue(dbError);

      await expect(userDao.updateRoleById("123", USER_ROLE.ADMIN)).rejects.toThrow("Update failed");
    });
  });

  describe("updateUsernameById", () => {
    test("should update username successfully", async () => {
      const mockDoc = { _id: "123", username: "newusername" };
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockDoc);

      await userDao.updateUsernameById("123", "NewUsername");

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "123",
        { username: "newusername" },
        { new: true, runValidators: true }
      );
    });

    test("should throw 'User not found' when user does not exist", async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(userDao.updateUsernameById("123", "newusername")).rejects.toThrow("User not found");
    });

    test("should throw 'Username already exists' for duplicate key error", async () => {
      const duplicateError = new Error("Duplicate key");
      duplicateError.code = 11000;
      mockUserModel.findByIdAndUpdate.mockRejectedValue(duplicateError);

      await expect(userDao.updateUsernameById("123", "existinguser")).rejects.toThrow("Username already exists");
    });

    test("should throw 'Username already exists' for MongoServerError", async () => {
      const duplicateError = new Error("Duplicate key");
      duplicateError.name = "MongoServerError";
      mockUserModel.findByIdAndUpdate.mockRejectedValue(duplicateError);

      await expect(userDao.updateUsernameById("123", "existinguser")).rejects.toThrow("Username already exists");
    });

    test("should throw original error for other errors", async () => {
      const dbError = new Error("Database error");
      mockUserModel.findByIdAndUpdate.mockRejectedValue(dbError);

      await expect(userDao.updateUsernameById("123", "newusername")).rejects.toThrow("Database error");
    });
  });

  describe("updatePasswordById", () => {
    test("should update password successfully", async () => {
      const mockDoc = {
        _id: "123",
        password: "oldhash",
        markModified: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
      };
      mockUserModel.findById.mockResolvedValue(mockDoc);

      await userDao.updatePasswordById("123", "newpassword");

      expect(mockUserModel.findById).toHaveBeenCalledWith("123");
      expect(mockDoc.password).toBe("newpassword");
      expect(mockDoc.markModified).toHaveBeenCalledWith("password");
      expect(mockDoc.save).toHaveBeenCalled();
    });

    test("should throw 'User not found' when user does not exist", async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(userDao.updatePasswordById("123", "newpassword")).rejects.toThrow("User not found");
    });

    test("should throw error when save fails", async () => {
      const mockDoc = {
        _id: "123",
        password: "oldhash",
        markModified: jest.fn(),
        save: jest.fn().mockRejectedValue(new Error("Save failed")),
      };
      mockUserModel.findById.mockResolvedValue(mockDoc);

      await expect(userDao.updatePasswordById("123", "newpassword")).rejects.toThrow("Save failed");
    });
  });

  describe("usernameExists", () => {
    test("should return true when username exists", async () => {
      const mockDoc = { _id: "123", username: "testuser" };
      mockUserModel.findOne.mockResolvedValue(mockDoc);

      const result = await userDao.usernameExists("testuser");

      expect(result).toBe(true);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ username: "testuser" });
    });

    test("should return false when username does not exist", async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const result = await userDao.usernameExists("nonexistent");

      expect(result).toBe(false);
    });

    test("should exclude user ID when excludeUserId is provided", async () => {
      const mockDoc = { _id: "456", username: "testuser" };
      mockUserModel.findOne.mockResolvedValue(mockDoc);

      const result = await userDao.usernameExists("testuser", "123");

      expect(result).toBe(true);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        username: "testuser",
        _id: { $ne: "123" },
      });
    });

    test("should convert username to lowercase", async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await userDao.usernameExists("TestUser");

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ username: "testuser" });
    });

    test("should throw error when database error occurs", async () => {
      const dbError = new Error("Database error");
      mockUserModel.findOne.mockRejectedValue(dbError);

      await expect(userDao.usernameExists("testuser")).rejects.toThrow("Database error");
    });
  });

  describe("getUserProfileById", () => {
    test("should return user profile when user exists", async () => {
      const mockDoc = {
        _id: "123",
        username: "testuser",
        status: USER_STATUS.ACTIVE,
        role: USER_ROLE.CITIZEN,
      };
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDoc),
      };
      mockUserModel.findById.mockReturnValue(mockQuery);

      const result = await userDao.getUserProfileById("123");

      expect(result).toEqual({
        id: "123",
        username: "testuser",
        status: USER_STATUS.ACTIVE,
        role: USER_ROLE.CITIZEN,
      });
      expect(mockUserModel.findById).toHaveBeenCalledWith("123");
      expect(mockQuery.select).toHaveBeenCalledWith("username status role");
    });

    test("should return null when user does not exist", async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      mockUserModel.findById.mockReturnValue(mockQuery);

      const result = await userDao.getUserProfileById("123");

      expect(result).toBeNull();
    });

    test("should throw error when database error occurs", async () => {
      const dbError = new Error("Database error");
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(dbError),
      };
      mockUserModel.findById.mockReturnValue(mockQuery);

      await expect(userDao.getUserProfileById("123")).rejects.toThrow("Database error");
    });
  });

  describe("getInactiveUsers", () => {
    test("should return inactive users sorted by username", async () => {
      const mockDocs = [
        { _id: "1", username: "inactive1", status: USER_STATUS.INACTIVE },
        { _id: "2", username: "inactive2", status: USER_STATUS.INACTIVE },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDocs),
      };
      mockUserModel.find.mockReturnValue(mockQuery);

      const result = await userDao.getInactiveUsers();

      expect(mockUserModel.find).toHaveBeenCalledWith({ status: USER_STATUS.INACTIVE });
      expect(mockQuery.sort).toHaveBeenCalledWith({ username: 1 });
      expect(result).toEqual([
        { _id: "1", username: "inactive1", status: USER_STATUS.INACTIVE, id: "1" },
        { _id: "2", username: "inactive2", status: USER_STATUS.INACTIVE, id: "2" },
      ]);
    });

    test("should return empty array when no inactive users", async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockUserModel.find.mockReturnValue(mockQuery);

      const result = await userDao.getInactiveUsers();

      expect(result).toEqual([]);
    });

    test("should throw error when database error occurs", async () => {
      const dbError = new Error("Database error");
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(dbError),
      };
      mockUserModel.find.mockReturnValue(mockQuery);

      await expect(userDao.getInactiveUsers()).rejects.toThrow("Database error");
    });
  });

  describe("getRoleById", () => {
    test("should return role when user exists", async () => {
      const mockDoc = {
        role: USER_ROLE.ADMIN,
      };
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDoc),
      };
      mockUserModel.findById.mockReturnValue(mockQuery);

      const result = await userDao.getRoleById("123");

      expect(result).toBe(USER_ROLE.ADMIN);
      expect(mockUserModel.findById).toHaveBeenCalledWith("123");
      expect(mockQuery.select).toHaveBeenCalledWith("role");
    });

    test("should return null when user does not exist", async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      mockUserModel.findById.mockReturnValue(mockQuery);

      const result = await userDao.getRoleById("123");

      expect(result).toBeNull();
    });

    test("should return CITIZEN when role is missing", async () => {
      const mockDoc = {
        role: null,
      };
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDoc),
      };
      mockUserModel.findById.mockReturnValue(mockQuery);

      const result = await userDao.getRoleById("123");

      expect(result).toBe(USER_ROLE.CITIZEN);
    });

    test("should throw error when database error occurs", async () => {
      const dbError = new Error("Database error");
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(dbError),
      };
      mockUserModel.findById.mockReturnValue(mockQuery);

      await expect(userDao.getRoleById("123")).rejects.toThrow("Database error");
    });
  });

  describe("checkInitialAdministratorExists", () => {
    test("should return true when initial administrator exists with all correct properties", async () => {
      const hashedPassword = await bcrypt.hash("admin", 10);
      const mockDoc = {
        username: "esnadmin",
        password: hashedPassword,
        role: USER_ROLE.ADMIN,
        status: USER_STATUS.ACTIVE,
        sharedstatus: SHARED_STATUS.OK,
      };
      mockUserModel.findOne.mockResolvedValue(mockDoc);

      const result = await userDao.checkInitialAdministratorExists();

      expect(result).toBe(true);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ username: "esnadmin" });
    });

    test("should return false when user does not exist", async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const result = await userDao.checkInitialAdministratorExists();

      expect(result).toBe(false);
    });

    test("should return false when role is incorrect", async () => {
      const hashedPassword = await bcrypt.hash("admin", 10);
      const mockDoc = {
        username: "esnadmin",
        password: hashedPassword,
        role: USER_ROLE.CITIZEN, // Wrong role
        status: USER_STATUS.ACTIVE,
        sharedstatus: SHARED_STATUS.OK,
      };
      mockUserModel.findOne.mockResolvedValue(mockDoc);

      const result = await userDao.checkInitialAdministratorExists();

      expect(result).toBe(false);
    });

    test("should return false when status is incorrect", async () => {
      const hashedPassword = await bcrypt.hash("admin", 10);
      const mockDoc = {
        username: "esnadmin",
        password: hashedPassword,
        role: USER_ROLE.ADMIN,
        status: USER_STATUS.INACTIVE, // Wrong status
        sharedstatus: SHARED_STATUS.OK,
      };
      mockUserModel.findOne.mockResolvedValue(mockDoc);

      const result = await userDao.checkInitialAdministratorExists();

      expect(result).toBe(false);
    });

    test("should return false when sharedstatus is incorrect", async () => {
      const hashedPassword = await bcrypt.hash("admin", 10);
      const mockDoc = {
        username: "esnadmin",
        password: hashedPassword,
        role: USER_ROLE.ADMIN,
        status: USER_STATUS.ACTIVE,
        sharedstatus: SHARED_STATUS.UNDEFINED, // Wrong sharedstatus
      };
      mockUserModel.findOne.mockResolvedValue(mockDoc);

      const result = await userDao.checkInitialAdministratorExists();

      expect(result).toBe(false);
    });

    test("should return false when password is incorrect", async () => {
      const wrongPassword = await bcrypt.hash("wrongpassword", 10);
      const mockDoc = {
        username: "esnadmin",
        password: wrongPassword,
        role: USER_ROLE.ADMIN,
        status: USER_STATUS.ACTIVE,
        sharedstatus: SHARED_STATUS.OK,
      };
      mockUserModel.findOne.mockResolvedValue(mockDoc);

      const result = await userDao.checkInitialAdministratorExists();

      expect(result).toBe(false);
    });

    test("should throw error when database error occurs", async () => {
      const dbError = new Error("Database error");
      mockUserModel.findOne.mockRejectedValue(dbError);

      await expect(userDao.checkInitialAdministratorExists()).rejects.toThrow("Database error");
    });
  });
});

