import CategorySkillPreset from "../entities/CategorySkillPreset.js";

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
	const presets = await CategorySkillPreset.getPresets();
	return {
		presets,
		categories: presets.categories || [],
		skills: presets.skills || []
	};
}

async function validateAndGetPresets(req, res, fieldName, bodyField) {
	const value = req.body[bodyField];
	const validation = validateNonEmptyString(value, fieldName);
	if (!validation.valid) {
		res.status(400).json({ status: "error", message: validation.message });
		return null;
	}
	
	const { presets, categories, skills } = await getPresetsWithArrays();
	return {
		trimmed: validation.trimmed,
		presets,
		categories,
		skills
	};
}

async function updateAndReturnPresets(res, categories, skills) {
	const updated = await CategorySkillPreset.updatePresets({ categories, skills });
	return res.status(200).json(formatPresetsResponse(updated));
}

export async function getPresets(req, res) {
	try {
		const presets = await CategorySkillPreset.getPresets();
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
		
		return await updateAndReturnPresets(res, categories, skills);
	} catch (err) {
		console.error("updatePresets error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function addCategory(req, res) {
	try {
		const data = await validateAndGetPresets(req, res, "Category", "category");
		if (!data) return;
		const { trimmed: trimmedCategory, presets, categories } = data;
		
		if (categories.includes(trimmedCategory)) {
			return res.status(409).json({ status: "error", message: "Category already exists" });
		}
		
		return await updateAndReturnPresets(res, [...categories, trimmedCategory], presets.skills || []);
	} catch (err) {
		console.error("addCategory error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function deleteCategory(req, res) {
	try {
		const data = await validateAndGetPresets(req, res, "Category", "category");
		if (!data) return;
		const { trimmed: trimmedCategory, presets, categories } = data;
		
		if (!categories.includes(trimmedCategory)) {
			return res.status(404).json({ status: "error", message: "Category not found" });
		}
		
		return await updateAndReturnPresets(res, categories.filter(c => c !== trimmedCategory), presets.skills || []);
	} catch (err) {
		console.error("deleteCategory error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function addSkill(req, res) {
	try {
		const data = await validateAndGetPresets(req, res, "Skill", "skill");
		if (!data) return;
		const { trimmed: trimmedSkill, presets, skills } = data;
		
		if (skills.includes(trimmedSkill)) {
			return res.status(409).json({ status: "error", message: "Skill already exists" });
		}
		
		return await updateAndReturnPresets(res, presets.categories || [], [...skills, trimmedSkill]);
	} catch (err) {
		console.error("addSkill error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function deleteSkill(req, res) {
	try {
		const data = await validateAndGetPresets(req, res, "Skill", "skill");
		if (!data) return;
		const { trimmed: trimmedSkill, presets, skills } = data;
		
		if (!skills.includes(trimmedSkill)) {
			return res.status(404).json({ status: "error", message: "Skill not found" });
		}
		
		return await updateAndReturnPresets(res, presets.categories || [], skills.filter(s => s !== trimmedSkill));
	} catch (err) {
		console.error("deleteSkill error", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

