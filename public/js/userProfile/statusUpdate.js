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

// initialize default selection
setActive(currentStatus);
