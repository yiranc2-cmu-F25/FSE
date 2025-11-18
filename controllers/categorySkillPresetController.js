import CategorySkillPresetDac from "../dacs/categorySkillPresetDac.js";

function validateNonEmptyString(value, fieldName) {
	if (!value || typeof value !== "string" || !value.trim()) {
		return { valid: false, message: `${fieldName} must be a non-empty string` };
	}
	return { valid: true, trimmed: value.trim() };
}

function formatPresetsResponse(presets) {
	return {
		categories: presets.categories || [],
		skills: presets.skills || []
	};
}

async function getPresetsWithArrays() {
	const presets = await CategorySkillPresetDac.getPresets();
	return {
		presets,
		categories: presets.categories || [],
		skills: presets.skills || []
	};
}

export async function getPresets(req, res) {
	try {
		const presets = await CategorySkillPresetDac.getPresets();
		return res.status(200).json(formatPresetsResponse(presets));
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
		return res.status(200).json(formatPresetsResponse(updated));
	} catch (err) {
		console.error("updatePresets error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function addCategory(req, res) {
	try {
		const { category } = req.body;
		const validation = validateNonEmptyString(category, "Category");
		if (!validation.valid) {
			return res.status(400).json({ status: "error", message: validation.message });
		}
		const trimmedCategory = validation.trimmed;
		
		const { presets, categories } = await getPresetsWithArrays();
		
		if (categories.includes(trimmedCategory)) {
			return res.status(409).json({ status: "error", message: "Category already exists" });
		}
		
		const updated = await CategorySkillPresetDac.updatePresets({
			categories: [...categories, trimmedCategory],
			skills: presets.skills || []
		});
		
		return res.status(200).json(formatPresetsResponse(updated));
	} catch (err) {
		console.error("addCategory error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function deleteCategory(req, res) {
	try {
		const { category } = req.body;
		const validation = validateNonEmptyString(category, "Category");
		if (!validation.valid) {
			return res.status(400).json({ status: "error", message: validation.message });
		}
		const trimmedCategory = validation.trimmed;
		
		const { presets, categories } = await getPresetsWithArrays();
		
		if (!categories.includes(trimmedCategory)) {
			return res.status(404).json({ status: "error", message: "Category not found" });
		}
		
		const updated = await CategorySkillPresetDac.updatePresets({
			categories: categories.filter(c => c !== trimmedCategory),
			skills: presets.skills || []
		});
		
		return res.status(200).json(formatPresetsResponse(updated));
	} catch (err) {
		console.error("deleteCategory error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function addSkill(req, res) {
	try {
		const { skill } = req.body;
		const validation = validateNonEmptyString(skill, "Skill");
		if (!validation.valid) {
			return res.status(400).json({ status: "error", message: validation.message });
		}
		const trimmedSkill = validation.trimmed;
		
		const { presets, skills } = await getPresetsWithArrays();
		
		if (skills.includes(trimmedSkill)) {
			return res.status(409).json({ status: "error", message: "Skill already exists" });
		}
		
		const updated = await CategorySkillPresetDac.updatePresets({
			categories: presets.categories || [],
			skills: [...skills, trimmedSkill]
		});
		
		return res.status(200).json(formatPresetsResponse(updated));
	} catch (err) {
		console.error("addSkill error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function deleteSkill(req, res) {
	try {
		const { skill } = req.body;
		const validation = validateNonEmptyString(skill, "Skill");
		if (!validation.valid) {
			return res.status(400).json({ status: "error", message: validation.message });
		}
		const trimmedSkill = validation.trimmed;
		
		const { presets, skills } = await getPresetsWithArrays();
		
		if (!skills.includes(trimmedSkill)) {
			return res.status(404).json({ status: "error", message: "Skill not found" });
		}
		
		const updated = await CategorySkillPresetDac.updatePresets({
			categories: presets.categories || [],
			skills: skills.filter(s => s !== trimmedSkill)
		});
		
		return res.status(200).json(formatPresetsResponse(updated));
	} catch (err) {
		console.error("deleteSkill error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

