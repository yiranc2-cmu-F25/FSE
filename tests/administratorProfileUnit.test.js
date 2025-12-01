import User from "../entities/User.js";
import userDac from "../dacs/userDac.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
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

