
import { getSocket } from "/js/utils/socket.js";
import { showToast, showVoiceCallToast } from "/js/utils/toasts.js";

function getCurrentDMIdFromURL() {
  const m = location.pathname.match(/^\/chats\/private\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function getCurrentGroupIdFromURL() {
  const m = location.pathname.match(/^\/groupchats\/([^/?#]+)/);
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

async function startVoiceCallNotify() {
  const me = await getMe();
  const myName = me?.username;
  if (!myName) return;

  const sock = await waitForSocket(8000);
  if (!sock) { console.warn("[notify] socket not ready for voice calls"); return; }

  if (!sock.connected && sock.connect) { sock.connect(); }

  // Track active calls to detect when a new call starts
  const activeCalls = new Map();

  sock.off?.("voice-call-status-update");
  sock.on("voice-call-status-update", async (data) => {
    const currentGroupId = getCurrentGroupIdFromURL();
    const { groupId, isActive, participantCount, participants } = data;

    // Don't notify if we're already on this group chat page
    if (currentGroupId && currentGroupId === groupId) {
      console.debug("[notify] suppress: already on this group chat", { currentGroupId, groupId });
      activeCalls.set(groupId, isActive);
      return;
    }

    // Check if this is a NEW active call (wasn't active before, now active)
    const wasActive = activeCalls.get(groupId);
    activeCalls.set(groupId, isActive);

    if (!isActive) {
      // Call ended, no notification needed
      return;
    }

    if (wasActive) {
      // Call was already ongoing, don't notify again
      return;
    }

    // Check if current user is a member of this group
    const isMember = await isUserMemberOfGroup(groupId);
    if (!isMember) {
      console.debug("[notify] suppress: not a member of this group", { groupId });
      return;
    }

    // Don't notify if it's only us in the call
    if (participants.length === 1 && participants.includes(myName)) {
      return;
    }

    // Find who started the call (first participant who isn't us)
    const starter = participants.find(p => p !== myName) || participants[0];

    showVoiceCallToast({
      username: starter || "Someone",
      groupId: groupId,
      timestamp: Date.now(),
    });
  });

  console.log("[notify] listener bound to voice-call-status-update");
}

async function isUserMemberOfGroup(groupId) {
  try {
    const r = await fetch(`/api/groups/${groupId}`, { credentials: "include" });
    if (!r.ok) return false;
    return true; // If we can fetch group details, we're a member
  } catch (e) {
    console.error("[notify] failed to check group membership:", e);
    return false;
  }
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", () => {
    startDMNotify();
    startVoiceCallNotify();
  }, { once: true });
} else {
  startDMNotify();
  startVoiceCallNotify();
}

