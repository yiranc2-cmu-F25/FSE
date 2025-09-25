/**
 * Join Community: FE validation + auth flow with in-page confirm modal.
 * - If username is reserved -> show username error.
 * - If username exists -> try login; on success, Logout() (per TA note).
 * - If username available -> open confirm modal; on confirm -> register.
 * - After successful registration -> Logout() (clear state + go HOME).
 */

const API = {
  usernameStatus: "/api/auth/reserved",
  register: "/api/auth/registrations",
  login: "/api/auth/online",
};
const HOME = "/";
const NEXT_ROUTE_AFTER_LOGIN_VALIDATION = "/profiles";
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
  let data = null;
  try {
    data = await res.json();
  } catch {}
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
///
// ui.modalSubmit?.addEventListener("click", onConfirmCreate);
// ui.modalCancel?.addEventListener("click", closeConfirmModal);
// ui.modal?.addEventListener("click", (e) => {
//   if (e.target === ui.modal) closeConfirmModal();
// });

// async function onConfirmCreate() {
//   // Pull username/password from the original join form
//   const uname = ui.username.value.trim();
//   const pwd = ui.password.value;

//   ui.modalSubmit.setAttribute("disabled", "true");
//   ui.modalErr.classList.add("hidden");
//   try {
//     const { res, data } = await postJSON(API.register, {
//       username: uname,
//       password: pwd,
//     });

//     if (res.ok && data?.ok) {
//       // Registration success -> immediately log out and return to HOME
//       closeConfirmModal();
//       await Logout();
//       return;
//     }

//     // Registration failed -> show modal error
//     ui.modalErr.textContent =
//       data?.message || "Registration failed. Please try again.";
//     ui.modalErr.classList.remove("hidden");
//   } catch (err) {
//     ui.modalErr.textContent = "Network error. Please try again.";
//     ui.modalErr.classList.remove("hidden");
//   } finally {
//     ui.modalSubmit.removeAttribute("disabled");
//   }
// }

// ----- Main submit flow (click Join) -----------------------------------------
async function onConfirmCreate(e) {
  e?.preventDefault?.();

  const uname = ui.username.value.trim();
  const pwd = ui.password.value;

  ui.modalSubmit.setAttribute("disabled", "true");
  ui.modalErr.classList.add("hidden");

  try {
    const { res, data } = await postJSON(API.register, {
      username: uname,
      password: pwd,
    });

    // Treat any 2xx as success unless backend explicitly says ok === false
    const success = res.ok && data?.ok !== false;

    if (success) {
      // Clean up and log out (required by TA), then go HOME
      try {
        sessionStorage.removeItem("pendingUser");
      } catch {}
      closeConfirmModal();
      // await Logout(); // clears client + POST /offline + redirect
      window.location.href = NEXT_ROUTE_AFTER_REGISTER_VALIDATION;
      return;
    }

    // Registration failed -> show message from server
    ui.modalErr.textContent =
      data?.message || "Registration failed. Please try again.";
    ui.modalErr.classList.remove("hidden");
  } catch (err) {
    ui.modalErr.textContent = "Network error. Please try again.";
    ui.modalErr.classList.remove("hidden");
  } finally {
    ui.modalSubmit.removeAttribute("disabled");
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  const { ok, uname, pwd } = clientValidate();
  if (!ok) return;

  ui.btn.setAttribute("disabled", "true");
  try {
    const { res: r1, data: d1 } = await postJSON(API.usernameStatus, {
      username: uname,
    });

    if (!r1.ok) {
      showError("username", d1?.message || "Unable to validate username.");
      return;
    }

    if (d1.status === "reserved") {
      showError("username", d1.message || "This username is not allowed.");
      return;
    }

    if (d1.status === "available") {
      // Store a tiny hint (optional) and open the confirm modal
      sessionStorage.setItem(
        "pendingUser",
        JSON.stringify({ u: uname, ts: Date.now() }),
      );
      openConfirmModal(uname);
      return;
    }

    if (d1.status === "exists") {
      // Attempt login (no username error on wrong password)
      const { res: r3, data: d3 } = await postJSON(API.login, {
        username: uname,
        password: pwd,
      });
      if (r3.ok && d3?.ok) {
        await Logout(); // TA requirement: log out right away after validating login
        return;
      }
      showError("password", d3?.message || "Incorrect password.");
      return;
    }

    showError("username", "Unexpected server response. Please try again.");
  } catch (err) {
    console.log("Network or unknown error", err);
    showError("username", "Network error. Please check your connection.");
  } finally {
    ui.btn.removeAttribute("disabled");
  }
}

// ----- Wire up events --------------------------------------------------------
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

// ----- Logout utilities ------------------------------------------------------
async function Logout() {
  await backendLogout();
  await clearClientState();
  window.location.href = HOME;
}
async function backendLogout() {
  try {
    const res = await fetch("/api/auth/offline", {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch (err) {
    console.error("logout error", err);
    return false;
  }
}
async function clearClientState() {
  sessionStorage.clear();
  localStorage.clear();
}
