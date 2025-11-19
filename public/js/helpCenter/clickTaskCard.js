// public/js/helpCenter/clickTaskCard.js

// Fetch task details from API
async function fetchTaskDetails(taskId) {
  try {
    const response = await fetch(`/api/tasks/single/${encodeURIComponent(taskId)}`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error("Unauthorized: Please log in");
        return null;
      }
      if (response.status === 404) {
        console.error("Task not found");
        return null;
      }
      throw new Error(`Failed to fetch task: ${response.status}`);
    }

    const task = await response.json();
    return task;
  } catch (error) {
    console.error("Error fetching task details:", error);
    return null;
  }
}

// Get current user ID (if available)
function getCurrentUserId() {
  // Try to get from various possible sources
  return (
    window.__CURRENT_USER_ID__ ||
    window.__USER_ID__ ||
    document.querySelector('[data-user-id]')?.dataset?.userId ||
    null
  );
}

// Determine viewer relationship to task
function determineViewerRelationship(task, currentUserId) {
  if (!task || !currentUserId) {
    return {
      isParticipant: false,
      isOwner: false,
    };
  }

  const creatorId = task.creator?.id || task.creator?._id || task.creator;
  const isOwner = String(creatorId) === String(currentUserId);
  
  // Use isParticipant from API response if available
  const isParticipant = task.isParticipant !== undefined 
    ? task.isParticipant 
    : isOwner; // Fallback to owner check if API doesn't provide it

  return {
    isParticipant,
    isOwner,
  };
}

// Handle task card click
async function handleTaskCardClick(event) {
  // Always prevent default navigation for task card clicks
  event.preventDefault();
  event.stopPropagation();

  // Find the task card - could be the clicked element itself or a parent
  const clickedElement = event.target;
  const link = clickedElement.closest("a[data-task-id]");
  const card =
    clickedElement.closest(".task-card, .task-list-item, .highlighted-task-card") ||
    link?.closest(".task-card, .task-list-item, .highlighted-task-card");

  // Get task ID from various possible sources
  const taskId =
    link?.dataset?.taskId ||
    card?.dataset?.taskId ||
    clickedElement.closest("[data-task-id]")?.dataset?.taskId ||
    clickedElement.dataset?.taskId;

  if (!taskId) {
    console.warn("No task ID found on clicked element", clickedElement);
    return;
  }

  // Show loading state
  if (window.TaskDetailModal) {
    window.TaskDetailModal.open({ id: taskId, loading: true });
  }

  // Fetch task details
  const task = await fetchTaskDetails(taskId);
  if (!task) {
    console.error("Failed to fetch task details for taskId:", taskId);
    if (window.TaskDetailModal) {
      window.TaskDetailModal.close();
    }
    return;
  }

  console.log("[clickTaskCard] Fetched task from API:", task);

  // Determine viewer relationship
  const currentUserId = getCurrentUserId();
  const viewer = determineViewerRelationship(task, currentUserId);
  
  console.log("[clickTaskCard] Viewer relationship:", viewer, "currentUserId:", currentUserId);

  // Open modal with task data
  if (window.TaskDetailModal) {
    window.TaskDetailModal.open(task, viewer);
  } else {
    console.error("[clickTaskCard] TaskDetailModal not available");
  }
}

// Attach click handlers to task cards
function attachTaskCardHandlers() {
  // Use event delegation for all clicks - this handles dynamically added cards
  document.addEventListener("click", (event) => {
    const clickedElement = event.target;
    
    // Check if click is on a task card or a link inside a task card
    const link = clickedElement.closest("a[data-task-id]");
    const card = clickedElement.closest(
      ".task-card, .task-list-item, .highlighted-task-card, .highlighted-task-cta",
    );

    // If clicked on a link with data-task-id or inside a task card, handle it
    if (link || card) {
      handleTaskCardClick(event);
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", attachTaskCardHandlers);
} else {
  attachTaskCardHandlers();
}

