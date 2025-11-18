import {loadInfo} from "../utils/loadUserInfo.js";
import { getInitialsSafe,getAvatarColor } from "../utils/avatars.js";
import { statusUpdate } from "../utils/statusPageUpdate.js";

const $ = (s) => document.querySelector(s);

const ui = {
  displayInput: $('input[name="displayName"]'),
  avatarInit: $("#avatar-initials"),
  avatarColor: $("#avatar"),
  statusText: $("#status-text"),
  openBtn: $("#open-profile-modal"),
  modal: $("#feature-modal"),
  overlay: $("#feature-modal-overlay"),
  closeBtn: $("#feature-modal-close"),
  logoutBtn: $("#feature-logout"),
  statusButton: $("#status-button"),
  speedTestButton: $("#speed-test-button"),
  announcementButton: $("#post-public-announcement-button"),
  updateSkillsButton: $("#update-skills-button"),
};
const body = document.body;
ui.body = body;

function setupUserInfo() {
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const user = await loadInfo();
      console.log("Loaded user info:", user);
      const name = (user.username || "").trim();

      statusUpdate(user.status);

      if (ui.statusText) ui.statusText.textContent = user.status ?? "UNDEFINED";
      if (ui.avatarColor) ui.avatarColor.style.backgroundColor = getAvatarColor(name);;
      if (ui.avatarInit) ui.avatarInit.textContent = getInitialsSafe(name);
      if (ui.displayInput) ui.displayInput.value = name || "Guest";
    } catch (err) {
      console.error("Failed to load user info:", err);
    }
  });
}

let lastActive = null;

function openModal() {
  lastActive = document.activeElement;
  ui.modal.classList.remove("hidden");
  ui.body.classList.add("overflow-hidden");
  ui.closeBtn?.focus();
}

function closeModal() {
  ui.modal.classList.add("hidden");
  ui.body.classList.remove("overflow-hidden");
  lastActive?.focus?.();
}

function setupOpenSidebar() {
  ui.openBtn?.addEventListener("click", openModal);
  ui.closeBtn?.addEventListener("click", closeModal);
  ui.overlay?.addEventListener("click", closeModal);
}

function setupCloseOnEscape() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !ui.modal.classList.contains("hidden")) closeModal();
  });
}

async function fetchLogout() {
  const res = await fetch("/api/authentications/logout", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (res.ok || res.status === 401 || res.status === 403) {
    window.location.replace("/");
    return;
  }
  const data = await res.json().catch(() => ({}));
  alert(data?.message || "Server error logging out. Please try again.");
}

function setupLogout() {
  ui.logoutBtn?.addEventListener("click", async () => {
    const originalText = ui.logoutBtn.textContent;
    ui.logoutBtn.disabled = true;
    ui.logoutBtn.textContent = "Logging out…";

    try {
      await fetchLogout();
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Network error. Please try again.");
    } finally {
      ui.logoutBtn.disabled = false;
      ui.logoutBtn.textContent = originalText;
    }
  });
}

function bootSidebar() {
  document.addEventListener("DOMContentLoaded", () => {
    setupOpenSidebar();
    setupCloseOnEscape();
    setupLogout();
  });
}


function setupSidebarSelection() {
  //click esn status link to go to status page
  document.addEventListener("DOMContentLoaded", () => {
    ui.statusButton?.addEventListener("click", () => {
      window.location.href = "/status";
    });
    ui.speedTestButton?.addEventListener("click", () => {
      window.location.href = "/speed-test";
    });

    ui.announcementButton?.addEventListener("click", () => {
      window.location.href = "/postPublicAnnouncements";
    });

    ui.updateSkillsButton?.addEventListener("click", () => {
      window.location.href = "/skills";
    });
  });
}

setupUserInfo();
bootSidebar();
setupSidebarSelection();
