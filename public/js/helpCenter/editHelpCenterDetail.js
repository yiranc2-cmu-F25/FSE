// public/js/helpCenter/editHelpCenterDetail.js

// ------------- DOM refs -------------
const addressInput = document.getElementById("address-input");
const verifyBtn = document.getElementById("verify-address-btn");
const resultsBox = document.getElementById("address-results");
const lonInput = document.getElementById("lon-input");
const latInput = document.getElementById("lat-input");

const nameInput = document.getElementById("name");
const typeSelect = document.getElementById("type");
const descriptionInput = document.getElementById("description");

const confirmBtn = document.getElementById("confirm-Btn");
const deleteBtn = document.getElementById("delete-Btn");
const formMessage = document.getElementById("form-message");

const baseMsgClass = "mt-3 min-h-[1.25rem] text-sm text-center";

// ------------- state -------------
let isAddressVerified = false;
let HELP_CENTER_ID = null;

// ------------- helpers -------------

function showFormMessage(msg, colorClass = "text-gray-700") {
  if (!formMessage) return;
  formMessage.textContent = msg;
  formMessage.className = `${baseMsgClass} ${colorClass}`;
}

function clearFormMessage() {
  if (!formMessage) return;
  formMessage.textContent = "";
  formMessage.className = baseMsgClass;
}

function setVerifiedState(v) {
  isAddressVerified = v;
}

function validateFields() {
  const missing = [];
  if (!nameInput.value.trim()) missing.push("Name");
  if (!typeSelect.value) missing.push("Type");
  if (!addressInput.value.trim()) missing.push("Address");
  if (!descriptionInput.value.trim()) missing.push("Description");

  if (missing.length > 0) {
    showFormMessage(`Please fill in: ${missing.join(", ")}.`, "text-red-600");
    return false;
  }
  return true;
}

// ------------- load help center from API -------------

function getIdFromPath() {
  // assuming URL like /help-centers/edit/672fa1f3b0c4c53dd22ff3ba
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1]; // last segment
}

async function loadHelpCenter() {
  HELP_CENTER_ID = getIdFromPath();
  if (!HELP_CENTER_ID) {
    showFormMessage("Invalid help center ID in URL.", "text-red-600");
    return;
  }

  try {
    showFormMessage("Loading help center...", "text-gray-500");

    const res = await fetch(`/api/help-centers/${HELP_CENTER_ID}`);

    if (res.status === 404) {
      showFormMessage("Help center not found.", "text-red-600");
      return;
    }

    if (res.status === 401 || res.status === 403) {
      showFormMessage(
        "You are not allowed to edit this help center.",
        "text-red-600"
      );
      return;
    }

    if (!res.ok) {
      showFormMessage(
        "Failed to load help center. Please try again.",
        "text-red-600"
      );
      return;
    }

    const hc = await res.json();
    prefillForm(hc);
    clearFormMessage();
  } catch (err) {
    console.error("Error loading help center:", err);
    showFormMessage("Network error. Please try again.", "text-red-600");
  }
}

function prefillForm(hc) {
  if (nameInput) nameInput.value = hc.name || "";
  if (typeSelect && hc.type) typeSelect.value = hc.type;
  if (addressInput) addressInput.value = hc.location || "";
  if (descriptionInput) descriptionInput.value = hc.description || "";

  if (
    Array.isArray(hc.coordinates) &&
    hc.coordinates.length === 2 &&
    typeof hc.coordinates[0] === "number" &&
    typeof hc.coordinates[1] === "number"
  ) {
    lonInput.value = hc.coordinates[0];
    latInput.value = hc.coordinates[1];
    setVerifiedState(true); // already has valid coords
  } else {
    lonInput.value = "";
    latInput.value = "";
    setVerifiedState(false);
  }
}

// ------------- verify address (Mapbox) -------------

if (addressInput) {
  addressInput.addEventListener("input", () => {
    if (isAddressVerified) {
      setVerifiedState(false);
      lonInput.value = "";
      latInput.value = "";
      showFormMessage(
        "Address changed. Please verify again.",
        "text-red-600"
      );
    } else {
      clearFormMessage();
    }
  });
}

if (verifyBtn && addressInput && resultsBox && lonInput && latInput) {
  verifyBtn.addEventListener("click", async () => {
    const query = addressInput.value.trim();

    lonInput.value = "";
    latInput.value = "";
    setVerifiedState(false);
    resultsBox.innerHTML = "";
    resultsBox.classList.add("hidden");
    clearFormMessage();

    if (query.length < 3) {
      showFormMessage(
        "Please enter at least 3 characters before verifying.",
        "text-red-600"
      );
      return;
    }

    try {
      const res = await fetch(
        `/api/addresses?query=${encodeURIComponent(query)}`
      );

      if (!res.ok) {
        showFormMessage(
          "Error verifying address. Please try again.",
          "text-red-600"
        );
        return;
      }

      const results = await res.json();
      if (!Array.isArray(results) || results.length === 0) {
        showFormMessage(
          "No matching addresses found. Please refine your input.",
          "text-red-600"
        );
        return;
      }

      renderOptions(results);
    } catch (err) {
      console.error("Verify address error:", err);
      showFormMessage(
        "Error verifying address. Please try again.",
        "text-red-600"
      );
    }
  });
}

function renderOptions(results) {
  resultsBox.innerHTML = "";
  resultsBox.classList.remove("hidden");

  const info = document.createElement("div");
  info.className = "px-3 py-2 text-xs text-gray-500";
  info.textContent = "Select an address:";
  resultsBox.appendChild(info);

  results.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "block w-full px-3 py-2 text-left text-sm hover:bg-gray-100";
    btn.textContent = item.label || item.place_formatted || item.name;

    btn.addEventListener("click", () => {
      addressInput.value =
        item.label || item.place_formatted || item.name || addressInput.value;

      lonInput.value = item.lon;
      latInput.value = item.lat;

      setVerifiedState(true);
      resultsBox.innerHTML = "";
      resultsBox.classList.add("hidden");

      showFormMessage("Address selected and verified.", "text-green-600");
    });

    resultsBox.appendChild(btn);
  });
}

// ------------- Confirm (PATCH) -------------

if (confirmBtn) {
  confirmBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    clearFormMessage();

    if (!HELP_CENTER_ID) {
      showFormMessage("Invalid help center ID.", "text-red-600");
      return;
    }

    if (!validateFields()) return;

    if (!isAddressVerified) {
      showFormMessage(
        "Please verify your address before saving.",
        "text-red-600"
      );
      return;
    }

    const lon = Number(lonInput.value);
    const lat = Number(latInput.value);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      showFormMessage(
        "Coordinates missing or invalid. Please verify your address again.",
        "text-red-600"
      );
      setVerifiedState(false);
      lonInput.value = "";
      latInput.value = "";
      return;
    }

    const payload = {
      name: nameInput.value.trim(),
      type: typeSelect.value,
      location: addressInput.value.trim(),
      description: descriptionInput.value.trim(),
      coordinates: [lon, lat],
    };

    try {
      const res = await fetch(`/api/help-centers/${HELP_CENTER_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // redirect to confirmation page with updated action
        window.location.href = "/help-centers/confirmation?action=updated";
        return;
      }

      let errMsg = "Failed to update help center.";
      try {
        const body = await res.json();
        if (body && body.message) errMsg = body.message;
      } catch (_) {}

      showFormMessage(errMsg, "text-red-600");
    } catch (err) {
      console.error("Update help center error:", err);
      showFormMessage("Network error. Please try again.", "text-red-600");
    }
  });
}

// ------------- Delete modal using <template> -------------

function openDeleteModal() {
  const tpl = document.getElementById("delete-modal-template");
  if (!tpl) {
    console.warn("Delete modal template not found");
    return;
  }

  const fragment = tpl.content.cloneNode(true);
  const overlay = fragment.firstElementChild;
  if (!overlay) return;

  const cancelBtn = overlay.querySelector("[data-cancel]");
  const confirmBtn = overlay.querySelector("[data-confirm]");

  // Add modal to DOM
  document.body.appendChild(overlay);

  // Cancel → just remove overlay
  cancelBtn?.addEventListener("click", () => {
    overlay.remove();
  });

  // Confirm → perform delete, then remove overlay
  confirmBtn?.addEventListener("click", async () => {
    await deleteHelpCenter();
    overlay.remove();
  });
}

async function deleteHelpCenter() {
  clearFormMessage();

  if (!HELP_CENTER_ID) {
    showFormMessage("Invalid help center ID.", "text-red-600");
    return;
  }

  try {
    const res = await fetch(`/api/help-centers/${HELP_CENTER_ID}`, {
      method: "DELETE",
    });

    if (res.ok) {
      window.location.href = "/help-centers/confirmation?action=deleted";
      return;
    }

    let errMsg = "Failed to delete help center.";
    try {
      const body = await res.json();
      if (body && body.message) errMsg = body.message;
    } catch (_) {}

    showFormMessage(errMsg, "text-red-600");
  } catch (err) {
    console.error("Delete help center error:", err);
    showFormMessage("Network error. Please try again.", "text-red-600");
  }
}

if (deleteBtn) {
  deleteBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openDeleteModal();
  });
}

// ------------- bootstrap -------------

document.addEventListener("DOMContentLoaded", () => {
  loadHelpCenter();
});
