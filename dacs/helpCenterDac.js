let _DAO = null;

export default class HelpCenterDac {
    static set DAO(dao) {
        _DAO = dao;
    }

    static get DAO() {
        if (!_DAO) {
            throw new Error("HelpCenterDac DAO not injected");
        }
        return _DAO;
    }
}
