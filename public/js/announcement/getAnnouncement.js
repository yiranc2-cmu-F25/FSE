import { getSocket } from "/js/utils/socket.js";

// UI elements
const $ = (selector) => document.querySelector(selector);
const announcementList = $("#announcement-list");

// Initialize socket connection
const socket = getSocket();

// Format date for display (Today, July 2nd, etc.)
function formatAnnouncementDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const announcementDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  const diffDays = Math.floor(
    (today - announcementDate) / (1000 * 60 * 60 * 24),
  );

  let dateStr;
  if (diffDays === 0) {
    dateStr = "Today";
  } else {
    const month = date.toLocaleString("en-US", { month: "long" });
    const day = date.getDate();
    const suffix = getDaySuffix(day);
    dateStr = `${month} ${day}${suffix}`;
  }

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const timeStr = `${hours}:${minutes}`;

  return { date: dateStr, time: timeStr };
}

function getDaySuffix(day) {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function getStatusBadgeClass(status) {
  if (status.toUpperCase() === "HELP") {
    return "bg-yellow-400 text-white";
  } else if (status.toUpperCase() === "EMERGENCY") {
    return "bg-red-400 text-white";
  } else if (status.toUpperCase() === "OK") {
    return "bg-green-400 text-white";
  }
  return "bg-gray-400 text-white";
}

function createAnnouncementElement(announcement) {
  const { date, time } = formatAnnouncementDate(announcement.timestamp);
  const statusClass = getStatusBadgeClass(announcement.status);

  const article = document.createElement("article");
  article.className = "flex gap-4";
  // LHS must have fixed width to align properly
  article.innerHTML = `
    <!-- left: time-->
    <div class="flex flex-col items-start pt-1 min-w-[100px] max-w-[100px] pr-6 border-r border-gray-200">
      <span class="font-poppins text-sm font-medium text-gray-500">${date}</span>
      <span class="font-poppins mt-1 text-sm font-medium text-gray-500">${time}</span>
    </div>

    

    <!-- content -->
    <div class="w-[400px] flex flex-col">
      <div class="mb-1 flex items-center gap-2">
        <span class="font-poppins font-bold text-black">${escapeHtml(announcement.sender)}</span>
        <span class="font-poppins rounded-md px-2 py-0.5 text-xs font-semibold ${statusClass}">
          ${escapeHtml(announcement.status.toUpperCase())}
        </span>
      </div>
      <p class="font-poppins text-sm leading-relaxed text-gray-500">
        ${escapeHtml(announcement.content)}
      </p>
    </div>
  `;

  return article;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Render announcement list
function renderAnnouncements(announcements) {
  if (!announcementList) {
    console.error("Announcement list container not found");
    return;
  }

  // Clear existing announcements (remove static template if present)
  announcementList.innerHTML = "";

  // Sort announcements by timestamp (newest first)
  const sorted = [...announcements].sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  // Render latest announcement
  sorted.forEach((announcement) => {
    const element = createAnnouncementElement(announcement);
    announcementList.appendChild(element);
  });
}

async function fetchAnnouncements() {
  try {
    const response = await fetch("/api/announcements", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const announcements = await response.json();
    renderAnnouncements(announcements);
  } catch (error) {
    console.error("Failed to fetch announcements:", error);
  }
}

socket.on("public_message", (message) => {
  fetchAnnouncements();
});

// Initial load
document.addEventListener("DOMContentLoaded", () => {
  fetchAnnouncements();
});

// Also fetch when socket connects (in case we missed messages)
socket.on("connect", () => {
  fetchAnnouncements();
});
