let skillSelectHandlers = new WeakMap();
let selectedSkillsRefs = new WeakMap();
let onAddCallbacks = new WeakMap();
let userSkillsRefs = new WeakMap();

export function setupSkillSelectHandler(select, selectedSkills, onAdd, userSkills = []) {
	if (!select) {
		console.error("[skillSelect] select element is null");
		return;
	}

	// Remove existing handler if any
	const existingHandler = skillSelectHandlers.get(select);
	if (existingHandler) {
		select.removeEventListener("change", existingHandler);
	}

	// Store the reference to selectedSkills array so handler can always access the latest one
	// This allows the array reference to be updated (e.g., when loading draft/board data)
	selectedSkillsRefs.set(select, { array: selectedSkills });
	onAddCallbacks.set(select, onAdd);
	userSkillsRefs.set(select, { array: userSkills });

	// Create new handler that always uses the latest selectedSkills reference
	const handler = (e) => {
		const ref = selectedSkillsRefs.get(select);
		const callback = onAddCallbacks.get(select);
		const userSkillsRef = userSkillsRefs.get(select);
		if (!ref || !callback) {
			console.error("[skillSelect] missing ref or callback");
			return;
		}

		const selectedSkills = ref.array;
		const val = select.value;
		console.log("[skillSelect] change event triggered, value:", val, "selectedSkills before:", [...selectedSkills]);
		
		if (!val || val === "") {
			console.log("[skillSelect] empty value, returning");
			return;
		}
		
		if (selectedSkills.includes(val)) {
			console.log("[skillSelect] skill already selected:", val);
			select.value = "";
			return;
		}
		
		console.log("[skillSelect] adding skill:", val);
		selectedSkills.push(val);
		console.log("[skillSelect] selectedSkills after add:", [...selectedSkills]);
		console.log("[skillSelect] calling onAdd callback...");
		
		// Call onAdd callback before resetting select value
		try {
			callback();
			console.log("[skillSelect] onAdd callback completed");
		} catch (err) {
			console.error("[skillSelect] error in onAdd callback:", err);
		}
		
		// Reset select value after callback
		select.value = "";
		console.log("[skillSelect] select value reset to empty");
	};

	// Store handler for future removal
	skillSelectHandlers.set(select, handler);
	
	// Add event listener
	select.addEventListener("change", handler);
	console.log("[skillSelect] event listener added to select element");
}

// Function to update the selectedSkills reference when it's reassigned
export function updateSelectedSkillsRef(select, newSelectedSkills) {
	const ref = selectedSkillsRefs.get(select);
	if (ref) {
		ref.array = newSelectedSkills;
		console.log("[skillSelect] updated selectedSkills reference");
	}
}

// Function to update the userSkills reference when it changes
export function updateUserSkillsRef(select, newUserSkills) {
	const ref = userSkillsRefs.get(select);
	if (ref) {
		ref.array = newUserSkills;
		console.log("[skillSelect] updated userSkills reference");
	}
}

