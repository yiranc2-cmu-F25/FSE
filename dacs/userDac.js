let _DAO = null;

export default class UserDac {
    static set DAO(dao) {
        _DAO = dao;
    }

    static get DAO() {
        if (!_DAO) {
            throw new Error("UserDac DAO not injected");
        }
        return _DAO;
    }
}
