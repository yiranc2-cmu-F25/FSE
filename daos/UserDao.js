import bcrypt from "bcrypt";
import { USER_STATUS } from "../constants/userStatus.js";
import { USER_ROLE } from "../constants/userRole.js";
import { SHARED_STATUS } from "../constants/sharedStatus.js";
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

    async updateAccountStatusById(id, newStatus) {
        try {
            await this.UserModel.findByIdAndUpdate(
                id,
                { status: newStatus },
                { new: true },
            );
        } catch (err) {
            console.error("Error updating account status for user ID:", id, err);
            throw err;
        }
    }

    async updateRoleById(id, newRole) {
        try {
            await this.UserModel.findByIdAndUpdate(
                id,
                { role: newRole },
                { new: true },
            );
        } catch (err) {
            console.error("Error updating role for user ID:", id, err);
            throw err;
        }
    }

    async updateUsernameById(id, newUsername) {
        try {
            // Username will be validated by schema validation
            const doc = await this.UserModel.findByIdAndUpdate(
                id,
                { username: newUsername.toLowerCase() },
                { new: true, runValidators: true },
            );
            if (!doc) {
                throw new Error("User not found");
            }
        } catch (err) {
            console.error("Error updating username for user ID:", id, err);
            // Check if it's a duplicate key error
            if (err.code === 11000 || err.name === "MongoServerError") {
                throw new Error("Username already exists");
            }
            throw err;
        }
    }

    async updatePasswordById(id, newPassword) {
        try {
            // Password will be hashed by pre-save hook
            const doc = await this.UserModel.findById(id);
            if (!doc) {
                throw new Error("User not found");
            }
            // Explicitly mark password as modified to ensure pre-save hook runs
            // This is critical when multiple fields are updated in parallel
            doc.password = newPassword;
            doc.markModified("password");
            await doc.save();
        } catch (err) {
            console.error("Error updating password for user ID:", id, err);
            throw err;
        }
    }

    /**
     * Applies several profile changes to one user document in a single save so
     * that schema validation and the password-hashing pre-save hook both run.
     * @returns the updated plain user object, or null if the user does not exist
     * @throws Error("Username already exists") on a duplicate username
     */
    async updateProfileById(id, { status, role, username, password }) {
        try {
            const doc = await this.UserModel.findById(id);
            if (!doc) return null;
            if (status !== undefined) doc.status = status;
            if (role !== undefined) doc.role = role;
            if (username !== undefined) doc.username = username.toLowerCase();
            if (password !== undefined) {
                doc.password = password;
                doc.markModified("password");
            }
            await doc.save();
            const obj = doc.toObject();
            return { ...obj, id: obj._id };
        } catch (err) {
            console.error("Error updating profile for user ID:", id, err);
            if (err.code === 11000 || err.name === "MongoServerError") {
                throw new Error("Username already exists");
            }
            throw err;
        }
    }

    async usernameExists(username, excludeUserId = null) {
        try {
            const query = { username: username.toLowerCase() };
            if (excludeUserId) {
                query._id = { $ne: excludeUserId };
            }
            const doc = await this.UserModel.findOne(query);
            return !!doc;
        } catch (err) {
            console.error("Error checking username existence:", err);
            throw err;
        }
    }

    async getUserProfileById(id) {
        try {
            const doc = await this.UserModel.findById(id)
                .select('username status role')
                .lean();
            if (!doc) {
                return null;
            }
            return {
                id: doc._id.toString(),
                username: doc.username,
                status: doc.status,
                role: doc.role,
            };
        } catch (err) {
            console.error("Error getting user profile by ID:", err);
            throw err;
        }
    }

    async getInactiveUsers() {
        try {
            const docs = await this.UserModel.find({ status: USER_STATUS.INACTIVE })
                .sort({ username: 1 })
                .lean();
            return docs.map((doc) => ({ ...doc, id: doc._id }));
        } catch (err) {
            console.error("Error getting inactive users:", err);
            throw err;
        }
    }

    async getRoleById(id) {
        try {
            const doc = await this.UserModel.findById(id)
                .select('role')
                .lean();
            if (!doc) {
                return null;
            }
            return doc.role || USER_ROLE.CITIZEN;
        } catch (err) {
            console.error("Error getting role by ID:", err);
            throw err;
        }
    }

    /**
     * Check if the initial administrator user exists
     * Initial administrator should have:
     * - username: "esnadmin" (stored as lowercase)
     * - password: "admin" (validated using bcrypt)
     * - role: USER_ROLE.ADMIN ("admin")
     * - status: USER_STATUS.ACTIVE ("active")
     * - sharedstatus: SHARED_STATUS.OK ("ok")
     * @returns {Promise<boolean>} True if initial administrator exists and matches all criteria
     */
    async checkInitialAdministratorExists() {
        try {
            const INITIAL_ADMIN_USERNAME = "esnadmin";
            const INITIAL_ADMIN_PASSWORD = "admin";

            // Find user by username (username is stored as lowercase)
            const doc = await this.UserModel.findOne({ username: INITIAL_ADMIN_USERNAME });
            
            if (!doc) {
                return false;
            }

            // Check role
            if (doc.role !== USER_ROLE.ADMIN) {
                return false;
            }

            // Check account status
            if (doc.status !== USER_STATUS.ACTIVE) {
                return false;
            }

            // Check shared status
            if (doc.sharedstatus !== SHARED_STATUS.OK) {
                return false;
            }

            // Validate password using bcrypt
            const passwordMatches = await bcrypt.compare(INITIAL_ADMIN_PASSWORD, doc.password);
            if (!passwordMatches) {
                return false;
            }

            return true;
        } catch (err) {
            console.error("Error checking initial administrator:", err);
            throw err;
        }
    }
}
