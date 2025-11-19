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

export function setupModalCloseWithRedirect(modal, closeBtn, redirectUrl) {
	if (!modal || !closeBtn) return;
	
	closeBtn.addEventListener("click", () => {
		closeModal(modal);
		window.location.href = redirectUrl;
	});

	modal.addEventListener("click", (e) => {
		if (e.target === modal) {
			closeModal(modal);
		}
	});
}

function closeModal(modal) {
	modal.classList.add("hidden");
	modal.classList.remove("flex");
	modal.setAttribute("aria-hidden", "true");
}

