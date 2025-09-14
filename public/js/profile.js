// ----- DOM helpers -----------------------------------------------------------
const $ = (s) => document.querySelector(s);
const HOME = "/";
async function onLogout(e) {
  e.preventDefault();
  // 1) tell server to invalidate session/token
  // TODO: await backendLogout();
  // 2) wipe client side
  // TODO: await clearClientState();
  // 3) go home
  window.location.href = HOME;
}

function init() {
  const btn = $("#btn-logout");
  if (btn) btn.addEventListener("click", onLogout);
}

window.addEventListener("DOMContentLoaded", init);
