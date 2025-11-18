import bcrypt from "bcrypt";
import { USER_STATUS } from "../constants/userStatus.js";
import { iUserDao } from "./iUserDao.js";

export class UserDao extends iUserDao {
    constructor({ UserModel }) {
        super();
        this.UserModel = UserModel;
    }

    async create({ username, password, sharedstatus, status, role, skills }) {
        const doc = await this.UserModel.create({
            username,
            password,
            sharedstatus,
            status,
            role,
            skills: skills || [],
        });

        return doc.toObject();
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

    async findById(id) {
        //console.log("[UserDao.findById] in:", id);
        try {
            const doc = await this.UserModel.findById(id);
            //console.log("[UserDao.findById] found?", !!doc, doc && {
            // _id: doc._id?.toString(),
            // username: doc.username,
            // sharedstatus: doc.sharedstatus,
            // status: doc.status
            // });
            return doc || null;
        } catch (err) {
            console.error("[UserDao.findById] error:", err);
            throw err;
        }
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

    async getSkillsById(id) {
        try {
            const doc = await this.UserModel.findById(id).select("skills").lean();
            return doc ? (doc.skills || []) : [];
        } catch (err) {
            console.error("Error getting skills for user ID:", id, err);
            throw err;
        }
    }

    async updateSkillsById(id, skills) {
        try {
            await this.UserModel.findByIdAndUpdate(
                id,
                { skills: Array.isArray(skills) ? skills : [] },
                { new: true },
            );
        } catch (err) {
            console.error("Error updating skills for user ID:", id, err);
            throw err;
        }
    }
}
