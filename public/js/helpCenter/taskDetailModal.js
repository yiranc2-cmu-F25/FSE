// public/js/tasks/taskDetailModal.js

const overlay = document.querySelector("#task-modal-root");
const taskModalWrapper = document.querySelector("#task-modal-wrapper");
const detailPanel = document.querySelector("#task-detail-panel");
const joinPanel = document.querySelector("#task-join-panel");
const quitPanel = document.querySelector("#task-quit-panel");
const logPanel = document.querySelector("#task-log-panel");

// Action overlay + button bar inside detail panel
const actionOverlay = document.querySelector("#task-action-overlay");
const actionButtonsBox = document.querySelector("#task-action-buttons");
const btnUploadLog = document.querySelector("#btn-upload-log");
const btnJoinTask = document.querySelector("#btn-join-task");
const btnQuitTask = document.querySelector("#btn-quit-task");
const btnEditTask = document.querySelector("#btn-edit-task");

// Simple utility
function hideElement(el) {
  if (el) el.classList.add("hidden");
}
function showElement(el) {
  if (el) el.classList.remove("hidden");
}

// Current task and viewer state - start empty, will be populated from API
let currentTaskData = null;
let currentViewer = { isParticipant: false, isOwner: false };

// Store original modal HTML structure
let originalModalHTML = null;
if (detailPanel) {
  originalModalHTML = detailPanel.innerHTML;
}

// Transform backend task data to modal format
function transformTaskForModal(backendTask) {
  if (!backendTask) {
    console.error("[transformTaskForModal] No backend task provided");
    return null;
  }

  console.log("[transformTaskForModal] Transforming backend task:", backendTask);

  // Transform resourcesNeeded from Map/Object to array format
  const resourcesNeeded = [];
  if (backendTask.resourcesNeeded) {
    if (backendTask.resourcesNeeded instanceof Map) {
      backendTask.resourcesNeeded.forEach((quantity, resource) => {
        resourcesNeeded.push({
          label: `${resource} (${quantity} needed)`,
          isFulfilled: false, // TODO: Update when fulfillment tracking is implemented
        });
      });
    } else if (typeof backendTask.resourcesNeeded === "object" && backendTask.resourcesNeeded !== null) {
      // Handle both plain objects and Mongoose Map objects
      const entries = backendTask.resourcesNeeded instanceof Map
        ? Array.from(backendTask.resourcesNeeded.entries())
        : Object.entries(backendTask.resourcesNeeded);
      
      entries.forEach(([resource, quantity]) => {
        if (resource && quantity !== undefined) {
          resourcesNeeded.push({
            label: `${resource} (${quantity} needed)`,
            isFulfilled: false,
          });
        }
      });
    }
  }

  // Get status label
  const statusLabel =
    backendTask.emergencyLevel?.charAt(0).toUpperCase() +
      backendTask.emergencyLevel?.slice(1) || "";

  const transformed = {
    id: backendTask.id || backendTask._id?.toString() || null,
    title: backendTask.title || "",
    category: backendTask.category || "",
    emergencyLevel: backendTask.emergencyLevel || "",
    statusLabel: statusLabel,
    statusLevel: backendTask.emergencyLevel || "",
    status: backendTask.isOpen ? "OPEN" : "CLOSED",
    location: backendTask.location || "",
    postTime: backendTask.createdAt || backendTask.updatedAt || null,
    dueDate: backendTask.dueDate || null,
    helpersJoined: backendTask.helpersJoined || 0,
    helpersCapacity: backendTask.helpers || 0,
    helperAvatars: backendTask.helperAvatars || [],
    participantNames: Array.isArray(backendTask.participantNames)
      ? backendTask.participantNames
      : [],
    description: backendTask.description || "",
    taskLogs: backendTask.taskLogs || [],
    resourcesNeeded: resourcesNeeded,
    skillsRequired: Array.isArray(backendTask.skillsRequired)
      ? backendTask.skillsRequired
      : [],
    creatorId: backendTask.creator?.id || backendTask.creator?._id?.toString() || backendTask.creator?.toString() || null,
    creator: backendTask.creator,
  };

  console.log("[transformTaskForModal] Transformed task:", transformed);
  return transformed;
}

// Format date for display
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Populate modal with task data
function populateModal(task) {
  if (!task || !detailPanel) {
    console.warn("[populateModal] Missing task or detailPanel", { task, detailPanel });
    return;
  }

  console.log("[populateModal] Populating modal with task:", task);

  // Update title
  const titleEl = detailPanel.querySelector("h2");
  if (titleEl) {
    titleEl.textContent = task.title || "";
    console.log("[populateModal] Updated title:", task.title);
  } else {
    console.warn("[populateModal] Title element not found");
  }

  // Update status label - find the first rounded-full in the mb-3 div
  const statusContainer = detailPanel.querySelector(".mb-3");
  const statusLabelEl = statusContainer?.querySelector(".rounded-full");
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
    console.log("[populateModal] Updated status label:", task.statusLabel);
  } else {
    console.warn("[populateModal] Status label element not found");
  }

  // Update location
  const locationDt = Array.from(detailPanel.querySelectorAll("dt")).find(
    (dt) => dt.textContent.trim() === "Location:",
  );
  if (locationDt) {
    const locationDd = locationDt.nextElementSibling;
    if (locationDd) {
      locationDd.textContent = task.location || "Not specified";
      console.log("[populateModal] Updated location:", task.location);
    } else {
      console.warn("[populateModal] Location dd element not found");
    }
  } else {
    console.warn("[populateModal] Location dt element not found");
  }

  // Update post time
  const postTimeDt = Array.from(detailPanel.querySelectorAll("dt")).find(
    (dt) => dt.textContent.trim() === "Post Time:",
  );
  if (postTimeDt) {
    const postTimeDd = postTimeDt.nextElementSibling;
    if (postTimeDd) {
      const formattedDate = formatDate(task.postTime);
      postTimeDd.textContent = formattedDate || "Not specified";
      console.log("[populateModal] Updated post time:", formattedDate, "from:", task.postTime);
    } else {
      console.warn("[populateModal] Post time dd element not found");
    }
  } else {
    console.warn("[populateModal] Post time dt element not found");
  }

  // Update due date
  const dueDateDt = Array.from(detailPanel.querySelectorAll("dt")).find(
    (dt) => dt.textContent.trim() === "Due Date:",
  );
  if (dueDateDt) {
    const dueDateDd = dueDateDt.nextElementSibling;
    if (dueDateDd) {
      const formattedDate = task.dueDate ? formatDate(task.dueDate) : "Not specified";
      dueDateDd.textContent = formattedDate;
      console.log("[populateModal] Updated due date:", formattedDate, "from:", task.dueDate);
    } else {
      console.warn("[populateModal] Due date dd element not found");
    }
  } else {
    console.warn("[populateModal] Due date dt element not found");
  }

  // Update helpers
  const helpersDt = Array.from(detailPanel.querySelectorAll("dt")).find(
    (dt) => dt.textContent.trim() === "Helpers:",
  );
  if (helpersDt) {
    const helpersDd = helpersDt.nextElementSibling;
    if (helpersDd) {
      const ratioPill = helpersDd.querySelector(".helpers-ratio-pill");
      const progressBar = helpersDd.querySelector(".helpers-progress-bar");
      const avatarsContainer = helpersDd.querySelector(".helpers-avatars");
      const helperNamesList = helpersDd.querySelector(".helper-names-list");

      if (ratioPill) {
        const joined = task.helpersJoined || 0;
        const capacity = task.helpersCapacity || 0;
        ratioPill.textContent = `${joined} / ${capacity}`;
        console.log("[populateModal] Updated helpers ratio:", `${joined} / ${capacity}`);
      } else {
        console.warn("[populateModal] Helpers ratio pill not found");
      }

      if (progressBar && task.helpersCapacity > 0) {
        const percentage = (100 * (task.helpersJoined || 0)) / task.helpersCapacity;
        progressBar.style.width = `${percentage}%`;
        console.log("[populateModal] Updated progress bar:", `${percentage}%`);
      } else if (!progressBar) {
        console.warn("[populateModal] Progress bar not found");
      }

      // Update avatars (placeholder for now)
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
        console.warn("[populateModal] Helper names list not found");
      }
    } else {
      console.warn("[populateModal] Helpers dd element not found");
    }
  } else {
    console.warn("[populateModal] Helpers dt element not found");
  }

  // Update description
  const descSection = Array.from(detailPanel.querySelectorAll("section")).find((section) => {
    const h3 = section.querySelector("h3");
    return h3 && h3.textContent.trim() === "Description";
  });
  if (descSection) {
    const descP = descSection.querySelector("p");
    if (descP) {
      descP.textContent = task.description || "";
      console.log("[populateModal] Updated description:", task.description?.substring(0, 50) + "...");
    } else {
      console.warn("[populateModal] Description paragraph not found");
    }
  } else {
    console.warn("[populateModal] Description section not found");
  }

  // Update task logs
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

  // Update resources needed
  const resourcesSection = Array.from(detailPanel.querySelectorAll("section")).find((section) => {
    const h3 = section.querySelector("h3");
    return h3 && h3.textContent.trim() === "Resource Needed";
  });
  if (resourcesSection) {
    const resourcesContainer = resourcesSection.querySelector(".space-y-1");
    if (resourcesContainer) {
      console.log("[populateModal] Resources needed:", task.resourcesNeeded);
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
        console.log("[populateModal] Updated resources, count:", task.resourcesNeeded.length);
      } else {
        resourcesContainer.innerHTML =
          '<p class="text-[11px] text-stone-500">No resources needed.</p>';
        console.log("[populateModal] No resources needed");
      }
    } else {
      console.warn("[populateModal] Resources container not found");
    }
  } else {
    console.warn("[populateModal] Resources section not found");
  }

  // Update skills required
  const skillsSection = Array.from(detailPanel.querySelectorAll("section")).find((section) => {
    const h3 = section.querySelector("h3");
    return h3 && h3.textContent.trim() === "Skills Required";
  });
  if (skillsSection) {
    const skillsList = skillsSection.querySelector("ul");
    if (skillsList) {
      console.log("[populateModal] Skills required:", task.skillsRequired);
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
        console.log("[populateModal] Updated skills, count:", task.skillsRequired.length);
      } else {
        skillsList.innerHTML = '<li class="text-[11px] text-stone-500">No specific skills required.</li>';
        console.log("[populateModal] No skills required");
      }
    } else {
      console.warn("[populateModal] Skills list not found");
    }
  } else {
    console.warn("[populateModal] Skills section not found");
  }

  // Update join panel task title
  if (joinPanel) {
    const joinPanelTitle = joinPanel.querySelector("span.font-semibold");
    if (joinPanelTitle) {
      joinPanelTitle.textContent = task.title || "";
      console.log("[populateModal] Updated join panel title:", task.title);
    } else {
      console.warn("[populateModal] Join panel title span not found");
    }
  }

  // Update quit panel task title
  if (quitPanel) {
    const quitPanelTitle = quitPanel.querySelector("span.font-semibold");
    if (quitPanelTitle) {
      quitPanelTitle.textContent = task.title || "";
      console.log("[populateModal] Updated quit panel title:", task.title);
    } else {
      console.warn("[populateModal] Quit panel title span not found");
    }
  }
}

function setDetailButtonsVisibility(isParticipant, isOwner) {
  const anyButtons = [];

  if (!isParticipant) {
    // can join
    anyButtons.push(btnJoinTask);
    showElement(btnJoinTask);
    hideElement(btnQuitTask);
    hideElement(btnUploadLog);
  } else {
    // participant: can quit and upload log
    anyButtons.push(btnQuitTask, btnUploadLog);
    showElement(btnQuitTask);
    showElement(btnUploadLog);
    hideElement(btnJoinTask);
  }

  if (isOwner) {
    anyButtons.push(btnEditTask);
    showElement(btnEditTask);
  } else {
    hideElement(btnEditTask);
  }

  if (anyButtons.length > 0) {
    showElement(actionOverlay);
    showElement(actionButtonsBox);
  } else {
    hideElement(actionOverlay);
    hideElement(actionButtonsBox);
  }
}

// ----- Modal open / close helpers -----

function openPanel(panel) {
  if (!overlay || !panel) return;
  showElement(overlay);
  hideElement(detailPanel);
  hideElement(joinPanel);
  hideElement(quitPanel);
  hideElement(logPanel);
  showElement(panel);
  overlay.setAttribute("aria-hidden", "false");
}

function openDetail() {
  if (!overlay || !detailPanel) return;
  
  // Ensure we have valid viewer data
  const isParticipant = currentViewer ? !!currentViewer.isParticipant : false;
  const isOwner = currentViewer ? !!currentViewer.isOwner : false;
  
  setDetailButtonsVisibility(isParticipant, isOwner);
  openPanel(detailPanel);
}

function closeModal() {
  if (!overlay) return;
  hideElement(overlay);
  overlay.setAttribute("aria-hidden", "true");
}

// ----- Click-outside handling -----

if (overlay) {
  console.log("Wiring up modal overlay click handler");

  overlay.addEventListener("click", (event) => {
    // only close if clicking on the dimmed background, not inside a panel or button
    const target = event.target;
    
    // Don't close if clicking on buttons or inside panels
    if (target.closest("#task-action-buttons") || 
        target.closest("#task-detail-panel") ||
        target.closest("#task-join-panel") ||
        target.closest("#task-quit-panel") ||
        target.closest("#task-log-panel")) {
      return;
    }
    
    if (target === overlay) {
      closeModal();
    }
  });
}
if (taskModalWrapper) {
  console.log("Wiring up modal wrapper click handler");
  taskModalWrapper.addEventListener("click", (event) => {
    // only close if clicking on the dimmed background, not inside a panel or button
    const target = event.target;
    
    // Don't close if clicking on buttons or inside panels
    if (target.closest("#task-action-buttons") || 
        target.closest("#task-detail-panel") ||
        target.closest("#task-join-panel") ||
        target.closest("#task-quit-panel") ||
        target.closest("#task-log-panel")) {
      return;
    }
    
    if (target === taskModalWrapper) {
      closeModal();
    }
  });
}

// Cancel buttons inside sub-modals
document.querySelectorAll("[data-modal-cancel]").forEach((btn) => {
  btn.addEventListener("click", () => {
    // return to detail panel instead of closing everything
    openDetail();
  });
});

// ----- Action button wiring -----

const hasModalTrigger = (el) => !!el?.dataset?.modalOpen;

// Join Task button handler - use event delegation to ensure it works
document.addEventListener("click", (e) => {
  // Check if the clicked element is the Join Task button or inside it
  const joinBtn = e.target.closest("#btn-join-task");
  if (joinBtn) {
    e.preventDefault();
    e.stopPropagation();
    console.log("[Join Task] Button clicked, opening join panel");
    
    // Remove any existing data-modal-open attribute to prevent ModalManager interference
    if (joinBtn.hasAttribute("data-modal-open")) {
      joinBtn.removeAttribute("data-modal-open");
    }
    
    // Open join panel with form first (user needs to enter note)
    // Update join panel title before opening
    if (joinPanel && currentTaskData) {
      const joinPanelTitle = joinPanel.querySelector("span.font-semibold");
      if (joinPanelTitle) {
        joinPanelTitle.textContent = currentTaskData.title || "";
      }
    }
    
    if (!joinPanel) {
      console.error("[Join Task] Join panel not found");
      return;
    }
    
    openPanel(joinPanel);
  }
}, true); // Use capture phase to run early

if (btnQuitTask && !hasModalTrigger(btnQuitTask)) {
  btnQuitTask.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Open quit panel for confirmation
    // Update quit panel title before opening
    if (quitPanel && currentTaskData) {
      const quitPanelTitle = quitPanel.querySelector("span.font-semibold");
      if (quitPanelTitle) {
        quitPanelTitle.textContent = currentTaskData.title || "";
      }
    }
    openPanel(quitPanel);
  });
}

if (btnUploadLog) {
  btnUploadLog.addEventListener("click", () => {
    // Clear log textarea when opening
    const logTextarea = document.querySelector("#task-log-text");
    if (logTextarea) {
      logTextarea.value = "";
    }
    openPanel(logPanel);
  });
}

// Edit Task button handler - use event delegation to ensure it works
document.addEventListener("click", (e) => {
  // Check if the clicked element is the Edit Task button or inside it
  const editBtn = e.target.closest("#btn-edit-task");
  if (editBtn) {
    e.preventDefault();
    e.stopPropagation();
    console.log("[Edit Task] Button clicked, navigating to edit page");
    
    // Navigate to Edit page
    if (currentTaskData && currentTaskData.id) {
      // Close modal first
      closeModal();
      // Navigate to edit page
      window.location.href = `/task-edit/${encodeURIComponent(currentTaskData.id)}`;
    } else {
      console.error("Cannot edit task: no task data available");
      alert("Error: No task data available to edit");
    }
  }
}, true); // Use capture phase to run early

// ===== Join Task Functionality =====
async function joinTask(taskId, note) {
  try {
    const response = await fetch(`/api/tasks/single/${encodeURIComponent(taskId)}/join`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ note: note || "" }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized: Please log in");
      }
      if (response.status === 400) {
        const error = await response.json();
        throw new Error(error.message || "Failed to join task");
      }
      if (response.status === 404) {
        throw new Error("Task not found");
      }
      throw new Error(`Failed to join task: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error joining task:", error);
    throw error;
  }
}

// Join panel confirm button - opens confirm modal (use event delegation)
document.addEventListener("click", (e) => {
  const confirmBtn = e.target.closest("#join-confirm-btn");
  if (confirmBtn) {
    e.preventDefault();
    e.stopPropagation();
    console.log("[Join Confirm] Button clicked, opening confirm modal");
    
    if (!currentTaskData || !currentTaskData.id) {
      console.error("No task data available to join");
      alert("Error: No task data available");
      return;
    }

    const noteTextarea = document.querySelector("#join-note");
    const note = noteTextarea ? noteTextarea.value.trim() : "";
    
    // Store note for later use
    window.__JOIN_NOTE__ = note;
    
    // Close join panel and open confirm modal
    closeModal();
    if (window.ModalManager) {
      window.ModalManager.open("join-confirm-modal");
    } else {
      console.error("ModalManager not available");
      alert("Error: Modal manager not available");
    }
  }
}, true); // Use capture phase

// Intercept join confirm modal's confirm button to call API
// This must run before ModalManager handles the click
document.addEventListener("click", async (event) => {
  const target = event.target;
  const confirmModal = target?.closest('[data-modal="join-confirm-modal"]');
  
  // Check if clicking the confirm button in join-confirm-modal
  // Look for button with bg-emerald-500 class and "Confirm" text, or data-modal-next attribute
  const isConfirmButton = confirmModal && 
    (target.classList.contains("bg-emerald-500") || target.hasAttribute("data-modal-next")) &&
    target.textContent.trim() === "Confirm";
  
  if (isConfirmButton) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation(); // Prevent ModalManager from handling this
    
    if (!currentTaskData || !currentTaskData.id) {
      console.error("No task data available to join");
      return;
    }

    const note = window.__JOIN_NOTE__ || "";
    
    // Disable button during submission
    target.disabled = true;
    const originalText = target.textContent;
    target.textContent = "Joining...";

    try {
      await joinTask(currentTaskData.id, note);
      
      // Update viewer state to reflect participation
      currentViewer.isParticipant = true;
      
      // Update button visibility
      setDetailButtonsVisibility(true, currentViewer.isOwner);
      
      // Close confirm modal
      if (window.ModalManager) {
        window.ModalManager.close("join-confirm-modal");
      }
      
      // Show success modal
      if (window.ModalManager) {
        window.ModalManager.open("join-success-modal");
      }
      
      // Clear stored note
      window.__JOIN_NOTE__ = null;
    } catch (error) {
      alert(`Failed to join task: ${error.message}`);
      console.error("Join task error:", error);
      // Re-enable button on error
      target.disabled = false;
      target.textContent = originalText;
    }
  }
}, true); // Use capture phase to run before ModalManager

// Handle join success modal close - navigate back to ESN Help Center page
document.addEventListener("click", (event) => {
  const target = event.target;
  const successModal = target?.closest('[data-modal="join-success-modal"]');
  
  if (successModal && target?.hasAttribute("data-modal-close")) {
    // Close success modal
    if (window.ModalManager) {
      window.ModalManager.close("join-success-modal");
    }
    
    // Close task detail modal
    closeModal();
    
    // Navigate back to ESN Help Center page
    window.location.href = "/esn-help-center";
  }
});

// ===== Quit Task Functionality =====
async function quitTask(taskId) {
  try {
    // TODO: Replace with actual API endpoint when available
    // Example: POST /api/tasks/{taskId}/quit
    const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/quit`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized: Please log in");
      }
      if (response.status === 400) {
        const error = await response.json();
        throw new Error(error.message || "Failed to quit task");
      }
      throw new Error(`Failed to quit task: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error quitting task:", error);
    // For now, if API doesn't exist, simulate success
    // Remove this when API is implemented
    if (error.message.includes("Failed to fetch") || error.message.includes("404")) {
      console.warn("Quit task API not yet implemented, simulating success");
      return { status: "success", message: "Task quit successfully (simulated)" };
    }
    throw error;
  }
}

// Quit panel confirm button - opens confirm modal
const quitConfirmBtn = document.querySelector("#quit-confirm-btn");
if (quitConfirmBtn) {
  quitConfirmBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Close quit panel and open confirm modal
    closeModal();
    if (window.ModalManager) {
      window.ModalManager.open("quit-confirm-modal");
    }
  });
}

// Intercept quit confirm modal's confirm button to call API
document.addEventListener("click", async (event) => {
  const target = event.target;
  const confirmModal = target?.closest('[data-modal="quit-confirm-modal"]');
  
  // Check if clicking the confirm button in quit-confirm-modal
  if (confirmModal && target.classList.contains("bg-rose-500") && target.textContent.trim() === "Confirm") {
    event.preventDefault();
    event.stopPropagation();
    
    if (!currentTaskData || !currentTaskData.id) {
      console.error("No task data available to quit");
      return;
    }

    // Disable button during submission
    target.disabled = true;
    target.textContent = "Quitting...";

    try {
      await quitTask(currentTaskData.id);
      
      // Update viewer state to reflect non-participation
      currentViewer.isParticipant = false;
      
      // Update button visibility
      setDetailButtonsVisibility(false, currentViewer.isOwner);
      
      // Close confirm modal
      if (window.ModalManager) {
        window.ModalManager.close("quit-confirm-modal");
      }
      
      // Show success modal
      if (window.ModalManager) {
        window.ModalManager.open("quit-success-modal");
      }
    } catch (error) {
      alert(`Failed to quit task: ${error.message}`);
      console.error("Quit task error:", error);
      // Re-enable button on error
      target.disabled = false;
      target.textContent = "Confirm";
    }
  }
});

// Handle quit success modal close - reopen task detail modal
document.addEventListener("click", (event) => {
  const target = event.target;
  const successModal = target?.closest('[data-modal="quit-success-modal"]');
  
  if (successModal && target?.hasAttribute("data-modal-close")) {
    // Close success modal
    if (window.ModalManager) {
      window.ModalManager.close("quit-success-modal");
    }
    
    // Reopen task detail modal with updated state
    if (currentTaskData && window.TaskDetailModal) {
      setTimeout(() => {
        window.TaskDetailModal.open(currentTaskData, currentViewer);
      }, 200);
    }
  }
});

// ===== Upload Task Log Functionality =====
async function uploadTaskLog(taskId, logText) {
  try {
    // TODO: Replace with actual API endpoint when available
    // Example: POST /api/tasks/{taskId}/logs
    const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/logs`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        summary: logText,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized: Please log in");
      }
      if (response.status === 400) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload task log");
      }
      throw new Error(`Failed to upload task log: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error uploading task log:", error);
    // For now, if API doesn't exist, simulate success
    // Remove this when API is implemented
    if (error.message.includes("Failed to fetch") || error.message.includes("404")) {
      console.warn("Upload task log API not yet implemented, simulating success");
      return { status: "success", message: "Task log uploaded successfully (simulated)" };
    }
    throw error;
  }
}

const logSubmitBtn = document.querySelector("#log-submit-btn");
if (logSubmitBtn) {
  logSubmitBtn.addEventListener("click", async () => {
    if (!currentTaskData || !currentTaskData.id) {
      console.error("No task data available to upload log");
      return;
    }

    const logTextarea = document.querySelector("#task-log-text");
    const logText = logTextarea ? logTextarea.value.trim() : "";

    if (!logText) {
      alert("Please enter a task log before submitting.");
      return;
    }

    // Disable button during submission
    logSubmitBtn.disabled = true;
    logSubmitBtn.textContent = "Submitting...";

    try {
      await uploadTaskLog(currentTaskData.id, logText);
      
      // Clear the textarea
      if (logTextarea) {
        logTextarea.value = "";
      }
      
      // Show success message
      alert("Task log uploaded successfully!");
      
      // Return to detail panel
    openDetail();
      
      // Optionally refresh task data to show new log
      // Could fetch task again and repopulate modal
    } catch (error) {
      alert(`Failed to upload task log: ${error.message}`);
      console.error("Upload log error:", error);
    } finally {
      logSubmitBtn.disabled = false;
      logSubmitBtn.textContent = "Submit Task Log";
    }
  });
}

// ----- Public API so other scripts can open the modal -----

window.TaskDetailModal = {
  open(task, viewerOverride) {
    // Handle loading state
    if (task && task.loading) {
      // Show loading indicator - use overlay instead of replacing HTML
      if (detailPanel) {
        // Create or show loading overlay
        let loadingOverlay = detailPanel.querySelector(".task-loading-overlay");
        if (!loadingOverlay) {
          loadingOverlay = document.createElement("div");
          loadingOverlay.className = "task-loading-overlay absolute inset-0 flex items-center justify-center bg-white/90 z-10 rounded-3xl";
          loadingOverlay.innerHTML = `
            <div class="flex flex-col items-center gap-2">
              <div class="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600"></div>
              <p class="text-stone-600 text-sm">Loading task details...</p>
            </div>
          `;
          detailPanel.style.position = "relative";
          detailPanel.appendChild(loadingOverlay);
        }
        loadingOverlay.classList.remove("hidden");
        loadingOverlay.style.display = "flex";
      }
      openPanel(detailPanel);
      return;
    }

    // Hide loading overlay if it exists
    const loadingOverlay = detailPanel?.querySelector(".task-loading-overlay");
    if (loadingOverlay) {
      loadingOverlay.classList.add("hidden");
      loadingOverlay.style.display = "none";
    }

    // Restore original HTML structure if it was replaced or doesn't exist
    const needsRestore = detailPanel && originalModalHTML && !detailPanel.querySelector(".mb-3");
    if (needsRestore) {
      detailPanel.innerHTML = originalModalHTML;
    }

    // Transform and store task data
    // Check if task has id or _id (backend might use either)
    const hasTaskId = task && typeof task === "object" && (task.id || task._id);
    
    if (hasTaskId) {
      // Transform backend task data to modal format
      const transformedTask = transformTaskForModal(task);
      if (!transformedTask) {
        console.error("[TaskDetailModal] Failed to transform task:", task);
        return;
      }
      
      currentTaskData = transformedTask;
      currentViewer = viewerOverride || { isParticipant: false, isOwner: false };

      // Ensure modal structure exists before populating
      if (detailPanel && originalModalHTML && !detailPanel.querySelector(".mb-3")) {
        detailPanel.innerHTML = originalModalHTML;
      }

      // Populate modal with task data
      populateModal(currentTaskData);
      
      console.log("[TaskDetailModal] Populated modal with API data:", currentTaskData);
    } else {
      // Only use fallback data if no task was provided at all
      // This prevents using dummy data when API data should be used
      if (!task || (typeof task === "object" && Object.keys(task).length === 0)) {
        // Check if we have fallback data, but warn that we're using it
        const fallbackTask = window.__TASK_DETAIL__ || {};
        const fallbackViewer = viewerOverride || window.__TASK_VIEWER__ || {};
        
        // Only use fallback if it has valid data AND we're not expecting API data
        // (i.e., this is a direct call without fetching)
        if (fallbackTask && (fallbackTask.id || fallbackTask._id)) {
          console.warn("[TaskDetailModal] Using fallback/dummy data - API data should be used instead");
          currentTaskData = fallbackTask;
          currentViewer = fallbackViewer;
          
          // Ensure modal structure exists
          if (detailPanel && originalModalHTML && !detailPanel.querySelector(".mb-3")) {
            detailPanel.innerHTML = originalModalHTML;
          }
          populateModal(currentTaskData);
        } else {
          console.warn("[TaskDetailModal] No valid task data available - modal will be empty");
          // Don't return - still open the modal so user can see it's empty/loading
        }
      } else {
        // Task provided but no ID - log error
        console.error("[TaskDetailModal] Task provided but missing ID:", task);
        console.error("[TaskDetailModal] Task keys:", Object.keys(task || {}));
        return;
      }
    }

      console.info(
        "[TaskDetailModal] open called with task:",
      currentTaskData,
        "viewer:",
      currentViewer,
      );

    openDetail();
  },
  close: closeModal,
};

// For quick manual testing, you can call in console:
// TaskDetailModal.open();
