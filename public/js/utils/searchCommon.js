import { initializeSearch, normalizeQuery, hideFooter, processData, showNoResultsMessage } from "./searchInit.js";

const lastCursors = [];
let lastQuery = "";
let searchContext = "";
let searchPeerId = "";
let begin = 1;

async function searchCommon(query) {
  const trimmed = normalizeQuery(query);
  if (!trimmed) {
    hideFooter();
    showNoResultsMessage();
    return;
  }

  const endpoint = [
    `/api/queries?type=${encodeURIComponent(searchContext)}`,
    `&content=${encodeURIComponent(trimmed)}`,
    `&limit=10`,
    `&peerId=${encodeURIComponent(searchPeerId)}`
  ].join("");

  try {
    const res = await fetch(endpoint, { credentials: "include" });
    if (!res.ok) {
      throw new Error(`Search request failed with status ${res.status}`);
    }

    const data = await res.json();
    lastQuery = trimmed;
    lastCursors.length = 0;
    lastCursors.push(data.nextCursor || null);
    begin = 1;
    processData(data, begin);
  } catch (error) {
    console.error("Error during search:", error);
  }
}

async function moreCommon() {
  if (lastCursors.at(-1) === null) {
    console.warn("No more results to load.");
    return;
  }

  const trimmed = normalizeQuery(lastQuery);

  const endpoint = [
    `/api/queries?type=${encodeURIComponent(searchContext)}`,
    `&content=${encodeURIComponent(trimmed)}`,
    `&limit=10`,
    `&cursor=${encodeURIComponent(lastCursors.at(-1))}`,
    `&peerId=${encodeURIComponent(searchPeerId)}`
  ].join("");

  try {
    const res = await fetch(endpoint, { credentials: "include" });
    if (!res.ok) {
      throw new Error(`Search request failed with status ${res.status}`);
    }

    const data = await res.json();
    lastQuery = trimmed;
    lastCursors.push(data.nextCursor || null);
    begin += 10;
    processData(data, begin);
  } catch (error) {
    console.error("Error during search:", error);
  }
}

async function lessCommon() {
  if (lastCursors.length < 2) {
    console.warn("No more results to load.");
    return;
  }

  const trimmed = normalizeQuery(lastQuery);

  const cursor = lastCursors.length === 2 ? "" : lastCursors.at(-3);

  const endpoint = [
    `/api/queries?type=${encodeURIComponent(searchContext)}`,
    `&content=${encodeURIComponent(trimmed)}`,
    `&limit=10`,
    `&cursor=${encodeURIComponent(cursor)}`,
    `&peerId=${encodeURIComponent(searchPeerId)}`
  ].join("");

  try {
    const res = await fetch(endpoint, { credentials: "include" });
    if (!res.ok) {
      throw new Error(`Search request failed with status ${res.status}`);
    }

    const data = await res.json();
    lastQuery = trimmed;
    lastCursors.length -= 1;
    begin -= 10;
    processData(data, begin);
  } catch (error) {
    console.error("Error during search:", error);
  }
}

function boot({search, more, less}) {
  initializeSearch({ onSearch: search ?? searchCommon, onMore: more ?? moreCommon, onLess: less ?? lessCommon });
}

function initializeSearchContext(context, peerId, {search, more, less}) {
  searchContext = context;
  searchPeerId = peerId;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", 
      () => {
        boot({search, more, less});
      }
    );
  } else {
    boot({search, more, less});
  }
}

export { initializeSearchContext, searchCommon, moreCommon, lessCommon };
