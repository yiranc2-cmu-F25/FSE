/**
 * Modal Workflow for Edit Profile
 * Handles confirm and success modals
 */

const modalOverlay = document.getElementById("global-modal-overlay");
const modalContent = document.getElementById("modal-dynamic-content");
const modalBackdrop = document.getElementById("modal-backdrop");
const confirmTemplate = document.getElementById("tmpl-modal-confirm");
const successTemplate = document.getElementById("tmpl-modal-success");

// Global functions for onclick handlers
window.openModal = function() {
  if (!modalOverlay) return;
  modalOverlay.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
};

window.closeModal = function() {
  if (!modalOverlay) return;
  modalOverlay.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
  if (modalContent) {
    modalContent.innerHTML = "";
  }
};

// Setup backdrop click handler
function setupModalHandlers() {
  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", (e) => {
      // Only close if clicking directly on backdrop, not on modal content
      if (e.target === modalBackdrop) {
        closeModal();
      }
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupModalHandlers);
} else {
  setupModalHandlers();
}

function showConfirmModal() {
  if (!modalContent || !confirmTemplate) return;
  
  const content = confirmTemplate.content.cloneNode(true);
  modalContent.innerHTML = "";
  modalContent.appendChild(content);
  
  // Wire up cancel button
  const cancelBtn = document.getElementById("btn-confirm-cancel");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeModal);
  }
  
  // Wire up confirm button
  const confirmBtn = document.getElementById("btn-confirm-action");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", handleConfirm);
  }
  
  openModal();
}

function showSuccessModal() {
  if (!modalContent || !successTemplate) return;
  
  const content = successTemplate.content.cloneNode(true);
  modalContent.innerHTML = "";
  modalContent.appendChild(content);
  
  // Wire up "Great!" button to navigate
  const greatBtn = document.getElementById("btn-success-great");
  if (greatBtn) {
    greatBtn.addEventListener("click", () => {
      window.location.href = "/admin/users";
    });
  }
  
  openModal();
}

async function handleConfirm() {
  // Close confirm modal first
  closeModal();
  
  // TODO: Send actual request to backend
  // const form = document.getElementById("edit-profile-form");
  // const formData = new FormData(form);
  // 
  // try {
  //   const response = await fetch("/admin/users/update", {
  //     method: "POST",
  //     body: formData,
  //     credentials: "include",
  //   });
  //   
  //   if (response.ok) {
  //     const data = await response.json();
  //     showSuccessModal();
  //   } else {
  //     // Handle error - show error modal
  //     console.error("Update failed:", response.status);
  //   }
  // } catch (error) {
  //   console.error("Network error:", error);
  // }
  
  // For now, assume success (as per requirements)
  setTimeout(() => {
    showSuccessModal();
  }, 300); // Small delay for smooth transition
}

// Export for use in other scripts
window.showConfirmModal = showConfirmModal;

