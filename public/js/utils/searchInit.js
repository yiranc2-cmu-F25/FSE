import { renderSearchItem } from "../utils/renderSearchItem.js";

let searchHandler = async () => {};
let moreHandler = async () => {};
let lessHandler = async () => {};
let initialized = false;

export const RESULT_BEGIN_INDEX = 1;

const $ = (s) => document.querySelector(s);
const ui = {
  search_screen_button: $("#search-screen-btn"),
  search_screen: $("#search-screen"),
  search_input: $("#search-prompt"),
  clear_search_input: $("#clear-search-input"),
  next_button: $("#next-button"),
  previous_button: $("#previous-button"),
  search_result_scroll: $("#search-result-scroll"),
};

function openModal() {
  ui.search_screen?.classList.remove("hidden");
  ui.search_screen?.classList.add("flex");
  ui.search_screen?.querySelector("input")?.focus();
  document.body.classList.add("overflow-hidden");
}

function closeModal() {
  ui.search_screen?.classList.remove("flex");
  ui.search_screen?.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

function setSearchHandler(handler) {
  searchHandler = typeof handler === "function" ? handler : () => {};
}

function setMoreHandler(handler) {
  moreHandler = typeof handler === "function" ? handler : () => {};
}

function setLessHandler(handler) {
  lessHandler = typeof handler === "function" ? handler : () => {};
}

function setupSearchScreenButton() {
  ui.search_screen_button?.addEventListener("click", () => {
    openModal();
  });

  ui.search_screen?.addEventListener("click", (e) => {
    if (e.target === ui.search_screen) {
      e.stopPropagation();
      e.preventDefault();
      closeModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !ui.search_screen?.classList.contains("hidden")) {
      closeModal();
    }
  });
}

function clearSearchResults() {
  ["#online-search-result-list", "#offline-search-result-list", "#search-result-list"].forEach((selector) => {
    const list = document.querySelector(selector);
    if (list) {
      list.innerHTML = "";
    }
  });
}

function setupSearchInput() {
  const IME_PROCESSING_KEY_CODE = 229;

  ui.clear_search_input?.addEventListener("click", () => {
    const input = ui.search_input;
    if (!input) return;
    input.value = "";
    input.focus();
  });

  let isImeActive = false;
  ui.search_input?.addEventListener("compositionstart", () => {
    isImeActive = true;
  });
  ui.search_input?.addEventListener("compositionend", () => {
    setTimeout(() => {
      isImeActive = false;
    });
  });
  ui.search_input?.addEventListener("keydown", (e) => {
    if (isImeActive || e.key === "Process" || e.keyCode === IME_PROCESSING_KEY_CODE) {
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const value = ui.search_input?.value ?? "";
      clearSearchResults();
      Promise.resolve(searchHandler(value)).catch((err) => {
        console.error("Search handler failed:", err);
      });
    }
  });
}

function setupMore() {
  attachPaginatedHandler(ui.next_button, moreHandler, "More handler failed:");
}

function setupLess() {
  attachPaginatedHandler(ui.previous_button, lessHandler, "Less handler failed:");
}

function attachPaginatedHandler(button, handler, errorLabel) {
  button?.addEventListener("click", () => {
    if (button.disabled) return;
    button.disabled = true;
    clearSearchResults();
    Promise.resolve(handler())
      .catch((err) => console.error(errorLabel, err))
      .finally(() => {
        button.disabled = false;
      });
  });
}

export function hideFooter() {
  const footer = document.querySelector("#search-result-footer");
  if (footer) {
    footer.classList.remove("flex");
    footer.classList.add("hidden");
  }
}

export function showFooter({start, end, total}) {
  const footer = document.querySelector("#search-result-footer");
  if (footer) {
    footer.classList.remove("hidden");
    footer.classList.add("flex");
  }
  document.querySelector("#search-result-start").textContent = start;
  document.querySelector("#search-result-end").textContent = end;
  document.querySelector("#search-result-count").textContent = total;
  if (total === 0 || (start === 0 && end === 0)) {
    document.querySelector("#search-result-interval")?.classList.add("hidden");
  } else {
    document.querySelector("#search-result-interval")?.classList.remove("hidden");
  }
}

export function hideNoResultsMessage() {
  const resultPageEl = document.querySelector("#result-page");
  if (resultPageEl) {
    resultPageEl.classList.remove("hidden");
    resultPageEl.classList.add("flex");
  }
  const noResultEl = document.querySelector("#no-result-page");
  if (noResultEl) {
    noResultEl.classList.remove("flex");
    noResultEl.classList.add("hidden");
  }
}

export function showNoResultsMessage() {
  const resultPageEl = document.querySelector("#result-page");
  if (resultPageEl) {
    resultPageEl.classList.remove("flex");
    resultPageEl.classList.add("hidden");
  }
  const noResultEl = document.querySelector("#no-result-page");
  if (noResultEl) {
    noResultEl.classList.remove("hidden");
    noResultEl.classList.add("flex");
  }
}

export function hideNextButton() {
  const nextButton = document.querySelector("#next-button");
  if (nextButton) {
    nextButton.classList.remove("flex");
    nextButton.classList.add("hidden");
  }
}

export function showNextButton() {
  const nextButton = document.querySelector("#next-button");
  if (nextButton) {
    nextButton.classList.remove("hidden");
    nextButton.classList.add("flex");
  }
}

export function hidePreviousButton() {
  const prevButton = document.querySelector("#previous-button");
  if (prevButton) {
    prevButton.classList.remove("flex");
    prevButton.classList.add("hidden");
  }
}

export function showPreviousButton() {
  const prevButton = document.querySelector("#previous-button");
  if (prevButton) {
    prevButton.classList.remove("hidden");
    prevButton.classList.add("flex");
  }
}

export function normalizeQuery(raw) {
  return raw?.trim() ?? "";
}

export function processData(data, begin) {
  if (!data.count || data.count === 0) {
    showNoResultsMessage();
    hideFooter();
    return;
  } else {
    hideNoResultsMessage();
    data.results?.forEach((message) => {
      message = {
        name: message.sender ?? message.name ?? "Status Changing to",
        timestamp: message.changedAt ?? message.timestamp,
        ...message,
      }
      const itemNode = renderSearchItem(message);
      document.querySelector("#search-result-list").appendChild(itemNode);
    });
    const listLength = document.querySelector("#search-result-list").children.length;
    const interval = {
      start: begin,
      end: begin + listLength - 1,
      total: data.count || 0,
    };
    showFooter(interval);
    showPreviousButton();
    showNextButton();
    if (interval.start == 1) {
      hidePreviousButton();
    }
    if (interval.end == interval.total) {
      hideNextButton();
    }
  }
}

export function initializeSearch(options = {}) {
  if (options.onSearch) {
    setSearchHandler(options.onSearch);
  }
  if (options.onMore) {
    setMoreHandler(options.onMore);
  }
  if (options.onLess) {
    setLessHandler(options.onLess);
  }
  if (initialized) {
    return;
  }
  setupSearchScreenButton();
  setupSearchInput();
  setupMore();
  setupLess();
  initialized = true;
}
