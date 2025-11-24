/**
 * Helper functions for DAO operations to reduce duplication
 */

import { transformTaskDocSimple } from "./taskTransformers.js";
import { buildParticipantCountMap } from "./filterBuilders.js";

/**
 * Common pattern for querying tasks with participant counts in TaskDao
 * @param {Object} params - Parameters
 * @param {Object} params.TaskModel - Mongoose Task model
 * @param {Object} params.TaskParticipantModel - Mongoose TaskParticipant model
 * @param {Object} params.filter - MongoDB filter object
 * @param {Object} params.sort - MongoDB sort object
 * @param {number} params.skip - Skip count
 * @param {number} params.limit - Limit count
 * @returns {Promise<Array>} Array of transformed task documents with participant counts
 */
export async function queryTasksWithParticipantCounts({
  TaskModel,
  TaskParticipantModel,
  filter,
  sort,
  skip,
  limit,
}) {
  const query = TaskModel.find(filter)
    .sort(sort)
    .populate("creator", "username");

  if (skip !== undefined) query.skip(skip);
  if (limit !== undefined) query.limit(limit);

  const docs = await query.lean();

  // Get participant counts for all tasks
  const taskIds = docs.map((doc) => doc._id);
  const participantCounts = await TaskParticipantModel.aggregate([
    { $match: { task: { $in: taskIds } } },
    { $group: { _id: "$task", count: { $sum: 1 } } },
  ]);

  const countMap = buildParticipantCountMap(participantCounts);

  return docs.map((doc) => ({
    ...transformTaskDocSimple(doc),
    helpersJoined: countMap[doc._id.toString()] || 0,
  }));
}

/**
 * Common pattern for querying tasks with participant counts and participation status in TaskDao
 * @param {Object} params - Parameters
 * @param {Object} params.TaskModel - Mongoose Task model
 * @param {Object} params.TaskParticipantModel - Mongoose TaskParticipant model
 * @param {string} params.userId - User ID to check participation
 * @param {Object} params.filter - MongoDB filter object
 * @param {Object} params.sort - MongoDB sort object
 * @param {number} params.skip - Skip count
 * @param {number} params.limit - Limit count
 * @returns {Promise<Array>} Array of transformed task documents with participant counts and participation status
 */
export async function queryTasksWithParticipantStatus({
  TaskModel,
  TaskParticipantModel,
  userId,
  filter,
  sort,
  skip,
  limit,
}) {
  const query = TaskModel.find(filter)
    .sort(sort)
    .populate("creator", "username");

  if (skip !== undefined) query.skip(skip);
  if (limit !== undefined) query.limit(limit);

  const docs = await query.lean();

  // Get participant counts for all tasks
  const taskIds = docs.map((doc) => doc._id);
  const participantCounts = await TaskParticipantModel.aggregate([
    { $match: { task: { $in: taskIds } } },
    { $group: { _id: "$task", count: { $sum: 1 } } },
  ]);

  // Get user's participation status for each task
  const userParticipations = await TaskParticipantModel.find({
    task: { $in: taskIds },
    user: userId,
  }).lean();

  const participationSet = new Set(
    userParticipations.map((p) => p.task.toString())
  );

  const countMap = buildParticipantCountMap(participantCounts);

  return docs.map((doc) => ({
    ...transformTaskDocSimple(doc),
    helpersJoined: countMap[doc._id.toString()] || 0,
    isParticipant: participationSet.has(doc._id.toString()),
  }));
}

