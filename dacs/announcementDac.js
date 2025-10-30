let _DAO = null;

export default class AnnouncementDac {
    static set DAO(dao) {
        _DAO = dao;
    }

    static get DAO() {
        if (!_DAO) {
            throw new Error("AnnouncementDac DAO not injected");
        }
        return _DAO;
    }
}
