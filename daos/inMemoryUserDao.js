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
            createdAt: new Date(),
        });
        this.users.push({
            id: 2,
            username: "Shumin",
            password: "xyz567",
            sharedstatus: SHARED_STATUS.OK,
            status: USER_STATUS.ACTIVE,
            role: USER_ROLE.CITIZEN,
            createdAt: new Date(),
        });
        this.users.push({
            id: 3,
            username: "Ritvik",
            password: "def012",
            sharedstatus: SHARED_STATUS.HELP,
            status: USER_STATUS.ACTIVE,
            role: USER_ROLE.CITIZEN,
            createdAt: new Date(),
        });
        this.delay = 100;
    }

    async create({ username, password, sharedstatus, status, role }) {
        this.users.push({
            id: this.users.length + 1,
            username,
            password,
            sharedstatus: sharedstatus || "undefined",
            status: status || "active",
            role: role || "citizen",
            createdAt: new Date(),
        });
    }

    async validatePassword(username, plainPassword) {
        const user = this.users.find((u) => username === u.username);
        if (!user) return false;
        return plainPassword === user.password;
    }

    async getUsernameById(id) {
        const user = this.users.find((u) => id === u.id);
        return user ? user.username : null;
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
        const user = this.users.find((u) => id === u.id);
        if (user) {
            user.sharedstatus = newStatus;
        }
    }
}
