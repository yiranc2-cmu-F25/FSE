const addressInput = document.getElementById("address-input");
const verifyBtn = document.getElementById("verify-address-btn");
const resultsBox = document.getElementById("address-results");
const lonInput = document.getElementById("lon-input");
const latInput = document.getElementById("lat-input");

// Inputs for payload
const nameInput = document.getElementById("name");
const typeSelect = document.getElementById("type");
const descriptionInput = document.getElementById("description");

// REGISTER button + global message area
const registerBtn = document.getElementById("register-Btn");
const formMessage = document.getElementById("form-message");

let isAddressVerified = false;

// ---------- helpers ----------

function setVerifiedState(verified) {
  isAddressVerified = verified;
}

function clearFormMessage() {
    if (!formMessage) return;
    formMessage.textContent = "";
}

function showFormMessage(msg, colorClass = "text-gray-700") {
    if (!formMessage) return;
    formMessage.textContent = msg;
    formMessage.className =
    "mt-3 text-sm text-center " + colorClass; // reset + add color
}

function validateFields() {
  const missing = [];

  if (!nameInput.value.trim()) missing.push("Name");
  if (!typeSelect.value) missing.push("Type");
  if (!addressInput.value.trim()) missing.push("Address");
  if (!descriptionInput.value.trim()) missing.push("Description");

  if (missing.length > 0) {
    showFormMessage(
      `Please fill in: ${missing.join(", ")}.`,
      "text-red-600"
    );
    return false;
  }
  return true;
}

// ---------- address input behavior ----------

// When user types, invalidate previous verification
if (addressInput) {
  addressInput.addEventListener("input", () => {
    if (isAddressVerified) {
      setVerifiedState(false);
      lonInput.value = "";
      latInput.value = "";
    //   showFormMessage(
    //     "Address changed. Please verify again.",
    //     "text-red-600"
    //   );
    // } else {
    //   // If not verified yet, just clear any old message
    //   clearFormMessage();
    }
  });
}

// ---------- Verify button ----------

if (verifyBtn && addressInput && resultsBox && lonInput && latInput) {
  verifyBtn.addEventListener("click", async () => {
    const query = addressInput.value.trim();

    // Clear previous selection & messages
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

// ---------- REGISTER button ----------

if (registerBtn) {
  registerBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    clearFormMessage();

    // 1. Check that all fields have values
    if (!validateFields()) {
      return;
    }

    // 2. Check that address is verified
    if (!isAddressVerified) {
      showFormMessage(
        "Please verify your address before submitting.",
        "text-red-600"
      );
      return;
    }

    const name = nameInput.value.trim();
    const type = typeSelect.value;
    const address = addressInput.value.trim();
    const description = descriptionInput.value.trim();
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
      name,
      type,
      location: address,        // backend expects `location`
      description,
      coordinates: [lon, lat],  // array for DAO/schema
    };

    try {
      const res = await fetch("/api/help-centers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        window.location.href = "/help-centers/confirm?action=registered";
        return;
      }

      let errorMessage = "Failed to register help center.";
      try {
        const errBody = await res.json();
        if (errBody && errBody.message) {
          errorMessage = errBody.message;
        }
      } catch (_) {
        // ignore if response isn't JSON
      }

      showFormMessage(errorMessage, "text-red-600");
    } catch (err) {
      console.error("Register help center error:", err);
      showFormMessage("Network error. Please try again.", "text-red-600");
    }
  });
}
