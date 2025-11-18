export default class iTaskDao {
  constructor({ TaskModel }) {
    this.TaskModel = TaskModel;
  }

  onWip() {
    throw new Error("Not implemented!");
  }

  /**
   * Create a new task
   * @param {Object} taskData - Task data including all required and optional fields
   * @param {String} taskData.title - Task title (max 50 chars, required)
   * @param {String} taskData.description - Task description (required)
   * @param {String} taskData.category - Task category (required)
   * @param {Number} taskData.helpers - Number of helpers needed (min 1, required)
   * @param {String} taskData.emergencyLevel - Emergency level (required)
   * @param {String} taskData.taskType - Task type: "normal", "asap", or "schedule" (required)
   * @param {Date} taskData.dueDate - Due date (optional, required for normal type)
   * @param {String} taskData.location - Location (optional)
   * @param {Map} taskData.resourcesNeeded - Resources needed map (optional)
   * @param {Array<String>} taskData.skillsRequired - Skills required array (optional)
   * @param {String} taskData.creator - Creator user ID (required for ownership)
   * @returns {Promise<Object>} Created task document
   */
  async create({
    title,
    description,
    category,
    helpers,
    emergencyLevel,
    taskType,
    dueDate,
    location,
    resourcesNeeded,
    skillsRequired,
    creator,
  }) {
    this.onWip();
  }

  /**
   * Get a single task by ID
   * @param {String} id - Task ID
   * @returns {Promise<Object|null>} Task document or null if not found
   */
  async getTask(id) {
    this.onWip();
  }

  /**
   * Get all tasks with filtering and sorting
   * All tasks are visible to all citizens
   * @param {Object} options - Filter and sort options
   * @param {String} options.emergencyLevel - Filter by emergency level
   * @param {String} options.category - Filter by category
   * @param {Boolean} options.isOpen - Filter by isOpen status
   * @param {String} options.sortBy - Sort field: "emergencyLevel", "helpers", "category", "createdAt", "updatedAt", "isOpen"
   * @param {String} options.sortOrder - Sort order: "asc" or "desc" (default: "desc")
   * @param {Number} options.limit - Limit number of results
   * @param {Number} options.skip - Skip number of results for pagination
   * @returns {Promise<Array>} Array of task documents
   */
  async getAllTasks({
    emergencyLevel,
    category,
    isOpen,
    sortBy,
    sortOrder,
    limit,
    skip,
  }) {
    this.onWip();
  }

  /**
   * Get all tasks created by a specific user
   * @param {String} creatorId - Creator user ID
   * @param {Object} options - Filter and sort options (same as getAllTasks)
   * @returns {Promise<Array>} Array of task documents created by the user
   */
  async getTasksByCreator(
    creatorId,
    { emergencyLevel, category, isOpen, sortBy, sortOrder, limit, skip },
  ) {
    this.onWip();
  }

  /**
   * Update a task (only by owner)
   * @param {String} taskId - Task ID
   * @param {String} creatorId - Creator user ID (for ownership verification)
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object|null>} Updated task document or null if not found/not owner
   */
  async updateTask(taskId, creatorId, updateData) {
    this.onWip();
  }

  /**
   * Delete a task (only by owner)
   * @param {String} taskId - Task ID
   * @param {String} creatorId - Creator user ID (for ownership verification)
   * @returns {Promise<Boolean>} True if deleted, false if not found/not owner
   */
  async deleteTask(taskId, creatorId) {
    this.onWip();
  }

  /**
   * Count tasks matching filters (useful for pagination)
   * @param {Object} filters - Filter options (same as getAllTasks)
   * @returns {Promise<Number>} Count of matching tasks
   */
  async countTasks({ emergencyLevel, category, isOpen }) {
    this.onWip();
  }

  /**
   * Count tasks by creator
   * @param {String} creatorId - Creator user ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Number>} Count of tasks created by the user
   */
  async countTasksByCreator(creatorId, { emergencyLevel, category, isOpen }) {
    this.onWip();
  }
}
