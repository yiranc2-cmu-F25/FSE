let _DAO = null;

export default class MsgDac {
    static set DAO(dao) {
        _DAO = dao;
    }

    static get DAO() {
        if (!_DAO) {
            throw new Error("MsgDac DAO not injected");
        }
        return _DAO;
    }
}
