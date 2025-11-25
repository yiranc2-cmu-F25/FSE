const msgEl = document.getElementById("detail-message");
const nameEl = document.getElementById("detail-name");
const typeEl = document.getElementById("detail-type");
const locationEl = document.getElementById("detail-location");
const descEl = document.getElementById("detail-description");
const coordsEl = document.getElementById("detail-coordinates");
const viewMapBtn = document.getElementById("detail-view-map-btn");
const snapshotImg = document.getElementById("detail-map-snapshot");

let currentCoordinates = null;

function showMessage(msg, colorClass = "text-gray-600") {
  if (!msgEl) return;
  msgEl.textContent = msg;
  msgEl.className = `min-h-[1.25rem] text-sm text-center ${colorClass}`;
}

function clearMessage() {
  if (!msgEl) return;
  msgEl.textContent = "";
  msgEl.className = "min-h-[1.25rem] text-sm text-gray-600 text-center";
}

function buildStaticMapUrl(lon, lat) {
  const token = window.MAPBOX_TOKEN;
  if (!token) return "";

  const style = "mapbox/streets-v12";
  const zoom = 14;
  const width = 600;
  const height = 300;

  return (
    `https://api.mapbox.com/styles/v1/${style}/static/` +
    `pin-l+ef4444(${lon},${lat})/` +
    `${lon},${lat},${zoom},0/` +
    `${width}x${height}@2x` +
    `?access_token=${token}`
  );
}


function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getIdFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1]; // last segment
}

async function loadHelpCenter() {
  const id = getIdFromPath();
  if (!id) {
    showMessage("Invalid help center ID in URL.", "text-red-600");
    return;
  }

  try {
    showMessage("Loading help center...", "text-gray-500");

    const res = await fetch(`/api/help-centers/${id}`);

    if (res.status === 404) {
      showMessage("Help center not found.", "text-red-600");
      return;
    }
    if (!res.ok) {
      showMessage("Failed to load help center.", "text-red-600");
      return;
    }

    const hc = await res.json();
    fillDetail(hc);
    clearMessage();
  } catch (err) {
    console.error("Error loading help center detail:", err);
    showMessage("Network error. Please try again.", "text-red-600");
  }
}

function fillDetail(hc) {
  if (nameEl) nameEl.textContent = escapeHtml(hc.name || "Untitled Help Center");

  const rawType = hc.type || "Unknown";
  const prettyType =
    rawType.charAt(0).toUpperCase() + rawType.slice(1);
  if (typeEl) typeEl.textContent = escapeHtml(prettyType);

  if (locationEl) locationEl.textContent = escapeHtml(hc.location || "No address available");

  if (descEl) {
    descEl.textContent =
      hc.description && hc.description.trim().length > 0
        ? hc.description
        : "No description provided.";
  }

  if (
    Array.isArray(hc.coordinates) &&
    hc.coordinates.length === 2 &&
    typeof hc.coordinates[0] === "number" &&
    typeof hc.coordinates[1] === "number"
  ) {
    const [lon, lat] = hc.coordinates;
    currentCoordinates = { lon, lat };

    if (coordsEl) {
      coordsEl.textContent = `Longitude: ${lon.toFixed(5)}, Latitude: ${lat.toFixed(
        5
      )}`;
    }

    // 👉 set snapshot image
    if (snapshotImg) {
      const url = buildStaticMapUrl(lon, lat);
      snapshotImg.src = url;
      snapshotImg.alt = `Map showing location of ${hc.name || "help center"}`;
    }
  } else {
    if (coordsEl) coordsEl.textContent = "Coordinates not available.";
    if (snapshotImg) {
      snapshotImg.src = "";
      snapshotImg.alt = "Map not available";
    }
  }
}

// View in Map button
if (viewMapBtn) {
  viewMapBtn.addEventListener("click", () => {
    if (!currentCoordinates) {
      showMessage(
        "No coordinates available to show on map.",
        "text-red-600"
      );
      return;
    }
    const { lon, lat } = currentCoordinates;
    // Adjust this URL to your actual map page route
    window.location.href = `/help-centers/map?lon=${lon}&lat=${lat}`;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadHelpCenter();
});
