import { getSocket } from "/js/utils/socket.js";
import { renderMessage } from "/js/utils/renderMessage.js";

// Styling constants
const lineHeight = 24;
const maxRows = 5;

// HTML element selectors
const $ = (s) => document.querySelector(s);
const ui = {
  input: $("#msg-input"),
  form: $("#msg-form"),
  messageList: $("#msg-list"),
  sendBtn: $("#send-btn"),
  onlineCount: $("#online-num"),
};

const me = (window.__CURRENT_USER__ || "").trim().toLowerCase();

const socket = getSocket();

async function loadOnlineMemberCount() {
  const res = await fetch("/api/authentications/lists", {
    credentials: "include",
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { onlineUsers = [], offlineUsers = [] } = await res.json();
  const onlineCount = onlineUsers.length;
  if (ui.onlineCount) {
    ui.onlineCount.textContent = onlineCount.toString();
  }
}

function setupPublicMessageListener() {
  socket.on("public_message", (message) => {
    const { sender, content, status, timestamp, isOwn } = message;
    const s = (message?.sender || "").toLowerCase();
    const localIsOwn = me && s && s === me;
    const msgEl = renderMessage({
      name: sender,
      text: content,
      status,
      timestamp,
      isOwn: localIsOwn,
    });
    ui.messageList.appendChild(msgEl);
    ui.messageList.scrollTop = ui.messageList.scrollHeight;
  });
}

function setupOnlineMemberCountListener() {
  socket.on("user_list", (userList) => {
    ui.onlineCount.textContent = userList.length.toString();
  });
}

// Async Message Sending and Retrieval
const fetchPublicMessagesPath = "/api/messages/public";

async function fetchMessages() {
  try {
    const publicMessages = await retrievePublicMessages();
    renderPublicMessages(publicMessages);
    scrollMessagesToBottom();
  } catch (e) {
    logFetchError(e);
  }
}

async function sendMessage(text) {
  try {
    if (!text) return;
    prepareInputForSend();
    const user = await fetchCurrentUser();
    await postPublicMessage(user, text);
  } catch (e) {
    logSendError(e);
  }
}

async function retrievePublicMessages() {
  const res = await fetch(fetchPublicMessagesPath, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}

function renderPublicMessages(messages) {
  messages.forEach((message) => appendMessageToList(message));
}

function appendMessageToList(message) {
  ui.messageList.appendChild(
    renderMessage({
      name: message.sender,
      text: message.content,
      status: message.status,
      timestamp: message.timestamp,
      isOwn: message.isOwn,
    }),
  );
}

function scrollMessagesToBottom() {
  ui.messageList.scrollTop = ui.messageList.scrollHeight;
}

function logFetchError(error) {
  console.error("Failed to fetch messages:", error);
}

function prepareInputForSend() {
  ui.input.value = "";
  ui.input.rows = 1;
  ui.sendBtn.disabled = true;
}

async function fetchCurrentUser() {
  const res = await fetch("api/authentications/accounts", { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}

async function postPublicMessage(user, text) {
  const postRes = await fetch("/api/messages/public", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(buildMessagePayload(user, text)),
  });
  if (!postRes.ok) throw new Error(`HTTP error! status: ${postRes.status}`);
}

function buildMessagePayload(user, text) {
  return {
    sender: user.id,
    content: text,
    status: user.status.toLowerCase(),
    timestamp: new Date(),
  };
}

function logSendError(error) {
  console.error("Failed to send message:", error);
}

let isImeActive = false;

function setupInputListener() {
  // Event Listeners
  ui.input.addEventListener("input", () => {
    if (!ui.input.value) {
      ui.sendBtn.disabled = true;
    } else {
      ui.sendBtn.disabled = false;
    }
    ui.input.rows = 1;
    const currentRows = Math.min(
      Math.floor(ui.input.scrollHeight / lineHeight),
      maxRows,
    );
    ui.input.rows = currentRows;
    ui.input.scrollTop = ui.input.scrollHeight;
    ui.messageList.scrollTop = ui.messageList.scrollHeight;
  });
}

function setupCompositionListeners() {
  ui.input.addEventListener("compositionstart", () => {
    isImeActive = true;
  });

  ui.input.addEventListener("compositionend", () => {
    // Delay so the keydown that comes right after we commit doesn't read false immediately.
    setTimeout(() => {
      isImeActive = false;
    });
  });
}

function setupEnterListener() {
  ui.input.addEventListener("keydown", (e) => {
    if (isImeActive || e.key === "Process" || e.keyCode === 229) {
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(ui.input.value);
    }
  });
}

function setupSendButtonListener() {
  ui.form.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage(ui.input.value);
  });
}

function setupScrollListener() {
  document.addEventListener("DOMContentLoaded", () => {
    ui.messageList.scrollTop = ui.messageList.scrollHeight;
  });
}

// Top-level Scripts
await loadOnlineMemberCount();
fetchMessages();
setupPublicMessageListener();
setupOnlineMemberCountListener();
setupInputListener();
setupCompositionListeners();
setupEnterListener();
setupSendButtonListener();
setupScrollListener();
