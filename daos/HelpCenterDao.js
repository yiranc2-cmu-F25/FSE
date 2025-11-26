import { iHelpCenterDao } from "./iHelpCenterDao.js";
import { getActiveUserIds } from "../utils/filterInactiveUsers.js";
import User from "../entities/User.js";
import { USER_STATUS } from "../constants/userStatus.js";

export class HelpCenterDao extends iHelpCenterDao {
    constructor({ HelpCenterModel }) {
        super();
        this.HelpCenterModel = HelpCenterModel;
    }

    async create({ name, type, location, description, coordinates, owner }) {
        const doc = await this.HelpCenterModel.create({
            name,
            type,
            location,
            description,
            coordinates,
            owner,
        });
    }

    async getHelpCenterByUserId( userId ) {
        const centers = await this.HelpCenterModel.find({ owner: userId }).lean();
        // Filter out help centers where owner is inactive
        const owner = await User.findById(userId);
        if (!owner || owner.status !== USER_STATUS.ACTIVE) {
            return [];
        }
        return centers;
    }

    async getClosestHelpCenters({ coordinates, limit = 10 }) {
        const centers = await this.HelpCenterModel.find({
            coordinates: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: coordinates
                    }
                }
            }
        }).limit(limit).lean();
        
        // Filter out help centers where owner is inactive
        const ownerIds = centers.map(c => String(c.owner));
        const activeOwnerIds = await getActiveUserIds(ownerIds);
        return centers.filter(c => activeOwnerIds.has(String(c.owner)));
    }

    async updateHelpCenter({ id, name, type, location, description, coordinates }) {
        return this.HelpCenterModel.findByIdAndUpdate(id, {
            name,
            type,
            location,
            description,
            coordinates,
            updatedAt: Date.now()
        }, { new: true, runValidators: true });
    }

    async deleteHelpCenter(id) {
        console.log("trying to delete", id)
        return this.HelpCenterModel.findByIdAndDelete(id);
    }

    async getHelpCenterById(id) {
        const center = await this.HelpCenterModel.findById(id).lean();
        if (!center) return null;
        
        // Check if owner is active
        const owner = await User.findById(center.owner);
        if (!owner || owner.status !== USER_STATUS.ACTIVE) {
            return null;
        }
        
        return center;
    }
}
