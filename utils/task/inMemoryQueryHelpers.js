/**
 * Helper functions for in-memory DAO query operations to reduce duplication
 */

import { transformTaskDocSimple } from "./taskTransformers.js";
import { filterTasks, sortTasks, paginateArray, buildParticipantCountMapInMemory } from "./inMemoryHelpers.js";
import { getActiveUserIds } from "../../utils/filterInactiveUsers.js";
import { USER_STATUS } from "../../constants/userStatus.js";

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
 * @returns {Promise<Array>} Array of transformed task documents with participant counts
 */
export async function queryInMemoryTasksWithCounts({
  tasks,
  participants,
  filters = {},
  sortBy = "createdAt",
  sortOrder = "desc",
  skip,
  limit,
}) {
  let filtered = filterTasks(tasks, filters);
  
  // Filter out tasks where creator is inactive
  if (filtered.length > 0) {
    const creatorIds = filtered.map(t => t.creator).filter(Boolean);
    const activeCreatorIds = await getActiveUserIds(creatorIds);
    filtered = filtered.filter(t => t.creator && activeCreatorIds.has(String(t.creator)));
  }
  
  sortTasks(filtered, sortBy, sortOrder);
  filtered = paginateArray(filtered, skip, limit);

  // Filter participants to only count active users
  const UserDac = (await import("../../dacs/userDac.js")).default;
  const activeParticipantIds = new Set();
  for (const participant of participants) {
    try {
      const user = await UserDac.DAO?.findById?.(participant.user);
      if (user && user.status === USER_STATUS.ACTIVE) {
        activeParticipantIds.add(String(participant.user));
      }
    } catch (err) {
      // User not found or error, skip this participant
    }
  }
  const activeParticipants = participants.filter(p => activeParticipantIds.has(String(p.user)));
  
  const countMap = buildParticipantCountMapInMemory(filtered, activeParticipants);

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
 * @returns {Promise<Array>} Array of transformed task documents with participant counts and participation status
 */
export async function queryInMemoryTasksWithStatus({
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
  
  // Filter out tasks where creator is inactive
  if (filtered.length > 0) {
    const creatorIds = filtered.map(t => t.creator).filter(Boolean);
    const activeCreatorIds = await getActiveUserIds(creatorIds);
    filtered = filtered.filter(t => t.creator && activeCreatorIds.has(String(t.creator)));
  }
  
  sortTasks(filtered, sortBy, sortOrder);
  filtered = paginateArray(filtered, skip, limit);

  // Filter participants to only count active users
  const UserDac = (await import("../../dacs/userDac.js")).default;
  const activeParticipantIds = new Set();
  for (const participant of participants) {
    try {
      const user = await UserDac.DAO?.findById?.(participant.user);
      if (user && user.status === USER_STATUS.ACTIVE) {
        activeParticipantIds.add(String(participant.user));
      }
    } catch (err) {
      // User not found or error, skip this participant
    }
  }
  const activeParticipants = participants.filter(p => activeParticipantIds.has(String(p.user)));

  const taskIds = filtered.map((t) => t._id);
  const countMap = buildParticipantCountMapInMemory(filtered, activeParticipants);

  const participationSet = new Set(
    activeParticipants
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

