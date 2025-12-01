import { jest } from "@jest/globals";
import User from "../entities/User.js";
import userDac from "../dacs/userDac.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import {
  requireAdmin,
  getAllUsers,
  updateUserProfile,
} from "../controllers/administratorProfileController.js";
import { USER_ROLE } from "../constants/userRole.js";
import { USER_STATUS } from "../constants/userStatus.js";
import { SHARED_STATUS } from "../constants/sharedStatus.js";

const BASE_USER_PROPS = Object.freeze({
  username: "testuser",
  password: "testpass",
  sharedstatus: "undefined",
  status: "active",
  role: "citizen",
});

const buildUserProps = (overrides) => ({ ...BASE_USER_PROPS, ...overrides });

function createMockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("requireAdmin middleware", () => {
  let mockNext;

  beforeEach(() => {
    mockNext = jest.fn();
  });

  test("should call next() when user has admin role from req.user", async () => {
    const req = { user: { role: USER_ROLE.ADMIN } };
    const res = createMockRes();

    await requireAdmin(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("should call next() when user has admin role from req.role", async () => {
    const req = { role: USER_ROLE.ADMIN };
    const res = createMockRes();

    await requireAdmin(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("should return 401 when role is not found", async () => {
    const req = {};
    const res = createMockRes();

    await requireAdmin(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Unauthorized: User role not found",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("should return 403 when user is not admin", async () => {
    const req = { user: { role: USER_ROLE.CITIZEN } };
    const res = createMockRes();

    await requireAdmin(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Forbidden: Administrator privileges required",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("should return 403 when user is coordinator", async () => {
    const req = { user: { role: USER_ROLE.COORDINATOR } };
    const res = createMockRes();

    await requireAdmin(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Forbidden: Administrator privileges required",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("should return 500 when an error occurs", async () => {
    const req = { user: null };
    // Mock req.user.role access to throw error
    Object.defineProperty(req, "user", {
      get() {
        throw new Error("Unexpected error");
      },
    });
    const res = createMockRes();

    await requireAdmin(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Server error" });
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe("getAllUsers", () => {
  beforeEach(() => {
    userDac.DAO = new inMemoryUserDao();
  });

  test("should return all users (active and inactive) sorted by username", async () => {
    // Create active users
    const activeUser1 = new User(
      buildUserProps({ username: `active1_${Date.now()}` })
    );
    await activeUser1.create();

    const activeUser2 = new User(
      buildUserProps({ username: `active2_${Date.now()}` })
    );
    await activeUser2.create();

    // Create inactive user
    const inactiveUser = new User(
      buildUserProps({
        username: `inactive_${Date.now()}`,
        status: USER_STATUS.INACTIVE,
      })
    );
    await inactiveUser.create();

    const req = {};
    const res = createMockRes();

    await getAllUsers(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();

    const responseBody = res.json.mock.calls[0][0];
    expect(Array.isArray(responseBody)).toBe(true);
    expect(responseBody.length).toBeGreaterThanOrEqual(3);

    // Verify all users are present
    const usernames = responseBody.map((u) => u.username);
    expect(usernames).toContain(activeUser1.username);
    expect(usernames).toContain(activeUser2.username);
    expect(usernames).toContain(inactiveUser.username);

    // Verify users are sorted by username
    const sortedUsernames = [...usernames].sort((a, b) =>
      a.localeCompare(b)
    );
    expect(usernames).toEqual(sortedUsernames);

    // Verify response format
    responseBody.forEach((user) => {
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("username");
      expect(user).toHaveProperty("status");
      expect(user).toHaveProperty("role");
      expect(user).not.toHaveProperty("password");
    });
  });

  test("should return empty array when no users exist", async () => {
    userDac.DAO = new inMemoryUserDao();
    // Clear all users
    userDac.DAO.users = [];

    const req = {};
    const res = createMockRes();

    await getAllUsers(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
  });

  test("should return 500 when an error occurs", async () => {
    // Mock getAllUsers to throw error
    const originalGetAllUsers = User.getAllUsers;
    User.getAllUsers = jest.fn().mockRejectedValue(new Error("DB error"));

    const req = {};
    const res = createMockRes();

    await getAllUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Server error" });

    // Restore original method
    User.getAllUsers = originalGetAllUsers;
  });
});

describe("updateUserProfile", () => {
  let originalFindById;
  
  beforeEach(() => {
    userDac.DAO = new inMemoryUserDao();
    
    // Mock User.findById to return objects with save() method for inMemoryUserDao
    originalFindById = User.findById;
    User.findById = jest.fn(async (userId) => {
      const user = await userDac.DAO.findById(userId);
      if (!user) return null;
      
      // Find the actual user object in DAO to modify it directly
      const daoUser = userDac.DAO.users.find(u => u.id == userId);
      if (!daoUser) return null;
      
      // Return a proxy object that updates the DAO user when properties are set
      const userProxy = {
        get status() { return daoUser.status; },
        set status(value) { daoUser.status = value; },
        get role() { return daoUser.role; },
        set role(value) { daoUser.role = value; },
        get username() { return daoUser.username; },
        set username(value) { daoUser.username = value; },
        get password() { return daoUser.password; },
        set password(value) { daoUser.password = value; },
        get id() { return daoUser.id; },
        get _id() { return daoUser.id || daoUser._id; },
        async save() {
          // Save is a no-op since we're modifying the object directly
          return userProxy;
        },
        toObject() {
          return { ...daoUser };
        }
      };
      
      return userProxy;
    });
  });

  afterEach(() => {
    // Restore original findById
    if (originalFindById) {
      User.findById = originalFindById;
    }
  });

  test("should return 400 when userId is missing", async () => {
    const req = { params: {}, body: { status: USER_STATUS.ACTIVE } };
    const res = createMockRes();

    await updateUserProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "User ID is required",
    });
  });

  test("should return 404 when user is not found", async () => {
    const req = {
      params: { userId: "nonexistent_id" },
      body: { status: USER_STATUS.ACTIVE },
    };
    const res = createMockRes();

    await updateUserProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
  });

  test("should successfully update user status", async () => {
    const user = new User(buildUserProps({ username: `status_user_${Date.now()}` }));
    await user.create();
    const found = await User.findByUsername(user.username);

    const req = {
      params: { userId: found.id },
      body: { status: USER_STATUS.INACTIVE },
      app: { get: jest.fn(() => null) },
    };
    const res = createMockRes();

    await updateUserProfile(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();

    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.message).toBe("Profile updated successfully");
    expect(responseBody.profile.status).toBe(USER_STATUS.INACTIVE);

    // Verify user was actually updated
    const updated = await User.findById(found.id);
    expect(updated.status).toBe(USER_STATUS.INACTIVE);
  });

  test("should successfully update user role", async () => {
    const user = new User(
      buildUserProps({ username: `role_user_${Date.now()}`, role: USER_ROLE.CITIZEN })
    );
    await user.create();
    const found = await User.findByUsername(user.username);

    const req = {
      params: { userId: found.id },
      body: { role: USER_ROLE.COORDINATOR },
      app: { get: jest.fn(() => null) },
    };
    const res = createMockRes();

    await updateUserProfile(req, res);

    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.profile.role).toBe(USER_ROLE.COORDINATOR);

    // Verify user was actually updated
    const updated = await User.findById(found.id);
    expect(updated.role).toBe(USER_ROLE.COORDINATOR);
  });

  test("should successfully update username", async () => {
    const user = new User(
      buildUserProps({ username: `oldname_${Date.now()}` })
    );
    await user.create();
    const found = await User.findByUsername(user.username);

    const newUsername = `newname_${Date.now()}`;
    const mockSocket = {
      disconnectUser: jest.fn(),
    };
    const req = {
      params: { userId: found.id },
      body: { username: newUsername },
      app: { get: jest.fn(() => mockSocket) },
    };
    const res = createMockRes();

    await updateUserProfile(req, res);

    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.profile.username).toBe(newUsername.toLowerCase());

    // Verify user was actually updated
    const updated = await User.findByUsername(newUsername.toLowerCase());
    expect(updated).toBeTruthy();
    expect(updated.username).toBe(newUsername.toLowerCase());

    // Verify socket was called with old username
    expect(mockSocket.disconnectUser).toHaveBeenCalledWith(user.username);
  });

  test("should successfully update password", async () => {
    const user = new User(
      buildUserProps({ username: `password_user_${Date.now()}`, password: "oldpass" })
    );
    await user.create();
    const found = await User.findByUsername(user.username);

    const req = {
      params: { userId: found.id },
      body: { password: "newpass123" },
      app: { get: jest.fn(() => null) },
    };
    const res = createMockRes();

    await updateUserProfile(req, res);

    expect(res.status).not.toHaveBeenCalled();
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.message).toBe("Profile updated successfully");

    // Verify password was updated (can't easily test hashing without more setup)
    const updated = await User.findById(found.id);
    expect(updated.password).not.toBe("oldpass");
  });

  test("should successfully update multiple fields at once", async () => {
    const user = new User(
      buildUserProps({
        username: `multi_user_${Date.now()}`,
        status: USER_STATUS.ACTIVE,
        role: USER_ROLE.CITIZEN,
      })
    );
    await user.create();
    const found = await User.findByUsername(user.username);

    const newUsername = `multi_new_${Date.now()}`;
    const req = {
      params: { userId: found.id },
      body: {
        status: USER_STATUS.INACTIVE,
        role: USER_ROLE.COORDINATOR,
        username: newUsername,
      },
      app: { get: jest.fn(() => null) },
    };
    const res = createMockRes();

    await updateUserProfile(req, res);

    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.profile.status).toBe(USER_STATUS.INACTIVE);
    expect(responseBody.profile.role).toBe(USER_ROLE.COORDINATOR);
    expect(responseBody.profile.username).toBe(newUsername.toLowerCase());

    // Verify all fields were updated
    const updated = await User.findByUsername(newUsername.toLowerCase());
    expect(updated.status).toBe(USER_STATUS.INACTIVE);
    expect(updated.role).toBe(USER_ROLE.COORDINATOR);
  });

  test("should return 400 when status is invalid", async () => {
    const user = new User(buildUserProps({ username: `invalid_status_${Date.now()}` }));
    await user.create();
    const found = await User.findByUsername(user.username);

    const req = {
      params: { userId: found.id },
      body: { status: "invalid_status" },
      app: { get: jest.fn(() => null) },
    };
    const res = createMockRes();

    await updateUserProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toBe("Validation errors");
    expect(res.json.mock.calls[0][0].errors).toContain(
      "Invalid status. Must be 'active' or 'inactive'"
    );
  });

  test("should return 400 when role is invalid", async () => {
    const user = new User(buildUserProps({ username: `invalid_role_${Date.now()}` }));
    await user.create();
    const found = await User.findByUsername(user.username);

    const req = {
      params: { userId: found.id },
      body: { role: "invalid_role" },
      app: { get: jest.fn(() => null) },
    };
    const res = createMockRes();

    await updateUserProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toBe("Validation errors");
    expect(res.json.mock.calls[0][0].errors[0]).toContain("Invalid role");
  });

  test("should return 400 when username is invalid (too short)", async () => {
    const user = new User(buildUserProps({ username: `validuser_${Date.now()}` }));
    await user.create();
    const found = await User.findByUsername(user.username);

    const req = {
      params: { userId: found.id },
      body: { username: "ab" }, // Too short
      app: { get: jest.fn(() => null) },
    };
    const res = createMockRes();

    await updateUserProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toBe("Validation errors");
    expect(res.json.mock.calls[0][0].errors[0]).toContain("Invalid username format");
  });

  test("should return 400 when username contains dots", async () => {
    const user = new User(buildUserProps({ username: `validuser_${Date.now()}` }));
    await user.create();
    const found = await User.findByUsername(user.username);

    const req = {
      params: { userId: found.id },
      body: { username: "user.name" }, // Contains dot
      app: { get: jest.fn(() => null) },
    };
    const res = createMockRes();

    await updateUserProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toBe("Validation errors");
    expect(res.json.mock.calls[0][0].errors[0]).toContain("Invalid username format");
  });

  test("should return 400 when username already exists", async () => {
    const user1 = new User(buildUserProps({ username: `existing_${Date.now()}` }));
    await user1.create();

    const user2 = new User(
      buildUserProps({ username: `toupdate_${Date.now()}` })
    );
    await user2.create();
    const found = await User.findByUsername(user2.username);

    const req = {
      params: { userId: found.id },
      body: { username: user1.username },
      app: { get: jest.fn(() => null) },
    };
    const res = createMockRes();

    await updateUserProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toBe("Validation errors");
    expect(res.json.mock.calls[0][0].errors).toContain("Username already exists");
  });

  test("should return 400 when password is invalid (too short)", async () => {
    const user = new User(buildUserProps({ username: `password_invalid_${Date.now()}` }));
    await user.create();
    const found = await User.findByUsername(user.username);

    const req = {
      params: { userId: found.id },
      body: { password: "123" }, // Too short
      app: { get: jest.fn(() => null) },
    };
    const res = createMockRes();

    await updateUserProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toBe("Validation errors");
    expect(res.json.mock.calls[0][0].errors[0]).toContain("Invalid password format");
  });

  test("should return 400 when multiple validation errors occur", async () => {
    const user = new User(buildUserProps({ username: `multi_error_${Date.now()}` }));
    await user.create();
    const found = await User.findByUsername(user.username);

    const req = {
      params: { userId: found.id },
      body: {
        status: "invalid_status",
        role: "invalid_role",
        password: "123", // Too short
      },
      app: { get: jest.fn(() => null) },
    };
    const res = createMockRes();

    await updateUserProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toBe("Validation errors");
    expect(res.json.mock.calls[0][0].errors.length).toBeGreaterThanOrEqual(3);
  });

  test("should not disconnect socket when username doesn't change", async () => {
    const user = new User(buildUserProps({ username: `same_username_${Date.now()}` }));
    await user.create();
    const found = await User.findByUsername(user.username);

    const mockSocket = {
      disconnectUser: jest.fn(),
    };
    const req = {
      params: { userId: found.id },
      body: { username: user.username }, // Same username
      app: { get: jest.fn(() => mockSocket) },
    };
    const res = createMockRes();

    await updateUserProfile(req, res);

    // Socket should not be called when username doesn't change
    expect(mockSocket.disconnectUser).not.toHaveBeenCalled();
  });

  test("should return 500 when an error occurs", async () => {
    const user = new User(buildUserProps({ username: `error_user_${Date.now()}` }));
    await user.create();
    const found = await User.findByUsername(user.username);

    // Mock findById to throw error
    const originalFindById = User.findById;
    User.findById = jest.fn().mockRejectedValue(new Error("DB error"));

    const req = {
      params: { userId: found.id },
      body: { status: USER_STATUS.ACTIVE },
      app: { get: jest.fn(() => null) },
    };
    const res = createMockRes();

    await updateUserProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Server error" });

    // Restore original method
    User.findById = originalFindById;
  });

  test("should handle username case insensitivity", async () => {
    const user = new User(buildUserProps({ username: `lowercase_${Date.now()}` }));
    await user.create();
    const found = await User.findByUsername(user.username);

    const newUsername = `UPPERCASE_${Date.now()}`;
    const req = {
      params: { userId: found.id },
      body: { username: newUsername },
      app: { get: jest.fn(() => null) },
    };
    const res = createMockRes();

    await updateUserProfile(req, res);

    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.profile.username).toBe(newUsername.toLowerCase());

    // Verify username was stored in lowercase
    const updated = await User.findByUsername(newUsername.toLowerCase());
    expect(updated).toBeTruthy();
  });
});

describe("Initial-Administrator Rule", () => {
  beforeEach(() => {
    userDac.DAO = new inMemoryUserDao();
  });

  test("should return true when initial administrator exists with all correct properties", async () => {
    // Create initial administrator user with all required properties
    const initialAdmin = new User({
      username: "esnadmin",
      password: "admin",
      sharedstatus: SHARED_STATUS.OK,
      status: USER_STATUS.ACTIVE,
      role: USER_ROLE.ADMIN,
      skills: [],
    });
    await initialAdmin.create();

    const exists = await User.checkInitialAdministratorExists();
    expect(exists).toBe(true);
  });

  test("should return false when initial administrator does not exist", async () => {
    // Create a different admin user (not the initial one)
    const otherAdmin = new User({
      username: "otheradmin",
      password: "admin",
      sharedstatus: SHARED_STATUS.OK,
      status: USER_STATUS.ACTIVE,
      role: USER_ROLE.ADMIN,
      skills: [],
    });
    await otherAdmin.create();

    const exists = await User.checkInitialAdministratorExists();
    expect(exists).toBe(false);
  });

  test("should return false when user exists but has wrong username", async () => {
    // Create a user with a completely different username (not esnadmin)
    const wrongUsernameAdmin = new User({
      username: "differentadmin", // Completely different username
      password: "admin",
      sharedstatus: SHARED_STATUS.OK,
      status: USER_STATUS.ACTIVE,
      role: USER_ROLE.ADMIN,
      skills: [],
    });
    await wrongUsernameAdmin.create();

    const exists = await User.checkInitialAdministratorExists();
    expect(exists).toBe(false);
  });

  test("should return false when user exists but has wrong password", async () => {
    const wrongPasswordAdmin = new User({
      username: "esnadmin",
      password: "wrongpassword",
      sharedstatus: SHARED_STATUS.OK,
      status: USER_STATUS.ACTIVE,
      role: USER_ROLE.ADMIN,
      skills: [],
    });
    await wrongPasswordAdmin.create();

    const exists = await User.checkInitialAdministratorExists();
    expect(exists).toBe(false);
  });

  test("should return false when user exists but has wrong role", async () => {
    const wrongRoleUser = new User({
      username: "esnadmin",
      password: "admin",
      sharedstatus: SHARED_STATUS.OK,
      status: USER_STATUS.ACTIVE,
      role: USER_ROLE.CITIZEN, // Wrong role
      skills: [],
    });
    await wrongRoleUser.create();

    const exists = await User.checkInitialAdministratorExists();
    expect(exists).toBe(false);
  });

  test("should return false when user exists but has wrong status", async () => {
    const wrongStatusAdmin = new User({
      username: "esnadmin",
      password: "admin",
      sharedstatus: SHARED_STATUS.OK,
      status: USER_STATUS.INACTIVE, // Wrong status
      role: USER_ROLE.ADMIN,
      skills: [],
    });
    await wrongStatusAdmin.create();

    const exists = await User.checkInitialAdministratorExists();
    expect(exists).toBe(false);
  });

  test("should return false when user exists but has wrong sharedstatus", async () => {
    const wrongSharedStatusAdmin = new User({
      username: "esnadmin",
      password: "admin",
      sharedstatus: SHARED_STATUS.UNDEFINED, // Wrong sharedstatus
      status: USER_STATUS.ACTIVE,
      role: USER_ROLE.ADMIN,
      skills: [],
    });
    await wrongSharedStatusAdmin.create();

    const exists = await User.checkInitialAdministratorExists();
    expect(exists).toBe(false);
  });

  test("should return false when no users exist", async () => {
    // Clear all users
    userDac.DAO.users = [];

    const exists = await User.checkInitialAdministratorExists();
    expect(exists).toBe(false);
  });

  test("should return true even when other users exist", async () => {
    // Create initial administrator
    const initialAdmin = new User({
      username: "esnadmin",
      password: "admin",
      sharedstatus: SHARED_STATUS.OK,
      status: USER_STATUS.ACTIVE,
      role: USER_ROLE.ADMIN,
      skills: [],
    });
    await initialAdmin.create();

    // Create other users
    const otherUser1 = new User(
      buildUserProps({ username: `other1_${Date.now()}` })
    );
    await otherUser1.create();

    const otherAdmin = new User({
      username: `otheradmin_${Date.now()}`,
      password: "otherpass",
      sharedstatus: SHARED_STATUS.OK,
      status: USER_STATUS.ACTIVE,
      role: USER_ROLE.ADMIN,
      skills: [],
    });
    await otherAdmin.create();

    const exists = await User.checkInitialAdministratorExists();
    expect(exists).toBe(true);
  });
});

describe("At-Least-One-Administrator Rule", () => {
  beforeEach(() => {
    userDac.DAO = new inMemoryUserDao();
  });

  test("should return true when at least one active administrator exists", async () => {
    // Create an active administrator
    const admin = new User({
      username: `admin_${Date.now()}`,
      password: "adminpass",
      sharedstatus: SHARED_STATUS.OK,
      status: USER_STATUS.ACTIVE,
      role: USER_ROLE.ADMIN,
      skills: [],
    });
    await admin.create();

    // Check if at least one active admin exists
    const allUsers = await User.getAllUsers();
    const activeAdmins = allUsers.filter(
      (u) => u.role === USER_ROLE.ADMIN && u.status === USER_STATUS.ACTIVE
    );

    expect(activeAdmins.length).toBeGreaterThanOrEqual(1);
  });

  test("should return false when no active administrators exist", async () => {
    // Clear all users
    userDac.DAO.users = [];

    // Create only non-admin users
    const citizen1 = new User(
      buildUserProps({
        username: `citizen1_${Date.now()}`,
        role: USER_ROLE.CITIZEN,
      })
    );
    await citizen1.create();

    const coordinator = new User(
      buildUserProps({
        username: `coord_${Date.now()}`,
        role: USER_ROLE.COORDINATOR,
      })
    );
    await coordinator.create();

    // Check if at least one active admin exists
    const allUsers = await User.getAllUsers();
    const activeAdmins = allUsers.filter(
      (u) => u.role === USER_ROLE.ADMIN && u.status === USER_STATUS.ACTIVE
    );

    expect(activeAdmins.length).toBe(0);
  });

  test("should return false when only inactive administrators exist", async () => {
    // Create an inactive administrator
    const inactiveAdmin = new User({
      username: `inactive_admin_${Date.now()}`,
      password: "adminpass",
      sharedstatus: SHARED_STATUS.OK,
      status: USER_STATUS.INACTIVE, // Inactive
      role: USER_ROLE.ADMIN,
      skills: [],
    });
    await inactiveAdmin.create();

    // Check if at least one active admin exists
    const allUsers = await User.getAllUsers();
    const activeAdmins = allUsers.filter(
      (u) => u.role === USER_ROLE.ADMIN && u.status === USER_STATUS.ACTIVE
    );

    expect(activeAdmins.length).toBe(0);
  });

  test("should return true when multiple active administrators exist", async () => {
    // Create multiple active administrators
    const admin1 = new User({
      username: `admin1_${Date.now()}`,
      password: "adminpass1",
      sharedstatus: SHARED_STATUS.OK,
      status: USER_STATUS.ACTIVE,
      role: USER_ROLE.ADMIN,
      skills: [],
    });
    await admin1.create();

    const admin2 = new User({
      username: `admin2_${Date.now()}`,
      password: "adminpass2",
      sharedstatus: SHARED_STATUS.OK,
      status: USER_STATUS.ACTIVE,
      role: USER_ROLE.ADMIN,
      skills: [],
    });
    await admin2.create();

    // Check if at least one active admin exists
    const allUsers = await User.getAllUsers();
    const activeAdmins = allUsers.filter(
      (u) => u.role === USER_ROLE.ADMIN && u.status === USER_STATUS.ACTIVE
    );

    expect(activeAdmins.length).toBeGreaterThanOrEqual(1);
    expect(activeAdmins.length).toBeGreaterThanOrEqual(2);
  });

  test("should return true when initial administrator is the only active admin", async () => {
    // Create initial administrator
    const initialAdmin = new User({
      username: "esnadmin",
      password: "admin",
      sharedstatus: SHARED_STATUS.OK,
      status: USER_STATUS.ACTIVE,
      role: USER_ROLE.ADMIN,
      skills: [],
    });
    await initialAdmin.create();

    // Check if at least one active admin exists
    const allUsers = await User.getAllUsers();
    const activeAdmins = allUsers.filter(
      (u) => u.role === USER_ROLE.ADMIN && u.status === USER_STATUS.ACTIVE
    );

    expect(activeAdmins.length).toBeGreaterThanOrEqual(1);
    expect(activeAdmins.some((u) => u.username === "esnadmin")).toBe(true);
  });

  test("should return true when both initial and other active administrators exist", async () => {
    // Create initial administrator
    const initialAdmin = new User({
      username: "esnadmin",
      password: "admin",
      sharedstatus: SHARED_STATUS.OK,
      status: USER_STATUS.ACTIVE,
      role: USER_ROLE.ADMIN,
      skills: [],
    });
    await initialAdmin.create();

    // Create another active administrator
    const otherAdmin = new User({
      username: `otheradmin_${Date.now()}`,
      password: "otherpass",
      sharedstatus: SHARED_STATUS.OK,
      status: USER_STATUS.ACTIVE,
      role: USER_ROLE.ADMIN,
      skills: [],
    });
    await otherAdmin.create();

    // Check if at least one active admin exists
    const allUsers = await User.getAllUsers();
    const activeAdmins = allUsers.filter(
      (u) => u.role === USER_ROLE.ADMIN && u.status === USER_STATUS.ACTIVE
    );

    expect(activeAdmins.length).toBeGreaterThanOrEqual(1);
    expect(activeAdmins.length).toBeGreaterThanOrEqual(2);
  });
});

