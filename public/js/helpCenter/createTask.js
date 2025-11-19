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

// ---- back button (placeholder behavior) ----
if (backBtn) {
  backBtn.addEventListener("click", () => {
    // simple default: go back in history if possible
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/help-center";
    }
  });
}

// initial state
updateSkillHiddenInput();
renderSkillTags();
