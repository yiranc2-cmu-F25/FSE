import { getInitialsSafe, getAvatarColor } from "../avatars.js";
import { reverseConvertBloodType } from "./bloodTypeConverter.js";
import { isVisibilityOkOrHelp } from "./visibilityUtils.js";

// Helper function to create bookmark button
function createBookmarkButton(profile, isBookmarked) {
  const bookmarkBtn = document.createElement("button");
  bookmarkBtn.type = "button";
  bookmarkBtn.className = "bookmark-btn flex-shrink-0 mt-1 cursor-pointer hover:opacity-80 transition-opacity";
  bookmarkBtn.style.pointerEvents = "auto";
  bookmarkBtn.dataset.profileId = profile._id;
  bookmarkBtn.dataset.isBookmarked = isBookmarked ? "true" : "false";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", `w-6 h-6 ${isBookmarked ? 'fill-red-500' : 'fill-none'} stroke-2 stroke-stone-400`);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.style.pointerEvents = "none";
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z");
  svg.appendChild(path);
  bookmarkBtn.appendChild(svg);
  
  return bookmarkBtn;
}

// Helper function to check if photo should be shown based on visibility
function shouldShowPhoto(profile) {
  // If no photo, don't show
  if (!profile.facePhotoId) {
    return false;
  }
  
  // Get user status (the person whose profile we're viewing)
  const userStatus = (profile.userStatus || "undefined").toLowerCase();
  
  // IMPORTANT: When user status is emergency, always show photo regardless of visibility settings
  // This ensures all emergency profiles display their photos for better identification
  if (userStatus === "emergency") {
    return true;
  }
  
  // Get photo visibility (facePhotoId might be an object if populated, or just an ID)
  let photoVisibility = null;
  if (typeof profile.facePhotoId === 'object' && profile.facePhotoId !== null) {
    photoVisibility = profile.facePhotoId.visibility;
  }
  
  // If no visibility info, show photo (backward compatibility)
  if (!photoVisibility) {
    return true;
  }
  
  // Normalize visibility to lowercase for comparison
  const normalizedVisibility = (photoVisibility || "").toLowerCase();
  
  // Check visibility rules for non-emergency statuses
  if (normalizedVisibility === "emergencyonly" || normalizedVisibility === "emergency_only") {
    // Only show in emergency status (but we already handled emergency above)
    return false;
  } else if (normalizedVisibility === "helporok" || normalizedVisibility === "help_or_ok" || normalizedVisibility === "okorhelp") {
    // Show in ok or help status
    return userStatus === "ok" || userStatus === "help";
  }
  
  // Default: show photo
  return true;
}

// Helper function to create avatar element
function createAvatarElement(profile, initials, avatarColor, cacheVersion) {
  const avatarContainer = document.createElement("div");
  avatarContainer.className = "flex-shrink-0";

  // Check if photo should be shown based on visibility
  if (shouldShowPhoto(profile)) {
    const img = document.createElement("img");
    const version = cacheVersion || Date.now();
    const photoUrl = `/api/public/emergency-profiles/${profile._id}/photos?v=${version}`;
    img.src = photoUrl;
    img.alt = profile.username || "";
    img.className = "h-12 w-12 rounded-full object-cover";
    img.onerror = (e) => {
      img.style.display = "none";
      const avatarDiv = createInitialsAvatar(initials, avatarColor);
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
    // Show initials avatar when photo is not visible or not available
    const avatarDiv = createInitialsAvatar(initials, avatarColor);
    avatarContainer.appendChild(avatarDiv);
  }
  
  return avatarContainer;
}

// Helper function to create initials avatar
function createInitialsAvatar(initials, avatarColor) {
  const avatarDiv = document.createElement("div");
  avatarDiv.className = "grid h-12 w-12 place-content-center rounded-full text-base font-bold text-white shadow-md";
  avatarDiv.style.backgroundColor = avatarColor || "#3b6a95";
  avatarDiv.textContent = initials || "?";
  return avatarDiv;
}

// Helper function to create status badge
function createStatusBadge(userStatus) {
  const statusSpan = document.createElement("span");
  statusSpan.className = "px-2 py-0.5 rounded text-xs font-semibold";
  
  const status = (userStatus || "undefined").toLowerCase();
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
  
  return statusSpan;
}

// Helper function to create profile header
function createProfileHeader(profile) {
  const headerDiv = document.createElement("div");
  headerDiv.className = "flex items-center gap-2 mb-2";

  const usernameSpan = document.createElement("span");
  usernameSpan.className = "font-semibold text-stone-800";
  usernameSpan.textContent = profile.username || "Unknown";

  const statusSpan = createStatusBadge(profile.userStatus);

  headerDiv.appendChild(usernameSpan);
  headerDiv.appendChild(statusSpan);
  
  return headerDiv;
}

// Helper function to create field detail element
function createFieldDetail(label, value) {
  const div = document.createElement("div");
  div.textContent = `${label}: ${value}`;
  return div;
}

// Helper function to format array field
function formatArrayField(array, defaultValue = 'NULL') {
  return array && array.length > 0 && array[0] !== 'null' 
    ? array.join(', ') 
    : defaultValue;
}

// Helper function to create profile details
function createProfileDetails(profile, showFields) {
  const detailsDiv = document.createElement("div");
  detailsDiv.className = "space-y-1 text-sm text-stone-600";

  if (showFields.bloodType && profile.bloodType) {
    const bloodTypeDisplay = reverseConvertBloodType(profile.bloodType);
    detailsDiv.appendChild(createFieldDetail("Blood Type", bloodTypeDisplay));
  }

  if (showFields.height && profile.height !== null && profile.height !== undefined) {
    detailsDiv.appendChild(createFieldDetail("Height", `${profile.height}cm`));
  }

  if (showFields.allergies) {
    const allergiesText = formatArrayField(profile.allergies);
    detailsDiv.appendChild(createFieldDetail("Allergies", allergiesText));
  }

  if (showFields.weight && profile.weight !== null && profile.weight !== undefined) {
    detailsDiv.appendChild(createFieldDetail("Weight", `${profile.weight}kg`));
  }

  if (showFields.emergencyContacts && profile.emergencyContacts && profile.emergencyContacts.length > 0) {
    detailsDiv.appendChild(createFieldDetail("Emergency Contacts", profile.emergencyContacts.join(', ')));
  }

  if (showFields.currentMedications) {
    const medicationsText = formatArrayField(profile.currentMedications);
    detailsDiv.appendChild(createFieldDetail("Current Medications", medicationsText));
  }

  if (showFields.chronicConditions) {
    const conditionsText = formatArrayField(profile.chronicConditions);
    detailsDiv.appendChild(createFieldDetail("Chronic conditions", conditionsText));
  }

  return detailsDiv;
}

export function createProfileCardElement(profile, isBookmarked, showFields, initials, avatarColor, cacheVersion = null) {
  const card = document.createElement("div");
  card.className = "flex items-start gap-3 p-4 border-b border-stone-200";
  card.style.position = "relative";

  const bookmarkBtn = createBookmarkButton(profile, isBookmarked);
  const avatarContainer = createAvatarElement(profile, initials, avatarColor, cacheVersion);
  const infoContainer = document.createElement("div");
  infoContainer.className = "flex-1 min-w-0";

  const headerDiv = createProfileHeader(profile);
  const detailsDiv = createProfileDetails(profile, showFields);

  infoContainer.appendChild(headerDiv);
  infoContainer.appendChild(detailsDiv);

  card.appendChild(bookmarkBtn);
  card.appendChild(avatarContainer);
  card.appendChild(infoContainer);

  return card;
}

