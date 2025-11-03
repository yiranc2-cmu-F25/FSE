import { initializeSearch, normalizeQuery, hideFooter, showFooter, RESULT_BEGIN_INDEX } from "../utils/searchInit.js";
import { renderSearchItem } from "../utils/renderSearchItem.js";

const STATUS_KEYWORDS = ["ok", "help", "emergency"];

async function searchCitizens(query) {
  console.log("[Search] Searching citizens for query:", query);
  const trimmed = normalizeQuery(query);
  if (!trimmed) {
    const noInputTpl = document.getElementById("no-input-template");
    const onlineNoInputNode = noInputTpl.content.firstElementChild.cloneNode(true);
    document.querySelector("#online-search-result-list").appendChild(onlineNoInputNode);
    const offlineNoInputNode = noInputTpl.content.firstElementChild.cloneNode(true);
    document.querySelector("#offline-search-result-list").appendChild(offlineNoInputNode);
    hideFooter();
    return;
  }

  const normalized = trimmed.toLowerCase();
  let endpoint = `/api/queries?type=citizens&username=${encodeURIComponent(trimmed)}`;

  if (STATUS_KEYWORDS.includes(normalized)) {
    endpoint = `/api/queries?type=citizens_status&status=${encodeURIComponent(normalized)}`;
  }

  try {
    const res = await fetch(endpoint, { credentials: "include" });
    if (!res.ok) {
      throw new Error(`Search request failed with status ${res.status}`);
    }

    const data = await res.json();
    console.log("[Search results] ", data);
    data.results?.forEach((citizen) => {
      const itemNode = renderSearchItem(citizen.u);
      if (citizen.availability === "online") {
        document.querySelector("#online-search-result-list").appendChild(itemNode);
      } else {
        document.querySelector("#offline-search-result-list").appendChild(itemNode);
      }
    });
    const noResultTpl = document.getElementById("no-result-template");
    if (document.querySelector("#online-search-result-list").children.length === 0) {
      const onlineNoResultNode = noResultTpl.content.firstElementChild.cloneNode(true);
      document.querySelector("#online-search-result-list").appendChild(onlineNoResultNode);
    }
    if (document.querySelector("#offline-search-result-list").children.length === 0) {
      const offlineNoResultNode = noResultTpl.content.firstElementChild.cloneNode(true);
      document.querySelector("#offline-search-result-list").appendChild(offlineNoResultNode);
    }
    showFooter({
      start: RESULT_BEGIN_INDEX,
      end: Math.min(data.count, RESULT_BEGIN_INDEX + (data.results?.length || 0) - 1),
      total: data.count || 0,
    });
  } catch (error) {
    console.error("Error during search:", error);
  }
}

function boot() {
  initializeSearch({ onSearch: searchCitizens });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
