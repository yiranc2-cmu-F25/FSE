// public/js/helpCenter/viewHelpCenter.js

const listEl = document.getElementById("public-help-center-list");
const msgEl = document.getElementById("public-help-center-message");
const viewMapBtn = document.getElementById("view-map-btn");

let userLat = null;
let userLon = null;

function showMessage(msg, colorClass = "text-gray-600") {
  if (!msgEl) return;
  msgEl.textContent = msg;
  msgEl.className = `mt-4 min-h-[1.25rem] text-sm text-center ${colorClass}`;
}

function clearMessage() {
  if (!msgEl) return;
  msgEl.textContent = "";
  msgEl.className = "mt-4 min-h-[1.25rem] text-sm text-gray-600 text-center";
}

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

// Haversine distance in km
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderList(helpCenters) {
  if (!listEl) return;
  listEl.innerHTML = "";

  if (!Array.isArray(helpCenters) || helpCenters.length === 0) {
    showMessage("No help centers found nearby.", "text-gray-500");
    return;
  }

  helpCenters.forEach((hc) => {
    const rawType = hc.type || "Unknown";
    const prettyType =
      rawType.charAt(0).toUpperCase() + rawType.slice(1);

    const type = escapeHtml(prettyType);
    const name = escapeHtml(hc.name || "Untitled Help Center");
    const location = escapeHtml(hc.location || "");
    const description = escapeHtml(hc.description || "");

    let distanceLabel = "";
    if (typeof hc.distanceKm === "number") {
      distanceLabel = `${hc.distanceKm.toFixed(1)} km`;
    }

    const card = document.createElement("div");
    card.className =
      "w-full rounded-xl bg-white px-4 shadow-sm border border-gray-200 cursor-pointer";
    card.dataset.id = hc._id; // assume API returns _id

    card.innerHTML = `
      <div class="flex gap-4 py-4">
        <!-- Left column -->
        <div class="flex w-24 flex-col text-left">
          <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Type
          </span>
          <span class="mt-1 text-sm font-medium text-gray-700 break-words">
            ${type}
          </span>
        </div>

        <!-- Divider -->
        <div class="w-px bg-gray-200"></div>

        <!-- Content -->
        <div class="flex-1">
          <div class="mb-1 flex items-center justify-between gap-2">
            <span class="font-bold text-black line-clamp-1">
              ${name}
            </span>
            <span class="text-xs text-gray-400 whitespace-nowrap">
              ${distanceLabel}
            </span>
          </div>

          ${
            location
              ? `<p class="text-xs text-gray-500 line-clamp-1 mb-1">${location}</p>`
              : ""
          }

          ${
            description
              ? `<p class="text-xs text-gray-500 line-clamp-2">${description}</p>`
              : ""
          }
        </div>
      </div>
    `;

    card.addEventListener("click", () => {
      const id = card.dataset.id;
      if (id) {
        window.location.href = `/help-centers/view/${id}`;
      }
    });

    listEl.appendChild(card);
  });
}


async function fetchNearbyHelpCenters(lat, lon) {
  try {
    showMessage("Loading nearby help centers...", "text-gray-500");

    const query = `/api/help-centers/closest-help-centers?coordinates=${lon},${lat}&limit=10`;
    const res = await fetch(query);

    if (!res.ok) {
      showMessage("Failed to load help centers.", "text-red-600");
      return;
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      showMessage("Unexpected response from server.", "text-red-600");
      return;
    }

    // Attach distanceKm to each result
    const withDistance = data
      .filter(
        (hc) =>
          Array.isArray(hc.coordinates) &&
          hc.coordinates.length === 2 &&
          typeof hc.coordinates[0] === "number" &&
          typeof hc.coordinates[1] === "number"
      )
      .map((hc) => {
        const [hcLon, hcLat] = hc.coordinates;
        const dKm = distanceKm(lat, lon, hcLat, hcLon);
        return { ...hc, distanceKm: dKm };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);

    clearMessage();
    renderList(withDistance);
  } catch (err) {
    console.error("Error fetching nearby help centers:", err);
    showMessage("Server error. Please try again.", "text-red-600");
  }
}

function initGeolocationAndFetch() {
  if (!navigator.geolocation) {
    showMessage(
      "Geolocation is not supported by your browser.",
      "text-red-600"
    );
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLat = pos.coords.latitude;
      userLon = pos.coords.longitude;
      fetchNearbyHelpCenters(userLat, userLon);
    },
    (err) => {
      console.error("Geolocation error:", err);
      showMessage(
        "Unable to access your location. Please enable location services.",
        "text-red-600"
      );
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    }
  );
}

// bootstrap
document.addEventListener("DOMContentLoaded", () => {
  initGeolocationAndFetch();
});
