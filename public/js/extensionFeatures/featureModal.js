document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const openBtn = document.getElementById("open-profile-modal"); // kebab button
  const modal = document.getElementById("feature-modal");
  const overlay = document.getElementById("feature-modal-overlay");
  const closeBtn = document.getElementById("feature-modal-close");

  if (!modal) return;

  let lastActive = null;

  function openModal() {
    lastActive = document.activeElement;
    modal.classList.remove("hidden");
    body.classList.add("overflow-hidden");
    closeBtn?.focus();
  }

  function closeModal() {
    modal.classList.add("hidden");
    body.classList.remove("overflow-hidden");
    lastActive?.focus?.();
  }

  openBtn?.addEventListener("click", openModal);
  closeBtn?.addEventListener("click", closeModal);
  overlay?.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
  });

  const logoutBtn = document.getElementById("feature-logout");

  logoutBtn?.addEventListener("click", async () => {
    const originalText = logoutBtn.textContent;
    logoutBtn.disabled = true;
    logoutBtn.textContent = "Logging out…";

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (res.ok || res.status === 401 || res.status === 403) {
        window.location.replace("/");
        return;
      }
      const data = await res.json().catch(() => ({}));
      alert(data?.message || "Server error logging out. Please try again.");
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Network error. Please try again.");
    } finally {
      logoutBtn.disabled = false;
      logoutBtn.textContent = originalText;
    }
  });
});
