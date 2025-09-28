import { getAvatarColor, getInitials } from "/public/js/utils/avatars.js";
import { format } from "date-fns";

const lineHeight = 24;
const maxRows = 5;
const statusColors = {
  undefined: "gray",
  ok: "green",
  help: "yellow",
  emergency: "red",
};

let socket = io();

socket.on("message", (message) => {
  const msgEl = createMessageElement(
    message.sender,
    message.content,
    message.status,
    message.timestamp,
    message.sender === username,
  );
  ui.messageList.appendChild(msgEl);
  ui.messageList.scrollTop = ui.messageList.scrollHeight;
});

const $ = (s) => document.querySelector(s);

const ui = {
  input: $("#msg-input"),
  form: $("#msg-form"),
  messageList: $("#msg-list"),
  sendBtn: $("#send-btn"),
};

// TODO: total online number

function createMessageElement(
  name,
  text,
  status,
  timestamp,
  isOwnMessage = false,
) {
  const li = document.createElement("li");
  li.className = "mb-4 flex items-start gap-3";

  // TODO: show online status
  // const status = document.createElement("span");
  // status.className = "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-400";
  // avatar.appendChild(status);
  const avatar = document.createElement("figure");
  avatar.className =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full";
  avatar.style.backgroundColor = getAvatarColor(name);
  const initials = document.createElement("span");
  initials.className = "font-poppins font-semibold text-white";
  initials.textContent = getInitials(name);
  avatar.appendChild(initials);

  const content = document.createElement("div");
  content.className = "flex min-w-0 flex-col items-start";
  const headerEl = document.createElement("div");
  headerEl.className = "flex items-center gap-4";

  const nameEl = document.createElement("span");
  nameEl.className = "font-poppins font-bold";
  nameEl.textContent = name;
  headerEl.appendChild(nameEl);

  const statusEl = document.createElement("span");
  statusEl.className = `min-w-16 rounded-md bg-${statusColors[status]}-200 px-1 text-center font-poppins text-xs font-semibold text-${statusColors[status]}-500`;
  statusEl.textContent = status.toUpperCase();
  headerEl.appendChild(statusEl);
  content.appendChild(headerEl);

  const timeEl = document.createElement("p");
  timeEl.className = "font-poppins text-xs text-gray-400";
  const now = timestamp ?? new Date();
  timeEl.textContent = format(new Date(now), "MMMM dd yyyy 'at' hh:mm aa");

  const textEl = document.createElement("p");
  textEl.className =
    "mt-1 inline-block max-w-full break-words rounded-lg bg-white p-3 font-poppins shadow";
  textEl.textContent = text;
  content.appendChild(timeEl);
  content.appendChild(textEl);

  const padding = document.createElement("figure");
  padding.className =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-transparent";

  if (isOwnMessage) {
    li.classList.add("flex-row-reverse");
    headerEl.classList.add("flex-row-reverse");
    content.classList.remove("items-start");
    content.classList.add("items-end");
  }

  li.appendChild(avatar);
  li.appendChild(content);
  li.appendChild(padding);

  return li;
}

async function sendMessage(text) {
  try {
    if (text) {
      ui.input.value = "";
      ui.input.rows = 1;
      ui.sendBtn.disabled = true;
      const res = await fetch("api/auth/accounts", {
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
          sender: user._id,
          content: text,
          status: user.status,
          timestamp: date,
        }),
      });
      if (!postRes.ok) throw new Error(`HTTP error! status: ${postRes.status}`);
    }
  } catch (e) {
    console.error("Failed to send message:", e);
  }
}

async function fetchMessages() {
  try {
    const res = await fetch("/api/messages/public", {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const messages = await res.json();

    const fragment = document.createDocumentFragment();
    messages.forEach((msg) => {
      fragment.appendChild(
        createMessageElement(
          msg.sender,
          msg.content,
          msg.status,
          msg.timestamp,
          msg.sender === username,
        ),
      );
    });
    ui.messageList.appendChild(fragment);

    ui.messageList.scrollTop = ui.messageList.scrollHeight;
  } catch (e) {
    console.error("Failed to fetch or parse messages:", e);
  }
}

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

ui.input.addEventListener("keydown", (e) => {
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

fetchMessages();

//////////////////////////
const STATUS = {
  undefined: "gray",
  ok: "green",
  help: "yellow",
  emergency: "red",
};

function renderMessage({ name, text, status, timestamp, isOwn }) {
  const tpl = document.getElementById("chat-message");
  const li = tpl.content.firstElementChild.cloneNode(true);

  const safeName = toStr(name, "Unknown").trim() || "Unknown";
  const safeText = toStr(text, "");
  const key = (status || "undefined").toString().toLowerCase();
  const color = STATUS[key] || STATUS.undefined;

  li.querySelector(".name").textContent = safeName;
  li.querySelector(".time").textContent = formatDate(timestamp || new Date());
  li.querySelector(".bubble").textContent = safeText;

  const badge = li.querySelector(".status-badge");
  badge.textContent = (
    Object.keys(STATUS).includes(key) ? key : "undefined"
  ).toUpperCase();
  badge.classList.add(`bg-${color}-200`, `text-${color}-500`);

  const avatar = li.querySelector(".avatar");
  avatar.style.backgroundColor = getAvatarColor(safeName);
  li.querySelector(".initials").textContent = getInitials(safeName);

  if (isOwn) {
    li.classList.add("flex-row-reverse");
    li.querySelector(".header").classList.add("flex-row-reverse");
    const content = li.querySelector(".content");
    content.classList.remove("items-start");
    content.classList.add("items-end");
    const bubble = li.querySelector(".bubble");
    bubble.classList.remove("bg-white");
    bubble.classList.add("bg-blue-50");
  }
  return li;
}
// history
messages.forEach((m) => {
  const s = normalizeSender(m.sender, m.senderName);
  const own = isOwnSender(s);
  ui.messageList.appendChild(
    renderMessage({
      name: s.displayName,
      text: m.content,
      status: m.status,
      timestamp: m.timestamp,
      isOwn: own,
    }),
  );
});

// socket
socket.on("message", (m) => {
  const s = normalizeSender(m.sender, m.senderName);
  const own = isOwnSender(s);
  ui.messageList.appendChild(
    renderMessage({
      name: s.displayName,
      text: m.content,
      status: m.status,
      timestamp: m.timestamp,
      isOwn: own,
    }),
  );
});
