
import { formatDate } from "./taskModalUtils.js";

/**
 * Update the title in the modal
 */
export function populateTitle(detailPanel, task) {
  const titleEl = detailPanel.querySelector("h2");
  if (titleEl) {
    titleEl.textContent = task.title || "";
    console.log("[populateTitle] Updated title:", task.title);
  } else {
    console.warn("[populateTitle] Title element not found");
  }
}

/**
 * Update status labels and category icon
 */
export function populateStatus(detailPanel, task) {
  const statusContainer = detailPanel.querySelector(".mb-3");
  if (!statusContainer) {
    console.warn("[populateStatus] Status container not found");
    return;
  }

  // Update emergency level tag (first rounded-full)
  const statusLabelEl = statusContainer.querySelector(".rounded-full");
  if (statusLabelEl) {
    statusLabelEl.textContent = task.statusLabel || task.emergencyLevel || "";
    // Update status class based on level
    statusLabelEl.className = "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ";
    if (task.emergencyLevel === "critical") {
      statusLabelEl.className += "bg-rose-100 text-rose-600";
    } else if (task.emergencyLevel === "urgent") {
      statusLabelEl.className += "bg-amber-100 text-amber-600";
    } else {
      statusLabelEl.className += "bg-stone-100 text-stone-600";
    }
    console.log("[populateStatus] Updated emergency level tag:", task.statusLabel);
  }
  
  // Update status tag (OPEN/CLOSED) - second rounded-full
  const statusTags = statusContainer.querySelectorAll(".rounded-full");
  if (statusTags.length >= 2) {
    const statusTag = statusTags[1];
    const status = task.status || (task.isOpen !== false ? "OPEN" : "CLOSED");
    statusTag.textContent = status;
    statusTag.className = "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ";
    if (status === "OPEN") {
      statusTag.className += "bg-emerald-100 text-emerald-700";
    } else {
      statusTag.className += "bg-stone-200 text-stone-600";
    }
    console.log("[populateStatus] Updated status tag:", status);
  }
  
  // Update category icon
  const categoryIcon = statusContainer.querySelector("#task-category-icon");
  if (categoryIcon) {
    const categoryIconMap = {
      debris_removal_and_cleanup: "/images/help-tasks/icons/task_category/debrisRemoval_cleanUp.svg",
      temporary_repair: "/images/help-tasks/icons/task_category/tempRepair.svg",
      animal_care: "/images/help-tasks/icons/task_category/animalCare.svg",
      others: "/images/help-tasks/icons/task_category/otherCategory.svg",
    };
    const iconPath = categoryIconMap[task.category] || categoryIconMap.others;
    categoryIcon.src = iconPath;
    categoryIcon.alt = task.category || "Task category";
    console.log("[populateStatus] Updated category icon:", iconPath);
  }
}

/**
 * Update a field by finding its dt element
 */
function updateField(detailPanel, label, value) {
  const dt = Array.from(detailPanel.querySelectorAll("dt")).find(
    (dt) => dt.textContent.trim() === label,
  );
  if (dt) {
    const dd = dt.nextElementSibling;
    if (dd) {
      dd.textContent = value;
      return true;
    }
  }
  return false;
}

/**
 * Update location field
 */
export function populateLocation(detailPanel, task) {
  if (updateField(detailPanel, "Location:", task.location || "Not specified")) {
    console.log("[populateLocation] Updated location:", task.location);
  } else {
    console.warn("[populateLocation] Location field not found");
  }
}

/**
 * Update post time field
 */
export function populatePostTime(detailPanel, task) {
  const formattedDate = formatDate(task.postTime);
  if (updateField(detailPanel, "Post Time:", formattedDate || "Not specified")) {
    console.log("[populatePostTime] Updated post time:", formattedDate, "from:", task.postTime);
  } else {
    console.warn("[populatePostTime] Post time field not found");
  }
}

/**
 * Update due date field
 */
export function populateDueDate(detailPanel, task) {
  const formattedDate = task.dueDate ? formatDate(task.dueDate) : "Not specified";
  if (updateField(detailPanel, "Due Date:", formattedDate)) {
    console.log("[populateDueDate] Updated due date:", formattedDate, "from:", task.dueDate);
  } else {
    console.warn("[populateDueDate] Due date field not found");
  }
}

/**
 * Update publisher field
 */
export function populatePublisher(detailPanel, task) {
  const publisherName = task.creator?.username || "Unknown";
  if (updateField(detailPanel, "Publisher:", publisherName)) {
    console.log("[populatePublisher] Updated publisher:", publisherName);
  } else {
    console.warn("[populatePublisher] Publisher field not found");
  }
}

/**
 * Update helpers section
 */
export function populateHelpers(detailPanel, task) {
  const helpersDt = Array.from(detailPanel.querySelectorAll("dt")).find(
    (dt) => dt.textContent.trim() === "Helpers:",
  );
  if (!helpersDt) {
    console.warn("[populateHelpers] Helpers dt element not found");
    return;
  }

  const helpersDd = helpersDt.nextElementSibling;
  if (!helpersDd) {
    console.warn("[populateHelpers] Helpers dd element not found");
    return;
  }

  const ratioPill = helpersDd.querySelector(".helpers-ratio-pill");
  const progressBar = helpersDd.querySelector(".helpers-progress-bar");
  const avatarsContainer = helpersDd.querySelector(".helpers-avatars");
  const helperNamesList = helpersDd.querySelector(".helper-names-list");

  if (ratioPill) {
    const joined = task.helpersJoined || 0;
    const capacity = task.helpersCapacity || 0;
    ratioPill.textContent = `${joined} / ${capacity}`;
    console.log("[populateHelpers] Updated helpers ratio:", `${joined} / ${capacity}`);
  } else {
    console.warn("[populateHelpers] Helpers ratio pill not found");
  }

  if (progressBar && task.helpersCapacity > 0) {
    const percentage = (100 * (task.helpersJoined || 0)) / task.helpersCapacity;
    progressBar.style.width = `${percentage}%`;
    console.log("[populateHelpers] Updated progress bar:", `${percentage}%`);
  } else if (!progressBar) {
    console.warn("[populateHelpers] Progress bar not found");
  }

  // Update avatars
  if (avatarsContainer) {
    avatarsContainer.innerHTML = "";
    (task.helperAvatars || []).slice(0, 5).forEach((h) => {
      const span = document.createElement("span");
      span.className =
        "relative -ml-2 flex h-7 w-7 items-center justify-center rounded-full border border-white text-[9px] font-semibold text-white shadow-sm";
      span.style.backgroundColor = h.color || "#f97316";
      span.textContent = h.initials || "";
      avatarsContainer.appendChild(span);
    });
  }

  // Update helper names list
  if (helperNamesList) {
    const names = Array.isArray(task.participantNames)
      ? task.participantNames
      : [];

    if (names.length > 0) {
      helperNamesList.innerHTML = names
        .map(
          (name, index) => `
            <div class="flex items-center gap-2">
              <span class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-[10px] font-semibold text-amber-700">
                ${index + 1}
              </span>
              <span class="text-[11px] text-stone-700">${name}</span>
            </div>
          `,
        )
        .join("");
    } else {
      helperNamesList.innerHTML =
        '<p class="text-[11px] text-stone-500">No helpers yet.</p>';
    }
  } else {
    console.warn("[populateHelpers] Helper names list not found");
  }
}

/**
 * Update description section
 */
export function populateDescription(detailPanel, task) {
  const descSection = Array.from(detailPanel.querySelectorAll("section")).find((section) => {
    const h3 = section.querySelector("h3");
    return h3 && h3.textContent.trim() === "Description";
  });
  if (descSection) {
    const descP = descSection.querySelector("p");
    if (descP) {
      descP.textContent = task.description || "";
      console.log("[populateDescription] Updated description:", task.description?.substring(0, 50) + "...");
    } else {
      console.warn("[populateDescription] Description paragraph not found");
    }
  } else {
    console.warn("[populateDescription] Description section not found");
  }
}

/**
 * Update task logs section
 */
export function populateTaskLogs(detailPanel, task) {
  const logsSection = Array.from(detailPanel.querySelectorAll("section")).find((section) => {
    const h3 = section.querySelector("h3");
    return h3 && h3.textContent.trim() === "Task Logs";
  });
  if (logsSection) {
    const logsContainer = logsSection.querySelector(".space-y-2");
    if (logsContainer) {
      if (task.taskLogs && task.taskLogs.length > 0) {
        logsContainer.innerHTML = task.taskLogs
          .map(
            (log) => `
          <div class="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3">
            <p class="text-[11px] text-stone-500">${formatDate(log.timestamp)}</p>
            <p class="text-[11px] leading-snug text-stone-700">${log.summary || ""}</p>
          </div>
        `,
          )
          .join("");
      } else {
        logsContainer.innerHTML = '<p class="text-[11px] text-stone-500">No logs yet.</p>';
      }
    }
  }
}

/**
 * Update resources needed section
 */
export function populateResources(detailPanel, task) {
  const resourcesSection = Array.from(detailPanel.querySelectorAll("section")).find((section) => {
    const h3 = section.querySelector("h3");
    return h3 && h3.textContent.trim() === "Resource Needed";
  });
  if (resourcesSection) {
    const resourcesContainer = resourcesSection.querySelector(".space-y-1");
    if (resourcesContainer) {
      console.log("[populateResources] Resources needed:", task.resourcesNeeded);
      if (task.resourcesNeeded && Array.isArray(task.resourcesNeeded) && task.resourcesNeeded.length > 0) {
        resourcesContainer.innerHTML = task.resourcesNeeded
          .map(
            (r) => `
          <label class="flex items-start gap-2 text-[11px]">
            <input
              type="checkbox"
              disabled
              ${r.isFulfilled ? "checked" : ""}
              class="mt-[2px] h-3.5 w-3.5 rounded border-stone-300 text-amber-500 focus:ring-0"
            />
            <span class="${r.isFulfilled ? "text-stone-500 line-through" : ""}">
              ${r.label || ""}
            </span>
          </label>
        `,
          )
          .join("");
        console.log("[populateResources] Updated resources, count:", task.resourcesNeeded.length);
      } else {
        resourcesContainer.innerHTML =
          '<p class="text-[11px] text-stone-500">No resources needed.</p>';
        console.log("[populateResources] No resources needed");
      }
    } else {
      console.warn("[populateResources] Resources container not found");
    }
  } else {
    console.warn("[populateResources] Resources section not found");
  }
}

/**
 * Update skills required section
 */
export function populateSkills(detailPanel, task) {
  const skillsSection = Array.from(detailPanel.querySelectorAll("section")).find((section) => {
    const h3 = section.querySelector("h3");
    return h3 && h3.textContent.trim() === "Skills Required";
  });
  if (skillsSection) {
    const skillsList = skillsSection.querySelector("ul");
    if (skillsList) {
      console.log("[populateSkills] Skills required:", task.skillsRequired);
      if (task.skillsRequired && Array.isArray(task.skillsRequired) && task.skillsRequired.length > 0) {
        skillsList.innerHTML = task.skillsRequired
          .map(
            (s) => `
          <li class="flex items-start gap-2 text-[11px]">
            <span class="mt-[3px] h-1 w-1 rounded-full bg-amber-400"></span>
            <span>${s}</span>
          </li>
        `,
          )
          .join("");
        console.log("[populateSkills] Updated skills, count:", task.skillsRequired.length);
      } else {
        skillsList.innerHTML = '<li class="text-[11px] text-stone-500">No specific skills required.</li>';
        console.log("[populateSkills] No skills required");
      }
    } else {
      console.warn("[populateSkills] Skills list not found");
    }
  } else {
    console.warn("[populateSkills] Skills section not found");
  }
}

/**
 * Update panel titles (join/quit panels)
 */
export function populatePanelTitles(joinPanel, quitPanel, task) {
  // Update join panel task title
  if (joinPanel) {
    const joinPanelTitle = joinPanel.querySelector("span.font-semibold");
    if (joinPanelTitle) {
      joinPanelTitle.textContent = task.title || "";
      console.log("[populatePanelTitles] Updated join panel title:", task.title);
    } else {
      console.warn("[populatePanelTitles] Join panel title span not found");
    }
  }

  // Update quit panel task title
  if (quitPanel) {
    const quitPanelTitle = quitPanel.querySelector("span.font-semibold");
    if (quitPanelTitle) {
      quitPanelTitle.textContent = task.title || "";
      console.log("[populatePanelTitles] Updated quit panel title:", task.title);
    } else {
      console.warn("[populatePanelTitles] Quit panel title span not found");
    }
  }
}

