import { getInitialsSafe, getAvatarColor } from "../avatars.js";
import { reverseConvertBloodType } from "./bloodTypeConverter.js";
import { isVisibilityOkOrHelp } from "./visibilityUtils.js";

export function createProfileCardElement(profile, isBookmarked, showFields, initials, avatarColor, cacheVersion = null) {
  const card = document.createElement("div");
  card.className = "flex items-start gap-3 p-4 border-b border-stone-200";
  card.style.position = "relative"; // Ensure proper stacking context

  const bookmarkBtn = document.createElement("button");
  bookmarkBtn.type = "button"; // Prevent form submission
  bookmarkBtn.className = "bookmark-btn flex-shrink-0 mt-1 cursor-pointer hover:opacity-80 transition-opacity";
  bookmarkBtn.style.pointerEvents = "auto"; // Ensure button is clickable
  bookmarkBtn.dataset.profileId = profile._id;
  bookmarkBtn.dataset.isBookmarked = isBookmarked ? "true" : "false";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", `w-6 h-6 ${isBookmarked ? 'fill-red-500' : 'fill-none'} stroke-2 stroke-stone-400`);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.style.pointerEvents = "none"; // Prevent SVG from blocking clicks
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z");
  svg.appendChild(path);
  bookmarkBtn.appendChild(svg);

  const avatarContainer = document.createElement("div");
  avatarContainer.className = "flex-shrink-0";

  // Check if profile has facePhotoId (photo will be loaded separately to avoid large payload)
  if (profile.facePhotoId) {
    const img = document.createElement("img");
    // Add cache version to URL to prevent caching when photo is updated
    // Use cacheVersion if provided, otherwise use current timestamp
    const version = cacheVersion || Date.now();
    img.src = `/api/public/emergency-profiles/${profile._id}/photo?v=${version}`;
    img.alt = profile.username || "";
    img.className = "h-12 w-12 rounded-full object-cover";
    img.onerror = () => {
      // If image fails to load, show avatar with initials
      img.style.display = "none";
      const avatarDiv = document.createElement("div");
      avatarDiv.className = "grid h-12 w-12 place-content-center rounded-full text-base font-bold text-white shadow-md";
      avatarDiv.style.backgroundColor = avatarColor || "#3b6a95";
      avatarDiv.textContent = initials || "?";
      avatarContainer.appendChild(avatarDiv);
    };
    avatarContainer.appendChild(img);
  } else if (profile.facePhoto && profile.facePhoto.data) {
    // Fallback: if facePhoto.data is provided (for backward compatibility)
    const img = document.createElement("img");
    img.src = profile.facePhoto.data;
    img.alt = profile.username || "";
    img.className = "h-12 w-12 rounded-full object-cover";
    avatarContainer.appendChild(img);
  } else {
    const avatarDiv = document.createElement("div");
    avatarDiv.className = "grid h-12 w-12 place-content-center rounded-full text-base font-bold text-white shadow-md";
    avatarDiv.style.backgroundColor = avatarColor || "#3b6a95";
    avatarDiv.textContent = initials || "?";
    avatarContainer.appendChild(avatarDiv);
  }

  const infoContainer = document.createElement("div");
  infoContainer.className = "flex-1 min-w-0";

  const headerDiv = document.createElement("div");
  headerDiv.className = "flex items-center gap-2 mb-2";

  const usernameSpan = document.createElement("span");
  usernameSpan.className = "font-semibold text-stone-800";
  usernameSpan.textContent = profile.username || "Unknown";

  const statusSpan = document.createElement("span");
  statusSpan.className = "px-2 py-0.5 rounded text-xs font-semibold";
  
  // Normalize status to lowercase for comparison
  const status = (profile.userStatus || "undefined").toLowerCase();
  if (status === "ok") {
    statusSpan.className += " bg-green-500 text-white";
    statusSpan.textContent = "OK";
  } else if (status === "help") {
    statusSpan.className += " bg-yellow-400 text-black";
    statusSpan.textContent = "HELP";
  } else if (status === "emergency") {
    statusSpan.className += " bg-red-600 text-white";
    statusSpan.textContent = "EMERGENCY";
  } else {
    statusSpan.className += " bg-stone-400 text-white";
    statusSpan.textContent = "UNDEFINED";
  }

  headerDiv.appendChild(usernameSpan);
  headerDiv.appendChild(statusSpan);

  const detailsDiv = document.createElement("div");
  detailsDiv.className = "space-y-1 text-sm text-stone-600";

  if (showFields.bloodType && profile.bloodType) {
    const bloodTypeDiv = document.createElement("div");
    const bloodTypeDisplay = reverseConvertBloodType(profile.bloodType);
    bloodTypeDiv.textContent = `Blood Type: ${bloodTypeDisplay}`;
    detailsDiv.appendChild(bloodTypeDiv);
  }

  if (showFields.height && profile.height !== null && profile.height !== undefined) {
    const heightDiv = document.createElement("div");
    heightDiv.textContent = `Height: ${profile.height}cm`;
    detailsDiv.appendChild(heightDiv);
  }

  if (showFields.allergies) {
    const allergiesDiv = document.createElement("div");
    const allergiesText = profile.allergies && profile.allergies.length > 0 && profile.allergies[0] !== 'null' 
      ? profile.allergies.join(', ') 
      : 'NULL';
    allergiesDiv.textContent = `Allergies: ${allergiesText}`;
    detailsDiv.appendChild(allergiesDiv);
  }

  if (showFields.weight && profile.weight !== null && profile.weight !== undefined) {
    const weightDiv = document.createElement("div");
    weightDiv.textContent = `Weight: ${profile.weight}kg`;
    detailsDiv.appendChild(weightDiv);
  }

  if (showFields.emergencyContacts && profile.emergencyContacts && profile.emergencyContacts.length > 0) {
    const contactsDiv = document.createElement("div");
    contactsDiv.textContent = `Emergency Contacts: ${profile.emergencyContacts.join(', ')}`;
    detailsDiv.appendChild(contactsDiv);
  }

  if (showFields.currentMedications) {
    const medicationsDiv = document.createElement("div");
    const medicationsText = profile.currentMedications && profile.currentMedications.length > 0 && profile.currentMedications[0] !== 'null'
      ? profile.currentMedications.join(', ')
      : 'NULL';
    medicationsDiv.textContent = `Current Medications: ${medicationsText}`;
    detailsDiv.appendChild(medicationsDiv);
  }

  if (showFields.chronicConditions) {
    const conditionsDiv = document.createElement("div");
    const conditionsText = profile.chronicConditions && profile.chronicConditions.length > 0 && profile.chronicConditions[0] !== 'null'
      ? profile.chronicConditions.join(', ')
      : 'NULL';
    conditionsDiv.textContent = `Chronic conditions: ${conditionsText}`;
    detailsDiv.appendChild(conditionsDiv);
  }

  infoContainer.appendChild(headerDiv);
  infoContainer.appendChild(detailsDiv);

  card.appendChild(bookmarkBtn);
  card.appendChild(avatarContainer);
  card.appendChild(infoContainer);

  return card;
}

