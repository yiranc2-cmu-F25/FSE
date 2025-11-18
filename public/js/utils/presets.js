export async function fetchCategorySkillPresets() {
	try {
		const res = await fetch("/api/category-skill-presets", { credentials: "include" });
		if (!res.ok) {
			console.error("Failed to fetch presets");
			return null;
		}
		const data = await res.json();
		return data;
	} catch (err) {
		console.error("Error fetching presets:", err);
		return null;
	}
}

