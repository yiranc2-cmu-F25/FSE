// public/js/helpCenter/editTask.js

// This script handles edit mode for the task form
// It pre-populates fields and overrides form submission to use PUT method

const taskData = window.__EDIT_TASK_DATA__;

if (!taskData) {
  console.warn("No task data found for edit mode");
} else {
  console.log("Edit mode: Pre-populating form with task data:", taskData);

  // Function to initialize edit mode
  function initializeEditMode() {
    // Wait for DOM and createTask.js to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        // Wait a bit longer to ensure createTask.js has initialized
        setTimeout(() => {
          populateEditForm();
          overrideFormSubmission();
        }, 300);
      });
    } else {
      // DOM already loaded, wait for createTask.js
      setTimeout(() => {
        populateEditForm();
        overrideFormSubmission();
      }, 300);
    }
  }

  initializeEditMode();
}

// Initialize task status toggle buttons
function initializeTaskStatusToggle() {
  const openBtn = document.querySelector("#task-status-open-btn");
  const closedBtn = document.querySelector("#task-status-closed-btn");
  const statusInput = document.querySelector("#task-status-input");
  
  if (!openBtn || !closedBtn || !statusInput) {
    console.warn("[Edit Task] Task status elements not found");
    return;
  }
  
  function updateStatusButtons(isOpen) {
    // Update hidden input
    statusInput.value = isOpen ? "true" : "false";
    
    // Update button styles
    if (isOpen) {
      openBtn.className = "task-status-btn flex-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700";
      closedBtn.className = "task-status-btn flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-semibold text-stone-500";
    } else {
      openBtn.className = "task-status-btn flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-semibold text-stone-500";
      closedBtn.className = "task-status-btn flex-1 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-600";
    }
  }
  
  openBtn.addEventListener("click", () => {
    updateStatusButtons(true);
  });
  
  closedBtn.addEventListener("click", () => {
    updateStatusButtons(false);
  });
  
  // Initialize based on current value
  const currentValue = statusInput.value === "true";
  updateStatusButtons(currentValue);
}

// Initialize helper number validation
function initializeHelperValidation() {
  const helpersInput = document.querySelector("#task-helpers");
  const errorMsg = document.querySelector("#helpers-error-msg");
  
  if (!helpersInput || !errorMsg) {
    console.warn("[Edit Task] Helper validation elements not found");
    return;
  }
  
  // Get current number of participants from task data
  const currentParticipants = taskData?.helpersJoined || 0;
  
  function validateHelpers() {
    const value = parseInt(helpersInput.value);
    const isValid = !isNaN(value) && value >= currentParticipants;
    
    if (helpersInput.value && !isValid) {
      errorMsg.textContent = `Number of helpers cannot be below the current number of participants (${currentParticipants}).`;
      errorMsg.classList.remove("hidden");
      helpersInput.classList.add("border-rose-500");
    } else {
      errorMsg.classList.add("hidden");
      helpersInput.classList.remove("border-rose-500");
    }
    
    return isValid;
  }
  
  // Validate on input change
  helpersInput.addEventListener("input", validateHelpers);
  helpersInput.addEventListener("blur", validateHelpers);
  
  // Store validation function for form submission
  window.__VALIDATE_HELPERS__ = validateHelpers;
}

function populateEditForm() {
  console.log("[Edit Task] Starting form pre-population");
  
  // Initialize task status toggle
  initializeTaskStatusToggle();
  
  // Initialize helper validation
  initializeHelperValidation();
  
  // Pre-populate category
  if (taskData.category) {
    const backendToFrontendMap = {
      debris_removal_and_cleanup: "debris",
      temporary_repair: "temp-repair",
      animal_care: "animal-care",
      others: "other",
    };
    
    const frontendCategory = backendToFrontendMap[taskData.category] || taskData.category;
    
    const categoryBtn = document.querySelector(
      `[data-category="${frontendCategory}"]`
    );
    if (categoryBtn) {
      console.log("[Edit Task] Selecting category:", frontendCategory);
      // Trigger click to set up the hidden input and visual state
      categoryBtn.click();
    } else {
      console.warn("[Edit Task] Category button not found for:", frontendCategory);
    }
  }

  // Pre-populate emergency level
  if (taskData.emergencyLevel) {
    const emergencyBtn = document.querySelector(
      `[data-emergency="${taskData.emergencyLevel}"]`
    );
    if (emergencyBtn) {
      console.log("[Edit Task] Selecting emergency level:", taskData.emergencyLevel);
      // Trigger click to set up the hidden input and visual state
      emergencyBtn.click();
    } else {
      console.warn("[Edit Task] Emergency level button not found for:", taskData.emergencyLevel);
    }
  }

  // Pre-populate skills - wait a bit for skill input to be ready
  if (taskData.skillsRequired && Array.isArray(taskData.skillsRequired) && taskData.skillsRequired.length > 0) {
    setTimeout(() => {
      const skillInput = document.querySelector("#skill-input");
      const addSkillBtn = document.querySelector("#add-skill-btn");
      
      if (skillInput && addSkillBtn) {
        console.log("[Edit Task] Adding skills:", taskData.skillsRequired);
        taskData.skillsRequired.forEach((skill, index) => {
          setTimeout(() => {
            skillInput.value = skill;
            addSkillBtn.click();
          }, index * 100); // Stagger skill additions
        });
      } else {
        console.warn("[Edit Task] Skill input or button not found");
      }
    }, 200);
  }
  
  console.log("[Edit Task] Form pre-population complete");
}

function overrideFormSubmission() {
  const form = document.querySelector("#create-task-form");
  if (!form) {
    console.error("Form not found");
    return;
  }

  const taskId = form.dataset.taskId || taskData?.id || taskData?._id;
  if (!taskId) {
    console.error("Task ID not found");
    return;
  }

  // Override form submission with PUT method
  // Note: createTask.js is prevented from attaching its handler when __EDIT_TASK_DATA__ exists
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation(); // Prevent any other handlers from running

    // Get form values (same as createTask.js)
    const title = document.querySelector("#task-title")?.value?.trim() || "";
    const description =
      document.querySelector("#task-description")?.value?.trim() || "";
    const dueDate = document.querySelector("#task-due-date")?.value || "";
    const location = document.querySelector("#task-location")?.value?.trim() || "";
    const helpersNeeded =
      document.querySelector("#task-helpers")?.value || "";
    const categoryHiddenInput = document.querySelector("#task-category-input");
    const emergencyHiddenInput = document.querySelector("#task-emergency-input");
    const skillHiddenInput = document.querySelector("#skill-hidden-input");
    const statusInput = document.querySelector("#task-status-input");

    const categoryFrontend = categoryHiddenInput?.value || "";
    const emergencyLevel = emergencyHiddenInput?.value || "";
    const skillsJson = skillHiddenInput?.value || "[]";
    const isOpenValue = statusInput?.value || "true";

    // Validation
    if (!title) {
      alert("Please enter a task title");
      return;
    }
    if (!description) {
      alert("Please enter a task description");
      return;
    }
    if (!helpersNeeded || parseInt(helpersNeeded) < 1) {
      alert("Please enter a valid number of helpers (at least 1)");
      return;
    }
    
    // Validate helpers against current participants
    const currentParticipants = taskData?.helpersJoined || 0;
    const helpersNum = parseInt(helpersNeeded);
    if (helpersNum < currentParticipants) {
      const errorMsg = document.querySelector("#helpers-error-msg");
      if (errorMsg) {
        errorMsg.textContent = `Number of helpers cannot be below the current number of participants (${currentParticipants}).`;
        errorMsg.classList.remove("hidden");
      }
      alert(`Number of helpers cannot be below the current number of participants (${currentParticipants}).`);
      return;
    }
    if (!categoryFrontend) {
      alert("Please select a task category");
      return;
    }
    if (!emergencyLevel) {
      alert("Please select an emergency level");
      return;
    }

    // Map category to backend format
    const categoryMap = {
      debris: "debris_removal_and_cleanup",
      "temp-repair": "temporary_repair",
      "animal-care": "animal_care",
      other: "others",
    };
    const category = categoryMap[categoryFrontend] || categoryFrontend;

    // Parse skills
    let skillsRequired = [];
    try {
      skillsRequired = JSON.parse(skillsJson);
      if (!Array.isArray(skillsRequired)) {
        skillsRequired = [];
      }
    } catch (e) {
      console.warn("Failed to parse skills:", e);
      skillsRequired = [];
    }

    // Prepare request body
    const requestBody = {
      title,
      description,
      category,
      helpers: parseInt(helpersNeeded),
      emergencyLevel,
      taskType: taskData.taskType || "normal", // Preserve original taskType
      skillsRequired,
    };

    // Add optional fields
    if (dueDate) {
      // Convert date to ISO string
      const dateObj = new Date(dueDate);
      if (!isNaN(dateObj.getTime())) {
        requestBody.dueDate = dateObj.toISOString();
      }
    }
    if (location) {
      requestBody.location = location;
    }

    // Get isOpen status from form input
    const isOpen = isOpenValue === "true";
    requestBody.isOpen = isOpen;

    // Get submit button and disable during submission
    const submitBtn = document.querySelector("#update-task-btn");
    const originalText = submitBtn?.textContent || "Update Task";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Updating...";
    }

    // Submit to API using PUT method
    const apiUrl = `/api/tasks/single/${encodeURIComponent(taskId)}`;
    console.log("[Edit Task] Submitting update to:", apiUrl, "with method: PUT");
    console.log("[Edit Task] Request body:", requestBody);
    
    try {
      const response = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for auth
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized: Please log in");
        }
        if (response.status === 403) {
          throw new Error(data.message || "Unauthorized: Only the task owner can edit this task");
        }
        if (response.status === 404) {
          throw new Error("Task not found");
        }
        throw new Error(data.message || "Failed to update task");
      }

      // Success: show modal using ModalManager
      if (window.ModalManager) {
        window.ModalManager.open("edit-success-modal");
      } else {
        // Fallback if ModalManager not loaded
        const modal = document.querySelector('[data-modal="edit-success-modal"]');
        if (modal) {
          modal.classList.remove("hidden");
          document.body.style.overflow = "hidden";
        }
      }
    } catch (error) {
      console.error("Error updating task:", error);
      alert(`Failed to update task: ${error.message}`);
    } finally {
      // Re-enable button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
}

// Handle edit success modal close - redirect to help center
document.addEventListener("click", (event) => {
  const target = event.target;
  const modal = target?.closest('[data-modal="edit-success-modal"]');

  if (modal && target?.hasAttribute("data-modal-close")) {
    // Small delay to allow modal close animation
    setTimeout(() => {
      window.location.href = "/esn-help-center";
    }, 200);
  }
});

