import { getAvatarColor, getInitialsSafe } from "../utils/avatars.js";
import { getSocket } from "/js/utils/socket.js";
import { formatDate, toStr } from "../utils/dateFormatter.js";
const hdr = document.getElementById("dm-header");
const nameEl = document.getElementById("peer-name");
const chipEl = document.getElementById("peer-status-chip");
const socket = getSocket();
const msgList = document.getElementById("msg-list");
const meId = hdr?.dataset.meId;
const peerId = hdr?.dataset.peerId;

const EMPTY_ID = "dm-empty";
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
const STATUS = {
    undefined: "gray",
    ok: "green",
    help: "yellow",
    emergency: "red",
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
    msgList.classList.add("flex", "flex-col", "gap-2");
    const empty = document.getElementById(EMPTY_ID);
    if (empty) empty.remove();
}


// ---------- render message ----------
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
  li.querySelector(".initials").textContent = getInitialsSafe(safeName);

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

// ---------- send & recieve messages ----------
async function loadNames() {
    const meRes = await fetch(whoamiUrl, { credentials: "include" });
    const me = await meRes.json();
    meName = me.username;

    const pRes = await fetch(userBasicUrl(peerId), { credentials: "include" });
    const p = await pRes.json();
    peerName = p.username;
}

function initPrivateMessageSocket() {
    socket.on("private_message", (m) => {
        if (!meName || !peerName) return;

        const isFromPeerToMe = (m.sender === peerName && m.receiver === meName);
        if (!isFromPeerToMe) return;

        msgList.appendChild(renderMessage({
            name:     peerName || m.sender,
            text:     m.content,
            status:   m.status,
            timestamp:m.timestamp,
            isOwn:    false,
        }));
        msgList.scrollTop = msgList.scrollHeight;
    });
}

async function sendPrivateMessage(text) {
    try {
        if (!text || !text.trim()) return;
        if (!peerId) {
            console.warn("[dm] missing peerId on page");
            return;
        }
        ui.input.value = "";
        ui.input.rows = 1;
        ui.sendBtn.disabled = true;
        const meRes = await fetch(whoamiUrl, { credentials: "include" });
        if (!meRes.ok) throw new Error(`whoami failed: ${meRes.status}`);
        const me = await meRes.json();

        const now = new Date();
        const payload = {
            sender: me.id,
            receiver: peerId,
            content: text.trim(),
            status: String(me.status || "undefined").toLowerCase(),
            timestamp: now,
        };
        console.log("[dm.send] POST /api/messages/private payload", payload);
        const postRes = await fetch("/api/messages/private", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
        });
        if (!postRes.ok) throw new Error(`send DM failed: ${postRes.status}`);
        hideEmptyState();
        ui.messageList.appendChild(renderMessage({
            name:     meName || me.username,
            text:     payload.content,
            status:   payload.status,
            timestamp: now,
            isOwn:    true,
        }));
        ui.messageList.scrollTop = ui.messageList.scrollHeight;
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
async function loadHistory() {
    if (!peerId) return console.warn("[dm] missing peerId");
    const r = await fetch(`/api/messages/private/${encodeURIComponent(peerId)}`, {
        credentials: "include"
    });
    if (!r.ok) {
        console.error("[dm] loadHistory failed:", r.status);
        return;
    }
    const { messages = [] } = await r.json();
    if (messages.length === 0) {
        showEmptyState();
        return;
    }
    hideEmptyState();
    const nodes = messages.map(m => {
        const fromMe = String(m.senderId) === String(meId);
        return renderMessage({
            name:     fromMe ? (meName || "Me") : (peerName || "Peer"),
            text:     m.content,
            status:   m.status,
            timestamp:m.timestamp,
            isOwn:    m.isOwn,
        });
    });

    msgList.replaceChildren(...nodes);
    msgList.scrollTop = msgList.scrollHeight;
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

// ---------- bootstrap ----------
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await fillPeerHeader();
        await loadNames();
        await loadHistory();
        initPrivateMessageSocket();
    } catch (err) {
        console.error("[dm] bootstrap socket failed:", err);
    }
});
