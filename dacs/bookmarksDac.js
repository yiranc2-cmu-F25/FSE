let _DAO = null;

export default class BookmarksDac {
    static set DAO(dao) {
        _DAO = dao;
    }

    static get DAO() {
        if (!_DAO) {
            throw new Error("BookmarksDac DAO not injected");
        }
        return _DAO;
    }
}   