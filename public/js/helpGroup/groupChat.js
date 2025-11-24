import { renderMessage } from "../utils/renderMessage.js";
import { getInitialsSafe, getAvatarColor } from "../utils/avatars.js";
import { getSocket } from "../utils/socket.js";
import { initVoiceCall } from "./voiceCall.js";

const $ = (s) => document.querySelector(s);

// Styling constants for textarea
const lineHeight = 24;
const maxRows = 5;

const header = $("#group-chat-header");
const groupId = header?.dataset.groupId;
const currentUserId = window.__CURRENT_USER_ID__;
const socket = getSocket();

const ui = {
  groupName: $("#group-name"),
  groupMembersCount: $("#group-members-count"),
  actionBtn: $("#action-btn"),
  actionIcon: $("#action-icon"),
  msgList: $("#msg-list"),
  msgForm: $("#msg-form"),
  msgInput: $("#msg-input"),
  sendBtn: $("#send-btn"),
  confirmModal: $("#confirm-modal"),
  confirmTitle: $("#confirm-title"),
  confirmMessage: $("#confirm-message"),
  confirmOk: $("#confirm-ok"),
  confirmCancel: $("#confirm-cancel"),
  fabContainer: $("#fab-container"),
};

let groupDetails = null;
let currentUserStatus = "UNDEFINED";
let selectedMembersToRemove = new Set();
let selectedMembersToAdd = new Set();
let isImeActive = false;

// Fetch current user status
async function loadCurrentUserStatus() {
  try {
    const res = await fetch("/api/authentications/accounts", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const user = await res.json();
      currentUserStatus = user.status || "UNDEFINED";
    }
  } catch (err) {
    console.error("Failed to load user status:", err);
  }
}

// Load group details
async function loadGroupDetails() {
  try {
    const res = await fetch(`/api/groups/${groupId}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    groupDetails = await res.json();
    console.log("Group details:", groupDetails);

    // Update header
    ui.groupName.textContent = groupDetails.groupName;
    ui.groupMembersCount.textContent = `${groupDetails.totalCount} member${groupDetails.totalCount > 1 ? 's' : ''}`;

    // Setup action button (delete/leave)
    if (groupDetails.isOwner) {
      ui.actionIcon.src = "/images/help-group/icon-delete.svg";
      ui.actionIcon.alt = "Delete Group";
      ui.actionBtn.onclick = confirmDeleteGroup;
    } else {
      ui.actionIcon.src = "/images/help-group/icon-leave.svg";
      ui.actionIcon.alt = "Leave Group";
      ui.actionBtn.onclick = confirmLeaveGroup;
    }

    // Setup FABs based on user role
    setupFABs();
  } catch (err) {
    console.error("Failed to load group details:", err);
    alert("Failed to load group details");
    window.location.href = "/groups";
  }
}

// Load group messages
async function loadMessages() {
  try {
    const res = await fetch(`/api/groups/${groupId}/messages`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const messages = await res.json();
    console.log("Loaded messages:", messages);

    if (messages.length === 0) {
      showEmptyState();
    } else {
      hideEmptyState();
      messages.forEach((msg) => {
        ui.msgList.appendChild(renderMessage({
          name: msg.senderName,
          text: msg.messageText,
          status: msg.status,
          timestamp: msg.timestamp,
          isOwn: msg.isOwn,
        }));
      });
      scrollToBottom();
    }
  } catch (err) {
    console.error("Failed to load messages:", err);
  }
}

// Show empty state
function showEmptyState() {
  ui.msgList.innerHTML = `
    <li class="flex flex-col items-center justify-center py-16 px-4 text-center">
      <svg class="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <p class="text-sm text-gray-500">No messages yet. Start the conversation!</p>
    </li>
  `;
}

// Hide empty state
function hideEmptyState() {
  const emptyState = ui.msgList.querySelector("li");
  if (emptyState && emptyState.textContent.includes("No messages yet")) {
    emptyState.remove();
  }
}

// Scroll to bottom
function scrollToBottom() {
  requestAnimationFrame(() => {
    ui.msgList.scrollTop = ui.msgList.scrollHeight;
  });
}

// Prepare input for sending
function prepareInputForSend() {
  ui.msgInput.value = "";
  ui.msgInput.rows = 1;
  ui.sendBtn.disabled = true;
}

// Send message
async function sendMessage(e) {
  e.preventDefault();

  const text = ui.msgInput.value.trim();
  if (!text) return;

  prepareInputForSend();

  try {
    const res = await fetch(`/api/groups/${groupId}/messages`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messageText: text,
        status: currentUserStatus.toLowerCase(),
        timestamp: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    // Add message to UI
    hideEmptyState();
    scrollToBottom();
  } catch (err) {
    console.error("Failed to send message:", err);
    alert("Failed to send message");
    ui.msgInput.value = text; // Restore text on error
  }
}

// Enable/disable send button based on input and auto-expand textarea
function setupInputListener() {
  ui.msgInput.addEventListener("input", () => {
    if (!ui.msgInput.value) {
      ui.sendBtn.disabled = true;
    } else {
      ui.sendBtn.disabled = false;
    }
    ui.msgInput.rows = 1;
    const currentRows = Math.min(
      Math.floor(ui.msgInput.scrollHeight / lineHeight),
      maxRows,
    );
    ui.msgInput.rows = currentRows;
    ui.msgInput.scrollTop = ui.msgInput.scrollHeight;
    ui.msgList.scrollTop = ui.msgList.scrollHeight;
  });
}

// Handle IME composition (for Asian languages)
function setupCompositionListeners() {
  ui.msgInput.addEventListener("compositionstart", () => {
    isImeActive = true;
  });

  ui.msgInput.addEventListener("compositionend", () => {
    // Delay so the keydown that comes right after we commit doesn't read false immediately.
    setTimeout(() => {
      isImeActive = false;
    });
  });
}

// Handle Enter key to send (Shift+Enter for newline)
function setupEnterListener() {
  ui.msgInput.addEventListener("keydown", (e) => {
    if (isImeActive || e.key === "Process" || e.keyCode === 229) {
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  });
}

// Handle form submission
function setupSendButtonListener() {
  ui.msgForm.addEventListener("submit", sendMessage);
}

// Confirm modal helpers
function showConfirmModal(title, message, onConfirm) {
  ui.confirmTitle.textContent = title;
  ui.confirmMessage.textContent = message;
  ui.confirmModal.classList.remove("hidden");
  ui.confirmModal.classList.add("flex");

  const handleConfirm = () => {
    onConfirm();
    closeConfirmModal();
  };

  const handleCancel = () => {
    closeConfirmModal();
  };

  ui.confirmOk.onclick = handleConfirm;
  ui.confirmCancel.onclick = handleCancel;
  ui.confirmModal.onclick = (e) => {
    if (e.target === ui.confirmModal) closeConfirmModal();
  };
}

function closeConfirmModal() {
  ui.confirmModal.classList.add("hidden");
  ui.confirmModal.classList.remove("flex");
  ui.confirmOk.onclick = null;
  ui.confirmCancel.onclick = null;
}

// Delete group
function confirmDeleteGroup() {
  showConfirmModal(
    "Delete Group",
    "Are you sure you want to delete this group? This action cannot be undone.",
    async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}`, {
          method: "DELETE",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        window.location.href = "/groups";
      } catch (err) {
        console.error("Failed to delete group:", err);
        alert("Failed to delete group");
      }
    }
  );
}

// Leave group
function confirmLeaveGroup() {
  showConfirmModal(
    "Leave Group",
    "Are you sure you want to leave this group?",
    async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/members`, {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            userIds: [currentUserId],
          }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        window.location.href = "/groups";
      } catch (err) {
        console.error("Failed to leave group:", err);
        alert("Failed to leave group");
      }
    }
  );
}

// Setup socket listener for incoming group messages
function setupGroupMessageListener() {
  socket.on("group_message", (message) => {
    console.log("Received group message:", message);

    // Only show messages for this group
    if (message.groupId === groupId) {
      hideEmptyState();
      ui.msgList.appendChild(renderMessage({
        name: message.sender,
        text: message.content,
        status: message.status,
        timestamp: message.timestamp,
        isOwn: message.isOwn,
      }));
      scrollToBottom();
    }
  });
}

// ============================================================================
// Member Management Functions
// ============================================================================

// Setup FABs based on user role
function setupFABs() {
  ui.fabContainer.innerHTML = "";

  if (groupDetails.isOwner) {
    // Owner gets two FABs: view/manage members + add members
    const manageFAB = createManageMembersFAB();
    const addFAB = createAddMemberFAB();
    ui.fabContainer.appendChild(manageFAB);
    ui.fabContainer.appendChild(addFAB);
  } else {
    // Regular member gets one FAB: view members only
    const viewFAB = createViewMembersFAB();
    ui.fabContainer.appendChild(viewFAB);
  }
}

// Create view members FAB (for regular members)
function createViewMembersFAB() {
  const fab = document.createElement("button");
  fab.id = "view-members-btn";
  fab.type = "button";
  fab.className = "absolute bottom-8 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#D65841] shadow-lg transition hover:brightness-95";

  const img = document.createElement("img");
  img.src = "/images/help-group/icon-groups-white.svg";
  img.alt = "View Members";
  img.className = "h-6 w-6";

  fab.appendChild(img);
  fab.onclick = openViewMembersModal;

  return fab;
}

// Create manage members FAB (for owner - bottom FAB)
function createManageMembersFAB() {
  const fab = document.createElement("button");
  fab.id = "view-members-btn";
  fab.type = "button";
  fab.className = "absolute bottom-8 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#D65841] shadow-lg transition hover:brightness-95";

  const img = document.createElement("img");
  img.src = "/images/help-group/icon-groups-white.svg";
  img.alt = "Manage Members";
  img.className = "h-6 w-6";

  fab.appendChild(img);
  fab.onclick = openManageMembersModal;

  return fab;
}

// Create add member FAB (for owner - top FAB)
function createAddMemberFAB() {
  const fab = document.createElement("button");
  fab.id = "add-member-btn";
  fab.type = "button";
  fab.className = "absolute bottom-24 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#D65841] shadow-lg transition hover:brightness-95";

  const img = document.createElement("img");
  img.src = "/images/help-group/icon-add.svg";
  img.alt = "Add Member";
  img.className = "h-6 w-6";

  fab.appendChild(img);
  fab.onclick = openAddMemberModal;

  return fab;
}

// Render member item with status badge
function renderMemberItem(member, templateId, statusPrefix) {
  const template = $(`#${templateId}`);
  const clone = template.content.cloneNode(true);

  const avatar = clone.querySelector(".member-avatar");
  const initials = clone.querySelector(".member-initials");
  const name = clone.querySelector(".member-name");
  const statusBadge = clone.querySelector(".member-status-badge");

  // Set avatar color and initials
  const color = getAvatarColor(member.name);
  avatar.style.backgroundColor = color;
  initials.textContent = getInitialsSafe(member.name);

  // Set name
  name.textContent = member.name;

  // Set status badge
  const statusKey = (member.status || "undefined").toLowerCase();
  const statusTemplate = $(`#${statusPrefix}-status-${statusKey}-template`);
  if (statusTemplate) {
    const statusClone = statusTemplate.content.cloneNode(true);
    statusBadge.appendChild(statusClone);
  }

  return clone;
}

// Get all members sorted alphabetically
function getAllMembersSorted() {
  const allMembers = [];

  // Add owner
  if (groupDetails.owner) {
    allMembers.push({
      ...groupDetails.owner,
      isOwner: true
    });
  }

  // Add members
  if (groupDetails.members) {
    groupDetails.members.forEach(member => {
      allMembers.push({
        ...member,
        isOwner: false
      });
    });
  }

  // Sort alphabetically by name
  return allMembers.sort((a, b) => {
    const nameA = (a.name || "").toLowerCase();
    const nameB = (b.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

// ============================================================================
// View Members Modal (Regular Members)
// ============================================================================

function openViewMembersModal() {
  const modal = $("#view-members-modal");
  const list = $("#view-members-list");

  // Clear and populate list
  list.innerHTML = "";
  const members = getAllMembersSorted();

  members.forEach(member => {
    const item = renderMemberItem(member, "view-member-item-template", "view");
    list.appendChild(item);
  });

  // Show modal
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // Setup close handler
  const closeBtn = $("#view-members-close");
  closeBtn.onclick = closeViewMembersModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeViewMembersModal();
  };
}

function closeViewMembersModal() {
  const modal = $("#view-members-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

// ============================================================================
// Manage Members Modal (Owner - Remove Members)
// ============================================================================

function openManageMembersModal() {
  const modal = $("#manage-members-modal");
  const list = $("#manage-members-list");
  const errorDiv = $("#manage-members-error");

  // Clear selection and errors
  selectedMembersToRemove.clear();
  errorDiv.classList.add("hidden");
  errorDiv.textContent = "";

  // Clear and populate list
  list.innerHTML = "";
  const members = getAllMembersSorted();

  members.forEach(member => {
    let item;
    if (member.isOwner) {
      // Owner item without checkbox
      item = renderMemberItem(member, "manage-owner-item-template", "manage");
    } else {
      // Regular member with checkbox
      item = renderMemberItem(member, "manage-member-item-template", "manage");
      const li = item.querySelector(".manage-member-item");
      const checkIcon = item.querySelector(".check-icon");

      li.dataset.userId = member.id;
      li.onclick = () => toggleMemberSelection(member.id, checkIcon);
    }
    list.appendChild(item);
  });

  // Show modal
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // Setup handlers
  const closeBtn = $("#manage-members-close");
  const cancelBtn = $("#manage-members-cancel");
  const removeBtn = $("#manage-members-remove");

  closeBtn.onclick = closeManageMembersModal;
  cancelBtn.onclick = closeManageMembersModal;
  removeBtn.onclick = removeSelectedMembers;

  modal.onclick = (e) => {
    if (e.target === modal) closeManageMembersModal();
  };
}

function closeManageMembersModal() {
  const modal = $("#manage-members-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  selectedMembersToRemove.clear();
}

function toggleMemberSelection(userId, checkIcon) {
  if (selectedMembersToRemove.has(userId)) {
    selectedMembersToRemove.delete(userId);
    checkIcon.src = "/images/help-group/icon-uncheck.svg";
  } else {
    selectedMembersToRemove.add(userId);
    checkIcon.src = "/images/help-group/icon-check.svg";
  }
}

async function removeSelectedMembers() {
  const errorDiv = $("#manage-members-error");
  const removeBtn = $("#manage-members-remove");

  if (selectedMembersToRemove.size === 0) {
    errorDiv.textContent = "Please select at least one member to remove";
    errorDiv.classList.remove("hidden");
    return;
  }

  // Clear error
  errorDiv.classList.add("hidden");
  errorDiv.textContent = "";

  // Disable button
  const originalText = removeBtn.textContent;
  removeBtn.disabled = true;
  removeBtn.textContent = "Removing...";

  try {
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        userIds: Array.from(selectedMembersToRemove),
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    // Reload group details and close modal
    await loadGroupDetails();
    closeManageMembersModal();
  } catch (err) {
    console.error("Failed to remove members:", err);
    errorDiv.textContent = err.message || "Failed to remove members";
    errorDiv.classList.remove("hidden");
  } finally {
    removeBtn.disabled = false;
    removeBtn.textContent = originalText;
  }
}

// ============================================================================
// Add Member Modal (Owner)
// ============================================================================

async function openAddMemberModal() {
  const modal = $("#add-member-modal");
  const list = $("#add-member-list");
  const searchInput = $("#add-member-search");
  const searchClear = $("#add-member-search-clear");
  const errorDiv = $("#add-member-error");

  // Clear selection and errors
  selectedMembersToAdd.clear();
  errorDiv.classList.add("hidden");
  errorDiv.textContent = "";
  searchInput.value = "";
  searchClear.classList.add("hidden");

  // Load all citizens
  await loadAvailableCitizens();

  // Show modal
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // Setup handlers
  const closeBtn = $("#add-member-close");
  const cancelBtn = $("#add-member-cancel");
  const addBtn = $("#add-member-confirm");

  closeBtn.onclick = closeAddMemberModal;
  cancelBtn.onclick = closeAddMemberModal;
  addBtn.onclick = addSelectedMembers;

  searchInput.oninput = () => {
    filterAvailableCitizens(searchInput.value.trim());
    searchClear.classList.toggle("hidden", !searchInput.value.trim());
  };

  searchClear.onclick = () => {
    searchInput.value = "";
    searchClear.classList.add("hidden");
    filterAvailableCitizens("");
  };

  modal.onclick = (e) => {
    if (e.target === modal) closeAddMemberModal();
  };
}

function closeAddMemberModal() {
  const modal = $("#add-member-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  selectedMembersToAdd.clear();
}

let allAvailableCitizens = [];

async function loadAvailableCitizens() {
  try {
    const res = await fetch("/api/authentications/lists", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const onlineUsers = data.onlineUsers || [];
    const offlineUsers = data.offlineUsers || [];

    // Get current group member IDs
    const groupMemberIds = new Set();
    if (groupDetails.owner) {
      groupMemberIds.add(groupDetails.owner.id);
    }
    if (groupDetails.members) {
      groupDetails.members.forEach(m => groupMemberIds.add(m.id));
    }

    // Filter out current members and sort alphabetically
    const available = [...onlineUsers, ...offlineUsers]
      .filter(user => !groupMemberIds.has(user.id))
      .sort((a, b) => {
        const nameA = (a.name || a.username || "").toLowerCase();
        const nameB = (b.name || b.username || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

    allAvailableCitizens = available;
    renderAvailableCitizens(available);
  } catch (err) {
    console.error("Failed to load citizens:", err);
    const errorDiv = $("#add-member-error");
    errorDiv.textContent = "Failed to load users";
    errorDiv.classList.remove("hidden");
  }
}

function renderAvailableCitizens(citizens) {
  const list = $("#add-member-list");
  list.innerHTML = "";

  citizens.forEach(citizen => {
    const template = $("#add-member-item-template");
    const clone = template.content.cloneNode(true);

    const li = clone.querySelector(".add-member-item");
    const avatar = clone.querySelector(".member-avatar");
    const initials = clone.querySelector(".member-initials");
    const name = clone.querySelector(".member-name");
    const statusBadge = clone.querySelector(".member-status-badge");
    const checkIcon = clone.querySelector(".check-icon");

    // Set data
    li.dataset.userId = citizen.id;

    // Avatar
    const color = getAvatarColor(citizen.name || citizen.username);
    avatar.style.backgroundColor = color;
    initials.textContent = getInitialsSafe(citizen.name || citizen.username);

    // Name
    name.textContent = citizen.name || citizen.username;

    // Status badge
    const statusKey = (citizen.status || "undefined").toLowerCase();
    const statusTemplate = $(`#add-status-${statusKey}-template`);
    if (statusTemplate) {
      const statusClone = statusTemplate.content.cloneNode(true);
      statusBadge.appendChild(statusClone);
    }

    // Click handler
    li.onclick = () => toggleAddSelection(citizen.id, checkIcon);

    list.appendChild(clone);
  });
}

function filterAvailableCitizens(query) {
  const filtered = allAvailableCitizens.filter(citizen => {
    const name = (citizen.name || citizen.username || "").toLowerCase();
    return name.includes(query.toLowerCase());
  });
  renderAvailableCitizens(filtered);
}

function toggleAddSelection(userId, checkIcon) {
  if (selectedMembersToAdd.has(userId)) {
    selectedMembersToAdd.delete(userId);
    checkIcon.src = "/images/help-group/icon-uncheck.svg";
  } else {
    selectedMembersToAdd.add(userId);
    checkIcon.src = "/images/help-group/icon-check.svg";
  }
}

async function addSelectedMembers() {
  const errorDiv = $("#add-member-error");
  const addBtn = $("#add-member-confirm");

  if (selectedMembersToAdd.size === 0) {
    errorDiv.textContent = "Please select at least one member to add";
    errorDiv.classList.remove("hidden");
    return;
  }

  // Clear error
  errorDiv.classList.add("hidden");
  errorDiv.textContent = "";

  // Disable button
  const originalText = addBtn.textContent;
  addBtn.disabled = true;
  addBtn.textContent = "Adding...";

  try {
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        userIds: Array.from(selectedMembersToAdd),
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    // Reload group details and close modal
    await loadGroupDetails();
    closeAddMemberModal();
  } catch (err) {
    console.error("Failed to add members:", err);
    errorDiv.textContent = err.message || "Failed to add members";
    errorDiv.classList.remove("hidden");
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = originalText;
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  await loadCurrentUserStatus();
  await loadGroupDetails();
  await loadMessages();
  setupInputListener();
  setupCompositionListeners();
  setupEnterListener();
  setupSendButtonListener();
  setupGroupMessageListener();
  initVoiceCall(groupId);
});
