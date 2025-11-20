function formatDate(d) {
  const dt = new Date(d);
  const date = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  }).format(dt);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(dt);
  return `${date} at ${time}`;
}

/**
 * Format timestamp to relative time (e.g., "2m", "1h", "Yesterday", "Jan 15")
 * @param {string|number|Date} timestamp - The timestamp to format
 * @returns {string} - Formatted relative time string
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return "";

  const now = new Date();
  const date = new Date(timestamp);

  // Check if invalid date
  if (isNaN(date.getTime())) return "";

  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  // Less than 1 minute
  if (diffMin < 1) {
    return "now";
  }

  // Less than 1 hour - show minutes
  if (diffMin < 60) {
    return `${diffMin}m`;
  }

  // Less than 24 hours - show hours
  if (diffHour < 24) {
    return `${diffHour}h`;
  }

  // Yesterday
  if (diffDay === 1) {
    return "Yesterday";
  }

  // Less than 7 days - show day name
  if (diffDay < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }

  // Same year - show month and day
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Different year - show month, day, and year
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toStr(v, fb = "") {
  if (typeof v === "string") return v;
  if (v == null) return fb;
  try {
    return String(v);
  } catch {
    return fb;
  }
}
export { formatDate, formatTimestamp, toStr };
