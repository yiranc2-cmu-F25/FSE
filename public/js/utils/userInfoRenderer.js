import { loadInfo } from "./loadUserInfo.js";
import { getInitialsSafe, getAvatarColor } from "./avatars.js";

export function setupUserInfoRenderer(onLoad) {
	document.addEventListener("DOMContentLoaded", async () => {
		try {
			const user = await loadInfo();
			const name = (user.username || "").trim();

			const displayInput = document.querySelector('input[name="displayName"]');
			const avatarInit = document.getElementById("avatar-initials");
			const avatarColor = document.getElementById("avatar");

			if (avatarColor) avatarColor.style.backgroundColor = getAvatarColor(name);
			if (avatarInit) avatarInit.textContent = getInitialsSafe(name);
			if (displayInput) displayInput.value = name || "Guest";
			
			if (onLoad) {
				await onLoad(user);
			}
		} catch (err) {
			console.error("Failed to load user info:", err);
		}
	});
}

