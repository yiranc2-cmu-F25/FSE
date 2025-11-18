import { normalizeQuery, showFooter, hideNextButton, hidePreviousButton } from "../utils/searchInit.js";
import { initializeSearchContext, searchCommon } from "../utils/searchCommon.js";

function extractPeerIdFromPath() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  const maybeId = segments[segments.length - 1] || "";
  if (/^[a-f0-9]{24}$/i.test(maybeId)) {
    return maybeId;
  }
  return null;
}

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
  await searchCommon(query);
  if (trimmed.toLowerCase() === "status") {
    const listLength = document.querySelector("#search-result-list").children.length;
    showFooter({ start: 0, end: 0, total: listLength });
    displayStatusChangeSection();
    hideNextButton();
    hidePreviousButton();
  } else {
    hideStatusChangeSection();
  }
}

const peerId = extractPeerIdFromPath();
const searchContext = `messages_private`;
initializeSearchContext(searchContext, peerId, {search: searchPrivateMessages});

