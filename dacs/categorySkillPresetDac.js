import iDac from "./iDac.js";

export default class CategorySkillPresetDac extends iDac {
  static async getPresets() {
    return await this.DAO.getPresets();
  }

  static async updatePresets({ categories, skills }) {
    return await this.DAO.updatePresets({ categories, skills });
  }
}
