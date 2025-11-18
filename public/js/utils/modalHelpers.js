export function setupModalEventListeners(modal, okBtn, closeModal) {
	okBtn.addEventListener("click", closeModal, { once: true });
	
	modal.addEventListener("click", (e) => {
		if (e.target === modal) {
			closeModal();
		}
	}, { once: true });
}

export function openModal(modal) {
	if (!modal) return;
	modal.classList.remove("hidden");
	modal.classList.add("flex");
	modal.setAttribute("aria-hidden", "false");
}

