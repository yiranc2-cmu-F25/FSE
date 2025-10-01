import { getInitialsSafe, getAvatarColor } from "../utils/avatars.js";
import { getSocket } from "/js/utils/socket.js";

// ---------- DOM refs ----------
const onlineUL = document.querySelector("#online-members-list ul");
const offlineUL = document.querySelector("#offline-members-list ul");
const onlineH3 = document.getElementById("online-members-title");

// ---------- tiny utils ----------
const $c = (tag, className) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
};

const STATUS_BADGE_CLASS = {
  HELP: "rounded bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800",
  EMERGENCY: "rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700",
};

function badgeFor(statusUpper) {
  const cls = STATUS_BADGE_CLASS[statusUpper];
  if (!cls) return null;
  const st = $c("span", cls);
  st.textContent = statusUpper;
  return st;
}

// ---------- render ----------
function renderUserItem(u, isOnline) {
  const li = $c("li", "px-4 py-3");
  const article = $c("article", `flex items-start gap-3${isOnline ? "" : " opacity-80"}`);
  li.appendChild(article);

  // left: avatar + dot
  const left = $c("div", "relative");
  const avatar = $c("div", "grid h-9 w-9 place-content-center rounded-full text-xs font-bold text-white");
  const name = (u.name || "").trim();
  avatar.style.backgroundColor = getAvatarColor(name);
  avatar.textContent = getInitialsSafe(name);
  left.appendChild(avatar);

  const dot = $c("span",
    `absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${isOnline ? "bg-green-500" : "bg-stone-300"} ring-2 ring-white`
  );
  dot.setAttribute("aria-label", isOnline ? "online" : "offline");
  left.appendChild(dot);
  article.appendChild(left);

  // right: name / status / last seen
  const right = $c("div", "min-w-0 flex-1");
  const nameRow = $c("div", "name-status-div flex items-center gap-2");
  const nameEl = $c("p", "member-name truncate font-medium");
  nameEl.textContent = name;
  nameRow.appendChild(nameEl);

  const statusUpper = (u.status || "UNDEFINED").toUpperCase();
  const badge = badgeFor(statusUpper);
  if (badge) nameRow.appendChild(badge);

  const last = $c("p", "mt-0.5 text-xs text-stone-500");
  last.textContent = `Last seen ${u.lastSeen || ""}`;

  right.appendChild(nameRow);
  right.appendChild(last);
  article.appendChild(right);

  return li;
}

function renderLists(onlineUsers = [], offlineUsers = []) {
  if (!onlineUL || !offlineUL) return;

  const fragOnline  = document.createDocumentFragment();
  const fragOffline = document.createDocumentFragment();

  for (const u of onlineUsers)  fragOnline.appendChild(renderUserItem(u, true));
  for (const u of offlineUsers) fragOffline.appendChild(renderUserItem(u, false));

  onlineUL.replaceChildren(fragOnline);
  offlineUL.replaceChildren(fragOffline);

  if (onlineH3) onlineH3.textContent = `Online Members (${onlineUsers.length})`;
}

// ---------- data loaders ----------
async function loadMembers() {
  const res = await fetch("/api/auth/list", {
    credentials: "include",
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { onlineUsers = [], offlineUsers = [] } = await res.json();
  renderLists(onlineUsers, offlineUsers);
}

async function loadMe() {
  const res = await fetch("/api/auth/accounts", {
    credentials: "include",
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const me = await res.json();

  const name = (me.username || "").trim();
  const initials = getInitialsSafe(name);
  const color = getAvatarColor(name);

  const avatar = document.getElementById("header-avatar");
  const avatarInit = document.getElementById("header-avatar-initials");
  const nameEl = document.getElementById("header-name");

  if (avatar) avatar.style.backgroundColor = color;
  if (avatarInit) avatarInit.textContent = initials;
  if (nameEl) nameEl.textContent = name || "Guest";

  window.__CURRENT_USER__ = name;

  const socket = getSocket();
  if (socket && !socket.connected && !socket.active && socket.connect) {
    socket.connect();
  }
}

// ---------- socket passive refresh ----------
function setupPresence() {
  const socket = getSocket();
  if (!socket) return;

  let pending = false;
  socket.on("user_list", () => {
    if (pending) return;
    pending = true;
    queueMicrotask(() => {
      loadMembers().catch(() => {});
      pending = false;
    });
  });
}

// ---------- bootstrap ----------
document.addEventListener("DOMContentLoaded", () => {
  loadMe().catch(err => console.error("[members] loadMe failed:", err));
  loadMembers().catch(err => console.error("[members] loadMembers failed:", err));
  setupPresence();
});
