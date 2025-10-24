/**
 * Confirm Registration (stateless, no password stored client-side)
 *
 * Preconditions:
 *  - joinCommunity.js stored ONLY the username in sessionStorage:
 *      sessionStorage.setItem('pendingUser', JSON.stringify({ u: uname, ts: Date.now() }))
 *
 * What this script does:
 *  - Reads username from sessionStorage and displays it (readonly).
 *  - Asks user to re-type password (never stored).
 *  - On confirm, POSTs to backend to create the account.
 *  - On success → navigates to the “statuses” info page.
 *  - On failure → shows a modal with the server-provided reason.
 *
 * Backend contract (proposed):
 *  - POST /api/authentications/register
 *      Body:   { username: string, password: string }
 *      201/200 { ok: true }
 *      4xx/5xx { ok: false, message: string }
 *
 * Notes:
 *  - If pending data is missing/expired, user is redirected back to .
 *  - If user clicks “Home Page”, we clear pending and let the link navigate.
 */

const API = {
    register: "/api/authentications/registrations",
};
const NEXT_ROUTE_AFTER_OK = "/acknowledgement";
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

// ---------- DOM ----------
const $ = (s) => document.querySelector(s);
const ui = {
    usernameInput: $("#username"),
    passwordInput: $("#password"),
    wrapUser: $("#wrap-username"),
    wrapPass: $("#wrap-password"),
    errPass: $("#err-password"),
    confirmBtn: $("#btn-confirm"),
    homeLink: $("#link-home"),
    modal: $("#fail-modal"),
    modalMsg: $("#fail-msg"),
    modalClose: $("#modal-close"),
};

// ---------- Helpers ----------
function getPending() {
    try {
        const raw = sessionStorage.getItem("pendingUser");
        if (!raw) return null;
        const obj = JSON.parse(raw);
        if (!obj?.u) return null;
        if (obj.ts && Date.now() - obj.ts > MAX_AGE_MS) return null; // expired
        return obj;
    } catch {
        return null;
    }
}
function clearPending() {
    sessionStorage.removeItem("pendingUser");
}

function shake(el) {
    el?.classList.remove("shake");
    void el?.offsetWidth;
    el?.classList.add("shake");
}
function showPassError(msg) {
    ui.errPass.textContent = msg;
    ui.errPass.classList.remove("hidden");
    ui.wrapPass.classList.add("ring-2", "ring-red-400");
    shake(ui.wrapPass);
}
function clearPassError() {
    ui.errPass.textContent = "";
    ui.errPass.classList.add("hidden");
    ui.wrapPass.classList.remove("ring-2", "ring-red-400");
}

function openModal(msg) {
    ui.modalMsg.textContent = msg || "Registration failed, try again later.";
    ui.modal.classList.remove("hidden");
    ui.modal.classList.add("flex");
}
function closeModal() {
    ui.modal.classList.add("hidden");
    ui.modal.classList.remove("flex");
}

async function postJSON(url, body) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    let data = await res.json();
    return { res, data };
}

// ---------- Submit flow ----------
async function onConfirmClick(e) {
    e.preventDefault();

    const pending = getPending();
    if (!pending) {
        window.location.href = "/communities";
        return;
    }

    clearPassError();
    const pwd = ui.passwordInput.value;

    // Minimal client check per product rules
    if (!pwd || pwd.length < 4) {
        showPassError("Password must be at least 4 characters.");
        return;
    }

    ui.confirmBtn.setAttribute("disabled", "true");

    try {
        // TODO: Comment this back in when backend is ready
        // const { res, data } = await postJSON(API.register, {
        //   username: pending.u,
        //   password: pwd,
        // });
        const { res, data } = await postJSON(API.register, {
        username: pending.u,
        password: pwd,
        });
        //const { res, data } = { res: { ok: true }, data: { ok: true } }; // --- IGNORE ---
        if (res.ok && (data?.ok ?? true)) {
            clearPending();
            window.location.href = NEXT_ROUTE_AFTER_OK;
            return;
        }

        // Surface server reason when available (e.g., 409 username taken meanwhile)
        openModal(data?.message || "Registration failed, try again later.");
    } catch {
        openModal("Network error. Please try again later.");
    } finally {
        ui.confirmBtn.removeAttribute("disabled");
    }
}

// ---------- Init ----------
function init() {
    const pending = getPending();
    if (!pending) {
        window.location.href = "/communities";
        return;
    }
    // Show username from previous step
    ui.usernameInput.value = pending.u;

    // Wire events
    ui.confirmBtn.addEventListener("click", onConfirmClick);
    ui.passwordInput.addEventListener("input", clearPassError);
    ui.passwordInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") ui.confirmBtn.click();
    });

    // Cancel → clear pending; link still navigates
    ui.homeLink.addEventListener("click", () => clearPending());

    // Modal UX
    ui.modalClose.addEventListener("click", closeModal);
    ui.modal.addEventListener("click", (e) => {
        if (e.target === ui.modal) closeModal();
    });
}

init();
