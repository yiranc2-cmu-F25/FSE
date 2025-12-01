// public/js/helpCenter/taskDetailModal.js

import { hideElement, showElement, formatDate } from "./taskModalUtils.js";
import { joinTask, quitTask, uploadTaskLog, fetchTask } from "./taskApi.js";
import {
  populateTitle,
  populateStatus,
  populateLocation,
  populatePostTime,
  populateDueDate,
  populatePublisher,
  populateHelpers,
  populateDescription,
  populateTaskLogs,
  populateResources,
  populateSkills,
  populatePanelTitles,
} from "./taskModalPopulate.js";

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

// Populate modal with task data
function populateModal(task) {
  if (!task || !detailPanel) {
    console.warn("[populateModal] Missing task or detailPanel", { task, detailPanel });
    return;
  }

  console.log("[populateModal] Populating modal with task:", task);

  populateTitle(detailPanel, task);
  populateStatus(detailPanel, task);
  populateLocation(detailPanel, task);
  populatePostTime(detailPanel, task);
  populateDueDate(detailPanel, task);
  populatePublisher(detailPanel, task);
  populateHelpers(detailPanel, task);
  populateDescription(detailPanel, task);
  populateTaskLogs(detailPanel, task);
  populateResources(detailPanel, task);
  populateSkills(detailPanel, task);
  populatePanelTitles(joinPanel, quitPanel, task);
}

function setDetailButtonsVisibility(isParticipant, isOwner) {
  console.log("[setDetailButtonsVisibility] Setting buttons:", { isParticipant, isOwner });
  
  // Check if task is CLOSED
  const isTaskClosed = currentTaskData && currentTaskData.status === "CLOSED";
  
  const anyButtons = [];

  // For CLOSED tasks, only show Edit Task button to owner
  if (isTaskClosed) {
    if (isOwner) {
      anyButtons.push(btnEditTask);
      showElement(btnEditTask);
      console.log("[setDetailButtonsVisibility] Task is CLOSED - showing Edit Task button for owner");
    }
    // Hide all other buttons for closed tasks
    hideElement(btnJoinTask);
    hideElement(btnQuitTask);
    hideElement(btnUploadLog);
    if (!isOwner) {
      hideElement(btnEditTask);
    }
  } else {
    // For OPEN tasks, show buttons based on participation and ownership
    if (!isParticipant) {
      // Check if task is fully claimed (all helper slots filled)
      const helpersJoined = currentTaskData?.helpersJoined || 0;
      const helpersCapacity = currentTaskData?.helpersCapacity || 0;
      const isFullyClaimed = helpersCapacity > 0 && helpersJoined >= helpersCapacity;
      
      if (!isFullyClaimed) {
        // can join - task has available slots
        anyButtons.push(btnJoinTask);
        showElement(btnJoinTask);
        console.log("[setDetailButtonsVisibility] Showing Join Task button");
      } else {
        // task is fully claimed - hide join button
        hideElement(btnJoinTask);
        console.log("[setDetailButtonsVisibility] Task is fully claimed - hiding Join Task button");
      }
      hideElement(btnQuitTask);
      hideElement(btnUploadLog);
    } else {
      // participant: can quit and upload log
      anyButtons.push(btnQuitTask, btnUploadLog);
      showElement(btnQuitTask);
      showElement(btnUploadLog);
      hideElement(btnJoinTask);
      console.log("[setDetailButtonsVisibility] Showing Quit Task + Upload Log buttons");
    }

    if (isOwner) {
      anyButtons.push(btnEditTask);
      showElement(btnEditTask);
      console.log("[setDetailButtonsVisibility] Showing Edit Task button");
    } else {
      hideElement(btnEditTask);
    }
  }

  if (anyButtons.length > 0) {
    showElement(actionOverlay);
    showElement(actionButtonsBox);
  } else {
    hideElement(actionOverlay);
    hideElement(actionButtonsBox);
  }
  
  console.log("[setDetailButtonsVisibility] Total buttons shown:", anyButtons.length);
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
  
  // Prevent body scroll when modal is open
  document.body.style.overflow = "hidden";
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
  
  // Restore body scroll when modal is closed
  document.body.style.overflow = "";
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
    
    // Check if task is CLOSED
    if (currentTaskData && currentTaskData.status === "CLOSED") {
      alert("This task is CLOSED. You cannot join closed tasks.");
      return;
    }
    
    // Check if task is fully claimed (all helper slots filled)
    if (currentTaskData) {
      const helpersJoined = currentTaskData.helpersJoined || 0;
      const helpersCapacity = currentTaskData.helpersCapacity || 0;
      if (helpersCapacity > 0 && helpersJoined >= helpersCapacity) {
        alert("This task is fully claimed. No helper slots available.");
        return;
      }
    }
    
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

// Quit Task button handler - use event delegation to ensure it works
document.addEventListener("click", (e) => {
  // Check if the clicked element is the Quit Task button or inside it
  const quitBtn = e.target.closest("#btn-quit-task");
  if (quitBtn) {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if task is CLOSED
    if (currentTaskData && currentTaskData.status === "CLOSED") {
      alert("This task is CLOSED. You cannot quit closed tasks.");
      return;
    }
    
    console.log("[Quit Task] Button clicked, opening quit panel");
    
    // Remove any existing data-modal-open attribute to prevent ModalManager interference
    if (quitBtn.hasAttribute("data-modal-open")) {
      quitBtn.removeAttribute("data-modal-open");
    }
    
    // Open quit panel for confirmation
    // Update quit panel title before opening
    if (quitPanel && currentTaskData) {
      const quitPanelTitle = quitPanel.querySelector("span.font-semibold");
      if (quitPanelTitle) {
        quitPanelTitle.textContent = currentTaskData.title || "";
      }
    }
    
    if (!quitPanel) {
      console.error("[Quit Task] Quit panel not found");
      return;
    }
    
    openPanel(quitPanel);
  }
}, true); // Use capture phase to run early

if (btnUploadLog) {
  btnUploadLog.addEventListener("click", () => {
    // Check if task is CLOSED
    if (currentTaskData && currentTaskData.status === "CLOSED") {
      alert("This task is CLOSED. You cannot add task logs to closed tasks.");
      return;
    }
    
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
// joinTask is imported from taskApi.js

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

    // Check if task is CLOSED before attempting to join
    if (currentTaskData && currentTaskData.status === "CLOSED") {
      alert("This task is CLOSED. You cannot join closed tasks.");
      // Close confirm modal
      if (window.ModalManager) {
        window.ModalManager.close("join-confirm-modal");
      }
      // Return to detail panel
      openDetail();
      return;
    }
    
    // Check if task is fully claimed (all helper slots filled)
    if (currentTaskData) {
      const helpersJoined = currentTaskData.helpersJoined || 0;
      const helpersCapacity = currentTaskData.helpersCapacity || 0;
      if (helpersCapacity > 0 && helpersJoined >= helpersCapacity) {
        alert("This task is fully claimed. No helper slots available.");
        // Close confirm modal
        if (window.ModalManager) {
          window.ModalManager.close("join-confirm-modal");
        }
        // Return to detail panel
        openDetail();
        // Re-enable button
        target.disabled = false;
        target.textContent = originalText;
        return;
      }
    }
    
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

// Handle join confirm modal cancel button - close modal and return to detail panel
document.addEventListener("click", (event) => {
  const target = event.target;
  const confirmModal = target?.closest('[data-modal="join-confirm-modal"]');
  
  if (confirmModal && target?.hasAttribute("data-modal-close") && target.textContent.trim() === "Cancel") {
    event.preventDefault();
    event.stopPropagation();
    
    // Close confirm modal
    if (window.ModalManager) {
      window.ModalManager.close("join-confirm-modal");
    }
    
    // Return to detail panel
    openDetail();
  }
});

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
// quitTask is imported from taskApi.js

// Quit panel confirm button - performs API call
const quitConfirmBtn = document.querySelector("#quit-confirm-btn");
if (quitConfirmBtn) {
  quitConfirmBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentTaskData || !currentTaskData.id) {
      console.error("No task data available to quit");
      alert("Error: No task data available");
      return;
    }

    // Check if task is CLOSED
    if (currentTaskData && currentTaskData.status === "CLOSED") {
      alert("This task is CLOSED. You cannot quit closed tasks.");
      // Return to detail panel
      openDetail();
      return;
    }

    const originalText = quitConfirmBtn.textContent;
    quitConfirmBtn.disabled = true;
    quitConfirmBtn.textContent = "Quitting...";

    try {
      await quitTask(currentTaskData.id);
      
      // Update viewer state to reflect non-participation
      currentViewer.isParticipant = false;
      
      // Update button visibility
      setDetailButtonsVisibility(false, currentViewer.isOwner);
      
      // Close quit panel
      closeModal();
      
      // Show success modal
      if (window.ModalManager) {
        window.ModalManager.open("quit-success-modal");
      }
    } catch (error) {
      alert(`Failed to quit task: ${error.message}`);
      console.error("Quit task error:", error);
    } finally {
      quitConfirmBtn.disabled = false;
      quitConfirmBtn.textContent = originalText;
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

    // Check if task is CLOSED
    if (currentTaskData && currentTaskData.status === "CLOSED") {
      alert("This task is CLOSED. You cannot quit closed tasks.");
      // Close confirm modal
      if (window.ModalManager) {
        window.ModalManager.close("quit-confirm-modal");
      }
      // Return to detail panel
      openDetail();
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

// Handle log success modal close - stay on detail panel
document.addEventListener("click", (event) => {
  const target = event.target;
  const successModal = target?.closest('[data-modal="log-success-modal"]');
  
  if (successModal && target?.hasAttribute("data-modal-close")) {
    // Close success modal
    if (window.ModalManager) {
      window.ModalManager.close("log-success-modal");
    }
    // Stay on detail panel (already open)
  }
});

// Handle quit success modal close - refresh task data and reopen modal
document.addEventListener("click", (event) => {
  const target = event.target;
  const successModal = target?.closest('[data-modal="quit-success-modal"]');
  
  if (successModal && target?.hasAttribute("data-modal-close")) {
    // Close success modal
    if (window.ModalManager) {
      window.ModalManager.close("quit-success-modal");
    }
    
    // Refresh task data from API to get updated participant list
    if (currentTaskData && currentTaskData.id) {
      fetchTask(currentTaskData.id)
        .then((updatedTask) => {
          // Get current user ID for determining relationship
          const currentUserId = window.__CURRENT_USER_ID__ || null;
          
          // Determine viewer relationship
          const creatorId = updatedTask.creator?.id || updatedTask.creator?._id || updatedTask.creator;
          const isOwner = currentUserId && creatorId ? String(creatorId) === String(currentUserId) : false;
          const isParticipant = updatedTask.isParticipant !== undefined 
            ? updatedTask.isParticipant 
            : false;
          
          const updatedViewer = { isParticipant, isOwner };
          
          // Transform and update task data
          const transformedTask = transformTaskForModal(updatedTask);
          if (transformedTask) {
            currentTaskData = transformedTask;
            currentViewer = updatedViewer;
            
            // Reopen task detail modal with updated data
            if (window.TaskDetailModal) {
              setTimeout(() => {
                window.TaskDetailModal.open(updatedTask, updatedViewer);
              }, 200);
            }
          }
        })
        .catch((error) => {
          console.error("Error refreshing task data after quit:", error);
          // Still reopen modal with current data
          if (window.TaskDetailModal) {
            setTimeout(() => {
              window.TaskDetailModal.open(currentTaskData, currentViewer);
            }, 200);
          }
        });
    } else {
      // No task data, just close
      closeModal();
    }
  }
});

// ===== Upload Task Log Functionality =====
// uploadTaskLog is imported from taskApi.js

const logSubmitBtn = document.querySelector("#log-submit-btn");
if (logSubmitBtn) {
  logSubmitBtn.addEventListener("click", async () => {
    if (!currentTaskData || !currentTaskData.id) {
      console.error("No task data available to upload log");
      alert("Error: No task data available");
      return;
    }

    // Check if task is CLOSED
    if (currentTaskData && currentTaskData.status === "CLOSED") {
      alert("This task is CLOSED. You cannot add task logs to closed tasks.");
      // Return to detail panel
      openDetail();
      return;
    }

    const logTextarea = document.querySelector("#task-log-text");
    const logText = logTextarea ? logTextarea.value.trim() : "";

    if (!logText) {
      alert("Please enter a task log before submitting.");
      return;
    }

    // Disable button during submission
    const originalText = logSubmitBtn.textContent;
    logSubmitBtn.disabled = true;
    logSubmitBtn.textContent = "Submitting...";

    try {
      await uploadTaskLog(currentTaskData.id, logText);
      
      // Clear the textarea
      if (logTextarea) {
        logTextarea.value = "";
      }
      
      // Refresh task data to show new log
      try {
        const updatedTask = await fetchTask(currentTaskData.id);
        const transformedTask = transformTaskForModal(updatedTask);
        if (transformedTask) {
          currentTaskData = transformedTask;
          populateModal(currentTaskData);
        }
      } catch (error) {
        console.error("Error refreshing task data:", error);
      }
      
      // Show success modal
      if (window.ModalManager) {
        window.ModalManager.open("log-success-modal");
      } else {
        // Fallback if ModalManager not loaded
        const modal = document.querySelector('[data-modal="log-success-modal"]');
        if (modal) {
          modal.classList.remove("hidden");
          document.body.style.overflow = "hidden";
        }
      }
      
      // Return to detail panel
      openDetail();
    } catch (error) {
      alert(`Failed to upload task log: ${error.message}`);
      console.error("Upload log error:", error);
    } finally {
      logSubmitBtn.disabled = false;
      logSubmitBtn.textContent = originalText;
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
