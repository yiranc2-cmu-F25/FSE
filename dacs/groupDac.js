let _DAO = null;

export default class GroupDac {
    static set DAO(dao) {
        _DAO = dao;
    }

    static get DAO() {
        if (!_DAO) {
            throw new Error("GroupDac DAO not injected");
        }
        return _DAO;
    }
}
