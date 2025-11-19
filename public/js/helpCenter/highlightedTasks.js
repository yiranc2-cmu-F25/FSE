// public/js/helpCenter/highlightedTasks.js

// Map backend category values to frontend categoryType
const CATEGORY_TYPE_MAP = {
  debris_removal_and_cleanup: "debris",
  temporary_repair: "temp-repair",
  animal_care: "animal-care",
  others: "other",
};

// Map categoryType to icon paths
const CATEGORY_ICON_MAP = {
  debris: {
    src: "/images/help-tasks/icons/task_category/debrisRemoval_cleanUp.svg",
    alt: "Debris removal icon",
  },
  "temp-repair": {
    src: "/images/help-tasks/icons/task_category/tempRepair.svg",
    alt: "Temporary repair icon",
  },
  "animal-care": {
    src: "/images/help-tasks/icons/task_category/animalCare.svg",
    alt: "Animal care icon",
  },
  other: {
    src: "/images/help-tasks/icons/task_category/otherCategory.svg",
    alt: "Other category icon",
  },
};

// Map categoryType to background image paths
const CATEGORY_BG_MAP = {
  debris: "/images/help-tasks/icons/task_category/task_category_bg/debrisRemovalBG.svg",
  "temp-repair":
    "/images/help-tasks/icons/task_category/task_category_bg/tempRepairBG.svg",
  "animal-care":
    "/images/help-tasks/icons/task_category/task_category_bg/animalCareBG.svg",
  other: "/images/help-tasks/icons/task_category/task_category_bg/otherCategoryBG.svg",
};

// Map emergencyLevel to urgencyLabel (capitalize first letter)
function getUrgencyLabel(emergencyLevel) {
  if (!emergencyLevel) return "";
  return emergencyLevel.charAt(0).toUpperCase() + emergencyLevel.slice(1);
}

// Transform backend task data to highlighted task format
function transformHighlightedTask(backendTask) {
  const categoryType = CATEGORY_TYPE_MAP[backendTask.category] || "other";
  const urgencyLabel = getUrgencyLabel(backendTask.emergencyLevel);
  const icon = CATEGORY_ICON_MAP[categoryType] || CATEGORY_ICON_MAP.other;
  const bgImageUrl = CATEGORY_BG_MAP[categoryType] || CATEGORY_BG_MAP.other;

  return {
    id: backendTask.id || backendTask._id,
    title: backendTask.title || "",
    category: backendTask.category || "",
    categoryType: categoryType,
    statusLabel: urgencyLabel,
    statusLevel: backendTask.emergencyLevel || "standard",
    urgencyLabel: urgencyLabel,
    urgencyLevel: backendTask.emergencyLevel || "standard",
    joinedCount: backendTask.helpersJoined || 0,
    capacity: backendTask.helpers || 0,
    ctaLabel: "Join Now",
    href: `/tasks/${backendTask.id || backendTask._id}`,
    location: backendTask.location || "",
    icon: icon,
    bgImageUrl: bgImageUrl,
  };
}

// Fetch highlighted tasks from API
async function fetchHighlightedTasks() {
  try {
    const response = await fetch("/api/tasks?isOpen=true&sortBy=createdAt&sortOrder=desc&limit=5", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error("Unauthorized: Please log in");
        return [];
      }
      throw new Error(`Failed to fetch highlighted tasks: ${response.status}`);
    }

    const backendTasks = await response.json();
    if (!Array.isArray(backendTasks)) {
      console.error("Invalid response format: expected array");
      return [];
    }

    // Filter for tasks with vacancies and transform
    return backendTasks
      .filter((task) => {
        const capacity = task.helpers || 0;
        const joined = task.helpersJoined || 0;
        return joined < capacity;
      })
      .slice(0, 5)
      .map(transformHighlightedTask);
  } catch (error) {
    console.error("Error fetching highlighted tasks:", error);
    return [];
  }
}

// Render highlighted tasks
function renderHighlightedTasks(tasks, section) {
  const container = document.querySelector("#highlighted-tasks-container");
  if (!container) return;

  if (tasks.length === 0) {
    container.innerHTML = '<p class="text-stone-600">All tasks are fully joined. Nice work everyone!</p>';
    return;
  }

  const html = `
    <div class="-mx-6 mt-2 overflow-x-auto pb-3">
      <div class="flex gap-4 px-6">
        ${tasks
          .map((task) => {
            const urgencyClass =
              task.urgencyLevel === "critical"
                ? "bg-rose-100 text-rose-700"
                : task.urgencyLevel === "urgent"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-stone-100 text-stone-700";

            return `
            <article
              class="min-w-[260px] max-w-xs flex-1 rounded-3xl bg-gradient-to-br from-stone-50 to-stone-100 bg-cover p-4 shadow-sm highlighted-task-card"
              style="background-image: url('${task.bgImageUrl}');"
              data-task-id="${task.id}"
            >
              <!-- Top row: icon + title -->
              <div class="flex items-center gap-3">
                <div
                  class="flex h-16 w-20 items-center justify-center rounded-2xl bg-cover bg-center"
                >
                  ${
                    task.icon && task.icon.src
                      ? `<img
                          src="${task.icon.src}"
                          alt="${task.icon.alt || ""}"
                          class="h-12 w-12 pb-2"
                        />`
                      : `<span class="text-lg font-semibold text-white">
                          ${(task.title || "").charAt(0)}
                        </span>`
                  }
                </div>

                <div class="space-y-1">
                  <p class="text-sm font-semibold leading-snug text-stone-900">
                    ${task.title}
                  </p>
                  ${
                    task.location
                      ? `<p class="text-xs leading-tight text-stone-500">
                          ${task.location}
                        </p>`
                      : ""
                  }
                </div>
              </div>

              <!-- Meta row: joined + urgency -->
              <div class="mt-2 flex items-center justify-between text-[11px]">
                <div class="flex items-center gap-2 text-stone-600">
                  <span
                    class="inline-flex h-4 w-4 items-center justify-center"
                    aria-hidden="true"
                  >
                    ${
                      task.joinedCount === task.capacity
                        ? `<img
                            src="/images/help-tasks/icons/task_category/task_join_status/task_join_filled.svg"
                            alt="task_joined_filled"
                          />`
                        : `<img
                            src="/images/help-tasks/icons/task_category/task_join_status/task_join_unfilled.svg"
                            alt="task_joined_unfilled"
                          />`
                    }
                  </span>
                  <span>
                    ${task.joinedCount} / ${task.capacity} ${section?.joinedLabel || "joined"}
                  </span>
                </div>

                ${
                  task.urgencyLabel
                    ? `<span
                        class="rounded-full px-3 py-1 text-[10px] font-semibold ${urgencyClass}"
                      >
                        ${task.urgencyLabel}
                      </span>`
                    : ""
                }
              </div>

              <!-- CTA -->
              <button
                type="button"
                class="hover:bg-brand-primary mt-2 inline-flex w-full items-center justify-center rounded-2xl bg-stone-900/5 px-4 py-2.5 text-sm font-semibold text-amber-800 shadow-sm transition duration-75 hover:text-white highlighted-task-cta"
                data-task-id="${task.id}"
              >
                ${task.ctaLabel}
              </button>
            </article>
          `;
          })
          .join("")}
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Attach click handlers to task cards and CTAs
  document.querySelectorAll(".highlighted-task-card, .highlighted-task-cta").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const taskId = el.dataset.taskId;
      if (taskId && window.TaskDetailModal) {
        window.TaskDetailModal.open({ id: taskId });
      }
    });
  });
}

// Initialize highlighted tasks
async function initializeHighlightedTasks() {
  const section = window.__HIGHLIGHT_SECTION__ || {};
  const fallbackTasks = Array.isArray(window.__HIGHLIGHTED_TASKS__)
    ? window.__HIGHLIGHTED_TASKS__
    : [];

  // If we have fallback data, render it immediately
  if (fallbackTasks.length > 0) {
    renderHighlightedTasks(fallbackTasks, section);
  }

  // Fetch from API and update
  const fetchedTasks = await fetchHighlightedTasks();
  if (fetchedTasks.length > 0) {
    renderHighlightedTasks(fetchedTasks, section);
  } else if (fallbackTasks.length === 0) {
    // Show empty state if no tasks
    const container = document.querySelector("#highlighted-tasks-container");
    if (container) {
      container.innerHTML =
        '<p class="text-stone-600">All tasks are fully joined. Nice work everyone!</p>';
    }
  }
}

// Export for use in other scripts
window.HighlightedTasks = {
  fetch: fetchHighlightedTasks,
  render: renderHighlightedTasks,
  initialize: initializeHighlightedTasks,
};

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeHighlightedTasks);
} else {
  initializeHighlightedTasks();
}

