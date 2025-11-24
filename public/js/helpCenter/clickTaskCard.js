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

// Cache for current user ID to avoid repeated API calls
let cachedUserId = null;
let userIdFetchPromise = null;

// Get current user ID (if available)
async function getCurrentUserId() {
  // First, try to get from window (set by EJS template)
  if (window.__CURRENT_USER_ID__) {
    cachedUserId = String(window.__CURRENT_USER_ID__);
    return cachedUserId;
  }
  
  // If cached, return it
  if (cachedUserId) {
    return cachedUserId;
  }
  
  // If already fetching, return the promise
  if (userIdFetchPromise) {
    return userIdFetchPromise;
  }
  
  // Try other sources
  const fromOtherSources = 
    window.__USER_ID__ ||
    document.querySelector('[data-user-id]')?.dataset?.userId;
  
  if (fromOtherSources) {
    cachedUserId = String(fromOtherSources);
    return cachedUserId;
  }
  
  // Fetch from API as fallback
  userIdFetchPromise = fetch("/api/authentications/accounts", {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        // Not authenticated or error
        return null;
      }
      return response.json();
    })
    .then((user) => {
      if (user && user.id) {
        cachedUserId = String(user.id);
        return cachedUserId;
      }
      return null;
    })
    .catch((error) => {
      console.warn("[getCurrentUserId] Failed to fetch user ID:", error);
      return null;
    })
    .finally(() => {
      userIdFetchPromise = null;
    });
  
  return userIdFetchPromise;
}

// Determine viewer relationship to task
function determineViewerRelationship(task, currentUserId) {
  console.log("[determineViewerRelationship] Input:", { 
    taskId: task?.id, 
    taskIsParticipant: task?.isParticipant,
    currentUserId,
    creatorId: task?.creator?.id || task?.creator?._id || task?.creator
  });
  
  if (!task) {
    console.warn("[determineViewerRelationship] No task provided");
    return {
      isParticipant: false,
      isOwner: false,
    };
  }
  // log all ids for the comparison
  console.log("[determineViewerRelationship] Task:", task);

  // Normalize creator ID - handle both ObjectId and string formats
  const creatorId = task.creator?.id || task.creator?._id || task.creator;
  const normalizedCreatorId = creatorId ? String(creatorId) : null;
  const normalizedCurrentUserId = currentUserId ? String(currentUserId) : null;
  
  // Compare owner status - user can be both owner and participant
  const isOwner = normalizedCurrentUserId && normalizedCreatorId 
    ? normalizedCreatorId === normalizedCurrentUserId 
    : false;
  
  // Use isParticipant from API response if available
  // Note: A user can be BOTH a participant AND the owner
  const isParticipant = task.isParticipant !== undefined 
    ? task.isParticipant 
    : false; // Don't fallback to owner check - they are separate concepts

  console.log("[determineViewerRelationship] Result:", { 
    isParticipant, 
    isOwner,
    normalizedCreatorId,
    normalizedCurrentUserId,
    idsMatch: normalizedCreatorId === normalizedCurrentUserId
  });

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

  // Determine viewer relationship - await userId if it's a promise
  const currentUserId = await getCurrentUserId();
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

