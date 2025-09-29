// public/js/acknowledgement.js
const $ = (s) => document.querySelector(s);
const NEXT = "/landingPage";
const HOME = "/";

function init() {
  const btn = $("#btn-understand");
  if (btn) {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      await Logout();
      window.location.href = NEXT;
    });
  }
}
// ----- Logout utilities ------------------------------------------------------
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

window.addEventListener("DOMContentLoaded", init);
