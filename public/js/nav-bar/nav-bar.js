const path = window.location.pathname;
const membersBtn = document.getElementById("nav-members-btn");
const helpBtn = document.getElementById("nav-help-btn");

const membersIcon = document.getElementById("nav-members-icon");
const helpIcon = document.getElementById("nav-help-icon");

const membersLabel = document.getElementById("nav-members-label");
const helpLabel = document.getElementById("nav-help-label");

const memberPath = "/members";
const helpPath = "/esn-help-center";

function setAllThin() {
  membersIcon.src = "images/help-tasks/icons/Members-Thin.svg";
  helpIcon.src = "images/help-tasks/icons/Help-Center-Thin.svg";

  membersLabel.classList.remove("font-bold");
  membersLabel.classList.add("font-normal");
  helpLabel.classList.remove("font-bold");
  helpLabel.classList.add("font-normal");
}

function activate(tab) {
  setAllThin();

  if (tab === "members") {
    membersIcon.src = "images/help-tasks/icons/Members-Bold.svg";
    membersLabel.classList.remove("font-normal");
    membersLabel.classList.add("font-bold");
  } else if (tab === "help") {
    helpIcon.src = "images/help-tasks/icons/Help-Center-Bold.svg";
    helpLabel.classList.remove("font-normal");
    helpLabel.classList.add("font-bold");
  }
}

// Top-level path check: Set active tab based on current URL
if (path === memberPath || path.startsWith(memberPath + "/")) {
  activate("members");
} else if (path === helpPath || path.startsWith(helpPath + "/")) {
  activate("help");
} else {
  setAllThin();
}

// Event listeners for navigation buttons
membersBtn?.addEventListener("click", () => {
  if (path !== memberPath) {
    window.location.href = memberPath;
  }
});

helpBtn?.addEventListener("click", () => {
  if (path !== helpPath) {
    window.location.href = helpPath;
  }
});
