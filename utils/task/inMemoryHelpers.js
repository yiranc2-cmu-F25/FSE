/**
 * Utility functions for in-memory task operations
 */

/**
 * Filters tasks based on criteria
 * @param {Array} tasks - Array of task objects
 * @param {Object} filters - Filter criteria
 * @param {string} filters.emergencyLevel - Emergency level filter
 * @param {string} filters.category - Category filter
 * @param {boolean} filters.isOpen - Open/closed status filter
 * @param {string} filters.creatorId - Creator ID filter (optional)
 * @param {Array} filters.participantTaskIds - Array of task IDs where user is participant (optional)
 * @returns {Array} Filtered tasks
 */
export function filterTasks(tasks, filters = {}) {
  const { emergencyLevel, category, isOpen, creatorId, participantTaskIds } = filters;
  
  let filtered = [...tasks];

  // Handle creator and participant filters
  if (creatorId && participantTaskIds && participantTaskIds.length > 0) {
    // User is creator OR participant
    filtered = filtered.filter(
      (t) => String(t.creator) === String(creatorId) || participantTaskIds.includes(t._id)
    );
  } else if (creatorId) {
    // Only creator filter
    filtered = filtered.filter((t) => String(t.creator) === String(creatorId));
  } else if (participantTaskIds && participantTaskIds.length > 0) {
    // Only participant tasks
    filtered = filtered.filter((t) => participantTaskIds.includes(t._id));
  }

  // Apply additional filters
  if (emergencyLevel) {
    filtered = filtered.filter((t) => t.emergencyLevel === emergencyLevel);
  }
  if (category) {
    filtered = filtered.filter((t) => t.category === category);
  }
  if (isOpen !== undefined) {
    filtered = filtered.filter((t) => t.isOpen === isOpen);
  }

  return filtered;
}

/**
 * Sorts tasks in memory
 * @param {Array} tasks - Array of task objects
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order ('asc' or 'desc')
 * @returns {Array} Sorted tasks (mutates original array)
 */
export function sortTasks(tasks, sortBy = "createdAt", sortOrder = "desc") {
  tasks.sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case "emergencyLevel":
        aVal = a.emergencyLevel;
        bVal = b.emergencyLevel;
        break;
      case "helpers":
        aVal = a.helpers;
        bVal = b.helpers;
        break;
      case "category":
        aVal = a.category;
        bVal = b.category;
        break;
      case "createdAt":
        aVal = a.createdAt;
        bVal = b.createdAt;
        break;
      case "updatedAt":
        aVal = a.updatedAt;
        bVal = b.updatedAt;
        break;
      case "isOpen":
        aVal = a.isOpen ? 1 : 0;
        bVal = b.isOpen ? 1 : 0;
        break;
      default:
        aVal = a.createdAt;
        bVal = b.createdAt;
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });
  
  return tasks;
}

/**
 * Applies pagination to an array
 * @param {Array} items - Array to paginate
 * @param {number} skip - Number of items to skip
 * @param {number} limit - Maximum number of items to return
 * @returns {Array} Paginated array
 */
export function paginateArray(items, skip, limit) {
  let result = [...items];
  if (skip !== undefined) {
    result = result.slice(skip);
  }
  if (limit !== undefined) {
    result = result.slice(0, limit);
  }
  return result;
}

/**
 * Builds participant count map for tasks
 * @param {Array} tasks - Array of task objects
 * @param {Array} participants - Array of participant objects
 * @returns {Object} Map of task ID to participant count
 */
export function buildParticipantCountMapInMemory(tasks, participants) {
  const taskIds = tasks.map((t) => t._id);
  const countMap = {};
  taskIds.forEach((taskId) => {
    countMap[taskId] = participants.filter((p) => p.task === taskId).length;
  });
  return countMap;
}

