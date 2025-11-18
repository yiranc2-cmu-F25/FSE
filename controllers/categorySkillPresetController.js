import CategorySkillPresetDac from "../dacs/categorySkillPresetDac.js";

export async function getPresets(req, res) {
	try {
		const presets = await CategorySkillPresetDac.getPresets();
		return res.status(200).json({
			categories: presets.categories || [],
			skills: presets.skills || []
		});
	} catch (err) {
		console.error("getPresets error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function updatePresets(req, res) {
	try {
		const { categories, skills } = req.body;
		
		if (!Array.isArray(categories) || !Array.isArray(skills)) {
			return res.status(400).json({ status: "error", message: "Categories and skills must be arrays" });
		}
		
		const updated = await CategorySkillPresetDac.updatePresets({ categories, skills });
		return res.status(200).json({
			categories: updated.categories || [],
			skills: updated.skills || []
		});
	} catch (err) {
		console.error("updatePresets error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function addCategory(req, res) {
	try {
		const { category } = req.body;
		
		if (!category || typeof category !== "string" || !category.trim()) {
			return res.status(400).json({ status: "error", message: "Category must be a non-empty string" });
		}
		
		const presets = await CategorySkillPresetDac.getPresets();
		const categories = presets.categories || [];
		
		if (categories.includes(category.trim())) {
			return res.status(409).json({ status: "error", message: "Category already exists" });
		}
		
		const updated = await CategorySkillPresetDac.updatePresets({
			categories: [...categories, category.trim()],
			skills: presets.skills || []
		});
		
		return res.status(200).json({
			categories: updated.categories || [],
			skills: updated.skills || []
		});
	} catch (err) {
		console.error("addCategory error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function deleteCategory(req, res) {
	try {
		const { category } = req.body;
		
		if (!category || typeof category !== "string" || !category.trim()) {
			return res.status(400).json({ status: "error", message: "Category must be a non-empty string" });
		}
		
		const presets = await CategorySkillPresetDac.getPresets();
		const categories = presets.categories || [];
		
		if (!categories.includes(category.trim())) {
			return res.status(404).json({ status: "error", message: "Category not found" });
		}
		
		const updated = await CategorySkillPresetDac.updatePresets({
			categories: categories.filter(c => c !== category.trim()),
			skills: presets.skills || []
		});
		
		return res.status(200).json({
			categories: updated.categories || [],
			skills: updated.skills || []
		});
	} catch (err) {
		console.error("deleteCategory error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function addSkill(req, res) {
	try {
		const { skill } = req.body;
		
		if (!skill || typeof skill !== "string" || !skill.trim()) {
			return res.status(400).json({ status: "error", message: "Skill must be a non-empty string" });
		}
		
		const presets = await CategorySkillPresetDac.getPresets();
		const skills = presets.skills || [];
		
		if (skills.includes(skill.trim())) {
			return res.status(409).json({ status: "error", message: "Skill already exists" });
		}
		
		const updated = await CategorySkillPresetDac.updatePresets({
			categories: presets.categories || [],
			skills: [...skills, skill.trim()]
		});
		
		return res.status(200).json({
			categories: updated.categories || [],
			skills: updated.skills || []
		});
	} catch (err) {
		console.error("addSkill error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function deleteSkill(req, res) {
	try {
		const { skill } = req.body;
		
		if (!skill || typeof skill !== "string" || !skill.trim()) {
			return res.status(400).json({ status: "error", message: "Skill must be a non-empty string" });
		}
		
		const presets = await CategorySkillPresetDac.getPresets();
		const skills = presets.skills || [];
		
		if (!skills.includes(skill.trim())) {
			return res.status(404).json({ status: "error", message: "Skill not found" });
		}
		
		const updated = await CategorySkillPresetDac.updatePresets({
			categories: presets.categories || [],
			skills: skills.filter(s => s !== skill.trim())
		});
		
		return res.status(200).json({
			categories: updated.categories || [],
			skills: updated.skills || []
		});
	} catch (err) {
		console.error("deleteSkill error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

