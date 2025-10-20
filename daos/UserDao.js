import bcrypt from "bcrypt";
import { USER_STATUS } from "../constants/userStatus.js";
import { iUserDao } from "./iUserDao.js";

export class UserDao extends iUserDao {
    constructor({ UserModel }) {
        super();
        this.UserModel = UserModel;
    }

    async create({ username, password, sharedstatus, status, role }) {
        const doc = await this.UserModel.create({
            username,
            password,
            sharedstatus,
            status,
            role,
        });
    }

    async validatePassword(username, plainPassword) {
        const doc = await this.UserModel.findOne({ username });
        if (!doc) return false;
        return await bcrypt.compare(plainPassword, doc.password);
    }

    async getUsernameById(id) {
        const doc = await this.UserModel.findById(id);
        return doc ? doc.username : null;
    }

    async findByUsername(username) {
        const doc = await this.UserModel.findOne({ username });
        const obj = doc?.toObject();
        return (
            obj && {
                ...obj,
                id: obj._id,
            }
        );
    }

    async getAllUsers() {
        const docs = await this.UserModel.find({ status: USER_STATUS.ACTIVE })
            .sort({ username: 1 })
            .lean();
        return docs.map((doc) => ({ ...doc, id: doc._id }));
    }

    async updateStatusById(id, newStatus) {
        console.log(
            "Updating status for user ID:",
            id,
            "to new status:",
            newStatus,
        );
        try {
            const doc = await this.UserModel.findByIdAndUpdate(
                id,
                { sharedstatus: newStatus },
                { new: true },
            );
            console.log("After update, doc =", doc);
        } catch (err) {
            console.error("Error updating status for user ID:", id, err);
            throw err;
        }
    }
}
