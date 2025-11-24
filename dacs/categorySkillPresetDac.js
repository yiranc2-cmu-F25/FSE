let _DAO = null;

export default class CategorySkillPresetDac {
	static set DAO(dao) {
		_DAO = dao;
	}

	static get DAO() {
		if (!_DAO) {
			throw new Error("CategorySkillPresetDac DAO not injected");
		}
		return _DAO;
	}

	static async getPresets() {
		return await this.DAO.getPresets();
	}

	static async updatePresets({ categories, skills }) {
		return await this.DAO.updatePresets({ categories, skills });
	}
}

