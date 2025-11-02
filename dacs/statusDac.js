let _DAO = null;

export default class StatusDac {
    static set DAO(dao) {
        _DAO = dao;
    }

    static get DAO() {
        if (!_DAO) {
            throw new Error("StatusDac DAO not injected");
        }
        return _DAO;
    }
}