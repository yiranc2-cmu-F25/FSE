document.querySelectorAll(".task-card").forEach((card) => {
  card.addEventListener("click", () => {
    // eventually you’ll pass the real task + viewer info
    window.TaskDetailModal.open();
  });
});
