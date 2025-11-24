import { el } from "./domHelpers.js";

export function createSkillTag(skill, onRemove, options = {}) {
	const tagClassName = options.tagClassName || "inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-800";
	const removeClassName = options.removeClassName || "rounded-full bg-stone-200 px-1 text-stone-700";
	
	const tag = el("span", { className: tagClassName });
	const text = el("span", { text: skill });
	const remove = el("button", { type: "button", className: removeClassName });
	remove.innerHTML = "&times;";
	remove.addEventListener("click", () => {
		onRemove(skill);
	});
	tag.appendChild(text);
	tag.appendChild(remove);
	return tag;
}

