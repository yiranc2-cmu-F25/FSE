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
function toStr(v, fb = "") {
  if (typeof v === "string") return v;
  if (v == null) return fb;
  try {
    return String(v);
  } catch {
    return fb;
  }
}
export { formatDate, toStr };
