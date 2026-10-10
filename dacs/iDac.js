/**
 * Generic base class for Data Access Classes (DACs).
 *
 * A DAC is a static injection point: the server registers a MongoDB-backed
 * DAO (see config/daoRegistry.js), tests register an in-memory DAO, and the
 * entities only ever talk to `SomeDac.DAO`. Each subclass keeps its own DAO.
 */
export default class iDac {
  static _DAO = null;

  static set DAO(dao) {
    this._DAO = dao;
  }

  static get DAO() {
    if (!this._DAO) {
      throw new Error(`${this.name} DAO not injected`);
    }
    return this._DAO;
  }
}
