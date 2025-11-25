let _DAO =  null;

export default class EmergencyProfileDac {
    static set DAO(dao) {
        _DAO = dao;
    }

    static get DAO() {
        if (!_DAO) {
            throw new Error("EmergencyProfileDac DAO not injected");
        }
        return _DAO;
    }
}