import { initializeSearch, normalizeQuery, hideFooter, processData } from "../utils/searchInit.js";

let lastQuery = "";
let lastCursor = null;

async function searchPublicMessages(query) {
  const trimmed = normalizeQuery(query);
  if (!trimmed) {
    hideFooter();
  }

  const endpoint = `/api/queries?type=messages_public&content=${encodeURIComponent(trimmed)}&limit=10`;

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

async function morePublicMessages() {
  if (!lastCursor) {
    console.warn("No more results to load.");
    return;
  }

  const trimmed = normalizeQuery(lastQuery);

  const endpoint = `/api/queries?type=messages_public&content=${encodeURIComponent(trimmed)}&limit=10&cursor=${encodeURIComponent(lastCursor)}`;

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
  initializeSearch({ onSearch: searchPublicMessages, onMore: morePublicMessages });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
