/****************************************************
 * Edit Help Centers – Frontend Script
 * Features:
 * ✔ Fetch user help centers
 * ✔ Get user geolocation
 * ✔ Compute distance using Haversine formula
 * ✔ Sort by nearest → farthest
 * ✔ Render cards styled like announcement UI
 ****************************************************/

const listEl = document.getElementById("help-center-list");
const msgEl = document.getElementById("help-center-message");

const baseMsgClass =
  "min-h-[1.25rem] text-sm text-center mb-3 text-gray-600";

/*------------------------------
  Helpers
------------------------------*/

function capitalize(str = "") {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function setMessage(text, colorClass = "text-gray-600") {
  if (!msgEl) return;
  msgEl.textContent = text || "";
  msgEl.className = `${baseMsgClass} ${colorClass}`;
}

function clearMessage() {
  setMessage("");
}

// Prevent HTML injection issues
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/*------------------------------
  Geolocation
------------------------------*/

async function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported.");
      return resolve(null);
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      (err) => {
        console.warn("Geolocation error:", err);
        resolve(null); // Allow graceful fallback
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

/*------------------------------
  Haversine Formula (km)
------------------------------*/

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/*------------------------------
  Load Help Centers
------------------------------*/

async function loadHelpCenters(userLocation) {
  setMessage("Loading your help centers...");

  try {
    const res = await fetch("/api/help-centers");

    if (res.status === 401 || res.status === 403) {
      setMessage(
        "You must be logged in to view your help centers.",
        "text-red-600"
      );
      return;
    }

    if (!res.ok) {
      setMessage(
        "Failed to load help centers. Please try again later.",
        "text-red-600"
      );
      return;
    }

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      setMessage(
        "You have not registered any help centers yet.",
        "text-gray-500"
      );
      listEl.innerHTML = "";
      return;
    }

    /*--------------------------------
      If location available → compute distances
    ---------------------------------*/
    if (userLocation) {
      data.forEach((hc) => {
        const coords = hc.coordinates;
        if (
          Array.isArray(coords) &&
          coords.length === 2 &&
          typeof coords[0] === "number" &&
          typeof coords[1] === "number"
        ) {
          const [lon, lat] = coords;
          hc.distanceKm = haversineDistanceKm(
            userLocation.lat,
            userLocation.lon,
            lat,
            lon
          );
        } else {
          hc.distanceKm = null;
        }
      });

      // Sort by distance (unknown distances go last)
      data.sort((a, b) => {
        const da = a.distanceKm ?? Infinity;
        const db = b.distanceKm ?? Infinity;
        return da - db;
      });
    }

    clearMessage();
    renderList(data);
  } catch (err) {
    console.error("Error loading help centers:", err);
    setMessage("Network error. Please try again.", "text-red-600");
  }
}

/*------------------------------
  Render Cards
------------------------------*/

function renderList(helpCenters) {
  if (!listEl) return;
  listEl.innerHTML = "";

  helpCenters.forEach((hc) => {
    const name = escapeHtml(hc.name || "Untitled Help Center");
    const location = escapeHtml(hc.location || "");
    const typeRaw = Array.isArray(hc.type) ? hc.type[0] : hc.type;
    const type = escapeHtml(capitalize(typeRaw || "Unknown"));

    let distanceLabel = "";
    if (typeof hc.distanceKm === "number") {
      distanceLabel = `${hc.distanceKm.toFixed(1)} km`;
    }

    const card = document.createElement("button");
    card.type = "button";
    card.className =
      "w-full rounded-xl bg-white px-4 shadow-sm hover:shadow-md transition border border-gray-200 text-left";

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
        </div>
      </div>
    `;

    // Navigate to detailed edit page
    card.addEventListener("click", () => {
      if (!hc._id) {
        console.warn("Help center missing _id:", hc);
        return;
      }
      window.location.href = `/help-centers/manage/edit/${hc._id}`;
    });

    listEl.appendChild(card);
  });
}


/*------------------------------
  Bootstrap
------------------------------*/

document.addEventListener("DOMContentLoaded", async () => {
  const userLocation = await getUserLocation();
  loadHelpCenters(userLocation);
});
