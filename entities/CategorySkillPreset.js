import CategorySkillPresetDac from "../dacs/categorySkillPresetDac.js";

class CategorySkillPreset {
	static get DAO() {
		return CategorySkillPresetDac.DAO;
	}

	static async getPresets() {
		return await CategorySkillPreset.DAO.getPresets();
	}

	static async updatePresets({ categories, skills }) {
		return await CategorySkillPreset.DAO.updatePresets({ categories, skills });
	}
}

export default CategorySkillPreset;

