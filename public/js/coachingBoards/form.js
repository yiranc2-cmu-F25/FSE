import { getSocket } from "../utils/socket.js";
import { el } from "../utils/domHelpers.js";
import { setupModalEventListeners, openModal } from "../utils/modalHelpers.js";
import { fetchCategorySkillPresets } from "../utils/presets.js";
import { createSkillTag } from "../utils/skillTags.js";
import { setupSkillSelectHandler, updateSelectedSkillsRef, updateUserSkillsRef } from "../utils/skillSelect.js";
import { autoResizeTextarea } from "../utils/autoResizeTextarea.js";
import { countCharacters, updateCharCount as updateCharCountUtil, setupCharCountListener } from "../utils/charCount.js";

const CHAR_LIMITS = {
	title: 50,
	description: 300,
	objective: 300,
	notes: 500,
	step: 100
};

let CATEGORY_PRESET = [];
let SKILL_PRESET = [];

async function fetchPresets() {
	const data = await fetchCategorySkillPresets();
	if (data) {
		CATEGORY_PRESET = data.categories || [];
		SKILL_PRESET = data.skills || [];
	}
}

let selectedSkills = [];
let duplicateState = { isDuplicate: false, boardId: null };
let userSkills = [];

async function fetchDraft() {
	const res = await fetch("/api/coaching-boards/drafts/me", { credentials: "include" });
	if (res.status === 204) return null;
	if (!res.ok) return null;
	return await res.json();
}

async function checkDuplicate(title, category, excludeId = null) {
	let url = `/api/coaching-boards/duplications?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}`;
	if (excludeId) {
		url += `&excludeId=${encodeURIComponent(excludeId)}`;
	}
	const res = await fetch(url, { credentials: "include" });
	if (!res.ok) return { isDuplicate: false, titleValid: true };
	return await res.json();
}

async function fetchBoard(boardId) {
	const res = await fetch(`/api/coaching-boards/${boardId}`, { credentials: "include" });
	if (!res.ok) return null;
	return await res.json();
}

async function publish(payload, boardId = null) {
	const url = boardId ? `/api/coaching-boards/${boardId}` : "/api/coaching-boards";
	const method = boardId ? "PUT" : "POST";
	const res = await fetch(url, {
		method,
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify(payload)
	});
	return res;
}

async function saveDraft(payload) {
	const res = await fetch("/api/coaching-boards/drafts", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify(payload)
	});
	return res;
}

function readForm() {
	const steps = Array.from(document.querySelectorAll("[data-role='step-row'] textarea.step-input")).map(i => i.value).filter(Boolean);
	const tools = Array.from(document.querySelectorAll("[data-role='tool-row'] input.tool-input")).map(i => i.value).filter(Boolean);
	return {
		title: document.getElementById("title").value.trim(),
		category: document.getElementById("category").value,
		description: document.getElementById("description").value.trim(),
		objective: document.getElementById("objective").value.trim(),
		steps,
		relatedSkills: selectedSkills.slice(),
		tools,
		notes: document.getElementById("notes").value.trim()
	};
}

function applyDraft(d) {
	if (!d) return;
	document.getElementById("title").value = d.title ?? "";
	document.getElementById("category").value = d.category ?? "";
	document.getElementById("description").value = d.description ?? "";
	document.getElementById("objective").value = d.objective ?? "";
	const stepsContainer = document.getElementById("stepsContainer");
	stepsContainer.innerHTML = "";
	(d.steps || [""]).forEach(val => stepsContainer.appendChild(createStepRow(val)));
	const toolsContainer = document.getElementById("toolsContainer");
	toolsContainer.innerHTML = "";
	(d.tools || [""]).forEach(val => toolsContainer.appendChild(createToolRow(val)));
	selectedSkills = Array.from(new Set(d.relatedSkills || []));
	const select = document.getElementById("skillSelect");
	if (select) {
		updateSelectedSkillsRef(select, selectedSkills);
		updateUserSkillsRef(select, userSkills);
	}
	
	renderSkillTags();
	updateSkillSelectOptions();
	document.getElementById("notes").value = d.notes ?? "";
	updateCharCountUtil("title", "titleCharCount", CHAR_LIMITS.title);
	updateCharCountUtil("description", "descriptionCharCount", CHAR_LIMITS.description);
	updateCharCountUtil("objective", "objectiveCharCount", CHAR_LIMITS.objective);
	updateCharCountUtil("notes", "notesCharCount", CHAR_LIMITS.notes);
}

function applyBoardData(board) {
	if (!board) return;
	document.getElementById("title").value = board.title ?? "";
	document.getElementById("category").value = board.category ?? "";
	document.getElementById("description").value = board.description ?? "";
	document.getElementById("objective").value = board.objective ?? "";
	const stepsContainer = document.getElementById("stepsContainer");
	stepsContainer.innerHTML = "";
	(board.steps || []).forEach(val => stepsContainer.appendChild(createStepRow(val)));
	const toolsContainer = document.getElementById("toolsContainer");
	toolsContainer.innerHTML = "";
	(board.tools || []).forEach(val => toolsContainer.appendChild(createToolRow(val)));
	selectedSkills = Array.from(new Set(board.relatedSkills || []));
	const select = document.getElementById("skillSelect");
	if (select) {
		updateSelectedSkillsRef(select, selectedSkills);
		updateUserSkillsRef(select, userSkills);
	}
	
	renderSkillTags();
	updateSkillSelectOptions();
	document.getElementById("notes").value = board.notes ?? "";
	updateCharCountUtil("title", "titleCharCount", CHAR_LIMITS.title);
	updateCharCountUtil("description", "descriptionCharCount", CHAR_LIMITS.description);
	updateCharCountUtil("objective", "objectiveCharCount", CHAR_LIMITS.objective);
	updateCharCountUtil("notes", "notesCharCount", CHAR_LIMITS.notes);
}

function setupCategoryOptions() {
	const sel = document.getElementById("category");
	sel.innerHTML = "";
	sel.appendChild(el("option", { value: "", text: "Select a category" }));
	[...CATEGORY_PRESET].sort().forEach(c => sel.appendChild(el("option", { value: c, text: c })));
}

function renderSkillTags() {const list = document.getElementById("skillsTagList");
	if (!list) {return;
	}
	list.innerHTML = "";
	selectedSkills.forEach(s => {const tag = createSkillTag(s, (skill) => {
			selectedSkills = selectedSkills.filter(x => x !== skill);
			renderSkillTags();
			updateSkillSelectOptions();
		});
		list.appendChild(tag);
	});}

async function fetchUserSkills() {
	try {
		const user = await fetch("/api/authentications/accounts", { credentials: "include" });
		if (!user.ok) return [];
		const userData = await user.json();
		const userId = userData.id ?? userData._id ?? userData.userId;
		if (!userId) return [];
		
		const res = await fetch(`/api/users/${userId}/skills`, { credentials: "include" });
		if (!res.ok) return [];
		const data = await res.json();
		return data.skills || [];
	} catch (err) {return [];
	}
}

function updateSkillSelectOptions() {
	const select = document.getElementById("skillSelect");
	if (!select) return;
	const currentValue = select.value;
	while (select.options.length > 1) {
		select.remove(1);
	}
	const availableSkills = [...SKILL_PRESET].sort().filter(s => !selectedSkills.includes(s));
	availableSkills.forEach(s => {
		const option = el("option", { value: s, text: s });
		if (userSkills.includes(s)) {
			option.textContent = `⭐ ${s}`;
			option.style.backgroundColor = "#FEF3C7";
			option.style.color = "#92400E";
		}
		select.appendChild(option);
	});
	if (currentValue && availableSkills.includes(currentValue)) {
		select.value = currentValue;
	} else {
		select.value = "";
	}
}

function setupSkills() {
	const select = document.getElementById("skillSelect");
	select.innerHTML = "";
	select.appendChild(el("option", { value: "", text: "Add a skill" }));
	const availableSkills = [...SKILL_PRESET].sort().filter(s => !selectedSkills.includes(s));
	availableSkills.forEach(s => {
		const option = el("option", { value: s, text: s });
		if (userSkills.includes(s)) {
			option.textContent = `⭐ ${s}`;
			option.style.backgroundColor = "#FEF3C7";
			option.style.color = "#92400E";
		}
		select.appendChild(option);
	});
	setupSkillSelectHandler(select, selectedSkills, () => {renderSkillTags();
		updateSkillSelectOptions();}, userSkills);
	
	renderSkillTags();
}

function updateStepCharCount(textarea, countEl) {
	if (!textarea || !countEl) return;
	
	const count = countCharacters(textarea.value);
	countEl.textContent = `${count}/${CHAR_LIMITS.step}`;
	if (count > CHAR_LIMITS.step) {
		countEl.classList.add("text-red-600");
		countEl.classList.remove("text-gray-500");
	} else {
		countEl.classList.remove("text-red-600");
		countEl.classList.add("text-gray-500");
	}
}

function ensureAtLeastOneInput(containerId, className) {
	const container = document.getElementById(containerId);
	if (container.children.length === 0) {
		container.appendChild(containerId === "stepsContainer" ? createStepRow("") : createToolRow(""));
	}
}

function createStepRow(value = "") {
	const row = el("div", { className: "mt-2", dataset: { role: "step-row" } });
	const stepWrapper = el("div", { className: "flex items-start gap-2" });
	const handle = el("span", { className: "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-stone-500 select-none cursor-grab mt-2", text: "≡" });
	const textareaWrapper = el("div", { className: "flex-1" });
	const textarea = el("textarea", { 
		className: "step-input w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:outline-none cursor-text resize-none overflow-hidden min-w-0", 
		rows: 1,
		maxlength: CHAR_LIMITS.step
	});
	textarea.value = value;
	
	const charCountEl = el("div", { className: "mt-1 flex justify-end" });
	const countSpan = el("span", { className: "text-xs text-gray-500" });
	charCountEl.appendChild(countSpan);
	
	textarea.addEventListener("input", () => {
		autoResizeTextarea(textarea, 160);
		updateStepCharCount(textarea, countSpan);
	});
	
	const delBtn = el("button", { type: "button", className: "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-red-600 mt-2" });
	delBtn.innerHTML = "×";
	delBtn.addEventListener("click", () => removeRow(row, "stepsContainer", createStepRow));
	
	attachDragBehavior(row, "stepsContainer", handle);
	textareaWrapper.appendChild(textarea);
	textareaWrapper.appendChild(charCountEl);
	stepWrapper.appendChild(handle);
	stepWrapper.appendChild(textareaWrapper);
	stepWrapper.appendChild(delBtn);
	row.appendChild(stepWrapper);
	setTimeout(() => {
		autoResizeTextarea(textarea, 160);
		updateStepCharCount(textarea, countSpan);
	}, 0);
	return row;
}

function createToolRow(value = "") {
	const row = el("div", { className: "mt-2 flex items-center gap-2", dataset: { role: "tool-row" } });
	const input = el("input", { type: "text", className: "tool-input flex-1 rounded-md border-gray-300 px-3 py-2 shadow-sm focus:outline-none cursor-text", value });
	const delBtn = el("button", { type: "button", className: "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-red-600" });
	delBtn.innerHTML = "×";
	delBtn.addEventListener("click", () => removeRow(row, "toolsContainer", createToolRow));
	row.appendChild(input);
	row.appendChild(delBtn);
	return row;
}

const dragState = { sourceRow: null, isDragging: false };
let scrollListenerAdded = false;

function setupGlobalScrollCleanup() {
	if (scrollListenerAdded) return;
	scrollListenerAdded = true;
	document.addEventListener("scroll", () => {
		if (dragState.isDragging && dragState.sourceRow) {
			dragState.isDragging = false;
			if (dragState.sourceRow) {
				dragState.sourceRow.classList.remove("opacity-50");
				dragState.sourceRow.draggable = false;
			}
			dragState.sourceRow = null;
		}
	}, { passive: true });
}

function attachDragBehavior(row, containerId, handleEl) {
	row.draggable = false;
	let isMouseDown = false;
	
	setupGlobalScrollCleanup();
	
	handleEl.addEventListener("mousedown", () => {
		isMouseDown = true;
		row.draggable = true;
	});
	
	handleEl.addEventListener("mouseup", () => {
		isMouseDown = false;
		row.draggable = false;
	});
	
	handleEl.addEventListener("mouseleave", () => {
		isMouseDown = false;
		row.draggable = false;
	});
	
	row.addEventListener("dragstart", (e) => {
		if (!row.draggable) {
			e.preventDefault();
			return;
		}
		dragState.sourceRow = row;
		dragState.isDragging = true;
		row.classList.add("opacity-50");
		e.dataTransfer.effectAllowed = "move";
	});
	
	row.addEventListener("dragend", (e) => {
		row.classList.remove("opacity-50");
		dragState.sourceRow = null;
		dragState.isDragging = false;
		row.draggable = false;
		isMouseDown = false;
	});
	
	row.addEventListener("dragover", (e) => {
		if (!dragState.isDragging || !dragState.sourceRow) return;
		const container = document.getElementById(containerId);
		if (container && container.id === "stepsContainer" && container.contains(row) && container.contains(dragState.sourceRow)) {
			e.preventDefault();
			e.stopPropagation();
			e.dataTransfer.dropEffect = "move";
		}
	});
	
	row.addEventListener("drop", (e) => {
		if (!dragState.isDragging) return;
		const container = document.getElementById(containerId);
		if (!container || container.id !== "stepsContainer") return;
		e.preventDefault();
		e.stopPropagation();
		if (!dragState.sourceRow || dragState.sourceRow === row) return;
		
		const sourceIndex = Array.from(container.children).indexOf(dragState.sourceRow);
		const targetIndex = Array.from(container.children).indexOf(row);
		
		if (sourceIndex === targetIndex) return;
		
		const sourceRow = dragState.sourceRow;
		container.removeChild(sourceRow);
		
		if (sourceIndex < targetIndex) {
			container.insertBefore(sourceRow, row.nextSibling);
		} else {
			container.insertBefore(sourceRow, row);
		}
		
		dragState.isDragging = false;
	});
}
function moveRow(row, delta, containerId) {
	const container = document.getElementById(containerId);
	const index = Array.from(container.children).indexOf(row);
	const newIndex = index + delta;
	if (newIndex < 0 || newIndex >= container.children.length) return;
	container.insertBefore(row, container.children[newIndex + (delta > 0 ? 1 : 0)]);
}

function removeRow(row, containerId, factory) {
	const container = document.getElementById(containerId);
	container.removeChild(row);
	if (container.children.length === 0) {
		container.appendChild(factory(""));
	}
}

function setupDynamicFields() {
	document.getElementById("addStepBtn").addEventListener("click", () => {
		document.getElementById("stepsContainer").appendChild(createStepRow(""));
	});
	document.getElementById("addToolBtn").addEventListener("click", () => {
		document.getElementById("toolsContainer").appendChild(createToolRow(""));
	});
	ensureAtLeastOneInput("stepsContainer", "step-input");
	ensureAtLeastOneInput("toolsContainer", "tool-input");
}

function showTitleError(msg) {
	const elErr = document.getElementById("titleError");
	if (!msg) {
		elErr.classList.add("hidden");
		elErr.textContent = "";
		return;
	}
	elErr.textContent = msg;
	elErr.classList.remove("hidden");
}

function debounce(func, wait) {
	let timeout;
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

function showDuplicateModal(boardId) {
	duplicateState = { isDuplicate: true, boardId };
	const modal = document.getElementById("duplicateModal");
	openModal(modal);
}

function hideDuplicateModal() {
	duplicateState = { isDuplicate: false, boardId: null };
	const modal = document.getElementById("duplicateModal");
	if (modal) {
		modal.classList.add("hidden");
		modal.classList.remove("flex");
		modal.setAttribute("aria-hidden", "true");
	}
}

function setupRealtimeTitleCheck(excludeId = null) {
	const titleEl = document.getElementById("title");
	const catEl = document.getElementById("category");
	const viewBtn = document.getElementById("viewExistingBtn");
	const changeBtn = document.getElementById("changeTitleBtn");
	
	function showDuplicate(boardId) {
		showDuplicateModal(boardId);
	}
	function hideDuplicate() {
		hideDuplicateModal();
	}
	changeBtn?.addEventListener("click", () => {
		hideDuplicate();
		titleEl.focus();
	});
	viewBtn?.addEventListener("click", () => {
		if (duplicateState.boardId) {
			window.location.href = `/boards/${duplicateState.boardId}`;
		}
	});
	async function validate() {
		const title = titleEl.value.trim();
		const category = ""; 
		showTitleError("");
		hideDuplicate();
		if (!title) return;
		const { isDuplicate, titleValid, boardId } = await checkDuplicate(title, category, excludeId);
		if (!titleValid) {
			showTitleError("Title must be less than 50 characters.");
			return;
		}
		if (isDuplicate) {
			showDuplicate(boardId || null);
		}
	}
	const debouncedValidate = debounce(validate, 500);
	titleEl.addEventListener("input", debouncedValidate);
}

function setupActions(isEditMode = false, boardId = null) {
	const form = document.getElementById("boardForm");
	const saveDraftBtn = document.getElementById("saveDraftBtn");
	const deleteBtn = document.getElementById("deleteBtn");
	const formTitle = document.getElementById("formTitle");
	const exitModalMessage = document.getElementById("exitModalMessage");
	
	if (isEditMode) {
		if (formTitle) formTitle.textContent = "Edit Coaching Board";
		if (saveDraftBtn) saveDraftBtn.classList.add("hidden");
		if (deleteBtn) deleteBtn.classList.remove("hidden");
		if (exitModalMessage) exitModalMessage.textContent = "Are you sure you want to leave? Your draft will not be saved.";
	} else {
		if (formTitle) formTitle.textContent = "New Coaching Board";
		if (saveDraftBtn) saveDraftBtn.classList.remove("hidden");
		if (deleteBtn) deleteBtn.classList.add("hidden");
		if (exitModalMessage) exitModalMessage.textContent = "Are you sure you want to leave? Your draft will be saved.";
	}
	
	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		const payload = readForm();
		const title = payload.title.trim();
		const category = payload.category || "";
		const titleErrorEl = document.getElementById("titleError");
		const titleHelpEl = document.getElementById("titleHelp");
		
		if (titleErrorEl) {
			titleErrorEl.textContent = "";
			titleErrorEl.classList.add("hidden");
		}
		hideDuplicateModal();
		
		const { isDuplicate, titleValid, boardId: duplicateBoardId } = await checkDuplicate(title, category, boardId);
		
		if (!titleValid) {
			if (titleErrorEl) {
				titleErrorEl.textContent = "Title must be less than 50 characters.";
				titleErrorEl.classList.remove("hidden");
			}
			return;
		}
		
		if (isDuplicate) {
			showDuplicateModal(duplicateBoardId || null);
			return;
		}
		
		const res = await publish(payload, boardId);
		if (res.ok) {
			const data = await res.json();
			window.location.href = `/boards/${data.boardId || boardId}`;
			return;
		}
		const err = await res.json().catch(() => ({}));
		const errorMessage = err?.message || "Failed to publish. Please fix errors and try again.";
		
		if (errorMessage.includes("skill") || errorMessage.includes("verified")) {
			showSkillErrorModal(errorMessage);
		} else if (errorMessage.includes("step") || errorMessage.includes("Step")) {
			showStepErrorModal(errorMessage);
		} else {
			alert(errorMessage);
		}
	});
	
	if (saveDraftBtn && !isEditMode) {
		saveDraftBtn.addEventListener("click", async () => {
			const payload = readForm();
			const res = await saveDraft(payload);
			if (res.ok) {
				showDraftSavedModal();
			} else {
				alert("Failed to save draft.");
			}
		});
	}
	
	if (deleteBtn && isEditMode) {
		const deleteModal = document.getElementById("deleteConfirmModal");
		const deleteCancelBtn = document.getElementById("deleteCancelBtn");
		const deleteConfirmBtn = document.getElementById("deleteConfirmBtn");
		
		function showDeleteModal() {
			if (deleteModal) {
				deleteModal.classList.remove("hidden");
				deleteModal.classList.add("flex");
				deleteModal.setAttribute("aria-hidden", "false");
			}
		}
		
		function hideDeleteModal() {
			if (deleteModal) {
				deleteModal.classList.add("hidden");
				deleteModal.classList.remove("flex");
				deleteModal.setAttribute("aria-hidden", "true");
			}
		}
		
		deleteBtn.addEventListener("click", () => {
			showDeleteModal();
		});
		
		deleteCancelBtn?.addEventListener("click", () => {
			hideDeleteModal();
		});
		
		deleteConfirmBtn?.addEventListener("click", async () => {
			if (!boardId) {
				alert("Board ID not found.");
				hideDeleteModal();
				return;
			}
			
			try {
				const res = await fetch(`/api/coaching-boards/${boardId}`, {
					method: "DELETE",
					credentials: "include"
				});
				
				if (res.ok) {
					hideDeleteModal();
					window.location.href = "/boards";
				} else {
					const err = await res.json().catch(() => ({}));
					const errorMessage = err?.message || "Failed to delete board.";
					alert(errorMessage);
					hideDeleteModal();
				}
			} catch (error) {
				alert("An error occurred while deleting the board.");
				hideDeleteModal();
			}
		});
		
		if (deleteModal) {
			deleteModal.addEventListener("click", (e) => {
				if (e.target === deleteModal) {
				hideDeleteModal();
				}
			});
		}
	}

	const backBtn = document.getElementById("backBtn");
	const exitModal = document.getElementById("exitModal");
	const exitCancelBtn = document.getElementById("exitCancelBtn");
	const exitConfirmBtn = document.getElementById("exitConfirmBtn");
	function showExit() {
		exitModal.classList.remove("hidden");
		exitModal.classList.add("flex");
	}
	function hideExit() {
		exitModal.classList.remove("flex");
		exitModal.classList.add("hidden");
	}
	function isBlankDraft() {
		const payload = readForm();
		const nothingTyped =
			(payload.title || "").length === 0 &&
			(payload.category || "").length === 0 &&
			(payload.description || "").length === 0 &&
			(payload.objective || "").length === 0 &&
			(payload.notes || "").length === 0 &&
			(Array.isArray(payload.steps) ? payload.steps.length === 0 : true) &&
			(Array.isArray(payload.tools) ? payload.tools.length === 0 : true) &&
			(Array.isArray(payload.relatedSkills) ? payload.relatedSkills.length === 0 : true);
		return nothingTyped;
	}

	backBtn?.addEventListener("click", (e) => {
		e.preventDefault();
		if (isBlankDraft()) {
			window.location.href = "/boards";
			return;
		}
		showExit();
	});
	exitCancelBtn?.addEventListener("click", () => hideExit());
	exitConfirmBtn?.addEventListener("click", async () => {
		if (!isEditMode) {
			const payload = readForm();
			await saveDraft(payload);
		}
		window.location.href = isEditMode && boardId ? `/boards/${boardId}` : "/boards";
	});
}

function showDraftSavedModal() {
	const modal = document.getElementById("draftSavedModal");
	const okBtn = document.getElementById("draftSavedOkBtn");
	
	if (!modal || !okBtn) return;
	
	if (!modal.classList.contains("hidden")) return;
	
	openModal(modal);
	
	const closeModal = () => {
		modal.classList.add("hidden");
		modal.classList.remove("flex");
		modal.setAttribute("aria-hidden", "true");
		window.location.href = "/boards";
	};
	
	setupModalEventListeners(modal, okBtn, closeModal);
}

function showErrorModal(message, modalId, messageElId, okBtnId) {
	const modal = document.getElementById(modalId);
	const messageEl = document.getElementById(messageElId);
	const okBtn = document.getElementById(okBtnId);
	
	if (!modal || !messageEl || !okBtn) return;
	
	if (!modal.classList.contains("hidden")) return;
	
	messageEl.textContent = message;
	openModal(modal);
	
	const closeModal = () => {
		modal.classList.add("hidden");
		modal.classList.remove("flex");
		modal.setAttribute("aria-hidden", "true");
		const select = document.getElementById("skillSelect");
		if (select) {
			updateSelectedSkillsRef(select, selectedSkills);
			updateUserSkillsRef(select, userSkills);
		}
	};
	
	setupModalEventListeners(modal, okBtn, closeModal);
}

function showSkillErrorModal(message) {
	showErrorModal(message, "skillErrorModal", "skillErrorMessage", "skillErrorOkBtn");
}

function showStepErrorModal(message) {
	showErrorModal(message, "stepErrorModal", "stepErrorMessage", "stepErrorOkBtn");
}

function setupCharCountListeners() {
	setupCharCountListener("title", "titleCharCount", CHAR_LIMITS.title);
	setupCharCountListener("description", "descriptionCharCount", CHAR_LIMITS.description);
	setupCharCountListener("objective", "objectiveCharCount", CHAR_LIMITS.objective);
	setupCharCountListener("notes", "notesCharCount", CHAR_LIMITS.notes);
}

(async function init() {
	const boardId = window.__BOARD_ID__ || null;
	const isEditMode = !!boardId;
	
	await fetchPresets();
	userSkills = await fetchUserSkills();
	setupCategoryOptions();
	setupSkills();
	setupDynamicFields();
	setupCharCountListeners();
	setupRealtimeTitleCheck(boardId);
	
	if (isEditMode) {
		const board = await fetchBoard(boardId);
		if (board) {
			applyBoardData(board);
			setupSkills();
		} else {
			alert("Board not found");
			window.location.href = "/boards";
			return;
		}
	}
	
	setupActions(isEditMode, boardId);
	
	if (!isEditMode) {
		const draft = await fetchDraft();
		if (draft) {
			applyDraft(draft);
			setupSkills();
		}
	}
	
	getSocket();
})(); 

