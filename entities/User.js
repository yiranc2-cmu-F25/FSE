import userDac from "../dacs/userDac.js";
import { isUsernameValid, isPasswordValid } from "../utils/validators.js";

class User {
    constructor({ username, password, sharedstatus, status, role, skills }) {
        if (!isUsernameValid(username)) throw Error("Invalid username");
        if (!isPasswordValid(password)) throw Error("Invalid password");
        this.username = username;
        this.password = password;
        this.sharedstatus = sharedstatus;
        this.status = status;
        this.role = role;
        this.skills = skills || [];
    }

    static get DAO() {
        return userDac.DAO;
    }

    async create() {
        return await User.DAO.create({
            username: this.username,
            password: this.password,
            sharedstatus: this.sharedstatus,
            status: this.status,
            role: this.role,
            skills: this.skills,
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

    static async getSkillsById(id) {
        return await User.DAO.getSkillsById(id);
    }

    static async updateSkillsById(id, skills) {
        await User.DAO.updateSkillsById(id, skills);
    }

    static async getInactiveUsers() {
        return await User.DAO.getInactiveUsers();
    }

    static async updateAccountStatusById(id, newStatus) {
        await User.DAO.updateAccountStatusById(id, newStatus);
    }

    static async updateRoleById(id, newRole) {
        await User.DAO.updateRoleById(id, newRole);
    }

    static async updateUsernameById(id, newUsername) {
        await User.DAO.updateUsernameById(id, newUsername);
    }

    static async updatePasswordById(id, newPassword) {
        await User.DAO.updatePasswordById(id, newPassword);
    }

    static async usernameExists(username, excludeUserId = null) {
        return await User.DAO.usernameExists(username, excludeUserId);
    }

    static async checkInitialAdministratorExists() {
        return await User.DAO.checkInitialAdministratorExists();
    }
}

export default User;
