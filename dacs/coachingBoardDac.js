let _DAO = null;

export default class CoachingBoardDac {
	static set DAO(dao) {
		_DAO = dao;
	}

	static get DAO() {
		if (!_DAO) {
			throw new Error("CoachingBoardDac DAO not injected");
		}
		return _DAO;
	}
}


