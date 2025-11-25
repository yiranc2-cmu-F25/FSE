import { formatDate, toStr } from "./dateFormatter.js";

export function renderBoardSearchItem({ id, name, content, timestamp }) {
    const tpl = document.getElementById("message-item-template");
    const li = tpl.content.firstElementChild.cloneNode(true);

    const safeName = toStr(name, "").trim() || "";
    const safeContent = toStr(content, "");
    const safeTimestamp = timestamp ? formatDate(timestamp) : "";

    li.querySelector(".sender-name").textContent = safeName;
    li.querySelector(".send-time").textContent = safeTimestamp;
    li.querySelector(".message-content").textContent = safeContent;
    
    // Show UNDEFINED status tag for boards
    const statusTag = li.querySelector(".status-tag");
    if (statusTag) {
        const undefinedTpl = document.getElementById("message-undefined-template");
        if (undefinedTpl) {
            const statusEl = undefinedTpl.content.firstElementChild.cloneNode(true);
            statusTag.innerHTML = "";
            statusTag.appendChild(statusEl);
        }
    }

    // Make the entire item clickable and navigate to board detail
    if (id) {
        li.style.cursor = "pointer";
        li.addEventListener("click", () => {
            window.location.href = `/boards/${encodeURIComponent(id)}`;
        });
    }

    return li;
}
