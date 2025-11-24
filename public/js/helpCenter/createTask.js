// public/js/tasks/createTask.js

const skillInput = document.querySelector("#skill-input");
const addSkillBtn = document.querySelector("#add-skill-btn");
const skillTagsContainer = document.querySelector("#skill-tags-container");
const skillHiddenInput = document.querySelector("#skill-hidden-input");

const categoryChips = document.querySelectorAll(".category-chip");
const categoryHiddenInput = document.querySelector("#task-category-input");

const emergencyChips = document.querySelectorAll(".emergency-chip");
const emergencyHiddenInput = document.querySelector("#task-emergency-input");

const backBtn = document.querySelector("#create-task-back-btn");

let skills = [];

// ---- helpers ----
function normalizeSkill(text) {
  return text.trim();
}

function updateSkillHiddenInput() {
  // store as JSON string; backend can parse later
  skillHiddenInput.value = JSON.stringify(skills);
}

function renderSkillTags() {
  const html = skills
    .map(
      (skill) => `
      <span
        class="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm"
        data-skill="${skill}"
      >
        <span>${skill}</span>
        <button
          type="button"
          class="skill-remove-btn inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] text-amber-700"
          data-skill="${skill}"
          aria-label="Remove skill ${skill}"
        >
          ×
        </button>
      </span>
    `,
    )
    .join("");

  skillTagsContainer.innerHTML = html;
}

function addSkillFromInput() {
  if (!skillInput) return;
  const value = normalizeSkill(skillInput.value);
  if (!value) return;

  // avoid duplicates (case insensitive)
  const lower = value.toLowerCase();
  const exists = skills.some((s) => s.toLowerCase() === lower);
  if (exists) {
    skillInput.value = "";
    return;
  }

  skills.push(value);
  skillInput.value = "";
  renderSkillTags();
  updateSkillHiddenInput();
}

function removeSkill(skill) {
  const lower = skill.toLowerCase();
  skills = skills.filter((s) => s.toLowerCase() !== lower);
  renderSkillTags();
  updateSkillHiddenInput();
}

// ---- event wiring ----

// Enter key: add skill instead of submitting form
if (skillInput) {
  skillInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addSkillFromInput();
    }
  });
}

// Tick button
if (addSkillBtn) {
  addSkillBtn.addEventListener("click", () => {
    addSkillFromInput();
  });
}

// Remove skill via event delegation
if (skillTagsContainer) {
  skillTagsContainer.addEventListener("click", (event) => {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.classList.contains("skill-remove-btn")
    ) {
      const skill = target.dataset.skill || "";
      removeSkill(skill);
    }
  });
}

// ---- category chip selection ----
function clearSelectedChip(chips, selectedClass) {
  chips.forEach((chip) => chip.classList.remove(selectedClass));
}

if (categoryChips && categoryHiddenInput) {
  categoryChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const category = chip.dataset.category || "";

      clearSelectedChip(categoryChips, "ring-2");

      console.log("Selected category chip: ", chip.dataset.category);

      // simple visual "selected" state
      if (category === "debris") {
        chip.classList.add("ring-2", "ring-amber-300");
      } else if (category === "temp-repair") {
        chip.classList.add("ring-2", "ring-indigo-800");
      } else if (category === "animal-care") {
        chip.classList.add("ring-2", "ring-emerald-700");
      } else if (category === "other") {
        chip.classList.add("ring-2", "ring-stone-500");
      } else {
        chip.classList.add("ring-2", "ring-amber-300");
      }

      categoryHiddenInput.value = category;
    });
  });
}

// ---- emergency level selection ----
if (emergencyChips && emergencyHiddenInput) {
  emergencyChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const e_lvl = chip.dataset.emergency || "";

      clearSelectedChip(emergencyChips, "ring-2");

      console.log("Selected emergency level chip: ", chip.dataset.emergency);

      // simple visual "selected" state
      if (e_lvl === "critical") {
        chip.classList.add("ring-2", "ring-rose-500");
      } else if (e_lvl === "urgent") {
        chip.classList.add("ring-2", "ring-amber-600");
      } else if (e_lvl === "standard") {
        chip.classList.add("ring-2", "ring-stone-500");
      } else if (e_lvl === "scheduled") {
        chip.classList.add("ring-2", "ring-emerald-600");
      } else {
        chip.classList.add("ring-2", "ring-amber-300");
      }

      emergencyHiddenInput.value = e_lvl;
    });
  });
}

// ---- back button ----
if (backBtn) {
  backBtn.addEventListener("click", () => {
    window.location.href = "/esn-help-center";
  });
}

// ---- form submission ----
const form = document.querySelector("#create-task-form");
// Skip form submission handler if we're in edit mode (editTask.js will handle it)
if (form && !window.__EDIT_TASK_DATA__) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Map frontend category values to backend format
    const categoryMap = {
      debris: "debris_removal_and_cleanup",
      "temp-repair": "temporary_repair",
      "animal-care": "animal_care",
      other: "others",
    };

    // Get form data
    const formData = new FormData(form);
    const title = formData.get("title")?.trim();
    const description = formData.get("description")?.trim();
    const dueDate = formData.get("dueDate");
    const helpersNeeded = formData.get("helpersNeeded");
    const location = formData.get("location")?.trim();
    const categoryFrontend = categoryHiddenInput?.value || "";
    const emergencyLevel = emergencyHiddenInput?.value || "";
    const skillsJson = skillHiddenInput?.value || "[]";

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
    if (!categoryFrontend) {
      alert("Please select a task category");
      return;
    }
    if (!emergencyLevel) {
      alert("Please select an emergency level");
      return;
    }

    // Map category to backend format
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
      taskType: "normal", // Default to "normal" for now
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

    // Submit to API
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for auth
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create task");
      }

      // Success: show modal using ModalManager
      if (window.ModalManager) {
        window.ModalManager.open("publish-success-modal");
      } else {
        // Fallback if ModalManager not loaded
        const modal = document.querySelector('[data-modal="publish-success-modal"]');
        if (modal) {
          modal.classList.remove("hidden");
          document.body.style.overflow = "hidden";
        }
      }
    } catch (error) {
      console.error("Error creating task:", error);
      alert(`Failed to create task: ${error.message}`);
    }
  });
}

// ---- success modal redirect ----
// Listen for modal close event and redirect to help center
document.addEventListener("click", (event) => {
  const target = event.target;
  const modal = target?.closest('[data-modal="publish-success-modal"]');
  
  if (modal && target?.hasAttribute("data-modal-close")) {
    // Small delay to allow modal close animation
    setTimeout(() => {
      window.location.href = "/esn-help-center";
    }, 200);
  }
});

// initial state
updateSkillHiddenInput();
renderSkillTags();
