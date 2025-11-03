import { formatDate, toStr } from "./dateFormatter.js";

export function renderSearchItem({ name, status, content, timestamp }) {
    const tpl = document.getElementById("message-item-template");
    const li = tpl.content.firstElementChild.cloneNode(true);

    const safeName = toStr(name, "").trim() || "";
    const safeContent = toStr(content, "");
    const key = (status || "undefined").toString().toLowerCase();

    const statusTpl = document.getElementById(`message-${key}-template`);
    const statusEl = statusTpl.content.firstElementChild.cloneNode(true);

    li.querySelector(".sender-name").textContent = safeName;
    li.querySelector(".send-time").textContent = timestamp ? formatDate(timestamp): "";
    li.querySelector(".message-content").textContent = safeContent;
    li.querySelector(".status-tag").appendChild(statusEl);

    return li;
}