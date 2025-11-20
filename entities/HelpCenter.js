import HelpCenterDac from "../dacs/HelpCenterDac.js";

class HelpCenter {
    constructor({ name, type, location, description, coordinates, owner }) {
        this.name = name;
        this.type = type;
        this.location = location;
        this.description = description;
        this.coordinates = coordinates;
        this.owner = owner;
    }

    static get DAO() {
        return HelpCenterDac.DAO;
    }

    async create() {
        await HelpCenter.DAO.create({
            name: this.name,
            type: this.type,
            location: this.location,
            description: this.description,
            coordinates: this.coordinates,
            owner: this.owner,
        });
    }

    static async getHelpCenterByUserId( userId ) {
        return await HelpCenter.DAO.getHelpCenterByUserId( userId );
    }

    static async getClosestHelpCenters({ coordinates, limit = 10 }) {
        return await HelpCenter.DAO.getClosestHelpCenters({ coordinates, limit });
    }

    static async updateHelpCenter({ id, name, type, location, description, coordinates, owner }) {
        return await HelpCenter.DAO.updateHelpCenter({ id, name, type, location, description, coordinates, owner });
    }

    static async deleteHelpCenter( id ) {
        return await HelpCenter.DAO.deleteHelpCenter( id );
    }

    static async getHelpCenterById( id ) {
        return await HelpCenter.DAO.getHelpCenterById( id );
    }
}

export default HelpCenter;
