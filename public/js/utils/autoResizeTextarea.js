export function autoResizeTextarea(textarea, maxHeight = 160) {
	if (!textarea) return;
	textarea.style.height = "auto";
	textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
}

export function setupAutoResizeTextarea(textareaId, maxHeight = 160) {
	const textarea = document.getElementById(textareaId);
	if (!textarea) return;
	
	textarea.addEventListener("input", () => {
		autoResizeTextarea(textarea, maxHeight);
	});
	
	autoResizeTextarea(textarea, maxHeight);
}

