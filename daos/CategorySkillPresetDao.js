export class CategorySkillPresetDao {
	constructor({ CategorySkillPresetModel }) {
		this.CategorySkillPresetModel = CategorySkillPresetModel;
	}

	async getPresets() {
		let doc = await this.CategorySkillPresetModel.findOne().lean();
		if (!doc) {
			doc = await this.CategorySkillPresetModel.create({
				categories: [],
				skills: []
			});
			return doc.toObject();
		}
		return doc;
	}

	async updatePresets({ categories, skills }) {
		const doc = await this.CategorySkillPresetModel.findOneAndUpdate(
			{},
			{ $set: { categories, skills } },
			{ new: true, upsert: true, setDefaultsOnInsert: true }
		).lean();
		return doc;
	}
}

