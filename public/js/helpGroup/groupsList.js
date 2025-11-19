import { getInitialsSafe, getAvatarColor } from "../utils/avatars.js";

const groupsUL = document.getElementById("groups-list");
const createGroupBtn = document.getElementById("create-group-btn");
const createGroupModal = document.getElementById("create-group-modal");
const cancelCreateGroupBtn = document.getElementById("cancel-create-group-btn");
const confirmCreateGroupBtn = document.getElementById("confirm-create-group-btn");
const createGroupSearchInput = document.getElementById("create-group-search-input");
const clearCreateGroupSearch = document.getElementById("clear-create-group-search");
const createGroupSearchResultList = document.getElementById("create-group-search-result-list");
const groupNameInput = document.getElementById("group-name-input");
const groupNameWrapper = document.getElementById("group-name-wrapper");
const groupNameError = document.getElementById("group-name-error");

let selectedMemberIds = new Set();
let allCitizens = [];

function showGroupNameError(message) {
  groupNameError.textContent = message;
  groupNameError.classList.remove("hidden");
}

function clearGroupNameError() {
  groupNameError.textContent = "";
  groupNameError.classList.add("hidden");
}

function renderGroupItem(group) {
  const tpl = document.getElementById("group-item");
  const li = tpl.content.firstElementChild.cloneNode(true);

  const groupName = (group.groupName || "Unnamed Group").trim();
  const usernames = group.usernames || [];

  li.dataset.groupId = group.groupId || group._id;

  // Render overlapped avatars (up to 3)
  const avatarsContainer = li.querySelector(".avatars-container");
  const maxAvatars = Math.min(usernames.length, 3);

  for (let i = 0; i < maxAvatars; i++) {
    const memberName = usernames[i];
    const avatar = document.createElement("div");
    avatar.className = "absolute flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-white";
    avatar.style.backgroundColor = getAvatarColor(memberName);
    avatar.style.left = `${i * 10}px`;
    avatar.style.zIndex = maxAvatars - i;

    const initials = document.createElement("span");
    initials.className = "font-poppins text-xs font-semibold text-white";
    initials.textContent = getInitialsSafe(memberName);

    avatar.appendChild(initials);
    avatarsContainer.appendChild(avatar);
  }

  li.querySelector(".group-name").textContent = groupName;

  // Format member names with length limit and "x others" pattern
  const maxNameLength = 15;
  let membersText = "";

  if (usernames.length <= 3) {
    // Show all names for 2-3 members
    membersText = usernames.map(name =>
      name.length > maxNameLength ? name.substring(0, maxNameLength) + "..." : name
    ).join(", ");
  } else {
    // Show first 3 names and "x others" for more than 3
    const displayedNames = usernames.slice(0, 3).map(name =>
      name.length > maxNameLength ? name.substring(0, maxNameLength) + "..." : name
    );
    const othersCount = usernames.length - 3;
    membersText = displayedNames.join(", ") + ` and ${othersCount} other${othersCount > 1 ? 's' : ''}`;
  }

  li.querySelector(".members").textContent = membersText;

  return li;
}

async function loadGroups() {
  try {
    const res = await fetch("/api/groups", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const groups = await res.json();
    console.log("Loaded groups:", groups);

    if (!groupsUL) return;

    if (groups.length === 0) {
      // Show empty state
      groupsUL.innerHTML = `
        <li class="flex flex-col items-center justify-center py-16 px-4 text-center">
          <svg class="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 class="text-lg font-semibold text-gray-700 mb-2">No Groups Yet</h3>
          <p class="text-sm text-gray-500 mb-4">You're not in any help groups yet.</p>
          <p class="text-sm text-gray-500">Click the <span class="font-semibold">+</span> button below to create your first group!</p>
        </li>
      `;
    } else {
      const fragment = document.createDocumentFragment();
      groups.forEach((group) => {
        fragment.appendChild(renderGroupItem(group));
      });

      groupsUL.replaceChildren(fragment);
    }
  } catch (err) {
    console.error("Failed to load groups:", err);
  }
}

function setupGroupNavigation() {
  if (!groupsUL) return;

  groupsUL.addEventListener("click", (e) => {
    const target = e.target.closest("[data-group-id]");
    if (!target) return;
    const groupId = target.dataset.groupId;
    if (groupId) {
      window.location.href = `/groupchats/${encodeURIComponent(groupId)}`;
    }
  });
}

function openCreateGroupModal() {
  createGroupModal?.classList.remove("hidden");
  createGroupModal?.classList.add("flex");
  selectedMemberIds.clear();
  groupNameInput.value = "";
  createGroupSearchInput.value = "";
  loadAllCitizens();
}

function closeCreateGroupModal() {
  createGroupModal?.classList.add("hidden");
  createGroupModal?.classList.remove("flex");
  selectedMemberIds.clear();
  groupNameInput.value = "";
  createGroupSearchInput.value = "";
}

async function loadAllCitizens() {
  try {
    const res = await fetch("/api/authentications/lists", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const currentUserName = window.__CURRENT_USER__;

    // Filter out current user from the list
    const onlineUsers = (data.onlineUsers || []).filter(user => {
      const userName = user.name || user.username || "";
      return userName !== currentUserName;
    });
    const offlineUsers = (data.offlineUsers || []).filter(user => {
      const userName = user.name || user.username || "";
      return userName !== currentUserName;
    });

    // Merge and sort alphabetically by name
    allCitizens = [...onlineUsers, ...offlineUsers].sort((a, b) => {
      const nameA = (a.name || a.username || "").toLowerCase();
      const nameB = (b.name || b.username || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });

    renderCitizensList(allCitizens);
  } catch (err) {
    console.error("Failed to load citizens:", err);
  }
}

function renderCitizenItem(citizen) {
  const tpl = document.getElementById("create-group-member-item-template");
  const li = tpl.content.firstElementChild.cloneNode(true);

  const name = (citizen.name || citizen.username || "Unknown").trim();
  const userId = citizen.id || citizen._id || citizen.userId;
  const status = (citizen.status || "UNDEFINED").toUpperCase();

  li.dataset.userId = userId;

  const avatar = li.querySelector(".avatar");
  avatar.style.backgroundColor = getAvatarColor(name);
  li.querySelector(".initials").textContent = getInitialsSafe(name);

  li.querySelector(".member-name").textContent = name;

  // Add colored status badge
  const statusKey = status.toLowerCase();
  const statusTplId = `status-${statusKey}-template`;
  const statusTpl = document.getElementById(statusTplId);
  if (statusTpl) {
    const statusBadge = statusTpl.content.firstElementChild.cloneNode(true);
    li.querySelector(".member-status-badge").appendChild(statusBadge);
  }

  const checkIcon = li.querySelector(".check-icon");
  if (selectedMemberIds.has(userId)) {
    checkIcon.src = "/images/help-group/icon-check.svg";
  } else {
    checkIcon.src = "/images/help-group/icon-uncheck.svg";
  }

  li.addEventListener("click", () => {
    if (selectedMemberIds.has(userId)) {
      selectedMemberIds.delete(userId);
      checkIcon.src = "/images/help-group/icon-uncheck.svg";
    } else {
      selectedMemberIds.add(userId);
      checkIcon.src = "/images/help-group/icon-check.svg";
    }
  });

  return li;
}

function renderCitizensList(citizens) {
  if (!createGroupSearchResultList) return;

  const fragment = document.createDocumentFragment();
  citizens.forEach((citizen) => {
    fragment.appendChild(renderCitizenItem(citizen));
  });

  createGroupSearchResultList.replaceChildren(fragment);
}

function filterCitizens(query) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    renderCitizensList(allCitizens);
    return;
  }

  const filtered = allCitizens.filter((citizen) => {
    const name = (citizen.name || citizen.username || "").toLowerCase();
    return name.includes(trimmed);
  });

  renderCitizensList(filtered);
}

async function createGroup() {
  clearGroupNameError();

  const groupName = groupNameInput?.value.trim();
  if (!groupName) {
    showGroupNameError("Please enter a group name");
    return;
  }

  if (selectedMemberIds.size === 0) {
    showGroupNameError("Please select at least one member");
    return;
  }

  // Disable button during request
  confirmCreateGroupBtn.disabled = true;
  const originalText = confirmCreateGroupBtn.textContent;
  confirmCreateGroupBtn.textContent = "Creating...";

  try {
    const res = await fetch("/api/groups", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        groupName,
        memberIds: Array.from(selectedMemberIds),
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      showGroupNameError(errorData.message || `Failed to create group (${res.status})`);
      return;
    }

    const data = await res.json();
    console.log("Group created:", data);

    closeCreateGroupModal();
    await loadGroups();
  } catch (err) {
    console.error("Failed to create group:", err);
    showGroupNameError("Network error. Please try again.");
  } finally {
    confirmCreateGroupBtn.disabled = false;
    confirmCreateGroupBtn.textContent = originalText;
  }
}

function setupCreateGroupModal() {
  createGroupBtn?.addEventListener("click", openCreateGroupModal);
  cancelCreateGroupBtn?.addEventListener("click", closeCreateGroupModal);
  confirmCreateGroupBtn?.addEventListener("click", createGroup);

  createGroupSearchInput?.addEventListener("input", (e) => {
    filterCitizens(e.target.value);
  });

  clearCreateGroupSearch?.addEventListener("click", () => {
    createGroupSearchInput.value = "";
    filterCitizens("");
  });

  groupNameInput?.addEventListener("input", () => {
    clearGroupNameError();
  });

  createGroupModal?.addEventListener("click", (e) => {
    if (e.target === createGroupModal) {
      closeCreateGroupModal();
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadGroups();
  setupGroupNavigation();
  setupCreateGroupModal();
});
