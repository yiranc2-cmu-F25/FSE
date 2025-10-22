import userDac from "../dacs/userDac.js";
import { isUsernameValid, isPasswordValid } from "../utils/validators.js";

class User {
    constructor({ username, password, sharedstatus, status, role }) {
        if (!isUsernameValid(username)) throw Error("Invalid username");
        if (!isPasswordValid(password)) throw Error("Invalid password");
        this.username = username;
        this.password = password;
        this.sharedstatus = sharedstatus;
        this.status = status;
        this.role = role;
    }

    isActive() {
        return this.status === "active";
    }

    isAdmin() {
        return this.role === "admin";
    }

    toJSON() {
        return {
            id: this.id,
            username: this.username,
            sharedstatus: this.sharedstatus,
            status: this.status,
            role: this.role,
        };
    }

    static get DAO() {
        return userDac.DAO;
    }

    async create() {
        await User.DAO.create({
            username: this.username,
            password: this.password,
            sharedstatus: this.sharedstatus,
            status: this.status,
            role: this.role,
        });
    }

    static async findByUsername(username) {
        return await User.DAO.findByUsername(username);
    }
    
    static async findById(id) {
        return await User.DAO.findById(id);
    }

    static async validatePassword(username, plainPassword) {
        return await User.DAO.validatePassword(username, plainPassword);
    }

    static async getUsernameById(id) {
        return await User.DAO.getUsernameById(id);
    }

    static async getAllUsers() {
        return await User.DAO.getAllUsers();
    }

    static async updateStatusById(id, newStatus) {
        await User.DAO.updateStatusById(id, newStatus);
    }
}

export default User;
