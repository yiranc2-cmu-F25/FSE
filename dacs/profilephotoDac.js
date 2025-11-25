let _DAO = null;

export default class ProfilePhotoDac {
    static set DAO(dao) {
        _DAO = dao;
    }

    static get DAO() {
        if (!_DAO) {
            throw new Error("ProfilePhotoDac DAO not injected");
        }
        return _DAO;
    }
}