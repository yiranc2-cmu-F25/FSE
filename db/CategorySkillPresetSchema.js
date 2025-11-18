import mongoose from "mongoose";

export function makeCategorySkillPresetModel(conn) {
	const CategorySkillPresetSchema = new mongoose.Schema(
		{
			categories: { type: [String], required: true, default: [] },
			skills: { type: [String], required: true, default: [] }
		},
		{ timestamps: true }
	);

	CategorySkillPresetSchema.index({ _id: 1 }, { unique: true });

	return conn.model("CategorySkillPreset", CategorySkillPresetSchema);
}

