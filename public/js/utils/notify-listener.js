
import { getSocket } from "/js/utils/socket.js";
import { getAvatarColor, getInitialsSafe } from "/js/utils/avatars.js";
import { renderMessage } from "/js/utils/renderMessage.js";

function getCurrentDMIdFromURL() {
  const m = location.pathname.match(/^\/chats\/private\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function waitForSocket(timeoutMs = 8000, intervalMs = 100) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    (function poll() {
      const sock = getSocket?.();
      if (sock && (sock.connected || sock.id)) return resolve(sock);
      if (Date.now() > deadline) {
        console.warn("[notify] socket still not ready after", timeoutMs, "ms");
        return resolve(sock || null);
      }
      setTimeout(poll, intervalMs);
    })();
  });
}

async function getMe() {
  try {
    const r = await fetch("/api/authentications/accounts", { credentials: "include" });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } catch (e) {
    console.error("[notify] whoami failed:", e);
    return {};
  }
}

function timeStr(ts) {
  return new Date(ts || Date.now()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function showToast({ sender, senderId, timestamp, text, status }) {
  const root = document.getElementById("notif-root");
  const tpl  = document.getElementById("notif-toast");
  if (!root || !tpl) return;

  root.innerHTML = "";
  const el = tpl.content.firstElementChild.cloneNode(true);

  const name = sender || "Someone";
  const av = el.querySelector("[data-avatar]");
  const ini = el.querySelector("[data-initials]");

  ini.textContent = getInitialsSafe(name);
  av.style.backgroundColor = getAvatarColor(name);
  av.style.color = "#fff";

  el.querySelector("[data-title]").textContent = name;
  el.querySelector("[data-time]").textContent  = timeStr(timestamp);
  el.querySelector("[data-sub]").textContent   = "You recieved a new message";

  el.querySelector("[data-dismiss]").addEventListener("click", () => { root.innerHTML = ""; });
  el.querySelector("[data-view]").addEventListener("click", () => { 
    root.innerHTML = "";
    openDMSheet({ name, peerId: senderId, text, status, timestamp});
    });

  root.appendChild(el);
}


async function startDMNotify() {
  const me = await getMe();
  const myName = me?.username;
  if (!myName) return;

  const sock = await waitForSocket(8000);
  if (!sock) { console.warn("[notify] socket not ready"); return; }

  if (!sock.connected && sock.connect) { try { sock.connect(); } catch {} }

  try { sock.off?.("private_message"); } catch {}
  sock.on("private_message", (m) => {
    const currentPeerId = getCurrentDMIdFromURL();
    const senderIdStr   = String(m?.senderId || m?.fromId || "");

    if (currentPeerId && senderIdStr && senderIdStr === currentPeerId) {
        console.debug("[notify] suppress: already on this DM", { currentPeerId, senderIdStr });
        return;
    }
    const isForMe  = String(m?.receiver || "") === String(myName);
    const isFromMe = String(m?.sender   || "") === String(myName);
    if (!isForMe || isFromMe) return;

    showToast({
        sender:    m?.sender || "Someone",
        senderId:  String(m?.senderId || m?.fromId || ""),
        timestamp: m?.timestamp || Date.now(),
        text:      m?.content || "",
        status:    m?.status  || "UNDEFINED",
    });
  });

  console.log("[notify] listener bound to private_message");
}

async function openDMSheet({ name, peerId, text, status, timestamp }) {
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

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startDMNotify, { once: true });
} else {
  startDMNotify();
}

