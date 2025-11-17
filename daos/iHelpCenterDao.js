export class iHelpCenterDao {
    async create({ name, type, location, description, coordinates, owner }) {
        throw new Error("To be implemented!");
    }

    async getHelpCenterByUserId( userId ) {
        throw new Error("To be implemented!");
    }

    async getClosestHelpCenters({ coordinates, limit = 10 }) {
        throw new Error("To be implemented!");
    }

    async updateHelpCenter({ id, name, type, location, description, coordinates, owner }) {
        throw new Error("To be implemented!");
    }

    async deleteHelpCenter({ id }) {
        throw new Error("To be implemented!");
    }
}
