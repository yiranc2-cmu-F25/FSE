// public/js/helpCenter/taskModalUtils.js
// Utility functions for task modal

/**
 * Format date for display
 */
export function formatDate(iso) {
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

/**
 * Show/hide element helpers
 */
export function hideElement(el) {
  if (el) el.classList.add("hidden");
}

export function showElement(el) {
  if (el) el.classList.remove("hidden");
}

