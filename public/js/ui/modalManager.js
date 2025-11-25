const MODAL_ATTR = "modal";
const OPEN_ATTR = "modalOpen";
const CLOSE_ATTR = "modalClose";
const NEXT_ATTR = "modalNext";
const FOCUS_ATTR = "modalFocus";

const registry = new Map();
let openCount = 0;

function ready(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

function hideModal(modal) {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function showModal(modal) {
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  openCount += 1;
  document.body.classList.add("overflow-hidden");

  const focusTarget =
    modal.querySelector(`[data-${FOCUS_ATTR}]`) ||
    modal.querySelector("button, [href], input, textarea, select, [tabindex]:not([tabindex='-1'])");
  if (focusTarget) {
    focusTarget.focus();
  }
}

function closeModal(modal) {
  if (!modal || modal.classList.contains("hidden")) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  openCount = Math.max(0, openCount - 1);
  if (openCount === 0) {
    document.body.classList.remove("overflow-hidden");
  }
}

function getModal(id) {
  if (!id) return null;
  return registry.get(id);
}

function openById(id) {
  const modal = getModal(id);
  if (!modal) return;
  showModal(modal);
}

function closeById(id) {
  const modal = getModal(id);
  if (!modal) return;
  closeModal(modal);
}

ready(() => {
  document.querySelectorAll(`[data-${MODAL_ATTR}]`).forEach((modal) => {
    const id = modal.dataset[MODAL_ATTR];
    if (!id) return;
    registry.set(id, modal);
    hideModal(modal);
  });

  document.addEventListener("click", (event) => {
    const opener = event.target.closest(`[data-${OPEN_ATTR}]`);
    if (opener) {
      event.preventDefault();
      openById(opener.dataset[OPEN_ATTR]);
      return;
    }

    const closer = event.target.closest(`[data-${CLOSE_ATTR}]`);
    if (closer) {
      event.preventDefault();
      const modalId =
        closer.dataset[CLOSE_ATTR] ||
        closer.closest(`[data-${MODAL_ATTR}]`)?.dataset[MODAL_ATTR];
      closeById(modalId);
      const nextId = closer.dataset[NEXT_ATTR];
      if (nextId) {
        openById(nextId);
      }
    }
  });
});

export const ModalManager = {
  open: openById,
  close: closeById,
};

if (typeof window !== "undefined") {
  window.ModalManager = ModalManager;
}

