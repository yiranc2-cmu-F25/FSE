import { setupModalEventListeners } from "../utils/modalHelpers.js";

function getDontShowKey(userId) {
	if (!userId) return null;
	return `coachingBoard_subscriptionModal_dontShow_${userId}`;
}

export function shouldShowSubscriptionModal(userId) {
	const key = getDontShowKey(userId);
	if (!key) return true;
	return localStorage.getItem(key) !== "true";
}

function showModal(userId, modalId, checkboxId, okBtnId) {
	const modal = document.getElementById(modalId);
	const checkbox = document.getElementById(checkboxId);
	const okBtn = document.getElementById(okBtnId);
	
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
	
	setupModalEventListeners(modal, okBtn, closeModal);
}

export function showSubscriptionModal(userId) {
	showModal(userId, "subscriptionModal", "dontShowAgain", "subscriptionOkBtn");
}

export function shouldShowUnsubscriptionModal(userId) {
	const key = getDontShowKey(userId);
	if (!key) return true;
	return localStorage.getItem(key) !== "true";
}

export function showUnsubscriptionModal(userId) {
	showModal(userId, "unsubscriptionModal", "dontShowUnsubscribeAgain", "unsubscriptionOkBtn");
}

