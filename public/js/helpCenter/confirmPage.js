document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const action = params.get("action") || "registered";

  const pretty = {
    registered: "Registered",
    updated: "Updated",
    deleted: "Deleted",
  };

  // Update text
  const span = document.getElementById("action");
  if (span) {
    span.textContent = pretty[action] || "Completed";
  }

  // Update OK button destination
  const okBtn = document.getElementById("confirm-ok-btn");
  if (okBtn) {
    let target = "/help-centers"; // default

    if (action === "updated" || action === "deleted") {
      target = "/help-centers/edit";
    }

    okBtn.href = target;
  }
});
