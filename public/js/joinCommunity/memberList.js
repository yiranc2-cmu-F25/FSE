import { getInitials, getAvatarColor } from "/js/utils/avatars.js";
import { getSocket } from "/js/utils/socket.js";

const onlineSection = document.querySelector("#online-members-list");
const offlineSection = document.querySelector("#offline-members-list");
const onlineUL = onlineSection ? onlineSection.querySelector("ul")  : null;
const offlineUL = offlineSection ? offlineSection.querySelector("ul") : null;
const onlineTitleEl = document.getElementById("online-members-title");

function renderUserItem(u, isOnline) {
  const li = document.createElement("li");
  li.className = `px-4 py-3`;

  const article = document.createElement("article");
  article.className = `flex items-start gap-3${isOnline ? "" : " opacity-80"}`;
  li.appendChild(article);

  const left = document.createElement("div");
  left.className = "relative";
  article.appendChild(left);

  const avatar = document.createElement("div");
  avatar.className = "grid h-9 w-9 place-content-center rounded-full text-xs font-bold text-white";
  const name = (u.name || "").trim();
  avatar.style.backgroundColor = getAvatarColor(name);
  avatar.textContent = getInitials(name);
  left.appendChild(avatar);

  const dot = document.createElement("span");
  dot.className = `absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${isOnline ? "bg-green-500" : "bg-stone-300"} ring-2 ring-white`;
  dot.setAttribute("aria-label", isOnline ? "online" : "offline");
  left.appendChild(dot);

  const right = document.createElement("div");
  right.className = "min-w-0 flex-1";
  article.appendChild(right);

  const nameRow = document.createElement("div");
  nameRow.className = "name-status-div flex items-center gap-2";
  right.appendChild(nameRow);

  const nameEl = document.createElement("p");
  nameEl.className = "member-name truncate font-medium";
  nameEl.textContent = name;
  nameRow.appendChild(nameEl);

  const status = (u.status || "UNDEFINED").toUpperCase();
  if (status === "HELP") {
    const st = document.createElement("span");
    st.className = "rounded bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800";
    st.textContent = "HELP";
    nameRow.appendChild(st);
  } else if (status === "EMERGENCY") {
    const st = document.createElement("span");
    st.className = "rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700";
    st.textContent = "EMERGENCY";
    nameRow.appendChild(st);
  }

  const last = document.createElement("p");
  last.className = "mt-0.5 text-xs text-stone-500";
  last.textContent = `Last seen ${u.lastSeen || ""}`;
  right.appendChild(last);

  return li;
}

function renderLists(onlineUsers, offlineUsers) {
  if (!onlineUL || !offlineUL) return;
  onlineUL.innerHTML = "";
  offlineUL.innerHTML = "";

  for (const u of (onlineUsers || []))  onlineUL.appendChild(renderUserItem(u, true));
  for (const u of (offlineUsers || [])) offlineUL.appendChild(renderUserItem(u, false));

  if (onlineTitleEl) {
    onlineTitleEl.textContent = `Online Members (${onlineUsers ? onlineUsers.length : 0})`;
  }
}

async function loadMembers() {
  const res = await fetch("/api/auth/list", { 
    credentials: "include", 
    headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { onlineUsers, offlineUsers } = await res.json();
  renderLists(onlineUsers, offlineUsers);
}

(function setupPresence() {
  if (!window.io) return;
  const me = (window.__CURRENT_USER__ || "").trim();
  const socket = getSocket(); 

  socket.on("user_list", () => {
    loadMembers().catch(() => {});
  });
})();

document.addEventListener("DOMContentLoaded", () => {
  loadMembers().catch(err => console.error("[membersList] load error:", err));
});
