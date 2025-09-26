import { getAvatarColor, getInitials } from "/js/utils/avatars.js";
import { format } from "date-fns";

const lineHeight = 24;
const maxRows = 5;

const $ = (s) => document.querySelector(s);

const ui = {
    input: $("#msg-input"),
    form: $("#msg-form"),
    messageList: $("#msg-list"),
    sendBtn: $("#send-btn"),
};

function createMessageElement(name, text, timestamp=null) {
    const li = document.createElement("li");
    li.className = "mb-4 flex items-start gap-3";

    const avatar = document.createElement("figure");
    avatar.className = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full";
    avatar.style.backgroundColor = getAvatarColor(name);
    const initials = document.createElement("span");
    initials.className = "font-poppins font-semibold text-white";
    initials.textContent = getInitials(name);
    avatar.appendChild(initials);

    const content = document.createElement("div");
    const headerEl = document.createElement("div");
    headerEl.className = "flex items-center gap-4";

    const nameEl = document.createElement("span");
    nameEl.className = "font-poppins font-bold";
    nameEl.textContent = name;
    headerEl.appendChild(nameEl);

    const statusEl = document.createElement("span");
    statusEl.className = "min-w-16 rounded-md bg-green-200 text-center font-poppins text-xs font-semibold text-green-500";
    statusEl.textContent = "OK";
    headerEl.appendChild(statusEl);
    content.appendChild(headerEl);

    const timeEl = document.createElement("p");
    timeEl.className = "font-poppins text-xs text-gray-400";
    const now = timestamp ?? new Date();
    timeEl.textContent = format(new Date(now), "MMMM dd yyyy 'at' hh:mm aa");

    const textEl = document.createElement("p");
    textEl.className = "mt-1 rounded-lg bg-white p-3 font-poppins shadow";
    textEl.textContent = text;
    content.appendChild(timeEl);
    content.appendChild(textEl);

    li.appendChild(avatar);
    li.appendChild(content);

    return li;
}

function sendMessage(text) {
    if (text) {
        ui.input.value = "";
        ui.input.rows = 1;
        ui.sendBtn.disabled = true;
        const msgEl = createMessageElement("Me", text);
        ui.messageList.appendChild(msgEl);
        ui.messageList.scrollTop = ui.messageList.scrollHeight;
    }
}

async function fetchMessages() {
    try {
        const res = await fetch("/api/messages");
    } catch (e) {
        console.error("Failed to fetch messages", e);
        return;
    }
    try {
        const messages = await res.json();
    } catch (e) {
        console.error("Failed to parse messages", e);
        return;
    }
    messages.forEach(msg => {
        const msgEl = createMessageElement(msg.username, msg.text, msg.timestamp);
        ui.messageList.appendChild(msgEl);
    });
    ui.messageList.scrollTop = ui.messageList.scrollHeight;
}

ui.input.addEventListener("input", () => {
    if (!ui.input.value) {
        ui.sendBtn.disabled = true;
    } else {
        ui.sendBtn.disabled = false;
    }
    ui.input.rows = 1;
    const currentRows = Math.min(Math.floor(ui.input.scrollHeight / lineHeight), maxRows);
    ui.input.rows = currentRows;
    ui.input.scrollTop = ui.input.scrollHeight;
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
