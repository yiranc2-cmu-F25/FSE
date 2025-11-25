/**
 * Utility functions for building database query filters and sorts
 */

/**
 * Builds a filter object for task queries
 * @param {Object} options - Filter options
 * @param {string} options.emergencyLevel - Emergency level filter
 * @param {string} options.category - Category filter
 * @param {boolean} options.isOpen - Open/closed status filter
 * @param {string} options.creatorId - Creator ID filter (optional)
 * @param {Array} options.participantTaskIds - Array of task IDs where user is participant (optional)
 * @returns {Object} MongoDB filter object
 */
export function buildTaskFilter({ emergencyLevel, category, isOpen, creatorId, participantTaskIds } = {}) {
  const filter = {};

  if (creatorId) {
    filter.creator = creatorId;
  }

  if (participantTaskIds && participantTaskIds.length > 0) {
    // If we have participant task IDs, build $or filter
    if (creatorId) {
      filter.$or = [
        { creator: creatorId },
        { _id: { $in: participantTaskIds } },
      ];
      delete filter.creator; // Remove creator from base filter since it's in $or
    } else {
      filter._id = { $in: participantTaskIds };
    }
  }

  if (emergencyLevel) {
    filter.emergencyLevel = emergencyLevel;
  }
  if (category) {
    filter.category = category;
  }
  if (isOpen !== undefined) {
    filter.isOpen = isOpen;
  }

  return filter;
}

/**
 * Builds a sort object for task queries
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order ('asc' or 'desc')
 * @returns {Object} MongoDB sort object
 */
export function buildTaskSort(sortBy = "createdAt", sortOrder = "desc") {
  const sort = {};
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  switch (sortBy) {
    case "emergencyLevel":
      sort.emergencyLevel = sortDirection;
      break;
    case "helpers":
      sort.helpers = sortDirection;
      break;
    case "category":
      sort.category = sortDirection;
      break;
    case "createdAt":
      sort.createdAt = sortDirection;
      break;
    case "updatedAt":
      sort.updatedAt = sortDirection;
      break;
    case "isOpen":
      sort.isOpen = sortDirection;
      break;
    default:
      sort.createdAt = -1; // Default: newest first
  }

  return sort;
}

/**
 * Builds participant count map from aggregation results
 * @param {Array} participantCounts - Aggregation results with _id and count
 * @returns {Object} Map of task ID (string) to participant count
 */
export function buildParticipantCountMap(participantCounts) {
  const countMap = {};
  participantCounts.forEach((pc) => {
    countMap[pc._id.toString()] = pc.count;
  });
  return countMap;
}

