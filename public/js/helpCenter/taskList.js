// public/js/helpCenter/taskList.js

import {
  CATEGORY_TYPE_MAP,
  CATEGORY_DISPLAY_MAP,
  getStatusLabel,
  normalizeString,
  compareTasks,
  renderTaskList,
} from "./taskListCommon.js";

// Fallback to window.__TASKS__ if available (for backward compatibility)
let tasks = Array.isArray(window.__TASKS__) ? window.__TASKS__ : [];

const searchInput = document.querySelector("#task-search-input");
const sortSelect = document.querySelector("#task-sort-select");
const sortToggle = document.querySelector("#task-sort-toggle");
const sortToggleIcon = document.querySelector("#task-sort-toggle-icon");
const listContainer = document.querySelector("#task-list-items");

// Transform backend task data to frontend format
function transformTask(backendTask) {
  const categoryType =
    CATEGORY_TYPE_MAP[backendTask.category] || "other";
  const categoryDisplay =
    CATEGORY_DISPLAY_MAP[backendTask.category] || backendTask.category || "";
  const statusLabel = getStatusLabel(backendTask.emergencyLevel);
  const status = backendTask.isOpen ? "OPEN" : "CLOSED";

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
    // Optional fields
    icon: backendTask.icon,
    location: backendTask.location,
    description: backendTask.description,
  };
}

// Fetch tasks from API
async function fetchTasks() {
  try {
    const response = await fetch("/api/tasks", {
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
      throw new Error(`Failed to fetch tasks: ${response.status}`);
    }

    const backendTasks = await response.json();
    if (!Array.isArray(backendTasks)) {
      console.error("Invalid response format: expected array");
      return [];
    }

    return backendTasks.map(transformTask);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    // Return empty array on error, but keep using fallback data if available
    return [];
  }
}

if (searchInput && sortSelect && sortToggle && listContainer) {
  let currentDirection =
    sortToggle.dataset.direction === "asc" ? "asc" : "desc";
  let currentSortKey = sortSelect.value || "emergency";

  function updateToggleIcon() {
    if (!sortToggleIcon) return;
    sortToggleIcon.textContent = currentDirection === "asc" ? "↑" : "↓";
  }

  function applyFiltersAndRender() {
    const keyword = normalizeString(searchInput.value);

    let filtered = tasks.filter((task) => {
      if (!keyword) return true;
      const title = normalizeString(task.title);
      const category = normalizeString(task.category);
      return title.includes(keyword) || category.includes(keyword);
    });

    filtered.sort((a, b) => {
      const base = compareTasks(a, b, currentSortKey);
      if (currentDirection === "asc") {
        return base;
      }
      return -base;
    });

    renderTaskList(filtered, listContainer);
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
    const fetchedTasks = await fetchTasks();
    
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
