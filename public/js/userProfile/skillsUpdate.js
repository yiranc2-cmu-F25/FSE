import { loadInfo } from "../utils/loadUserInfo.js";
import { getInitialsSafe, getAvatarColor } from "../utils/avatars.js";
import { el } from "../utils/domHelpers.js";
import { fetchCategorySkillPresets } from "../utils/presets.js";

let SKILL_PRESET = [];
let selectedSkills = [];
let initialSkills = [];

async function fetchPresets() {
  const data = await fetchCategorySkillPresets();
  if (data) {
    SKILL_PRESET = data.skills || [];
    setupSkills();
  }
}

async function fetchUserSkills(userId) {
  try {
    const res = await fetch(`/api/users/${userId}/skills`, { credentials: "include" });
    if (!res.ok) {
      console.error("Failed to fetch user skills");
      return [];
    }
    const data = await res.json();
    return data.skills || [];
  } catch (err) {
    console.error("Error fetching user skills:", err);
    return [];
  }
}

async function updateUserSkills(userId, skills) {
  try {
    const res = await fetch("/api/users/skills", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId, skills }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error("Error updating user skills:", err);
    throw err;
  }
}

function renderUserInfo() {
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

      const userId = user.id ?? user._id ?? user.userId;
      if (userId) {
        const currentSkills = await fetchUserSkills(userId);
        selectedSkills = Array.from(new Set(currentSkills));
        initialSkills = Array.from(new Set(currentSkills));
        renderSkillTags();
      }
    } catch (err) {
      console.error("Failed to load user info:", err);
    }
  });
}

function renderSkillTags() {
  const list = document.getElementById("skillsTagList");
  const noSkillsMsg = document.getElementById("no-skills-message");
  
  if (!list) return;

  const existingTags = list.querySelectorAll("span");
  existingTags.forEach((tag) => tag.remove());

  if (selectedSkills.length === 0) {
    if (noSkillsMsg) noSkillsMsg.classList.remove("hidden");
  } else {
    if (noSkillsMsg) noSkillsMsg.classList.add("hidden");
    
    selectedSkills.forEach((s) => {
      const tag = el("span", {
        className:
          "inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-800",
      });
      const text = el("span", { text: s });
      const remove = el("button", {
        type: "button",
        className: "rounded-full bg-stone-200 hover:bg-stone-300 px-1.5 text-stone-700 transition",
      });
      remove.innerHTML = "&times;";
      remove.addEventListener("click", () => {
        selectedSkills = selectedSkills.filter((x) => x !== s);
        renderSkillTags();
      });
      tag.appendChild(text);
      tag.appendChild(remove);
      list.appendChild(tag);
    });
  }
}

function setupSkills() {
  const select = document.getElementById("skillSelect");
  if (!select) return;

  select.innerHTML = "";
  select.appendChild(el("option", { value: "", text: "Select a skill to add" }));

  const availableSkills = [...SKILL_PRESET]
    .sort()
    .filter((s) => !selectedSkills.includes(s));

  availableSkills.forEach((s) =>
    select.appendChild(el("option", { value: s, text: s }))
  );

  select.addEventListener("change", () => {
    const val = select.value;
    if (!val) return;
    if (!selectedSkills.includes(val)) {
      selectedSkills.push(val);
      renderSkillTags();
      setupSkills();
    }
    select.value = "";
  });
}

function setupFormSubmission() {
  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("skills-form");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const user = await loadInfo();
        const userId = user?.id ?? user?._id ?? user?.userId;
        if (!userId) {
          alert("User ID not found. Please try again.");
          return;
        }

        await updateUserSkills(userId, selectedSkills);
        initialSkills = Array.from(new Set(selectedSkills));
        openModal();
      } catch (err) {
        console.error("Failed to update skills:", err);
        alert("Failed to update skills. Please try again later.");
      }
    });
  });
}

const modal = document.getElementById("skills-modal");
const modalClose = document.getElementById("skills-modal-close");

function openModal() {
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    modal.setAttribute("aria-hidden", "false");
  }
}

function closeModal() {
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    modal.setAttribute("aria-hidden", "true");
  }
}

function setupModalHandlers() {
  if (modal && modalClose) {
    modalClose.addEventListener("click", () => {
      closeModal();
      window.location.href = "/members";
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }
}

function hasUnsavedChanges() {
  const currentSorted = [...selectedSkills].sort();
  const initialSorted = [...initialSkills].sort();
  return JSON.stringify(currentSorted) !== JSON.stringify(initialSorted);
}

function setupBackButton() {
  document.addEventListener("DOMContentLoaded", () => {
    const backButton = document.getElementById("back-link");
    if (backButton) {
      backButton.addEventListener("click", (e) => {
        if (hasUnsavedChanges()) {
          e.preventDefault();
          openExitConfirmModal();
        }
      });
    }
  });
}

const exitConfirmModal = document.getElementById("exit-confirm-modal");
const exitConfirmBtn = document.getElementById("exit-confirm-btn");
const exitCancelBtn = document.getElementById("exit-cancel-btn");

function openExitConfirmModal() {
  if (exitConfirmModal) {
    exitConfirmModal.classList.remove("hidden");
    exitConfirmModal.classList.add("flex");
    exitConfirmModal.setAttribute("aria-hidden", "false");
  }
}

function closeExitConfirmModal() {
  if (exitConfirmModal) {
    exitConfirmModal.classList.add("hidden");
    exitConfirmModal.classList.remove("flex");
    exitConfirmModal.setAttribute("aria-hidden", "true");
  }
}

function setupExitConfirmModal() {
  if (exitConfirmBtn) {
    exitConfirmBtn.addEventListener("click", () => {
      closeExitConfirmModal();
      window.location.href = "/members";
    });
  }
  
  if (exitCancelBtn) {
    exitCancelBtn.addEventListener("click", () => {
      closeExitConfirmModal();
    });
  }
  
  if (exitConfirmModal) {
    exitConfirmModal.addEventListener("click", (e) => {
      if (e.target === exitConfirmModal) {
        closeExitConfirmModal();
      }
    });
  }
}

fetchPresets();
renderUserInfo();
setupFormSubmission();
setupModalHandlers();
setupBackButton();
setupExitConfirmModal();

