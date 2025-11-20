document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const action = params.get("action") || "registered";

  const pretty = {
    registered: "Registered",
    updated: "Updated",
    deleted: "Deleted",
  };

  const span = document.getElementById("action");
  if (span) {
    span.textContent = pretty[action] || "Completed";
  }
});
