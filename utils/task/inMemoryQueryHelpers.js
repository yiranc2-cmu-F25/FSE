/**
 * Helper functions for in-memory DAO query operations to reduce duplication
 */

import { transformTaskDocSimple } from "./taskTransformers.js";
import { filterTasks, sortTasks, paginateArray, buildParticipantCountMapInMemory } from "./inMemoryHelpers.js";

/**
 * Common pattern for querying tasks with participant counts in inMemoryTaskDao
 * @param {Object} params - Parameters
 * @param {Array} params.tasks - Array of all tasks
 * @param {Array} params.participants - Array of all participants
 * @param {Object} params.filters - Filter criteria
 * @param {string} params.sortBy - Sort field
 * @param {string} params.sortOrder - Sort order
 * @param {number} params.skip - Skip count
 * @param {number} params.limit - Limit count
 * @returns {Array} Array of transformed task documents with participant counts
 */
export function queryInMemoryTasksWithCounts({
  tasks,
  participants,
  filters = {},
  sortBy = "createdAt",
  sortOrder = "desc",
  skip,
  limit,
}) {
  let filtered = filterTasks(tasks, filters);
  sortTasks(filtered, sortBy, sortOrder);
  filtered = paginateArray(filtered, skip, limit);

  const countMap = buildParticipantCountMapInMemory(filtered, participants);

  return filtered.map((task) => ({
    ...transformTaskDocSimple(task),
    helpersJoined: countMap[task._id] || 0,
  }));
}

/**
 * Common pattern for querying tasks with participant counts and participation status in inMemoryTaskDao
 * @param {Object} params - Parameters
 * @param {Array} params.tasks - Array of all tasks
 * @param {Array} params.participants - Array of all participants
 * @param {string} params.userId - User ID to check participation
 * @param {Object} params.filters - Filter criteria
 * @param {string} params.sortBy - Sort field
 * @param {string} params.sortOrder - Sort order
 * @param {number} params.skip - Skip count
 * @param {number} params.limit - Limit count
 * @returns {Array} Array of transformed task documents with participant counts and participation status
 */
export function queryInMemoryTasksWithStatus({
  tasks,
  participants,
  userId,
  filters = {},
  sortBy = "createdAt",
  sortOrder = "desc",
  skip,
  limit,
}) {
  let filtered = filterTasks(tasks, filters);
  sortTasks(filtered, sortBy, sortOrder);
  filtered = paginateArray(filtered, skip, limit);

  const taskIds = filtered.map((t) => t._id);
  const countMap = buildParticipantCountMapInMemory(filtered, participants);

  const participationSet = new Set(
    participants
      .filter(
        (p) =>
          String(p.user) === String(userId) &&
          taskIds.includes(p.task)
      )
      .map((p) => p.task)
  );

  return filtered.map((task) => ({
    ...transformTaskDocSimple(task),
    helpersJoined: countMap[task._id] || 0,
    isParticipant: participationSet.has(task._id),
  }));
}

