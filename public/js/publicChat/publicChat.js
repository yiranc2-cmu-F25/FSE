import { getSocket } from "/js/utils/socket.js";
import { renderMessage } from "/js/utils/renderMessage.js";
// console.log("[chat] module eval at", performance.now(), "ms; readyState=", document.readyState);
// console.log("[chat] __CURRENT_USER__ at import time =", window.__CURRENT_USER__);

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
};
// TODO: total online number
// TODO: show online status
// const status = document.createElement("span");
// status.className = "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-400";
// avatar.appendChild(status);
// Socket.io setup
const me = (window.__CURRENT_USER__ || "").trim().toLowerCase();

// console.log("[chat] before getSocket, __CURRENT_USER__ =", window.__CURRENT_USER__);
const socket = getSocket();
// console.log("[chat] after getSocket, socket?.auth =", socket?.auth);
// Incoming message should have:
// {
//     sender : msg.sender.username,
//     content : msg.content,
//     timestamp : msg.timestamp,
//     status : msg.status
// }

socket.on("public_message", (message) => {
  const { sender, content, status, timestamp, isOwn } = message;
  //   const isOwn = false;
  const s = (message?.sender || "").toLowerCase();
  const localIsOwn = me && s && s === me;
  console.log("Me:" + me);
  console.log("s:" + s);
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

// Async Message Sending and Retrieval
const fetchPublicMessagesPath = "/api/messages/public";
async function fetchMessages() {
  try {
    const res = await fetch(fetchPublicMessagesPath, {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const publicMessages = await res.json();

    publicMessages.forEach((m) => {
      //   const isOwn = false;
      ui.messageList.appendChild(
        renderMessage({
          name: m.sender,
          text: m.content,
          status: m.status,
          timestamp: m.timestamp,
          isOwn: m.isOwn,
        }),
      );
    });
    ui.messageList.scrollTop = ui.messageList.scrollHeight;
  } catch (e) {
    console.error("Failed to fetch messages:", e);
  }
}
async function sendMessage(text) {
  try {
    if (text) {
      ui.input.value = "";
      ui.input.rows = 1;
      ui.sendBtn.disabled = true;
      const res = await fetch("api/authentications/accounts", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const user = await res.json();
      let date = new Date();
      const postRes = await fetch("/api/messages/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sender: user.id,
          content: text,
          status: user.status.toLowerCase(),
          timestamp: date,
        }),
      });
      if (!postRes.ok) throw new Error(`HTTP error! status: ${postRes.status}`);
    }
  } catch (e) {
    console.error("Failed to send message:", e);
  }
}
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

let isImeActive = false;

ui.input.addEventListener("compositionstart", () => {
  isImeActive = true;
});

ui.input.addEventListener("compositionend", () => {
  // Delay so the keydown that comes right after we commit doesn't read false immediately.
  setTimeout(() => {
    isImeActive = false;
  });
});

ui.input.addEventListener("keydown", (e) => {
  if (isImeActive || e.key === "Process" || e.keyCode === 229) {
    return;
  }

  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage(ui.input.value);
  }
});

ui.form.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage(ui.input.value);
});

document.addEventListener("DOMContentLoaded", () => {
  ui.messageList.scrollTop = ui.messageList.scrollHeight;
});

// Top-level Scripts
fetchMessages();
