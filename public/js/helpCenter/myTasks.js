// public/js/helpCenter/myTasks.js

const allTasks = Array.isArray(window.__MY_TASKS__) ? window.__MY_TASKS__ : [];

const searchInput = document.querySelector("#my-task-search-input");
const sortSelect = document.querySelector("#my-task-sort-select");
const sortToggle = document.querySelector("#my-task-sort-toggle");
const sortToggleIcon = document.querySelector("#my-task-sort-toggle-icon");
const openContainer = document.querySelector("#my-open-task-items");
const closedContainer = document.querySelector("#my-closed-task-items");

if (
  searchInput &&
  sortSelect &&
  sortToggle &&
  sortToggleIcon &&
  openContainer &&
  closedContainer
) {
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
    debris: 0,
    "temp-repair": 1,
    "animal-care": 2,
    other: 3,
  };

  const STATUS_ORDER = {
    OPEN: 1,
    CLOSED: 0,
  };

  function updateToggleIcon() {
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
    const t = new Date(task.postedAt).getTime();
    return Number.isNaN(t) ? 0 : t;
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
        return getVacancy(a) - getVacancy(b);
      }
      case "category": {
        const groupDiff = getCategoryGroupIndex(a) - getCategoryGroupIndex(b);
        if (groupDiff !== 0) return groupDiff;
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

  function gradientClass(categoryType) {
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

  function statusClass(level) {
    const v = normalizeString(level);
    if (v === "critical") return "bg-rose-100 text-rose-700";
    if (v === "urgent") return "bg-amber-100 text-amber-700";
    return "bg-stone-100 text-stone-700";
  }

  function renderList(target, tasks) {
    const html = tasks
      .map((task) => {
        const gradient = gradientClass(task.categoryType);
        const sClass = statusClass(task.statusLevel);
        const catOrTitle = task.category || task.title || "";
        const href = task.href || `/tasks/${task.id}`;

        return `
          <article
            class="flex items-center justify-between rounded-3xl bg-gradient-to-r px-4 py-4 shadow-sm ${gradient}"
          >
            <div class="flex items-center gap-3">
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 shadow-sm">
                ${
                  task.icon && task.icon.src
                    ? `<img src="${task.icon.src}" alt="${
                        task.icon.alt || ""
                      }" class="h-6 w-6" />`
                    : `<span class="text-base font-semibold text-stone-700">${catOrTitle.charAt(
                        0,
                      )}</span>`
                }
              </div>
              <div class="space-y-1">
                <p class="text-sm font-semibold text-stone-900">
                  &lt;${catOrTitle}&gt;
                </p>
                ${
                  task.statusLabel
                    ? `<span class="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${sClass}">
                         ${task.statusLabel}
                       </span>`
                    : ""
                }
              </div>
            </div>
            <a
              href="${href}"
              class="ml-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-stone-500 shadow-sm transition hover:bg-amber-600 hover:text-white"
              aria-label="View task details"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
                <path fill="currentColor" d="M9.29 6.71a1 1 0 0 0 0 1.42L12.17 11L9.3 13.88a1 1 0 0 0 1.4 1.42l3.99-4a1 1 0 0 0 0-1.4l-4-4a1 1 0 0 0-1.4 0Z" />
              </svg>
            </a>
          </article>
        `;
      })
      .join("");

    target.innerHTML = html;
  }

  function applyFiltersAndRender() {
    const keyword = normalizeString(searchInput.value);

    let filtered = allTasks.filter((task) => {
      if (!keyword) return true;
      const title = normalizeString(task.title);
      const category = normalizeString(task.category);
      return title.includes(keyword) || category.includes(keyword);
    });

    filtered.sort((a, b) => {
      const base = compareTasks(a, b);
      return currentDirection === "asc" ? base : -base;
    });

    const open = filtered.filter(
      (t) => (t.status || "").toUpperCase() === "OPEN",
    );
    const closed = filtered.filter(
      (t) => (t.status || "").toUpperCase() === "CLOSED",
    );

    renderList(openContainer, open);
    renderList(closedContainer, closed);
  }

  searchInput.addEventListener("input", applyFiltersAndRender);

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

  // initial render
  updateToggleIcon();
  applyFiltersAndRender();
}
