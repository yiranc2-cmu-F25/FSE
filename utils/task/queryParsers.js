/**
 * Utility functions for parsing query parameters in task-related endpoints
 */

/**
 * Parses query parameters for task filtering and sorting
 * @param {Object} query - Express request query object
 * @returns {Object} Parsed options object with filters and sorting
 */
export function parseTaskQueryParams(query) {
  const {
    emergencyLevel,
    category,
    isOpen,
    sortBy,
    sortOrder,
    limit,
    skip,
  } = query;

  // Parse boolean and number query parameters
  const filters = {};
  if (emergencyLevel) filters.emergencyLevel = emergencyLevel;
  if (category) filters.category = category;
  if (isOpen !== undefined) {
    filters.isOpen = isOpen === "true" || isOpen === true;
  }

  const options = {
    ...filters,
    sortBy: sortBy || "createdAt",
    sortOrder: sortOrder || "desc",
    limit: limit ? parseInt(limit, 10) : undefined,
    skip: skip ? parseInt(skip, 10) : undefined,
  };

  return options;
}

/**
 * Parses query parameters for task counting
 * @param {Object} query - Express request query object
 * @returns {Object} Parsed filters object
 */
export function parseTaskCountParams(query) {
  const { emergencyLevel, category, isOpen } = query;

  const filters = {};
  if (emergencyLevel) filters.emergencyLevel = emergencyLevel;
  if (category) filters.category = category;
  if (isOpen !== undefined) {
    filters.isOpen = isOpen === "true" || isOpen === true;
  }

  return filters;
}

