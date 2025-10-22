import { getSocket } from "/js/utils/socket.js";
import { renderMessage } from "/js/utils/renderMessage.js";
const hdr = document.getElementById("dm-header");
const nameEl = document.getElementById("peer-name");
const chipEl = document.getElementById("peer-status-chip");
const socket = getSocket();
const msgList = document.getElementById("msg-list");
const meId = hdr?.dataset.meId;
const peerId = hdr?.dataset.peerId;

const whoamiUrl = "/api/authentications/accounts";
let meName = null;
let peerName = null;

const $ = (s) => document.querySelector(s);
const ui = {
    input: $("#msg-input"),
    form: $("#msg-form"),
    messageList: $("#msg-list"),
    sendBtn: $("#send-btn"),
};

// ---------- show empty ----------
function showEmptyState() {
    if (!msgList) return;
    msgList.classList.remove("flex", "flex-col", "gap-2");
    msgList.classList.add("grid", "place-content-center", "min-h-[70vh]", "p-4");
}

function hideEmptyState() {
    if (!msgList) return;
    msgList.classList.remove("grid", "place-content-center", "min-h-[70vh]");
    msgList.classList.add("flex", "flex-col", "gap-2", "overflow-y-auto", "p-4");
    const empties = msgList.querySelectorAll("#dm-empty,[data-empty],.js-empty,.empty-state");
    if (empties.length) {
    empties.forEach(n => n.remove());
    } else if (msgList.children.length === 1) {
        const only = msgList.children[0];
        if (only?.textContent?.includes("No messages yet")) only.remove();
    }
}

// ---------- utils ----------

const nextFrame = () => new Promise(r => requestAnimationFrame(r));
async function scrollListToBottom() {
    const el = ui.messageList;
    if (!el) return;
    await nextFrame();
    el.scrollTop = el.scrollHeight;
}

// ---------- send & receive messages ----------
async function loadNames() {
    const meRes = await fetch(whoamiUrl, { credentials: "include" });
    const me = await meRes.json();
    meName = me.username;

    const pRes = await fetch(userBasicUrl(peerId), { credentials: "include" });
    const p = await pRes.json();
    peerName = p.username;
}

async function initPrivateMessageSocket() {
    socket.on("private_message", async (m) => {
        if (!meName || !peerName) return;

        const isFromPeerToMe = (m.sender === peerName && m.receiver === meName);
        if (!isFromPeerToMe) return;
        hideEmptyState();
        msgList.appendChild(renderMessage({
            name:     peerName || m.sender,
            text:     m.content,
            status:   m.status,
            timestamp:m.timestamp,
            isOwn:    false,
        }));
        await scrollListToBottom();
    });
}

async function sendPrivateMessage(text) {
  try {
    const content = (text || "").trim();
    if (!content) return;
    if (!peerId) {
      console.warn("[dm] missing peerId on page");
      return;
    }

    ui.input.value = "";
    ui.input.rows = 1;
    ui.sendBtn.disabled = true;

    const meRes = await fetch("/api/authentications/accounts", { credentials: "include" });
    if (!meRes.ok) throw new Error(`whoami failed: ${meRes.status}`);
    const me = await meRes.json();

    const now = new Date();
    const payload = {
      sender: me.id,
      receiver: peerId,
      content,
      status: String(me.status || "undefined").toLowerCase(),
      timestamp: now,
    };

    const postRes = await fetch("/api/messages/private", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!postRes.ok) throw new Error(`send DM failed: ${postRes.status}`);

    hideEmptyState();
    const node = renderMessage({
      name:      meName || me.username,
      text:      payload.content,
      status:    payload.status,
      timestamp: now,
      isOwn:     true,
    });
    ui.messageList.appendChild(node);

    await scrollListToBottom();

  } catch (e) {
    console.error("[dm] Failed to send message:", e);
  } finally {
    ui.sendBtn.disabled = !ui.input.value;
  }
}


ui.form?.addEventListener("submit", (e) => {
    console.log("[dm.send] submit", { value: ui.input?.value });
    e.preventDefault();
    sendPrivateMessage(ui.input.value);
});
let isImeActive = false;
ui.input?.addEventListener("compositionstart", () => { isImeActive = true; });
ui.input?.addEventListener("compositionend", () => { setTimeout(() => { isImeActive = false; }); });
ui.input?.addEventListener("keydown", (e) => {
    if (isImeActive || e.key === "Process" || e.keyCode === 229) return;
    if (e.key === "Enter" && !e.shiftKey) {
        console.log("[dm.send] enter-to-send", { value: ui.input?.value });
        e.preventDefault();
        sendPrivateMessage(ui.input.value);
    }
});
ui.input?.addEventListener("input", () => {
    console.debug("[dm.send] input len", ui.input?.value?.length ?? 0);
    ui.sendBtn.disabled = !ui.input.value;
});

// ---------- load history ----------
async function fetchPrivateMessages() {
  if (!peerId) {
    console.warn("[dm.fetch] missing peerId");
    return;
  }
  try {
    const url = `/api/messages/private/${encodeURIComponent(peerId)}`;
    console.log("[dm.fetch] GET", url);

    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const payload = await res.json();
    const messages = Array.isArray(payload) ? payload : (payload.messages || []);
    console.log("[dm.fetch] count =", messages.length);

    if (messages.length === 0) {
      showEmptyState();
      return;
    }
    hideEmptyState();

    msgList.innerHTML = "";

    messages.forEach((m, i) => {
      const own = typeof m.isOwn === "boolean"
        ? m.isOwn
        : String(m.senderId) === String(meId);

      const displayName = own ? (meName || "Me") : (peerName || m.sender || "Peer");

      const node = renderMessage({
        name:      String(displayName ?? ""),
        text:      String(m.content ?? ""),
        status:    m.status ?? "UNDEFINED",
        timestamp: m.timestamp ?? m.createdAt ?? Date.now(),
        isOwn:     own,
      });

      if (!(node instanceof Node)) {
        console.error("[dm.fetch] renderMessage returned non-Node at", i, node);
        return;
      }
      msgList.appendChild(node);
    });

    await new Promise(r => requestAnimationFrame(r));
    const last = msgList.lastElementChild;
    if (last) last.scrollIntoView({ block: "end" });
    msgList.scrollTop = msgList.scrollHeight;

    console.log("[dm.fetch] scrolled", {
      top: msgList.scrollTop, height: msgList.scrollHeight
    });

  } catch (e) {
    console.error("[dm.fetch] failed:", e);
  }
}


// ---------- get username and status ----------

const userBasicUrl = (id) => `/api/users/${encodeURIComponent(id)}`;

function statusChip(statusRaw) {
    const s = String(statusRaw || "UNDEFINED").toUpperCase();
    switch (s) {
        case "HELP":
        return { text: "HELP", classes: "bg-yellow-100 text-yellow-800 ring-yellow-200" };
        case "OK":
        return { text: "OK", classes: "bg-emerald-100 text-emerald-700 ring-emerald-200" };
        case "EMERGENCY":
        return { text: "EMERGENCY", classes: "bg-rose-100 text-rose-700 ring-rose-200" };
        default:
        return { text: "UNDEFINED", classes: "bg-zinc-100 text-zinc-600 ring-zinc-200" };
    }
}

async function fillPeerHeader() {
    if (!hdr) return;
    const peerId = hdr.dataset.peerId;
    if (!peerId) return;

    const r = await fetch(userBasicUrl(peerId), { credentials: "same-origin" });
    if (!r.ok) {
        nameEl.textContent = "Unknown user";
        chipEl.classList.add("hidden");
        return;
    }
    const u = await r.json();

    nameEl.textContent = u.username || "Unknown user";

    const chip = statusChip(u.status);
    chipEl.textContent = chip.text;
    chipEl.className = `font-poppins inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold ring-1 ${chip.classes}`;
}

// on leaving page, mark all messages as read
window.addEventListener("beforeunload", () => {
  if (!peerId) return;

  const url = `/api/messages/private/read`;
  console.log("[dm] marking messages as read:", url);
  const body = JSON.stringify({ peerId });

  const data = new Blob([body], { type: "application/json" });
  navigator.sendBeacon(url, data);
});

// ---------- bootstrap ----------
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await fillPeerHeader();
        await loadNames();
        await fetchPrivateMessages();
        await initPrivateMessageSocket();
    } catch (err) {
        console.error("[dm] bootstrap socket failed:", err);
    }
});
