// ----- DOM helpers -----------------------------------------------------------
window.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) return;
    const user = await res.json();

    document.getElementById("username").textContent = user.username;
    document.getElementById("status").textContent = user.status;
    document.getElementById("avatar").src = user.image;
  } catch (err) {
    console.error("Failed to load profile", err);
  }
});

const $ = (s) => document.querySelector(s);
const HOME = "/";
async function onLogout(e) {
	e.preventDefault();
	// 1) tell server to invalidate session/token
	// TODO: await backendLogout();
	// 2) wipe client side
	// TODO: await clearClientState();
	// 3) go home
	await backendLogout();
	await clearClientState();
	window.location.href = HOME;
}

async function backendLogout() {
	try {
		const res = await fetch("/api/auth/logout", {
		method: "POST",
		credentials: "include",
		});
		return res.ok;
	} catch (err) {
		console.error("logout error", err);
		return false;
	}
}

async function clearClientState() {
	sessionStorage.clear();
	localStorage.clear();
}

function init() {
	const btn = $("#btn-logout");
	if (btn) btn.addEventListener("click", onLogout);
}

window.addEventListener("DOMContentLoaded", init);
