import { formatDate, toStr } from "../utils/dateFormatter.js";
import { getAvatarColor, getInitialsSafe } from "../utils/avatars.js";
import { linkify } from "../utils/linkify.js";
const STATUS = {
    undefined: "gray",
    ok: "green",
    help: "yellow",
    emergency: "red",
};
export function renderMessage({ name, text, status, timestamp, isOwn }) {
    const tpl = document.getElementById("chat-message");
    const li = tpl.content.firstElementChild.cloneNode(true);

    const safeName = toStr(name, "Unknown").trim() || "Unknown";
    const safeText = toStr(text, "");
    const key = (status || "undefined").toString().toLowerCase();
    const color = STATUS[key] || STATUS.undefined;

    li.querySelector(".name").textContent = safeName;
    li.querySelector(".time").textContent = formatDate(timestamp || new Date());
    li.querySelector(".bubble").innerHTML = linkify(safeText);

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