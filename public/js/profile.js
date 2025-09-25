// ----- DOM helpers -----------------------------------------------------------
function showStatusBlock(status) {
  const statuses = ["ok", "help", "emergency", "unknown"];
  statuses.forEach((s) => {
    const el = document.getElementById(`status-${s}`);
    if (el) {
      el.classList.add("hidden");
      el.classList.remove("flex");
    }
  });
  const showId = `status-${["ok", "help", "emergency"].includes(status) ? status : "unknown"}`;
  const showEl = document.getElementById(showId);
  if (showEl) {
    showEl.classList.remove("hidden");
    showEl.classList.add("flex");
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  try {
    // const res = await fetch("/api/auth/me", { credentials: "include" });
    // if (!res.ok) return;
    // const user = await res.json();

    // document.getElementById("username").textContent = user.username;
    // document.getElementById("avatar").src = user.image;

    // showStatusBlock(user.status);
    await Logout();
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
async function Logout() {
  await backendLogout();
  await clearClientState();
  window.location.href = HOME;
}

async function backendLogout() {
  try {
    const res = await fetch("/api/auth/offline", {
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
