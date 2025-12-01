// Map backend category values to frontend categoryType
export const CATEGORY_TYPE_MAP = {
  debris_removal_and_cleanup: "debris",
  temporary_repair: "temp-repair",
  animal_care: "animal-care",
  others: "other",
};

// Map backend category enum to display name
export const CATEGORY_DISPLAY_MAP = {
  debris_removal_and_cleanup: "Debris Removal",
  temporary_repair: "Temp Repair",
  animal_care: "Animal Care",
  others: "Others",
};

// Map emergencyLevel to statusLabel (capitalize first letter)
export function getStatusLabel(emergencyLevel) {
  if (!emergencyLevel) return "";
  return emergencyLevel.charAt(0).toUpperCase() + emergencyLevel.slice(1);
}

export const EMERGENCY_ORDER = {
  critical: 3,
  urgent: 2,
  standard: 1,
  scheduled: 0,
};

export const CATEGORY_GROUP_ORDER = {
  debris: 0, // Debris Removal & Cleanup
  "temp-repair": 1, // Temporary Repair Assistance
  "animal-care": 2, // Animal Care Assistance
  other: 3,
};

export const STATUS_ORDER = {
  OPEN: 1,
  CLOSED: 0,
};

export function normalizeString(value) {
  return (value || "").toString().trim().toLowerCase();
}

export function getVacancy(task) {
  const capacity = Number(task.capacity ?? 0);
  const joined = Number(task.joinedCount ?? 0);
  return capacity - joined;
}

export function getPostedTime(task) {
  if (!task.postedAt) return 0;
  const time = new Date(task.postedAt).getTime();
  return isNaN(time) ? 0 : time;
}

export function getCategoryGroupIndex(task) {
  const type = task.categoryType || "other";
  return CATEGORY_GROUP_ORDER[type] ?? CATEGORY_GROUP_ORDER.other;
}

export function compareTasks(a, b, currentSortKey) {
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

export function getGradientClass(categoryType) {
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

export function getStatusClass(statusLevel) {
  const level = normalizeString(statusLevel);
  if (level === "critical") return "bg-rose-100 text-rose-700";
  if (level === "urgent") return "bg-amber-100 text-amber-700";
  return "bg-stone-100 text-stone-700";
}

export function getCategoryIconPath(categoryType) {
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

export function getStatusTagClass(status) {
  const normalizedStatus = (status || "").toUpperCase();
  if (normalizedStatus === "OPEN") {
    return "bg-emerald-100 text-emerald-700";
  } else if (normalizedStatus === "CLOSED") {
    return "bg-stone-200 text-stone-600";
  }
  return "bg-stone-100 text-stone-700";
}

export function renderTaskList(items, listContainer) {
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

