/**
 * Helper functions for DAO operations to reduce duplication
 */

import { transformTaskDocSimple } from "./taskTransformers.js";
import { buildParticipantCountMap } from "./filterBuilders.js";
import { USER_STATUS } from "../../constants/userStatus.js";

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
    .populate({
      path: "creator",
      select: "username status",
      match: { status: USER_STATUS.ACTIVE }
    });

  if (skip !== undefined) query.skip(skip);
  if (limit !== undefined) query.limit(limit);

  const docs = await query.lean();

  // Filter out tasks where creator is inactive (populate returns null)
  const activeTasks = docs.filter(doc => doc.creator !== null);

  // Get participant counts for all active tasks - only count active users
  const taskIds = activeTasks.map((doc) => doc._id);
  
  // Use aggregation with $lookup to join User and filter inactive users
  const participantCounts = await TaskParticipantModel.aggregate([
    { $match: { task: { $in: taskIds } } },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userInfo"
      }
    },
    { $unwind: "$userInfo" },
    { $match: { "userInfo.status": USER_STATUS.ACTIVE } },
    { $group: { _id: "$task", count: { $sum: 1 } } },
  ]);

  const countMap = buildParticipantCountMap(participantCounts);

  return activeTasks.map((doc) => ({
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
    .populate({
      path: "creator",
      select: "username status",
      match: { status: USER_STATUS.ACTIVE }
    });

  if (skip !== undefined) query.skip(skip);
  if (limit !== undefined) query.limit(limit);

  const docs = await query.lean();

  // Filter out tasks where creator is inactive (populate returns null)
  const activeTasks = docs.filter(doc => doc.creator !== null);

  // Get participant counts for all active tasks - only count active users
  const taskIds = activeTasks.map((doc) => doc._id);
  
  // Use aggregation with $lookup to join User and filter inactive users
  const participantCounts = await TaskParticipantModel.aggregate([
    { $match: { task: { $in: taskIds } } },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userInfo"
      }
    },
    { $unwind: "$userInfo" },
    { $match: { "userInfo.status": USER_STATUS.ACTIVE } },
    { $group: { _id: "$task", count: { $sum: 1 } } },
  ]);

  // Get user's participation status for each task - only if user is active
  const userParticipations = await TaskParticipantModel.aggregate([
    { $match: { task: { $in: taskIds }, user: userId } },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userInfo"
      }
    },
    { $unwind: "$userInfo" },
    { $match: { "userInfo.status": USER_STATUS.ACTIVE } },
  ]);

  const participationSet = new Set(
    userParticipations.map((p) => p.task.toString())
  );

  const countMap = buildParticipantCountMap(participantCounts);

  return activeTasks.map((doc) => ({
    ...transformTaskDocSimple(doc),
    helpersJoined: countMap[doc._id.toString()] || 0,
    isParticipant: participationSet.has(doc._id.toString()),
  }));
}

