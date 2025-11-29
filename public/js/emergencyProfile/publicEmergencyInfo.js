import {loadInfo} from "../utils/loadUserInfo.js";
import { getInitialsSafe, getAvatarColor } from "../utils/avatars.js";
import { statusUpdate } from "../utils/statusPageUpdate.js";
import { isVisibilityOkOrHelp } from "../utils/emergencyProfile/visibilityUtils.js";
import { createProfileCardElement } from "../utils/emergencyProfile/renderProfileCard.js";
import { getSocket } from "../utils/socket.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const ui = {
  avatarInit: $("#header-avatar-initials"),
  avatarColor: $("#header-avatar"),
  bookmarkContainer: $("#bookmark-profiles"),
  emergencyContainer: $("#emergency-profiles"),
  okHelpContainer: $("#ok-help-profiles"),
  bookmarkNoProfiles: $("#bookmark-no-profiles"),
  emergencyNoProfiles: $("#emergency-no-profiles"),
  okHelpNoProfiles: $("#ok-help-no-profiles"),
};

let currentUser = null;
let bookmarkedProfileIds = new Set();
let photoCacheVersion = Date.now(); // Version number to bust cache when profiles are reloaded

function setupUserInfo() {
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      // Wait a bit to ensure Alpine.js has initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!ui.bookmarkContainer || !ui.emergencyContainer || !ui.okHelpContainer) {
        console.error("Containers not found! Retrying...");
        // Retry after a short delay
        setTimeout(async () => {
          ui.bookmarkContainer = $("#bookmark-profiles");
          ui.emergencyContainer = $("#emergency-profiles");
          ui.okHelpContainer = $("#ok-help-profiles");
          if (ui.bookmarkContainer && ui.emergencyContainer && ui.okHelpContainer) {
            await loadAllProfiles();
          } else {
            console.error("Containers still not found after retry");
          }
        }, 500);
        return;
      }
      
      currentUser = await loadInfo();
      const name = (currentUser.username || "").trim();
      const role = currentUser.role || "";

      function getPrivilegeRingClass(role) {
        if (!role) return "";
        const roleLower = role.toLowerCase();
        if (roleLower === "admin" || roleLower === "administrator") {
          return "ring-4 ring-pink-400";
        }
        if (roleLower === "coordinator") {
          return "ring-4 ring-yellow-400";
        }
        return ""; // Citizen has no ring
      }

      statusUpdate(currentUser.status);
      if (ui.avatarColor) {
        ui.avatarColor.style.backgroundColor = getAvatarColor(name);
        const ringClass = getPrivilegeRingClass(role);
        // Remove existing ring classes
        ui.avatarColor.classList.remove("ring-2", "ring-4", "ring-pink-400", "ring-yellow-400", "ring-white");
        // Add new ring class if provided
        if (ringClass) {
          const ringClasses = ringClass.split(" ");
          ringClasses.forEach((cls) => {
            if (cls) ui.avatarColor.classList.add(cls);
          });
        }
      }
      if (ui.avatarInit) ui.avatarInit.textContent = getInitialsSafe(name);
      
      setupStatusListener();
      await loadAllProfiles();
    } catch (err) {
      console.error("Failed to load user info:", err);
    }
  });
}

function setupStatusListener() {
  const socket = getSocket();
  
  socket.on("new_status", async (data) => {
    // Reload all profiles to get updated status
    await loadAllProfiles();
  });
  
  socket.on("emergency_profile_updated", async (data) => {
    // Reload all profiles when emergency profile is created, updated, or deleted
    await loadAllProfiles();
  });
}

async function loadAllProfiles() {
  try {
    // Update cache version to force reload of images
    photoCacheVersion = Date.now();
    
    const [allProfilesRes, bookmarkedRes] = await Promise.all([
      fetch("/api/public/emergency-profiles", {
        credentials: "include",
        headers: { "Accept": "application/json" },
      }),
      fetch("/api/public/emergency-profiles/bookmarks", {
        credentials: "include",
        headers: { "Accept": "application/json" },
      }),
    ]);

    let allProfilesError = null;
    let bookmarkedError = null;

    if (!allProfilesRes.ok) {
      const errorText = await allProfilesRes.text().catch(() => "Unknown error");
      allProfilesError = {
        status: allProfilesRes.status,
        statusText: allProfilesRes.statusText,
        message: errorText
      };
      console.error("Failed to load all profiles:", allProfilesError);
    }

    if (!bookmarkedRes.ok) {
      const errorText = await bookmarkedRes.text().catch(() => "Unknown error");
      bookmarkedError = {
        status: bookmarkedRes.status,
        statusText: bookmarkedRes.statusText,
        message: errorText
      };
      console.error("Failed to load bookmarked profiles:", bookmarkedError);
    }

    // If both requests failed, throw error
    if (allProfilesError && bookmarkedError) {
      throw new Error(`Both requests failed: All profiles (${allProfilesError.status}), Bookmarks (${bookmarkedError.status})`);
    }

    // If only one request failed, try to continue with the successful one
    let allProfiles = { emergency: [], others: [] };
    let bookmarkedProfiles = [];

    if (!allProfilesError) {
      try {
        allProfiles = await allProfilesRes.json();
      } catch (parseErr) {
        console.error("Failed to parse all profiles response:", parseErr);
        allProfilesError = { message: "Failed to parse response" };
      }
    }

    if (!bookmarkedError) {
      try {
        bookmarkedProfiles = await bookmarkedRes.json();
      } catch (parseErr) {
        console.error("Failed to parse bookmarked profiles response:", parseErr);
        bookmarkedError = { message: "Failed to parse response" };
      }
    }

    // If both failed after parsing, throw error
    if (allProfilesError && bookmarkedError) {
      throw new Error(`Failed to load profiles: ${allProfilesError.message || "Unknown error"}`);
    }

    bookmarkedProfileIds = new Set(bookmarkedProfiles.map(p => String(p._id)));

    await renderProfiles(allProfiles, bookmarkedProfiles);
  } catch (err) {
    console.error("Failed to load profiles:", err);
    const errorMessage = err.message || "Unknown error";
    console.error("Error details:", errorMessage);
    alert(`Failed to load emergency profiles: ${errorMessage}. Please check the console for more details.`);
  }
}

function getShowFields(profile, userStatus) {
  const visibility = profile.visibility || {};
  // Normalize status to lowercase for comparison
  const normalizedStatus = (userStatus || "undefined").toLowerCase();
  const isOkOrHelp = normalizedStatus === "ok" || normalizedStatus === "help";
  
  return {
    bloodType: isOkOrHelp 
      ? isVisibilityOkOrHelp(visibility.bloodType || visibility.bloddType)
      : true,
    height: isOkOrHelp 
      ? isVisibilityOkOrHelp(visibility.height)
      : true,
    weight: isOkOrHelp 
      ? isVisibilityOkOrHelp(visibility.weight)
      : true,
    allergies: isOkOrHelp 
      ? isVisibilityOkOrHelp(visibility.allergies)
      : true,
    currentMedications: isOkOrHelp 
      ? isVisibilityOkOrHelp(visibility.currentMedications)
      : true,
    chronicConditions: isOkOrHelp 
      ? isVisibilityOkOrHelp(visibility.chronicConditions)
      : true,
    emergencyContacts: isOkOrHelp 
      ? isVisibilityOkOrHelp(visibility.emergencyContacts)
      : true,
  };
}

async function renderProfileCard(profile, container, isBookmarked) {
  try {
    if (!profile || !container) {
      console.error("Missing profile or container", { profile, container });
      return;
    }

    const showFields = getShowFields(profile, profile.userStatus);
    const initials = getInitialsSafe(profile.username || "");
    const avatarColor = getAvatarColor(profile.username || "");
    
    // Create card element using DOM API (no innerHTML, no EJS partial)
    // Profile data already includes photo from getAllEmergencyProfiles
    // Pass cache version to ensure images are reloaded when profiles are refreshed
    const card = createProfileCardElement(profile, isBookmarked, showFields, initials, avatarColor, photoCacheVersion);
    
    container.appendChild(card);
    
    const bookmarkBtn = card.querySelector(".bookmark-btn");
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleBookmarkToggle(profile._id, bookmarkBtn);
      }, { capture: true });
    }
  } catch (err) {
    console.error("Error rendering profile card:", err);
  }
}

async function renderProfiles(allProfiles, bookmarkedProfiles) {
  if (!ui.bookmarkContainer || !ui.emergencyContainer || !ui.okHelpContainer) {
    console.error("Containers not found");
    return;
  }

  ui.bookmarkContainer.innerHTML = "";
  ui.emergencyContainer.innerHTML = "";
  ui.okHelpContainer.innerHTML = "";

  // Hide all "no profiles" messages initially
  if (ui.bookmarkNoProfiles) ui.bookmarkNoProfiles.classList.add("hidden");
  if (ui.emergencyNoProfiles) ui.emergencyNoProfiles.classList.add("hidden");
  if (ui.okHelpNoProfiles) ui.okHelpNoProfiles.classList.add("hidden");

  // Render bookmarked profiles
  for (const profile of bookmarkedProfiles) {
    await renderProfileCard(profile, ui.bookmarkContainer, true);
  }
  
  // Show "no profiles" message if no bookmarked profiles
  if (bookmarkedProfiles.length === 0 && ui.bookmarkNoProfiles) {
    ui.bookmarkNoProfiles.classList.remove("hidden");
  }

  // Render emergency profiles
  const emergencyProfiles = allProfiles.emergency || [];
  for (const profile of emergencyProfiles) {
    const isBookmarked = bookmarkedProfileIds.has(String(profile._id));
    await renderProfileCard(profile, ui.emergencyContainer, isBookmarked);
  }
  
  // Show "no profiles" message if no emergency profiles
  if (emergencyProfiles.length === 0 && ui.emergencyNoProfiles) {
    ui.emergencyNoProfiles.classList.remove("hidden");
  }

  // Render OK/HELP profiles
  const otherProfiles = allProfiles.others || [];
  const okHelpProfiles = otherProfiles.filter(p => {
    const status = p.userStatus || p.profile?.userStatus;
    return status === "ok" || status === "help" || status === "OK" || status === "HELP";
  });
  
  for (const profile of okHelpProfiles) {
    const isBookmarked = bookmarkedProfileIds.has(String(profile._id));
    await renderProfileCard(profile, ui.okHelpContainer, isBookmarked);
  }
  
  // Show "no profiles" message if no OK/HELP profiles
  if (okHelpProfiles.length === 0 && ui.okHelpNoProfiles) {
    ui.okHelpNoProfiles.classList.remove("hidden");
  }
}

async function handleBookmarkToggle(profileId, button) {
  const isBookmarked = button.dataset.isBookmarked === "true";
  
  try {
    const url = "/api/public/emergency-profiles/bookmarks";
    const method = isBookmarked ? "DELETE" : "POST";
    
    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ profileId }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Bookmark request failed:", { status: res.status, errorText });
      throw new Error(`Failed to toggle bookmark: ${res.status} ${errorText}`);
    }
    
    const newIsBookmarked = !isBookmarked;
    button.dataset.isBookmarked = newIsBookmarked ? "true" : "false";
    
    const svg = button.querySelector("svg");
    if (!svg) {
      console.error("SVG not found in button!");
    } else {
      if (newIsBookmarked) {
        svg.classList.remove("fill-none");
        svg.classList.add("fill-red-500");
        bookmarkedProfileIds.add(String(profileId));
      } else {
        svg.classList.remove("fill-red-500");
        svg.classList.add("fill-none");
        bookmarkedProfileIds.delete(String(profileId));
      }
    }

    // Reload to update bookmark section and ensure consistency
    await loadAllProfiles();
  } catch (err) {
    console.error("Failed to toggle bookmark:", err);
    alert("Failed to update bookmark. Please try again later.");
  }
}

setupUserInfo();
