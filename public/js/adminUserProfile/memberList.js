/**
 * Admin Member List
 * Filtering and sorting logic similar to taskList.js
 * Sorting by: privilege level (default) or account status
 */

// Fallback to window.__MEMBERS__ if available
let members = Array.isArray(window.__MEMBERS__) ? window.__MEMBERS__ : [];

const searchInput = document.querySelector("#member-search-input");
const sortSelect = document.querySelector("#member-sort-select");
const sortToggle = document.querySelector("#member-sort-toggle");
const sortToggleIcon = document.querySelector("#member-sort-toggle-icon");
const listContainer = document.querySelector("#member-list-items");

// Privilege level order (higher = more privileged)
const PRIVILEGE_ORDER = {
  Administrator: 3,
  Coordinator: 2,
  Citizen: 1,
};

// Account status order
const STATUS_ORDER = {
  Active: 1,
  Inactive: 0,
};

function normalizeString(value) {
  return (value || "").toString().trim().toLowerCase();
}

function getPrivilegeOrder(member) {
  const privilege = member.privilege || "Citizen";
  return PRIVILEGE_ORDER[privilege] ?? PRIVILEGE_ORDER.Citizen;
}

function getStatusOrder(member) {
  const status = member.status || "Inactive";
  return STATUS_ORDER[status] ?? STATUS_ORDER.Inactive;
}

function compareMembers(a, b) {
  const currentSortKey = sortSelect?.value || "privilege";

  switch (currentSortKey) {
    case "privilege": {
      const aOrder = getPrivilegeOrder(a);
      const bOrder = getPrivilegeOrder(b);
      if (aOrder !== bOrder) return aOrder - bOrder; // Ascending (will be flipped for desc)
      // If same privilege, sort by username alphabetically
      const aName = normalizeString(a.username);
      const bName = normalizeString(b.username);
      return aName.localeCompare(bName);
    }
    case "status": {
      const aStatus = getStatusOrder(a);
      const bStatus = getStatusOrder(b);
      if (aStatus !== bStatus) return aStatus - bStatus; // Ascending (will be flipped for desc)
      // If same status, sort by privilege, then username
      const aPriv = getPrivilegeOrder(a);
      const bPriv = getPrivilegeOrder(b);
      if (aPriv !== bPriv) return aPriv - bPriv;
      const aName = normalizeString(a.username);
      const bName = normalizeString(b.username);
      return aName.localeCompare(bName);
    }
    default: {
      // Default: sort by username
      const aName = normalizeString(a.username);
      const bName = normalizeString(b.username);
      return aName.localeCompare(bName);
    }
  }
}

function getPrivilegeClass(privilege) {
  if (privilege === "Administrator") return "bg-red-100 text-red-600";
  if (privilege === "Coordinator") return "bg-orange-100 text-orange-600";
  return "bg-stone-100 text-stone-700";
}

function getStatusClass(status) {
  return status === "Active"
    ? "bg-green-100 text-green-600"
    : "bg-gray-300 text-gray-600";
}

function getPrivilegeDisplay(privilege) {
  if (privilege === "Administrator") return "ADMIN";
  if (privilege === "Coordinator") return "COORDINATOR";
  return "CITIZEN";
}

function renderMemberList(items) {
  if (!listContainer) return;

  if (items.length === 0) {
    listContainer.innerHTML =
      '<p class="text-center text-stone-500 py-4">No members found</p>';
    return;
  }

  const html = items
    .map((member) => {
      const privilegeClass = getPrivilegeClass(member.privilege);
      const statusClass = getStatusClass(member.status);
      const privilegeDisplay = getPrivilegeDisplay(member.privilege);
      const href = `/admin/users/${member.id}/edit`;

      return `
        <a href="${href}" class="member-item flex items-center gap-4 px-2 py-3 rounded-xl hover:bg-stone-50 transition cursor-pointer" data-member-id="${member.id}">
          <div class="flex-1 flex items-center justify-center text-sm font-medium text-stone-900">
            ${member.username || "Unknown"}
          </div>
          <div class="flex-1 flex items-center justify-center">
            <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusClass}">
              ${member.status || "Inactive"}
            </span>
          </div>
          <div class="flex-1 flex items-center justify-center">
            <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase ${privilegeClass}">
              ${privilegeDisplay}
            </span>
          </div>
        </a>
      `;
    })
    .join("");

  listContainer.innerHTML = html;
}

function applyFiltersAndRender() {
  if (!searchInput || !sortSelect) return;

  const keyword = normalizeString(searchInput.value);
  const currentDirection =
    sortToggle?.dataset.direction === "asc" ? "asc" : "desc";

  let filtered = members.filter((member) => {
    if (!keyword) return true;
    const username = normalizeString(member.username);
    return username.includes(keyword);
  });

  filtered.sort((a, b) => {
    const base = compareMembers(a, b);
    if (currentDirection === "asc") {
      return base;
    }
    return -base;
  });

  renderMemberList(filtered);
}

function updateToggleIcon() {
  if (!sortToggleIcon || !sortToggle) return;
  const currentDirection =
    sortToggle.dataset.direction === "asc" ? "asc" : "desc";
  sortToggleIcon.textContent = currentDirection === "asc" ? "↑" : "↓";
}

// Helper functions to map backend format to frontend format
function mapBackendRoleToPrivilege(role) {
  if (role === "admin" || role === "Administrator") return "Administrator";
  if (role === "coordinator" || role === "Coordinator") return "Coordinator";
  if (role === "citizen" || role === "Citizen") return "Citizen";
  return "Citizen"; // default
}

function mapBackendStatusToDisplay(status) {
  if (status === "active" || status === "Active") return "Active";
  if (status === "inactive" || status === "Inactive") return "Inactive";
  return "Inactive"; // default
}

// Initialize members from server-rendered data
function initializeMembersFromDOM() {
  if (!listContainer) return;

  const memberItems = listContainer.querySelectorAll(".member-item");
  members = Array.from(memberItems).map((item) => {
    const memberId = item.dataset.memberId;
    const usernameEl = item.querySelector(".flex-1:first-child");
    const statusEl = item.querySelector(".flex-1:nth-child(2) span");
    const privilegeEl = item.querySelector(".flex-1:nth-child(3) span");

    // Extract status from class or text
    let status = "Inactive";
    if (statusEl) {
      const statusText = statusEl.textContent.trim().toUpperCase();
      status = statusText === "ACTIVE" ? "Active" : "Inactive";
    }

    // Extract privilege from text
    let privilege = "Citizen";
    if (privilegeEl) {
      const privText = privilegeEl.textContent.trim().toUpperCase();
      if (privText === "ADMIN") privilege = "Administrator";
      else if (privText === "COORDINATOR") privilege = "Coordinator";
      else privilege = "Citizen";
    }

    return {
      id: memberId,
      username: usernameEl?.textContent.trim() || "Unknown",
      status: status,
      privilege: privilege,
    };
  });
}

// Optional: Fetch members from API (for real-time updates)
async function fetchMembersFromAPI() {
  try {
    const response = await fetch("/api/admin/profiles", {
      method: "GET",
      credentials: "include",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch members:", response.status);
      return null;
    }

    const backendUsers = await response.json();
    if (!Array.isArray(backendUsers)) {
      console.error("Invalid response format: expected array");
      return null;
    }

    // Map backend format to frontend format
    return backendUsers.map((user) => ({
      id: user.id,
      username: user.username,
      status: mapBackendStatusToDisplay(user.status),
      privilege: mapBackendRoleToPrivilege(user.role),
    }));
  } catch (error) {
    console.error("Error fetching members from API:", error);
    return null;
  }
}

if (searchInput && sortSelect && sortToggle && listContainer) {
  // Initialize members from DOM if not already set
  if (members.length === 0) {
    initializeMembersFromDOM();
  }

  // Initialize toggle icon
  updateToggleIcon();

  // Event listeners
  searchInput.addEventListener("input", () => {
    applyFiltersAndRender();
  });

  sortSelect.addEventListener("change", () => {
    applyFiltersAndRender();
  });

  sortToggle.addEventListener("click", () => {
    const currentDirection =
      sortToggle.dataset.direction === "asc" ? "asc" : "desc";
    const newDirection = currentDirection === "asc" ? "desc" : "asc";
    sortToggle.dataset.direction = newDirection;
    updateToggleIcon();
    applyFiltersAndRender();
  });

  // Initial render
  applyFiltersAndRender();
}

