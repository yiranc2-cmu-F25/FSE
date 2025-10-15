//displayname, avatar, status
//loadinfo from backend
import {loadInfo} from "../utils/loadinfo.js";
import { getInitialsSafe,getAvatarColor } from "../utils/avatars.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const user = await loadInfo();
    const name = (user.username || "").trim();

    const displayInput = document.querySelector('input[name="displayName"]');
    const avatarInit = document.getElementById("avatar-initials");
    const avatarColor = document.getElementById("avatar");

    if (avatarColor) avatarColor.style.backgroundColor = getAvatarColor(name);;
    if (avatarInit) avatarInit.textContent = getInitialsSafe(name);
    if (displayInput) displayInput.value = name || "Guest";
  } catch (err) {
    console.error("Failed to load user info:", err);
  }
});

const root = document.querySelector("#esn-status");
if (!root) throw new Error("Missing #esn-status");

let currentStatus = (root.dataset.default || "UNDEFINED").toUpperCase();

const tabs = [...root.querySelectorAll(".status-tab")];

// interactions
tabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentStatus = (btn.dataset.status || "UNDEFINED").toUpperCase();
    console.log("new status", currentStatus);
    // TODO: on click, change the styling of the selected tab
  });
});

// helper: remove active class from all tabs
function clearActive() {
  tabs.forEach((tab) => tab.classList.remove("active"));
}

// helper: apply active class to the selected tab
function setActive(status) {
  clearActive();
  const selected = tabs.find(
    (tab) => (tab.dataset.status || "UNDEFINED").toUpperCase() === status,
  );
  if (selected) selected.classList.add("active");
}

// attach click handlers
tabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentStatus = (btn.dataset.status || "UNDEFINED").toUpperCase();
    console.log("new status", currentStatus);
    setActive(currentStatus);
    // TODO: later send currentStatus to backend here
  });
});



document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('status-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // TODO: save logic here in future
    try{
      const user = await loadInfo();
      const pathStatus = await fetch('/api/authentications/newstatuses', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId : user.id,
          newStatus: currentStatus }),
      });
      if (!pathStatus.ok) throw new Error(`HTTP ${pathStatus.status}`);
      const data = await pathStatus.json();
      openModal();
    }catch(err){
      console.error('Failed to update status:', err);
      alert('Failed to update status. Please try again later.');
    }
  });
});

// initialize default selection
setActive(currentStatus);


const modal = document.getElementById("status-modal");
const modalClose = document.getElementById("status-modal-close");

function openModal() {
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  modal.setAttribute("aria-hidden", "true");
}



if (modal && modalClose) {
  modalClose.addEventListener("click", () => {
    closeModal();
    window.location.href = "/members";
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
}