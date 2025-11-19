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

// Viewer state from server (mocked for now)
const taskData = window.__TASK_DETAIL__ || {};
const viewer = window.__TASK_VIEWER__ || {};
const isParticipant = !!viewer.isParticipant;
const isOwner = !!viewer.isOwner;

function setDetailButtonsVisibility() {
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
  setDetailButtonsVisibility();
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
    // only close if clicking on the dimmed background, not inside a panel
    console.log("Overlay click:", {
      target: event.target,
      currentTarget: event.currentTarget,
    });
    const target = event.Target;
    if (target === overlay) {
      closeModal();
    }
  });
}
if (taskModalWrapper) {
  console.log("Wiring up modal wrapper click handler");
  taskModalWrapper.addEventListener("click", (event) => {
    // only close if clicking on the dimmed background, not inside a panel
    console.log("Overlay click:", {
      target: event.target,
      currentTarget: event.currentTarget,
    });
    const target = event.Target;
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

if (btnJoinTask) {
  btnJoinTask.addEventListener("click", () => {
    openPanel(joinPanel);
  });
}

if (btnQuitTask) {
  btnQuitTask.addEventListener("click", () => {
    openPanel(quitPanel);
  });
}

if (btnUploadLog) {
  btnUploadLog.addEventListener("click", () => {
    openPanel(logPanel);
  });
}

if (btnEditTask) {
  btnEditTask.addEventListener("click", () => {
    // For now, simply navigate to an Edit page.
    // You can change the URL scheme later.
    if (taskData && taskData.id) {
      window.location.href = `/tasks/${encodeURIComponent(taskData.id)}/edit`;
    }
  });
}

// Placeholder for confirm buttons – currently just go back to detail
const joinConfirmBtn = document.querySelector("#join-confirm-btn");
if (joinConfirmBtn) {
  joinConfirmBtn.addEventListener("click", () => {
    // TODO: send join request to backend
    openDetail();
  });
}

const quitConfirmBtn = document.querySelector("#quit-confirm-btn");
if (quitConfirmBtn) {
  quitConfirmBtn.addEventListener("click", () => {
    // TODO: send quit request to backend
    openDetail();
  });
}

const logSubmitBtn = document.querySelector("#log-submit-btn");
if (logSubmitBtn) {
  logSubmitBtn.addEventListener("click", () => {
    // TODO: send task log to backend
    openDetail();
  });
}

// ----- Public API so other scripts can open the modal -----

window.TaskDetailModal = {
  open(task, viewerOverride) {
    if (task && typeof task === "object") {
      // For now we ignore overriding content markup to keep the mock static.
      // Later you can hydrate fields here (title, description, etc).
      console.info(
        "[TaskDetailModal] open called with task:",
        task,
        "viewer:",
        viewerOverride,
      );
    }
    openDetail();
  },
  close: closeModal,
};

// For quick manual testing, you can call in console:
// TaskDetailModal.open();
