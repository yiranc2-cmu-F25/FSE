export function setupSkillSelectHandler(select, selectedSkills, onAdd) {
	select.addEventListener("change", () => {
		const val = select.value;
		if (!val) return;
		if (!selectedSkills.includes(val)) {
			selectedSkills.push(val);
			onAdd();
		}
		select.value = "";
	});
}

