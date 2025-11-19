/**
 * Modal utility functions for emergency profile page
 */

export function showSuccessModal(modal, titleEl, descriptionEl, closeBtn, title, description) {
  if (modal && titleEl && descriptionEl) {
    titleEl.textContent = title;
    descriptionEl.textContent = description;
    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
    closeBtn?.focus();
  }
}

export function closeSuccessModal(modal) {
  if (modal) {
    modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }
}

export function showConfirmDeleteModal(modal, cancelBtn, okBtn) {
  return new Promise((resolve) => {
    if (modal) {
      modal.classList.remove("hidden");
      document.body.classList.add("overflow-hidden");
      
      // Setup one-time event listeners
      const handleConfirm = () => {
        closeConfirmDeleteModal(modal);
        resolve(true);
      };
      
      const handleCancel = () => {
        closeConfirmDeleteModal(modal);
        resolve(false);
      };
      
      if (okBtn) {
        okBtn.addEventListener("click", handleConfirm, { once: true });
      }
      if (cancelBtn) {
        cancelBtn.addEventListener("click", handleCancel, { once: true });
      }
      
      // Close on overlay click
      const handleOverlayClick = (e) => {
        if (e.target === modal) {
          closeConfirmDeleteModal(modal);
          resolve(false);
        }
      };
      modal.addEventListener("click", handleOverlayClick, { once: true });
      
      // Close on Escape key
      const handleEscape = (e) => {
        if (e.key === "Escape") {
          closeConfirmDeleteModal(modal);
          resolve(false);
        }
      };
      document.addEventListener("keydown", handleEscape, { once: true });
    } else {
      resolve(false);
    }
  });
}

export function closeConfirmDeleteModal(modal) {
  if (modal) {
    modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }
}

export function setupModalCloseHandlers(modal, closeBtn) {
  if (closeBtn) {
    closeBtn.addEventListener("click", () => closeSuccessModal(modal));
  }
  if (modal) {
    // Close modal when clicking on the overlay (background)
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeSuccessModal(modal);
      }
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.classList.contains("hidden")) {
      closeSuccessModal(modal);
    }
  });
}

