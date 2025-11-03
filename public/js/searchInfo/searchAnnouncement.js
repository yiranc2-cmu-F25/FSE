import { initializeSearch, normalizeQuery, hideFooter, processData } from "../utils/searchInit.js";

let lastQuery = "";
let lastCursor = null;

async function searchAnnouncements(query) {
  const trimmed = normalizeQuery(query);
  if (!trimmed) {
    hideFooter();
  }

  const endpoint = `/api/queries?type=announcements&content=${encodeURIComponent(trimmed)}&limit=10`;

  try {
    const res = await fetch(endpoint, { credentials: "include" });
    if (!res.ok) {
      throw new Error(`Search request failed with status ${res.status}`);
    }

    const data = await res.json();
    lastQuery = trimmed;
    lastCursor = data.nextCursor || null;
    processData(data);
  } catch (error) {
    console.error("Error during search:", error);
  }
}

async function moreAnnouncements() {
  if (!lastCursor) {
    console.warn("No more results to load.");
    return;
  }

  const trimmed = normalizeQuery(lastQuery);

  const endpoint = `/api/queries?type=announcements&content=${encodeURIComponent(trimmed)}&limit=10&cursor=${encodeURIComponent(lastCursor)}`;

  try {
    const res = await fetch(endpoint, { credentials: "include" });
    if (!res.ok) {
      throw new Error(`Search request failed with status ${res.status}`);
    }

    const data = await res.json();
    lastQuery = trimmed;
    lastCursor = data.nextCursor || null;
    processData(data);
  } catch (error) {
    console.error("Error during search:", error);
  }
}

function boot() {
  initializeSearch({ onSearch: searchAnnouncements, onMore: moreAnnouncements });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
