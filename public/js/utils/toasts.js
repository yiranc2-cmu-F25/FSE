import { getInitialsSafe, getAvatarColor } from "./avatars.js";
import { renderMessage } from "./renderMessage.js";
const STATUS = {
    undefined: "gray",
    ok: "green",
    help: "yellow",
    emergency: "red",
};
function timeStr(ts) {
  return new Date(ts || Date.now()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function openDMSheet({ name, peerId, text, status, timestamp }) {
  const sheet = document.getElementById("dm-sheet");
  if (!sheet) return;

  const list = sheet.querySelector("#dm-sheet-list");
  if (list) {
    list.innerHTML = "";
    list.appendChild(renderMessage({
      name,
      text,
      status,
      timestamp,
      isOwn: false,
    }));
    list.scrollTop = list.scrollHeight;
  }

  const btn = sheet.querySelector("#dm-sheet-reply");
  btn.onclick = () => {
    window.location.href = `/chats/private/${encodeURIComponent(peerId)}`;
  };

  sheet.classList.remove("hidden");
}

function showToast({ sender, senderId, timestamp, text, status }) {
  const root = document.getElementById("notif-root");
  const tpl  = document.getElementById("notif-toast");
  if (!root || !tpl) return;

  const el = tpl.content.firstElementChild.cloneNode(true);
  el.dataset.peerId = senderId || "";
  root.querySelector(`[data-peer-id="${senderId}"]`)?.remove();

  const name = sender || "Someone";
  const av = el.querySelector("[data-avatar]");
  const ini = el.querySelector("[data-initials]");

  ini.textContent = getInitialsSafe(name);
  av.style.backgroundColor = getAvatarColor(name);
  av.style.color = "#fff";

  el.querySelector("[data-title]").textContent = name;
  el.querySelector("[data-time]").textContent  = timeStr(timestamp);
  el.querySelector("[data-sub]").textContent   = "You received a new message";
  const key = (status || "undefined").toString().toLowerCase();
  const color = STATUS[key] || STATUS.undefined;
  const badge = el.querySelector(".status-badge");
  badge.textContent = (
      Object.keys(STATUS).includes(key) ? key : "undefined"
  ).toUpperCase();
  badge.classList.add(`bg-${color}-200`, `text-${color}-500`);

  el.querySelector("[data-dismiss]").addEventListener("click", () => { el.remove(); });
  el.querySelector("[data-view]").addEventListener("click", () => { 
    root.innerHTML = "";
    openDMSheet({ name, peerId: senderId, text, status, timestamp});
    });

  root.appendChild(el);
}

export { showToast };