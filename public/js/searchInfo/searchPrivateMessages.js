import { initializeSearch, normalizeQuery, hideFooter, processData } from "../utils/searchInit.js";

let lastQuery = "";
let lastCursor = null;
let peerId = null;

function displayStatusChangeSection() {
  const statusChangeSection = document.querySelector("#status-change-section");
  if (statusChangeSection) {
    statusChangeSection.classList.remove("hidden");
    statusChangeSection.classList.add("flex");
  }
}

function hideStatusChangeSection() {
  const statusChangeSection = document.querySelector("#status-change-section");
  if (statusChangeSection) {
    statusChangeSection.classList.remove("flex");
    statusChangeSection.classList.add("hidden");
  }
}

async function searchPrivateMessages(query) {
  const trimmed = normalizeQuery(query);
  if (!trimmed) {
    hideFooter();
  }
  if (trimmed.toLowerCase() === "status") {
    displayStatusChangeSection();
  } else {
    hideStatusChangeSection();
  }

  let endpoint = `/api/queries?type=messages_private&content=${encodeURIComponent(trimmed)}&limit=10&peerId=${encodeURIComponent(peerId || "")}`;

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

async function morePrivateMessages() {
  if (!lastCursor) {
    console.warn("No more results to load.");
    return;
  }

  const trimmed = normalizeQuery(lastQuery);
  if (trimmed.toLowerCase() === "status") {
    return;
  }

  let endpoint = `/api/queries?type=messages_private&content=${encodeURIComponent(trimmed)}&limit=10&peerId=${encodeURIComponent(peerId || "")}&cursor=${encodeURIComponent(lastCursor)}`;

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

function extractPeerIdFromPath() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  const maybeId = segments[segments.length - 1] || "";
  if (/^[a-f0-9]{24}$/i.test(maybeId)) {
    return maybeId;
  }
  return null;
}

function boot() {
  peerId = extractPeerIdFromPath();
  initializeSearch({ onSearch: searchPrivateMessages, onMore: morePrivateMessages });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
