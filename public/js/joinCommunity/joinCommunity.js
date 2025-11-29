/**
 * Join Community: FE validation + authentications flow with in-page confirm modal.
 * - If username is reserved -> show username error.
 * - If username exists -> try login; on success, Logout() (per TA note).
 * - If username available -> open confirm modal; on confirm -> register.
 * - After successful registration -> Logout() (clear state + go HOME).
 */

const API = {
  usernameStatus: "/api/authentications/users/usernames",
  register: "/api/authentications/registrations",
  login: "/api/authentications/login",
};
const HOME = "/";
const NEXT_ROUTE_AFTER_LOGIN_VALIDATION = "/members";
const NEXT_ROUTE_AFTER_REGISTER_VALIDATION = "/acknowledgements";

// ----- DOM helpers -----------------------------------------------------------
const $ = (s) => document.querySelector(s);
const ui = {
  username: $("#username"),
  password: $("#password"),
  wUser: $("#wrap-username"),
  wPass: $("#wrap-password"),
  errUser: $("#err-username"),
  errPass: $("#err-password"),
  btn: $("#btn-join"),
  // modal bits
  modal: $("#confirm-modal"),
  modalUname: $("#confirm-username"),
  modalCancel: $("#confirm-cancel"),
  modalSubmit: $("#confirm-submit"),
  modalErr: $("#confirm-error"),
};

function shake(el) {
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
}

function showError(which, message) {
  const wrap = which === "username" ? ui.wUser : ui.wPass;
  const err = which === "username" ? ui.errUser : ui.errPass;
  err.textContent = message;
  err.classList.remove("hidden");
  wrap.classList.add("ring-2", "ring-red-400");
  shake(wrap);
}
function clearError(which) {
  const wrap = which === "username" ? ui.wUser : ui.wPass;
  const err = which === "username" ? ui.errUser : ui.errPass;
  err.textContent = "";
  err.classList.add("hidden");
  wrap.classList.remove("ring-2", "ring-red-400");
}

function clientValidate() {
  let ok = true;
  const uname = ui.username.value.trim();
  const pwd = ui.password.value;

  clearError("username");
  clearError("password");

  if (uname.length < 3) {
    showError("username", "Username must be at least 3 characters.");
    ok = false;
  }
  if (pwd.length < 4) {
    showError("password", "Password must be at least 4 characters.");
    ok = false;
  }
  return { ok, uname, pwd };
}

// ----- Network helper --------------------------------------------------------
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  let data = await res.json();
  return { res, data };
}

// ----- Modal helpers ---------------------------------------------------------
function openConfirmModal(username) {
  ui.modalUname.value = username;
  ui.modalErr.classList.add("hidden");
  ui.modal.classList.remove("hidden");
  ui.modal.classList.add("flex");
  ui.modalSubmit.focus();
}
function closeConfirmModal() {
  ui.modal.classList.add("hidden");
  ui.modal.classList.remove("flex");
}

function setupClickHandlers() {
  // Click backdrop to close (optional)
  ui.modal?.addEventListener("click", (e) => {
    if (e.target === ui.modal) closeConfirmModal();
  });
  ui.modalCancel?.addEventListener("click", closeConfirmModal);

  // When user clicks "Create Account" in the modal
  ui.modalSubmit?.addEventListener("click", onConfirmCreate);
  ui.modalCancel?.addEventListener("click", closeConfirmModal);
  ui.modal?.addEventListener("click", (e) => {
    if (e.target === ui.modal) closeConfirmModal();
  });
}

// ----- Main submit flow (click Join) -----------------------------------------
async function onConfirmCreate(e) {
  e?.preventDefault?.();
  const { uname, pwd } = readCredentials();
  disableModalSubmit();
  hideModalError();

  try {
    const { res, data } = await postJSON(API.register, { username: uname, password: pwd });
    if (isRegistrationSuccess(res, data)) return finalizeRegistration();
    showModalError(data?.message || "Registration failed. Please try again.");
  } catch (_err) {
    showModalError("Network error. Please try again.");
  } finally {
    enableModalSubmit();
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  const { ok, uname, pwd } = clientValidate();
  if (!ok) return;

  disableSubmitButton();
  try {
    const { res, data } = await requestUsernameStatus(uname);
    if (!res.ok) return showError("username", data?.message || "Unable to validate username.");
    if (data.status === "reserved") return showError("username", data.message || "This username is not allowed.");
    if (data.status === "available") return handleAvailableUsername(uname);
    if (data.status === "exists") return handleExistingUsername(uname, pwd);
    showError("username", "Unexpected server response. Please try again.");
  } catch (err) {
    console.log("Network or unknown error", err);
    showError("username", "Network error. Please check your connection.");
  } finally {
    enableSubmitButton();
  }
}

function readCredentials() {
  return {
    uname: ui.username.value.trim(),
    pwd: ui.password.value,
  };
}

function disableModalSubmit() {
  ui.modalSubmit.setAttribute("disabled", "true");
}

function hideModalError() {
  ui.modalErr.classList.add("hidden");
}

function isRegistrationSuccess(res, data) {
  return res.ok && data?.ok !== false;
}

function finalizeRegistration() {
  sessionStorage.removeItem("pendingUser");
  closeConfirmModal();
  window.location.href = NEXT_ROUTE_AFTER_REGISTER_VALIDATION;
}

function showModalError(message) {
  ui.modalErr.textContent = message;
  ui.modalErr.classList.remove("hidden");
}

function enableModalSubmit() {
  ui.modalSubmit.removeAttribute("disabled");
}

function disableSubmitButton() {
  ui.btn.setAttribute("disabled", "true");
}

async function requestUsernameStatus(uname) {
  return postJSON(API.usernameStatus, { username: uname });
}

function handleAvailableUsername(uname) {
  sessionStorage.setItem("pendingUser", JSON.stringify({ u: uname, ts: Date.now() }));
  openConfirmModal(uname);
}

async function handleExistingUsername(uname, pwd) {
  const { res, data } = await postJSON(API.login, { username: uname, password: pwd });
  if (res.ok && data?.ok) {
    window.location.href = NEXT_ROUTE_AFTER_LOGIN_VALIDATION;
    return;
  }
  
  // Check if account is inactive - redirect to splash page with error modal
  if (res.status === 403 && data?.error === "Account inactive") {
    window.location.href = "/?inactive=true";
    return;
  }
  
  showError("password", data?.message || "Incorrect password.");
}

function enableSubmitButton() {
  ui.btn.removeAttribute("disabled");
}

// ----- Wire up events --------------------------------------------------------
function setupInputHandlers() {
  [ui.username, ui.password].forEach((inp) => {
    inp.addEventListener("input", () => {
      if (inp === ui.username) clearError("username");
      else clearError("password");
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") ui.btn.click();
    });
  });

  ui.btn.addEventListener("click", handleSubmit);
}

// ----- Bootstrap -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  setupClickHandlers();
  setupInputHandlers();
});

