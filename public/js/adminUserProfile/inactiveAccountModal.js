/**
 * Inactive Account Modal Handler
 * Displays error modal when user account is inactive
 * Used on splash page after logout or failed login
 */

const modalOverlay = document.getElementById("global-modal-overlay");
const modalContent = document.getElementById("modal-dynamic-content");
const modalBackdrop = document.getElementById("modal-backdrop");
const errorTemplate = document.getElementById("tmpl-modal-error");

/**
 * Open the modal
 */
function openModal() {
  if (!modalOverlay) return;
  modalOverlay.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}

/**
 * Close the modal
 */
function closeModal() {
  if (!modalOverlay) return;
  modalOverlay.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
  if (modalContent) {
    modalContent.innerHTML = "";
  }
}

/**
 * Setup backdrop click handler (called once on initialization)
 */
function setupBackdropHandler() {
  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", (e) => {
      // Only close if clicking directly on backdrop, not on modal content
      if (e.target === modalBackdrop) {
        closeModal();
      }
    });
  }
}

/**
 * Show the inactive account error modal
 */
function showInactiveAccountModal() {
  if (!modalContent || !errorTemplate) return;
  
  const content = errorTemplate.content.cloneNode(true);
  modalContent.innerHTML = "";
  modalContent.appendChild(content);
  
  // Wire up OK button - query from document after appending to DOM
  // Using document.getElementById ensures we find it even if querySelector fails
  const okBtn = document.getElementById("btn-error-ok");
  if (okBtn) {
    okBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
  } else {
    console.error("[inactiveAccountModal] OK button not found after appending content");
  }
  
  openModal();
}

// Make closeModal available globally for onclick handlers
window.closeModal = closeModal;

// Check URL parameter for inactive account
function checkForInactiveAccount() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("inactive") === "true") {
    showInactiveAccountModal();
    // Clean up URL (remove query parameter)
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// Initialize when DOM is ready
function initialize() {
  setupBackdropHandler();
  checkForInactiveAccount();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}

