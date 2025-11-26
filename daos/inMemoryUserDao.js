import { USER_STATUS } from "../constants/userStatus.js";
import { SHARED_STATUS } from "../constants/sharedStatus.js";
import { USER_ROLE } from "../constants/userRole.js";
import { PRIVILEGE_LEVEL } from "../constants/privilegeLevel.js";
import { iUserDao } from "./iUserDao.js";

export class inMemoryUserDao extends iUserDao {
  constructor() {
    super();
    this.users = [];
    this.users.push({
      id: 1,
      username: "Anton",
      password: "abc123",
      sharedstatus: SHARED_STATUS.UNDEFINED,
      status: USER_STATUS.ACTIVE,
      role: USER_ROLE.CITIZEN,
      privilegeLevel: PRIVILEGE_LEVEL.CITIZEN,
      skills: [],
      createdAt: new Date(),
    });
    this.users.push({
      id: 2,
      username: "Shumin",
      password: "xyz567",
      sharedstatus: SHARED_STATUS.OK,
      status: USER_STATUS.ACTIVE,
      role: USER_ROLE.CITIZEN,
      privilegeLevel: PRIVILEGE_LEVEL.CITIZEN,
      skills: [],
      createdAt: new Date(),
    });
    this.users.push({
      id: 3,
      username: "Ritvik",
      password: "def012",
      sharedstatus: SHARED_STATUS.HELP,
      status: USER_STATUS.ACTIVE,
      role: USER_ROLE.CITIZEN,
      privilegeLevel: PRIVILEGE_LEVEL.CITIZEN,
      skills: [],
      createdAt: new Date(),
    });
    this.delay = 100;
  }

  async create({ username, password, sharedstatus, status, role, skills }) {
    // Enforce unique username (in-memory simulation of DB unique index)
    const exists = this.users.find((u) => u.username === username);
    if (exists) {
      throw new Error("Duplicate username");
    }

    // Normalize sharedstatus and role to allowed constants
    const normalizedShared = sharedstatus || SHARED_STATUS.UNDEFINED;
    const allowedRoles = Object.values(USER_ROLE);
    const normalizedRole = allowedRoles.includes(role)
      ? role
      : USER_ROLE.CITIZEN;

    const newUser = {
      id: this.users.length + 1,
      username,
      password,
      sharedstatus: normalizedShared,
      status: status || USER_STATUS.ACTIVE,
      role: normalizedRole,
      privilegeLevel: PRIVILEGE_LEVEL.CITIZEN,
      skills: skills || [],
      createdAt: new Date(),
    };

    this.users.push(newUser);
    return { ...newUser };
  }

  async validatePassword(username, plainPassword) {
    const user = this.users.find((u) => username === u.username);
    if (!user) return false;
    return plainPassword === user.password;
  }

  async getUsernameById(id) {
    // Use == to handle both string and number IDs (e.g., "5" == 5)
    // Also handle ObjectId hex strings that can be parsed back to numbers
    let user = this.users.find((u) => id == u.id || id == u._id);
    if (!user && typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id)) {
      const parsedId = parseInt(id, 16);
      user = this.users.find((u) => parsedId === u.id);
    }
    return user ? user.username : null;
  }

  async findById(id) {
    // Use == to handle both string and number IDs (e.g., "5" == 5)
    const user = this.users.find((u) => id == u.id);
    return user ? { ...user } : null;
  }

  async findByUsername(username) {
    const user = this.users.find((u) => username === u.username);
    return user ? { ...user } : null;
  }

  async getAllUsers() {
    return this.users
      .filter((u) => u.status === USER_STATUS.ACTIVE)
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  async updateStatusById(id, newStatus) {
    // Use == to handle both string and number IDs
    const user = this.users.find((u) => id == u.id);
    if (user) {
      user.sharedstatus = newStatus;
    }
  }

  async getSkillsById(id) {
    const user = this.users.find((u) => id == u.id);
    return user ? (user.skills || []) : [];
  }

  async updateSkillsById(id, skills) {
    const user = this.users.find((u) => id == u.id);
    if (user) {
      user.skills = Array.isArray(skills) ? skills : [];
    }
  }

  async updateAccountStatusById(id, newStatus) {
    const user = this.users.find((u) => id == u.id);
    if (user) {
      user.status = newStatus;
    }
  }

  async updatePrivilegeLevelById(id, newPrivilegeLevel) {
    const user = this.users.find((u) => id == u.id);
    if (user) {
      user.privilegeLevel = newPrivilegeLevel;
    }
  }

  async updateUsernameById(id, newUsername) {
    const user = this.users.find((u) => id == u.id);
    if (!user) {
      throw new Error("User not found");
    }
    // Check for duplicate username (excluding current user)
    const existingUser = this.users.find(
      (u) => u.username.toLowerCase() === newUsername.toLowerCase() && u.id != id
    );
    if (existingUser) {
      throw new Error("Username already exists");
    }
    user.username = newUsername.toLowerCase();
  }

  async updatePasswordById(id, newPassword) {
    const user = this.users.find((u) => id == u.id);
    if (!user) {
      throw new Error("User not found");
    }
    user.password = newPassword;
  }

  async usernameExists(username, excludeUserId = null) {
    const normalizedUsername = username.toLowerCase();
    const user = this.users.find(
      (u) =>
        u.username.toLowerCase() === normalizedUsername &&
        (!excludeUserId || u.id != excludeUserId)
    );
    return !!user;
  }

  async getUserProfileByUsername(username) {
    const user = this.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      username: user.username,
      status: user.status,
      privilegeLevel: user.privilegeLevel || PRIVILEGE_LEVEL.CITIZEN,
    };
  }

  async getUserProfileById(id) {
    const user = this.users.find((u) => id == u.id);
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      username: user.username,
      status: user.status,
      privilegeLevel: user.privilegeLevel || PRIVILEGE_LEVEL.CITIZEN,
    };
  }

  async getInactiveUsers() {
    return this.users
      .filter((u) => u.status === USER_STATUS.INACTIVE)
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  async getPrivilegeLevelById(id) {
    const user = this.users.find((u) => id == u.id);
    if (!user) {
      return null;
    }
    return user.privilegeLevel || PRIVILEGE_LEVEL.CITIZEN;
  }
}