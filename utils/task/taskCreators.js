/**
 * Utility functions for creating task data structures
 */

/**
 * Builds base task data object for creation
 * @param {Object} params - Task creation parameters
 * @param {string} params.title - Task title
 * @param {string} params.description - Task description
 * @param {string} params.category - Task category
 * @param {number} params.helpers - Number of helpers needed
 * @param {string} params.emergencyLevel - Emergency level
 * @param {string} params.taskType - Task type
 * @param {string} params.creator - Creator ID
 * @param {Date} params.dueDate - Due date (optional)
 * @param {string} params.location - Location (optional)
 * @param {Object} params.resourcesNeeded - Resources needed (optional)
 * @param {Array} params.skillsRequired - Skills required (optional)
 * @returns {Object} Base task data object
 */
export function buildBaseTaskData({
  title,
  description,
  category,
  helpers,
  emergencyLevel,
  taskType,
  creator,
  dueDate,
  location,
  resourcesNeeded,
  skillsRequired,
}) {
  const now = new Date();
  const taskData = {
    title,
    description,
    category,
    helpers,
    emergencyLevel,
    taskType,
    isOpen: true, // Default to OPEN status
    creator, // Owner of the task
    createdAt: now,
    updatedAt: now,
  };

  // Add optional fields if provided
  if (dueDate !== undefined) taskData.dueDate = dueDate;
  if (location !== undefined) taskData.location = location;
  if (resourcesNeeded !== undefined) taskData.resourcesNeeded = resourcesNeeded;
  if (skillsRequired !== undefined) taskData.skillsRequired = skillsRequired;

  return taskData;
}

