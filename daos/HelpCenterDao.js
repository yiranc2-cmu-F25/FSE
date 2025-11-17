import { iHelpCenterDao } from "./iAnnouncementDao.js";

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
        return this.HelpCenterModel.find({ owner: userId });
    }

    async getClosestHelpCenters({ coordinates, limit = 10 }) {
        return this.HelpCenterModel.find({
            coordinates: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: coordinates
                    }
                }
            }
        }).limit(limit);
    }

    async updateHelpCenter({ id, name, type, location, description, coordinates, owner }) {
        return this.HelpCenterModel.findByIdAndUpdate(id, {
            name,
            type,
            location,
            description,
            coordinates,
            owner,
            updatedAt: Date.now()
        }, { new: true });
    }

    async deleteHelpCenter({ id }) {
        return this.HelpCenterModel.findByIdAndDelete(id);
    }
}
