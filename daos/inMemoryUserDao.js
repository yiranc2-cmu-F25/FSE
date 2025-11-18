import { USER_STATUS } from "../constants/userStatus.js";
import { SHARED_STATUS } from "../constants/sharedStatus.js";
import { USER_ROLE } from "../constants/userRole.js";
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
    const user = this.users.find((u) => id == u.id);
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
}