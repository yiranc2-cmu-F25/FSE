
// Generic class for Data Access Class (DACs)
// This should improve SIGRID score in terms of duplication
export default class iDac {
  static _DAO = null;
  static set DAO(dao) {
      this._DAO = dao;
  }

  static get DAO() {
      if (!this._DAO) {
          throw new Error(`${this.constructor.name} DAO not injected`);
      }
      return this._DAO;
  }
}