/* global mapboxgl */
const msgEl = document.getElementById("map-message");

function showMessage(msg) {
  if (!msgEl) return;
  msgEl.textContent = msg;
}

function clearMessage() {
  if (!msgEl) return;
  msgEl.textContent = "";
}

function getQueryCoords() {
  const params = new URLSearchParams(window.location.search);
  const lat = parseFloat(params.get("lat"));
  const lon = parseFloat(params.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }
  return { lat, lon };
}

function initMap(center) {
  const token = window.MAPBOX_TOKEN;
  if (!token) {
    showMessage("Map token missing.");
    return;
  }

  mapboxgl.accessToken = token;

  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [center.lon, center.lat], // [lng, lat]
    zoom: 13,
  });

  // Add zoom / rotation controls
  map.addControl(new mapboxgl.NavigationControl(), "top-right");

  // Add a marker for the focus location (user or selected help center)
  new mapboxgl.Marker({ color: "#2563eb" })
    .setLngLat([center.lon, center.lat])
    .setPopup(new mapboxgl.Popup().setHTML("<b>You are here</b>"))
    .addTo(map);

  // After map loads, fetch nearby help centers and add pins
  map.on("load", () => {
    clearMessage();
    addHelpCenterMarkers(map, center);
  });
}

async function addHelpCenterMarkers(map, center) {
  try {
    showMessage("Loading help centers...");

    const query = `/api/help-centers/closest-help-centers?coordinates=${center.lon},${center.lat}&limit=20`;
    const res = await fetch(query);

    if (!res.ok) {
      showMessage("Failed to load help centers.");
      return;
    }

    const helpCenters = await res.json();
    if (!Array.isArray(helpCenters) || helpCenters.length === 0) {
      showMessage("No help centers found nearby.");
      return;
    }

    helpCenters.forEach((hc) => {
      if (
        !Array.isArray(hc.coordinates) ||
        hc.coordinates.length !== 2 ||
        typeof hc.coordinates[0] !== "number" ||
        typeof hc.coordinates[1] !== "number"
      ) {
        return;
      }

      const [lon, lat] = hc.coordinates;

      const rawType = hc.type || "Unknown";
      const prettyType =
        rawType.charAt(0).toUpperCase() + rawType.slice(1);

      const name = hc.name || "Untitled Help Center";
      const location = hc.location || "";
      const description = hc.description || "";

      const popupHtml = `
        <div style="font-size: 12px;">
          <div style="font-weight: 600;">${name}</div>
          <div style="color:#6b7280;">Type: ${prettyType}</div>
          ${
            location
              ? `<div style="color:#6b7280; margin-top:2px;">Address: ${location}</div>`
              : ""
          }
          ${
            description
              ? `<div style="color:#6b7280; margin-top:4px;">Description: ${description}</div>`
              : ""
          }
        </div>
      `;

      new mapboxgl.Marker({ color: "#ef4444" }) // red
        .setLngLat([lon, lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml))
        .addTo(map);
    });

    clearMessage();
  } catch (err) {
    console.error("Error loading help centers on map:", err);
    showMessage("Server error. Please try again.");
  }
}

// bootstrap
document.addEventListener("DOMContentLoaded", () => {
  const queryCenter = getQueryCoords();

  if (!queryCenter) {
    // fallback: try browser geolocation
    if (!navigator.geolocation) {
      showMessage("Location not available.");
      return;
    }

    showMessage("Getting your location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const center = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };
        clearMessage();
        initMap(center);
      },
      (err) => {
        console.error("Geolocation error:", err);
        showMessage("Unable to access your location.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  } else {
    showMessage("Loading map...");
    initMap({ lat: queryCenter.lat, lon: queryCenter.lon });
  }
});
