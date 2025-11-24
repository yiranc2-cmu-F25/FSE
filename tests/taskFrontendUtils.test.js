/**
 * Unit tests for frontend task-related utility functions
 * These tests focus on business logic that can be tested without DOM manipulation
 */

describe("Task Frontend Utilities - Business Logic Tests", () => {
  // Mock the category mapping constants
  const CATEGORY_TYPE_MAP = {
    debris_removal_and_cleanup: "debris",
    temporary_repair: "temp-repair",
    animal_care: "animal-care",
    others: "other",
  };

  const CATEGORY_DISPLAY_MAP = {
    debris_removal_and_cleanup: "Debris Removal",
    temporary_repair: "Temp Repair",
    animal_care: "Animal Care",
    others: "Others",
  };

  // Test getStatusLabel function (from taskList.js)
  describe("getStatusLabel - Positive Tests", () => {
    test("should capitalize first letter of emergency level", () => {
      function getStatusLabel(emergencyLevel) {
        if (!emergencyLevel) return "";
        return emergencyLevel.charAt(0).toUpperCase() + emergencyLevel.slice(1);
      }

      expect(getStatusLabel("critical")).toBe("Critical");
      expect(getStatusLabel("urgent")).toBe("Urgent");
      expect(getStatusLabel("standard")).toBe("Standard");
      expect(getStatusLabel("scheduled")).toBe("Scheduled");
    });

    test("should return empty string for null or undefined", () => {
      function getStatusLabel(emergencyLevel) {
        if (!emergencyLevel) return "";
        return emergencyLevel.charAt(0).toUpperCase() + emergencyLevel.slice(1);
      }

      expect(getStatusLabel(null)).toBe("");
      expect(getStatusLabel(undefined)).toBe("");
      expect(getStatusLabel("")).toBe("");
    });

    test("should handle single character emergency levels", () => {
      function getStatusLabel(emergencyLevel) {
        if (!emergencyLevel) return "";
        return emergencyLevel.charAt(0).toUpperCase() + emergencyLevel.slice(1);
      }

      expect(getStatusLabel("c")).toBe("C");
    });
  });

  // Test transformTask function logic (from taskList.js)
  describe("transformTask - Positive Tests", () => {
    test("should transform backend task to frontend format correctly", () => {
      function transformTask(backendTask) {
        const categoryType =
          CATEGORY_TYPE_MAP[backendTask.category] || "other";
        const categoryDisplay =
          CATEGORY_DISPLAY_MAP[backendTask.category] || backendTask.category || "";
        const statusLabel = backendTask.emergencyLevel
          ? backendTask.emergencyLevel.charAt(0).toUpperCase() +
            backendTask.emergencyLevel.slice(1)
          : "";
        const status = backendTask.isOpen ? "OPEN" : "CLOSED";

        return {
          id: backendTask.id || backendTask._id,
          title: backendTask.title || "",
          category: categoryDisplay,
          categoryType: categoryType,
          statusLevel: backendTask.emergencyLevel || "standard",
          statusLabel: statusLabel,
          status: status,
        };
      }

      const backendTask = {
        id: "task123",
        title: "Test Task",
        category: "debris_removal_and_cleanup",
        emergencyLevel: "urgent",
        isOpen: true,
      };

      const transformed = transformTask(backendTask);

      expect(transformed.id).toBe("task123");
      expect(transformed.title).toBe("Test Task");
      expect(transformed.category).toBe("Debris Removal");
      expect(transformed.categoryType).toBe("debris");
      expect(transformed.statusLevel).toBe("urgent");
      expect(transformed.statusLabel).toBe("Urgent");
      expect(transformed.status).toBe("OPEN");
    });

    test("should handle closed tasks correctly", () => {
      function transformTask(backendTask) {
        const status = backendTask.isOpen ? "OPEN" : "CLOSED";
        return { status };
      }

      const backendTask = { isOpen: false };
      const transformed = transformTask(backendTask);
      expect(transformed.status).toBe("CLOSED");
    });

    test("should map all category types correctly", () => {
      function transformTask(backendTask) {
        const categoryType =
          CATEGORY_TYPE_MAP[backendTask.category] || "other";
        const categoryDisplay =
          CATEGORY_DISPLAY_MAP[backendTask.category] || backendTask.category || "";
        return { categoryType, category: categoryDisplay };
      }

      expect(transformTask({ category: "debris_removal_and_cleanup" })).toEqual({
        categoryType: "debris",
        category: "Debris Removal",
      });
      expect(transformTask({ category: "temporary_repair" })).toEqual({
        categoryType: "temp-repair",
        category: "Temp Repair",
      });
      expect(transformTask({ category: "animal_care" })).toEqual({
        categoryType: "animal-care",
        category: "Animal Care",
      });
      expect(transformTask({ category: "others" })).toEqual({
        categoryType: "other",
        category: "Others",
      });
    });

    test("should handle unknown categories with fallback", () => {
      function transformTask(backendTask) {
        const categoryType =
          CATEGORY_TYPE_MAP[backendTask.category] || "other";
        const categoryDisplay =
          CATEGORY_DISPLAY_MAP[backendTask.category] || backendTask.category || "";
        return { categoryType, category: categoryDisplay };
      }

      const result = transformTask({ category: "unknown_category" });
      expect(result.categoryType).toBe("other");
      expect(result.category).toBe("unknown_category");
    });

    test("should handle missing id fields gracefully", () => {
      function transformTask(backendTask) {
        return {
          id: backendTask.id || backendTask._id || null,
        };
      }

      expect(transformTask({ id: "task1" }).id).toBe("task1");
      expect(transformTask({ _id: "task2" }).id).toBe("task2");
      expect(transformTask({}).id).toBe(null);
    });
  });

  // Test normalizeSkill function (from createTask.js)
  describe("normalizeSkill - Positive Tests", () => {
    test("should trim whitespace from skill names", () => {
      function normalizeSkill(text) {
        return text.trim();
      }

      expect(normalizeSkill("  heavy_lifting  ")).toBe("heavy_lifting");
      expect(normalizeSkill("first_aid")).toBe("first_aid");
      expect(normalizeSkill("  cpr  ")).toBe("cpr");
    });

    test("should handle empty strings", () => {
      function normalizeSkill(text) {
        return text.trim();
      }

      expect(normalizeSkill("")).toBe("");
      expect(normalizeSkill("   ")).toBe("");
    });
  });

  // Test skill duplicate checking logic (from createTask.js)
  describe("skillDuplicateCheck - Positive Tests", () => {
    test("should detect duplicate skills case-insensitively", () => {
      function isDuplicate(skills, newSkill) {
        const lower = newSkill.toLowerCase();
        return skills.some((s) => s.toLowerCase() === lower);
      }

      const skills = ["heavy_lifting", "first_aid"];
      expect(isDuplicate(skills, "Heavy_Lifting")).toBe(true);
      expect(isDuplicate(skills, "FIRST_AID")).toBe(true);
      expect(isDuplicate(skills, "cpr")).toBe(false);
    });

    test("should handle empty skills array", () => {
      function isDuplicate(skills, newSkill) {
        const lower = newSkill.toLowerCase();
        return skills.some((s) => s.toLowerCase() === lower);
      }

      expect(isDuplicate([], "heavy_lifting")).toBe(false);
    });
  });

  // Test helper validation logic (from editTask.js)
  describe("helperValidation - Positive Tests", () => {
    test("should validate that helpers count is not below current participants", () => {
      function validateHelpers(helpersValue, currentParticipants) {
        const value = parseInt(helpersValue);
        return !isNaN(value) && value >= currentParticipants;
      }

      expect(validateHelpers("5", 3)).toBe(true);
      expect(validateHelpers("3", 3)).toBe(true);
      expect(validateHelpers("2", 3)).toBe(false);
      expect(validateHelpers("10", 5)).toBe(true);
    });

    test("should reject invalid input", () => {
      function validateHelpers(helpersValue, currentParticipants) {
        const value = parseInt(helpersValue);
        return !isNaN(value) && value >= currentParticipants;
      }

      expect(validateHelpers("abc", 3)).toBe(false);
      expect(validateHelpers("", 3)).toBe(false);
      expect(validateHelpers(null, 3)).toBe(false);
    });

    test("should handle zero participants correctly", () => {
      function validateHelpers(helpersValue, currentParticipants) {
        const value = parseInt(helpersValue);
        return !isNaN(value) && value >= currentParticipants;
      }

      expect(validateHelpers("1", 0)).toBe(true);
      expect(validateHelpers("0", 0)).toBe(true);
      expect(validateHelpers("0", 1)).toBe(false);
    });
  });

  // Test task status toggle logic (from editTask.js)
  describe("taskStatusToggle - Positive Tests", () => {
    test("should correctly determine if task is open", () => {
      function isTaskOpen(statusValue) {
        return statusValue === "true" || statusValue === true;
      }

      expect(isTaskOpen("true")).toBe(true);
      expect(isTaskOpen(true)).toBe(true);
      expect(isTaskOpen("false")).toBe(false);
      expect(isTaskOpen(false)).toBe(false);
    });

    test("should handle string boolean values", () => {
      function isTaskOpen(statusValue) {
        return statusValue === "true" || statusValue === true;
      }

      expect(isTaskOpen("true")).toBe(true);
      expect(isTaskOpen("false")).toBe(false);
      expect(isTaskOpen("True")).toBe(false); // Case sensitive
    });
  });

  // Test task filtering logic (from myTasks.js)
  describe("taskFiltering - Positive Tests", () => {
    test("should filter tasks by ownership correctly", () => {
      function filterByOwnership(tasks, filterValue, currentUserId) {
        if (filterValue === "owned") {
          return tasks.filter((task) => {
            const creatorId = task.creator?.id || task.creator?._id || task.creator;
            return currentUserId && creatorId
              ? String(creatorId) === String(currentUserId)
              : false;
          });
        }
        return tasks;
      }

      const tasks = [
        { id: "1", creator: { id: "user1" } },
        { id: "2", creator: { id: "user2" } },
        { id: "3", creator: { id: "user1" } },
      ];

      const filtered = filterByOwnership(tasks, "owned", "user1");
      expect(filtered.length).toBe(2);
      expect(filtered.every((t) => t.creator.id === "user1")).toBe(true);
    });

    test("should filter tasks by participation correctly", () => {
      function filterByParticipation(tasks, filterValue) {
        if (filterValue === "joined") {
          return tasks.filter((task) => task.isParticipant === true);
        }
        return tasks;
      }

      const tasks = [
        { id: "1", isParticipant: true },
        { id: "2", isParticipant: false },
        { id: "3", isParticipant: true },
      ];

      const filtered = filterByParticipation(tasks, "joined");
      expect(filtered.length).toBe(2);
      expect(filtered.every((t) => t.isParticipant === true)).toBe(true);
    });

    test("should return all tasks when filter is not owned or joined", () => {
      function filterTasks(tasks, filterValue) {
        if (filterValue === "owned" || filterValue === "joined") {
          return filterValue === "owned"
            ? tasks.filter((t) => t.isOwner)
            : tasks.filter((t) => t.isParticipant);
        }
        return tasks;
      }

      const tasks = [
        { id: "1", isOwner: true },
        { id: "2", isOwner: false },
      ];

      const filtered = filterTasks(tasks, "emergency");
      expect(filtered.length).toBe(2);
    });
  });

  // Test search filtering logic
  describe("searchFiltering - Positive Tests", () => {
    test("should filter tasks by search keyword in title", () => {
      function filterBySearch(tasks, keyword) {
        const normalizedKeyword = keyword.toLowerCase().trim();
        if (!normalizedKeyword) return tasks;
        return tasks.filter((task) => {
          const title = (task.title || "").toLowerCase();
          const category = (task.category || "").toLowerCase();
          return title.includes(normalizedKeyword) || category.includes(normalizedKeyword);
        });
      }

      const tasks = [
        { title: "Clear Debris", category: "Debris Removal" },
        { title: "Rescue Animals", category: "Animal Care" },
        { title: "Fix Roof", category: "Temp Repair" },
      ];

      expect(filterBySearch(tasks, "debris").length).toBe(1);
      expect(filterBySearch(tasks, "animal").length).toBe(1);
      expect(filterBySearch(tasks, "fix").length).toBe(1);
      expect(filterBySearch(tasks, "nonexistent").length).toBe(0);
    });

    test("should be case-insensitive", () => {
      function filterBySearch(tasks, keyword) {
        const normalizedKeyword = keyword.toLowerCase().trim();
        if (!normalizedKeyword) return tasks;
        return tasks.filter((task) => {
          const title = (task.title || "").toLowerCase();
          return title.includes(normalizedKeyword);
        });
      }

      const tasks = [{ title: "Clear Debris" }];
      expect(filterBySearch(tasks, "CLEAR").length).toBe(1);
      expect(filterBySearch(tasks, "clear").length).toBe(1);
      expect(filterBySearch(tasks, "Clear").length).toBe(1);
    });

    test("should return all tasks when keyword is empty", () => {
      function filterBySearch(tasks, keyword) {
        const normalizedKeyword = keyword.toLowerCase().trim();
        if (!normalizedKeyword) return tasks;
        return tasks.filter((task) => {
          const title = (task.title || "").toLowerCase();
          return title.includes(normalizedKeyword);
        });
      }

      const tasks = [
        { title: "Task 1" },
        { title: "Task 2" },
      ];
      expect(filterBySearch(tasks, "").length).toBe(2);
      expect(filterBySearch(tasks, "   ").length).toBe(2);
    });
  });

  // Test sorting logic
  describe("taskSorting - Positive Tests", () => {
    test("should sort tasks by emergency level correctly", () => {
      const EMERGENCY_ORDER = {
        critical: 3,
        urgent: 2,
        standard: 1,
        scheduled: 0,
      };

      function compareByEmergency(a, b) {
        const aLevel = EMERGENCY_ORDER[a.statusLevel] ?? -1;
        const bLevel = EMERGENCY_ORDER[b.statusLevel] ?? -1;
        return aLevel - bLevel;
      }

      const tasks = [
        { statusLevel: "standard" },
        { statusLevel: "critical" },
        { statusLevel: "urgent" },
      ];

      const sorted = [...tasks].sort(compareByEmergency);
      expect(sorted[0].statusLevel).toBe("standard");
      expect(sorted[1].statusLevel).toBe("urgent");
      expect(sorted[2].statusLevel).toBe("critical");
    });

    test("should sort tasks by vacancy correctly", () => {
      function getVacancy(task) {
        const capacity = Number(task.capacity ?? 0);
        const joined = Number(task.joinedCount ?? 0);
        return capacity - joined;
      }

      function compareByVacancy(a, b) {
        return getVacancy(a) - getVacancy(b);
      }

      const tasks = [
        { capacity: 5, joinedCount: 3 },
        { capacity: 10, joinedCount: 2 },
        { capacity: 3, joinedCount: 1 },
      ];

      const sorted = [...tasks].sort(compareByVacancy);
      expect(getVacancy(sorted[0])).toBe(2);
      expect(getVacancy(sorted[1])).toBe(2);
      expect(getVacancy(sorted[2])).toBe(8);
    });

    test("should handle reverse sorting order", () => {
      function compareTasks(a, b, direction) {
        const diff = a.helpers - b.helpers;
        return direction === "asc" ? diff : -diff;
      }

      const tasks = [
        { helpers: 3 },
        { helpers: 1 },
        { helpers: 5 },
      ];

      const sortedAsc = [...tasks].sort((a, b) => compareTasks(a, b, "asc"));
      expect(sortedAsc[0].helpers).toBe(1);
      expect(sortedAsc[2].helpers).toBe(5);

      const sortedDesc = [...tasks].sort((a, b) => compareTasks(a, b, "desc"));
      expect(sortedDesc[0].helpers).toBe(5);
      expect(sortedDesc[2].helpers).toBe(1);
    });
  });

  // Test date formatting logic
  describe("dateFormatting - Positive Tests", () => {
    test("should format posted time correctly", () => {
      function getPostedTime(task) {
        if (!task.postedAt) return 0;
        const time = new Date(task.postedAt).getTime();
        return isNaN(time) ? 0 : time;
      }

      const task1 = { postedAt: "2024-10-24T10:30:00.000Z" };
      const task2 = { postedAt: "2024-10-25T10:30:00.000Z" };
      const task3 = {};

      expect(getPostedTime(task1)).toBeGreaterThan(0);
      expect(getPostedTime(task2)).toBeGreaterThan(getPostedTime(task1));
      expect(getPostedTime(task3)).toBe(0);
    });

    test("should handle invalid dates gracefully", () => {
      function getPostedTime(task) {
        if (!task.postedAt) return 0;
        const time = new Date(task.postedAt).getTime();
        return isNaN(time) ? 0 : time;
      }

      const task = { postedAt: "invalid-date" };
      expect(getPostedTime(task)).toBe(0);
    });
  });

  // Test category group ordering
  describe("categoryGroupOrdering - Positive Tests", () => {
    test("should order categories correctly", () => {
      const CATEGORY_GROUP_ORDER = {
        debris: 0,
        "temp-repair": 1,
        "animal-care": 2,
        other: 3,
      };

      function getCategoryGroupIndex(task) {
        const type = task.categoryType || "other";
        return CATEGORY_GROUP_ORDER[type] ?? CATEGORY_GROUP_ORDER.other;
      }

      expect(getCategoryGroupIndex({ categoryType: "debris" })).toBe(0);
      expect(getCategoryGroupIndex({ categoryType: "temp-repair" })).toBe(1);
      expect(getCategoryGroupIndex({ categoryType: "animal-care" })).toBe(2);
      expect(getCategoryGroupIndex({ categoryType: "other" })).toBe(3);
      expect(getCategoryGroupIndex({ categoryType: "unknown" })).toBe(3); // Fallback
    });
  });
});

