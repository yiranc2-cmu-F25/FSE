//displayname, avatar, status
//loadinfo from backend
import { getSocket } from "../utils/socket.js";
import { setupUserInfoRenderer } from "../utils/userInfoRenderer.js";
import { setupModalCloseWithRedirect, openModal as openModalUtil } from "../utils/modalHelpers.js";
import { loadInfo } from "../utils/loadUserInfo.js";

function connectSocket() {
  const sock = getSocket();
  if (sock && !sock.connected) {
    try {
      sock.connect();
      sock.on?.("connect", () => console.log("[status] socket connected", sock.id));
      sock.on?.("connect_error", (e) => console.warn("[status] connect_error", e?.message || e));
    } catch (e) {
      console.error("[status] connect() failed", e);
    }
  }
}

function renderInfo() {
  setupUserInfoRenderer();
}

const root = document.querySelector("#esn-status");
if (!root) throw new Error("Missing #esn-status");

let currentStatus = (root.dataset.default || "UNDEFINED").toUpperCase();

const tabs = [...root.querySelectorAll(".status-tab")];

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

function attachClickHandlers() {
  // attach click handlers
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      currentStatus = (btn.dataset.status || "UNDEFINED").toUpperCase();
      console.log("new status", currentStatus);
      setActive(currentStatus);
    });
  });
}

async function fetchPathStatus(userId, newStatus) {
  const pathStatus = await fetch('/api/authentications/statuses/new', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      userId : userId,
      newStatus: newStatus }),
  });
  if (!pathStatus.ok) throw new Error(`HTTP ${pathStatus.status}`);
  return pathStatus.json();
}

function attachSubmitHandler() {
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('status-form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try{
        const user = await loadInfo();
        await fetchPathStatus(user.id, currentStatus);
        openModal();
      }catch(err){
        console.error('Failed to update status:', err);
        alert('Failed to update status. Please try again later.');
      }
    });
  });
}

// initialize default selection
setActive(currentStatus);


const modal = document.getElementById("status-modal");
const modalClose = document.getElementById("status-modal-close");

function openModal() {
  openModalUtil(modal);
}

function closeModalHandler() {
  setupModalCloseWithRedirect(modal, modalClose, "/members");
}

// kick off
connectSocket();
renderInfo();
attachClickHandlers();
attachSubmitHandler();
closeModalHandler();
