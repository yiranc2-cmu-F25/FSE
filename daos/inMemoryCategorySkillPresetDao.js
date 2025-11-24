export class inMemoryCategorySkillPresetDao {
	constructor() {
		this.presets = {
			categories: [],
			skills: []
		};
	}

	async getPresets() {
		return {
			categories: this.presets.categories || [],
			skills: this.presets.skills || []
		};
	}

	async updatePresets({ categories, skills }) {
		this.presets = {
			categories: categories || [],
			skills: skills || []
		};
		return this.presets;
	}
}

