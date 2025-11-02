import StatusDac from "../dacs/statusDac.js";

class Status {
  static async recordChange({ userId, status, timestamp}) {
    return await StatusDac.DAO.recordChange({
      userId,
      newStatus: status,
      at: timestamp ?? new Date(),
    });
  }

  static async getHistory({ userId, limit = 10, cursor }) {
    return await StatusDac.DAO.getHistory({ userId, limit, cursor });
  }

}

export default Status;
