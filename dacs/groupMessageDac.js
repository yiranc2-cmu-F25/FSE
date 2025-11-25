let _DAO = null;

export default class GroupMessageDac {
    static set DAO(dao) {
        _DAO = dao;
    }

    static get DAO() {
        if (!_DAO) {
            throw new Error("GroupMessageDac DAO not injected");
        }
        return _DAO;
    }
}
