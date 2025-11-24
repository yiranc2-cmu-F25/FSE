// public/js/helpCenter/myTasks.js
// This script reuses the taskList.js logic but fetches from /api/tasks/self endpoint
// to show only tasks owned or participated by the current user

// Fallback to window.__TASKS__ if available (for backward compatibility)
let tasks = Array.isArray(window.__TASKS__) ? window.__TASKS__ : [];

const searchInput = document.querySelector("#task-search-input");
const sortSelect = document.querySelector("#task-sort-select");
const sortToggle = document.querySelector("#task-sort-toggle");
const sortToggleIcon = document.querySelector("#task-sort-toggle-icon");
const listContainer = document.querySelector("#task-list-items");

// Map backend category values to frontend categoryType
const CATEGORY_TYPE_MAP = {
  debris_removal_and_cleanup: "debris",
  temporary_repair: "temp-repair",
  animal_care: "animal-care",
  others: "other",
};

// Map backend category enum to display name
const CATEGORY_DISPLAY_MAP = {
  debris_removal_and_cleanup: "Debris Removal",
  temporary_repair: "Temp Repair",
  animal_care: "Animal Care",
  others: "Others",
};

// Map emergencyLevel to statusLabel (capitalize first letter)
function getStatusLabel(emergencyLevel) {
  if (!emergencyLevel) return "";
  return emergencyLevel.charAt(0).toUpperCase() + emergencyLevel.slice(1);
}

// Transform backend task data to frontend format
function transformTask(backendTask, currentUserId) {
  const categoryType =
    CATEGORY_TYPE_MAP[backendTask.category] || "other";
  const categoryDisplay =
    CATEGORY_DISPLAY_MAP[backendTask.category] || backendTask.category || "";
  const statusLabel = getStatusLabel(backendTask.emergencyLevel);
  const status = backendTask.isOpen ? "OPEN" : "CLOSED";

  // Determine if user is owner
  const creatorId = backendTask.creator?.id || backendTask.creator?._id || backendTask.creator;
  const isOwner = currentUserId && creatorId 
    ? String(creatorId) === String(currentUserId)
    : false;
  
  // Use isParticipant from backend if available, otherwise false
  const isParticipant = backendTask.isParticipant !== undefined 
    ? backendTask.isParticipant 
    : false;

  return {
    id: backendTask.id || backendTask._id,
    title: backendTask.title || "",
    category: categoryDisplay,
    categoryType: categoryType,
    statusLevel: backendTask.emergencyLevel || "standard",
    statusLabel: statusLabel,
    status: status,
    capacity: backendTask.helpers || 0,
    joinedCount: backendTask.helpersJoined || 0,
    postedAt: backendTask.createdAt || backendTask.updatedAt,
    href: `/tasks/${backendTask.id || backendTask._id}`,
    // Ownership and participation info
    isOwner: isOwner,
    isParticipant: isParticipant,
    // Optional fields
    icon: backendTask.icon,
    location: backendTask.location,
    description: backendTask.description,
  };
}

// Fetch tasks from API (user's tasks only)
async function fetchMyTasks() {
  try {
    const response = await fetch("/api/tasks/self", {
      method: "GET",
      credentials: "include", // Include cookies for authentication
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error("Unauthorized: Please log in");
        return [];
      }
      throw new Error(`Failed to fetch my tasks: ${response.status}`);
    }

    const backendTasks = await response.json();
    if (!Array.isArray(backendTasks)) {
      console.error("Invalid response format: expected array");
      return [];
    }

    // Get current user ID for ownership check
    const currentUserId = window.__CURRENT_USER_ID__ || null;
    
    return backendTasks.map((task) => transformTask(task, currentUserId));
  } catch (error) {
    console.error("Error fetching my tasks:", error);
    // Return empty array on error, but keep using fallback data if available
    return [];
  }
}

if (searchInput && sortSelect && sortToggle && listContainer) {
  let currentDirection =
    sortToggle.dataset.direction === "asc" ? "asc" : "desc";
  let currentSortKey = sortSelect.value || "emergency";

  const EMERGENCY_ORDER = {
    critical: 3,
    urgent: 2,
    standard: 1,
    scheduled: 0,
  };

  const CATEGORY_GROUP_ORDER = {
    debris: 0, // Debris Removal & Cleanup
    "temp-repair": 1, // Temporary Repair Assistance
    "animal-care": 2, // Animal Care Assistance
    other: 3,
  };

  const STATUS_ORDER = {
    OPEN: 1,
    CLOSED: 0,
  };

  function updateToggleIcon() {
    if (!sortToggleIcon) return;
    sortToggleIcon.textContent = currentDirection === "asc" ? "↑" : "↓";
  }

  function normalizeString(value) {
    return (value || "").toString().trim().toLowerCase();
  }

  function getVacancy(task) {
    const capacity = Number(task.capacity ?? 0);
    const joined = Number(task.joinedCount ?? 0);
    return capacity - joined;
  }

  function getPostedTime(task) {
    if (!task.postedAt) return 0;
    const time = new Date(task.postedAt).getTime();
    return isNaN(time) ? 0 : time;
  }

  function getCategoryGroupIndex(task) {
    const type = task.categoryType || "other";
    return CATEGORY_GROUP_ORDER[type] ?? CATEGORY_GROUP_ORDER.other;
  }

  function compareTasks(a, b) {
    switch (currentSortKey) {
      case "emergency": {
        const aLevel = EMERGENCY_ORDER[normalizeString(a.statusLevel)] ?? -1;
        const bLevel = EMERGENCY_ORDER[normalizeString(b.statusLevel)] ?? -1;
        return aLevel - bLevel;
      }
      case "vacancy": {
        const diff = getVacancy(a) - getVacancy(b);
        return diff;
      }
      case "category": {
        const groupDiff = getCategoryGroupIndex(a) - getCategoryGroupIndex(b);
        if (groupDiff !== 0) return groupDiff;
        // inside same group, alphabetical by category/title
        const aName = normalizeString(a.category || a.title);
        const bName = normalizeString(b.category || b.title);
        return aName.localeCompare(bName);
      }
      case "postedAt": {
        return getPostedTime(a) - getPostedTime(b);
      }
      case "status": {
        const aStatus = STATUS_ORDER[(a.status || "").toUpperCase()] ?? -1;
        const bStatus = STATUS_ORDER[(b.status || "").toUpperCase()] ?? -1;
        return aStatus - bStatus;
      }
      default: {
        const aName = normalizeString(a.title);
        const bName = normalizeString(b.title);
        return aName.localeCompare(bName);
      }
    }
  }

  function getGradientClass(categoryType) {
    switch (categoryType) {
      case "temp-repair":
        return "from-indigo-50 to-indigo-100";
      case "animal-care":
        return "from-emerald-50 to-emerald-100";
      case "debris":
        return "from-amber-50 to-amber-100";
      default:
        return "from-stone-50 to-stone-100";
    }
  }

  function getStatusClass(statusLevel) {
    const level = normalizeString(statusLevel);
    if (level === "critical") return "bg-rose-100 text-rose-700";
    if (level === "urgent") return "bg-amber-100 text-amber-700";
    return "bg-stone-100 text-stone-700";
  }

  function getCategoryIconPath(categoryType) {
    switch (categoryType) {
      case "debris":
        return "/images/help-tasks/icons/task_category/debrisRemoval_cleanUp.svg";
      case "temp-repair":
        return "/images/help-tasks/icons/task_category/tempRepair.svg";
      case "animal-care":
        return "/images/help-tasks/icons/task_category/animalCare.svg";
      case "other":
        return "/images/help-tasks/icons/task_category/otherCategory.svg";
      default:
        return "/images/help-tasks/icons/task_category/otherCategory.svg";
    }
  }

  function getStatusTagClass(status) {
    const normalizedStatus = (status || "").toUpperCase();
    if (normalizedStatus === "OPEN") {
      return "bg-emerald-100 text-emerald-700";
    } else if (normalizedStatus === "CLOSED") {
      return "bg-stone-200 text-stone-600";
    }
    return "bg-stone-100 text-stone-700";
  }

  function renderTaskList(items) {
    const html = items
      .map((task) => {
        const gradient = getGradientClass(task.categoryType);
        const statusClass = getStatusClass(task.statusLevel);
        const statusTagClass = getStatusTagClass(task.status);
        const categoryIconPath = getCategoryIconPath(task.categoryType);
        const taskTitle = task.title || "Untitled Task";
        const href = task.href || `/tasks/${task.id}`;

        return `
          <article
            class="flex items-center justify-between rounded-3xl bg-gradient-to-r px-4 py-4 shadow-sm ${gradient} task-list-item task-card"
            data-task-id="${task.id}"
          >
            <div class="flex items-center gap-3">
              <!-- Category Icon -->
              <div
                class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 shadow-sm"
              >
                <img 
                  src="${categoryIconPath}" 
                  alt="${task.category || 'Task category'}" 
                  class="h-full w-full" 
                />
              </div>

              <!-- Task Info -->
              <div class="space-y-1">
                <!-- Task Name -->
                <p class="text-sm font-semibold text-stone-900">
                  ${taskTitle}
                </p>
                
                <!-- Tags: Emergency Level and Status -->
                <div class="flex items-center gap-2 flex-wrap">
                  ${
                    task.statusLabel
                      ? `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${statusClass}">
                          ${task.statusLabel}
                        </span>`
                      : ""
                  }
                  ${
                    task.status
                      ? `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${statusTagClass}">
                          ${task.status}
                        </span>`
                      : ""
                  }
                </div>
              </div>
            </div>

            <a
              href="${href}"
              class="ml-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-stone-500 shadow-sm transition hover:bg-amber-600 hover:text-white"
              aria-label="View task details"
              data-task-id="${task.id}"
            >
              <!-- chevron icon placeholder -->
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
                <path fill="currentColor" d="M9.29 6.71a1 1 0 0 0 0 1.42L12.17 11L9.3 13.88a1 1 0 0 0 1.4 1.42l3.99-4a1 1 0 0 0 0-1.4l-4-4a1 1 0 0 0-1.4 0Z" />
              </svg>
            </a>
          </article>
        `;
      })
      .join("");

    listContainer.innerHTML = html;
  }

  function applyFiltersAndRender() {
    const keyword = normalizeString(searchInput.value);
    const filterValue = sortSelect.value || "emergency";

    let filtered = tasks.filter((task) => {
      // Apply ownership/participation filter
      if (filterValue === "owned") {
        // Only show tasks owned by user
        if (!task.isOwner) return false;
      } else if (filterValue === "joined") {
        // Show all tasks where user is participant (including tasks they created)
        if (!task.isParticipant) return false;
      }
      // For other filter values (emergency, vacancy, etc.), show all tasks
      
      // Apply search filter
      if (keyword) {
        const title = normalizeString(task.title);
        const category = normalizeString(task.category);
        if (!title.includes(keyword) && !category.includes(keyword)) {
          return false;
        }
      }
      
      return true;
    });

    // Apply sorting
    if (filterValue === "owned" || filterValue === "joined") {
      // For owned/joined filters, sort by posted time (newest first by default)
      filtered.sort((a, b) => {
        const timeA = getPostedTime(a);
        const timeB = getPostedTime(b);
        return currentDirection === "asc" ? timeA - timeB : timeB - timeA;
      });
    } else {
      // For other filters, use the standard comparison
      filtered.sort((a, b) => {
        const base = compareTasks(a, b);
        if (currentDirection === "asc") {
          return base;
        }
        return -base;
      });
    }

    renderTaskList(filtered);
  }

  // Event listeners
  searchInput.addEventListener("input", () => {
    applyFiltersAndRender();
  });

  sortSelect.addEventListener("change", () => {
    currentSortKey = sortSelect.value || "emergency";
    applyFiltersAndRender();
  });

  sortToggle.addEventListener("click", () => {
    currentDirection = currentDirection === "asc" ? "desc" : "asc";
    sortToggle.dataset.direction = currentDirection;
    updateToggleIcon();
    applyFiltersAndRender();
  });

  // Initialize: fetch tasks from API and render
  async function initialize() {
    // If we have fallback data, render it immediately for better UX
    if (tasks.length > 0) {
      updateToggleIcon();
      applyFiltersAndRender();
    } else {
      // Show loading state only if no fallback data
      if (listContainer) {
        listContainer.innerHTML = '<p class="text-center text-stone-500 py-4">Loading tasks...</p>';
      }
    }

    // Fetch tasks from API in the background
    const fetchedTasks = await fetchMyTasks();
    
    // Update tasks if API returned data
    if (fetchedTasks.length > 0) {
      tasks = fetchedTasks;
      updateToggleIcon();
      applyFiltersAndRender();
    } else if (tasks.length === 0) {
      // If no tasks from API and no fallback, show empty state
      if (listContainer) {
        listContainer.innerHTML = '<p class="text-center text-stone-500 py-4">No tasks available</p>';
      }
      return;
    }
  }

  // Start initialization
  initialize();
}
