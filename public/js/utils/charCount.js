export function countCharacters(text) {
	return text ? text.length : 0;
}

export function updateCharCount(inputId, countId, maxLength, format = "full") {
	const input = document.getElementById(inputId);
	const countEl = document.getElementById(countId);
	if (!input || !countEl) return;
	
	const count = countCharacters(input.value);
	if (format === "number") {
		// Only update the number, assuming HTML has "/300 characters" already
		countEl.textContent = count;
	} else {
		// Update with full format "X/Y"
		countEl.textContent = `${count}/${maxLength}`;
	}
	
	if (count > maxLength) {
		countEl.classList.add("text-red-600");
		countEl.classList.remove("text-gray-500");
	} else {
		countEl.classList.remove("text-red-600");
		countEl.classList.add("text-gray-500");
	}
}

export function setupCharCountListener(inputId, countId, maxLength, format = "full") {
	const input = document.getElementById(inputId);
	if (!input) return;
	
	input.addEventListener("input", () => {
		updateCharCount(inputId, countId, maxLength, format);
	});
	
	// Initial update
	updateCharCount(inputId, countId, maxLength, format);
}

