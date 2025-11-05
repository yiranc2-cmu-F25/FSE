import { loadInfo } from "/js/utils/loadUserInfo.js";

const $ = (selector) => document.querySelector(selector);
let ui = {};

function pickSender(user) {
  return (
    user?.id ||
    user?._id ||
    user?.userId ||
    user?.email ||
    user?.username ||
    null
  );
}

function addClasses(el, ...cls) {
  el.classList.add(...cls);
}
function removeClasses(el, ...cls) {
  el.classList.remove(...cls);
}

function initUI() {
  ui = {
    createBtn: $("#create-announcement-btn"),
    composeCard: $("#compose-card"),
    form: $("#compose-card"),
    textarea: $("#announcement-input"),
    sendBtn: $("#send-btn"),
  };
  return Object.values(ui).every((el) => el !== null);
}

function expandCompose() {
  ui.composeCard.setAttribute("data-state", "expanded");
  ui.createBtn?.setAttribute("aria-expanded", "true");
  ui.composeCard.classList.remove("hidden", "pointer-events-none");
  removeClasses(ui.composeCard, "max-h-0", "opacity-0", "scale-95");
  addClasses(ui.composeCard, "max-h-[320px]", "opacity-100", "scale-100");
  ui.createBtn.classList.add("hidden");
  setTimeout(() => ui.textarea?.focus(), 30);
}

function collapseCompose() {
  ui.composeCard.setAttribute("data-state", "collapsed");
  ui.createBtn?.setAttribute("aria-expanded", "false");
  addClasses(ui.composeCard, "pointer-events-none");
  addClasses(ui.composeCard, "max-h-0", "opacity-0", "scale-95");
  removeClasses(ui.composeCard, "max-h-[320px]", "opacity-100", "scale-100");
  ui.form.reset();
  ui.sendBtn.disabled = true;
  ui.createBtn.classList.remove("hidden");
  ui.composeCard.classList.add("hidden");
}

function toggleComposeCard() {
  const isCollapsed =
    ui.composeCard.classList.contains("hidden") ||
    ui.composeCard.getAttribute("data-state") === "collapsed";
  if (isCollapsed) expandCompose();
  else collapseCompose();
}

function updateSendButton() {
  const hasContent = ui.textarea.value.trim().length > 0;
  ui.sendBtn.disabled = !hasContent;
}

async function handleSubmit(e) {
  e.preventDefault();
  console.log("[postAnnouncement] handleSubmit called");

  const content = ui.textarea.value.trim();
  if (!content) {
    console.log("[postAnnouncement] No content, returning");
    return;
  }

  try {
    console.log("[postAnnouncement] Loading user info...");
    const user = await loadInfo();
    console.log("[postAnnouncement] User info loaded:", user);

    const sender = pickSender(user);
    if (!sender) {
      console.error("[postAnnouncement] Missing sender info from user");
      alert("Failed to get user information. Please refresh the page.");
      return;
    }

    const status = user.status;
    console.log("[postAnnouncement] User status:", status);

    ui.sendBtn.disabled = true;
    console.log("[postAnnouncement] Send button disabled, sending request...");

    const timestamp = new Date().toISOString();
    const payload = { sender, content, status, timestamp };
    console.log("body sent:", payload);

    const response = await fetch("/api/announcements/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    console.log("[postAnnouncement] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[postAnnouncement] Error response:", errorText);
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorText}`,
      );
    }

    const result = await response.json();
    console.log("[postAnnouncement] Success:", result);

    ui.textarea.value = "";
    updateSendButton();
    collapseCompose();
  } catch (error) {
    console.error("[postAnnouncement] Failed to post announcement:", error);
    ui.sendBtn.disabled = false;
    alert(`Failed to post announcement: ${error.message}`);
  }
}

function initEventListeners() {
  console.log("[postAnnouncement] Initializing...");

  const ok = initUI();
  if (!ok) {
    console.error("[postAnnouncement] Some UI elements not found:", {
      createBtn: !!ui.createBtn,
      composeCard: !!ui.composeCard,
      form: !!ui.form,
      textarea: !!ui.textarea,
      sendBtn: !!ui.sendBtn,
    });
    return;
  }
  console.log("[postAnnouncement] All UI elements found");

  ui.createBtn?.addEventListener("click", toggleComposeCard);
  console.log("[postAnnouncement] Create button listener attached");

  ui.form?.addEventListener("submit", (e) => {
    console.log("[postAnnouncement] Form submit event triggered");
    handleSubmit(e);
  });

  ui.sendBtn?.addEventListener("click", (e) => {
    console.log(
      "[postAnnouncement] Send button clicked, disabled:",
      ui.sendBtn.disabled,
    );
    if (!ui.sendBtn.disabled && ui.form) {
      e.preventDefault();
      handleSubmit(e);
    }
  });

  if (ui.textarea) {
    ui.textarea.addEventListener("input", updateSendButton);
    ui.textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!ui.sendBtn.disabled) handleSubmit(e);
      }
    });
  }

  if (ui.sendBtn) ui.sendBtn.disabled = true;

  document.addEventListener("click", (e) => {
    const isExpanded = ui.composeCard.getAttribute("data-state") === "expanded";
    if (!isExpanded) return;

    const target = e.target;

    const clickedInsideCompose = ui.composeCard.contains(target);
    const clickedCreateBtn = ui.createBtn.contains(target);
    const clickedBackBtn = target.closest("#back-button") !== null;

    if (!clickedInsideCompose && !clickedCreateBtn && !clickedBackBtn) {
      console.log(
        "[postAnnouncement] Clicked outside compose card, collapsing...",
      );
      collapseCompose();
    }
  });

  console.log("[postAnnouncement] Initialization complete");
}

// DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initEventListeners);
} else {
  setTimeout(initEventListeners, 0);
}
