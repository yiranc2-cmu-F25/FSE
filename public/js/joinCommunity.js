/**
 * Frontend validation + auth flow for Join Community page.
 *
 * LOCAL (client) rules we enforce before hitting the server:
 *  - username.trim().length >= 3
 *  - password.length >= 4
 *
 * BACKEND rules (must be validated on server; FE only displays messages):
 *  - username not in banned/reserved list
 *  - username uniqueness / existence
 *  - password correctness/strength, etc.
 *
 * ─── Backend API CONTRACT (proposed) ─────────────────────────────────────────
 * 1) POST /api/auth/username-status
 *    Request: { "username": "alice" }
 *    Response (200):
 *      - { status: "reserved", reason: "banned_username" }
 *      - { status: "available" }                       // not taken & not reserved
 *      - { status: "exists" }                          // username exists (login path)
 *
 * 2a) POST /api/auth/register    // when status === "available"
 *     Request: { "username": "alice", "password": "abcd" }
 *     Response:
 *       - 200 { ok: true } → proceed
 *       - 400 { ok: false, reason: "weak_password" | "policy_violation", message: "..." }
 *
 * 2b) POST /api/auth/login       // when status === "exists"
 *     Request: { "username": "alice", "password": "abcd" }
 *     Response:
 *       - 200 { ok: true } → proceed
 *       - 401 { ok: false, reason: "incorrect_password", message: "Incorrect password." }
 *       - 423 { ok: false, reason: "locked", message: "Account locked." }
 *
 * Frontend behavior required by product note:
 *  - If username is reserved → show username error (wiggle + message).
 *  - If username exists and is NOT reserved → do NOT error the username.
 *      Instead, attempt login; if password incorrect, show password error.
 *  - On any non-ok, server should return a human-readable `message` we can show.
 */

// ----- Config (easy to change if backend prefixes differ) --------------------
const API = {
  usernameStatus: "/api/auth/username-status",
  register: "/api/auth/register",
  login: "/api/auth/login",
};
const NEXT_ROUTE_AFTER_LOGIN_VALIDATION = "/profile"; // when existing user login is validated

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
};

function shake(el) {
  el.classList.remove("shake");
  void el.offsetWidth; // restart animation
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

// ----- Network helpers -------------------------------------------------------
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { res, data };
}

// ----- Main submit flow ------------------------------------------------------
async function handleSubmit(e) {
	e.preventDefault();

	// 1) Client-side length checks
	const { ok, uname, pwd } = clientValidate();
	if (!ok) return;

	ui.btn.setAttribute("disabled", "true");

	try {
		// 2) Ask server about the username status
		// TODO: Comment this back for integration
		// const { res: r1, data: d1 } = await postJSON(API.usernameStatus, {
		//   username: uname,
		// });
		// 1. Testing 'available' user flow: NEXT page is /confirm
		// const { res: r1, data: d1 } = {
		//   res: { ok: true },
		//   data: { status: "available" },
		// };
		// 2. Testing 'reserved' user flow: stay on page, show username error
		// const { res: r1, data: d1 } = {
		//   res: { ok: true },
		//   data: { status: "reserved" },
		// };
		// 3. Testing 'exists' user flow: send Login request to db to verify password; Next page is /profile if correct
		// const { res: r1, data: d1 } = {
		//   res: { ok: true },
		//   data: { status: "exists" },
		// };
		const { res: r1, data: d1 } = await postJSON(API.usernameStatus, {
			username: uname,
		});

		if (!r1.ok) {
			// If server cannot even validate username, show generic error on username
			showError(
				"username",
				d1?.message || "Unable to validate username. Please try again.",
			);
			return;
		}

		if (d1.status === "reserved") {
			// Reserved/banned → username error, per rule
			showError("username", d1.message || "This username is not allowed.");
			return;
		}

		if (d1.status === "available") {
			sessionStorage.setItem(
				"pendingUser",
				JSON.stringify({ u: uname, ts: Date.now() }),
			);
			window.location.href = "/confirm";
		}

		if (d1.status === "exists") {
		// Existing user → login. Do NOT show username error if incorrect password.
		// TODO: Comment this back for integration
		// const { res: r3, data: d3 } = await postJSON(API.login, {
		//   username: uname,
		//   password: pwd,
		// });
		const { res: r3, data: d3 } = await postJSON(API.login, {
		  username: uname,
		  password: pwd,
		});
		//const { res: r3, data: d3 } = { res: { ok: true }, data: { ok: true } }; // for testing, assume always correct
		if (r3.ok && d3?.ok) {
			window.location.href = NEXT_ROUTE_AFTER_LOGIN_VALIDATION;
			return;
		}
		// Password or other login error → show on password field
		showError("password", d3?.message || "Incorrect password.");
		return;
		}

		// Unexpected status
		showError("username", "Unexpected server response. Please try again.");
	} catch (err) {
		// Network/unknown error → show username error (entry point)
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
