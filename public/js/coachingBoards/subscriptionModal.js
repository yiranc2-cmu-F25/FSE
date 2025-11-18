function getDontShowKey(userId) {
	if (!userId) return null;
	return `coachingBoard_subscriptionModal_dontShow_${userId}`;
}

export function shouldShowSubscriptionModal(userId) {
	const key = getDontShowKey(userId);
	if (!key) return true;
	return localStorage.getItem(key) !== "true";
}

export function showSubscriptionModal(userId) {
	const modal = document.getElementById("subscriptionModal");
	const checkbox = document.getElementById("dontShowAgain");
	const okBtn = document.getElementById("subscriptionOkBtn");
	
	if (!modal || !checkbox || !okBtn) return;
	
	if (!modal.classList.contains("hidden")) return;
	
	modal.classList.remove("hidden");
	modal.classList.add("flex");
	modal.setAttribute("aria-hidden", "false");
	checkbox.checked = false;
	
	const closeModal = () => {
		if (checkbox.checked && userId) {
			const key = getDontShowKey(userId);
			if (key) {
			localStorage.setItem(key, "true");
			}
		}
		modal.classList.add("hidden");
		modal.classList.remove("flex");
		modal.setAttribute("aria-hidden", "true");
	};
	
	okBtn.addEventListener("click", closeModal, { once: true });
	
	modal.addEventListener("click", (e) => {
		if (e.target === modal) {
			closeModal();
		}
	}, { once: true });
}

export function shouldShowUnsubscriptionModal(userId) {
	const key = getDontShowKey(userId);
	if (!key) return true;
	return localStorage.getItem(key) !== "true";
}

export function showUnsubscriptionModal(userId) {
	const modal = document.getElementById("unsubscriptionModal");
	const checkbox = document.getElementById("dontShowUnsubscribeAgain");
	const okBtn = document.getElementById("unsubscriptionOkBtn");
	
	if (!modal || !checkbox || !okBtn) return;
	
	if (!modal.classList.contains("hidden")) return;
	
	modal.classList.remove("hidden");
	modal.classList.add("flex");
	modal.setAttribute("aria-hidden", "false");
	checkbox.checked = false;
	
	const closeModal = () => {
		if (checkbox.checked && userId) {
			const key = getDontShowKey(userId);
			if (key) {
				localStorage.setItem(key, "true");
			}
		}
		modal.classList.add("hidden");
		modal.classList.remove("flex");
		modal.setAttribute("aria-hidden", "true");
	};
	
	okBtn.addEventListener("click", closeModal, { once: true });
	
	modal.addEventListener("click", (e) => {
		if (e.target === modal) {
			closeModal();
		}
	}, { once: true });
}

