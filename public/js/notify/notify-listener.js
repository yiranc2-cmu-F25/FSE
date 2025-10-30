
import { getSocket } from "/js/utils/socket.js";
import { showToast } from "/js/utils/toasts.js";

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

async function startDMNotify() {
  const me = await getMe();
  const myName = me?.username;
  if (!myName) return;

  const sock = await waitForSocket(8000);
  if (!sock) { console.warn("[notify] socket not ready"); return; }

  if (!sock.connected && sock.connect) { sock.connect(); }

  sock.off?.("private_message");
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

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startDMNotify, { once: true });
} else {
  startDMNotify();
}

