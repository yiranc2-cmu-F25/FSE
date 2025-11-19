import iTaskDao from "./iTaskDao.js";

export default class TaskDao extends iTaskDao {
  constructor({ TaskModel, TaskParticipantModel, TaskLogModel }) {
    super({ TaskModel });
    this.TaskParticipantModel = TaskParticipantModel;
    this.TaskLogModel = TaskLogModel;
  }

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
    if (resourcesNeeded !== undefined)
      taskData.resourcesNeeded = resourcesNeeded;
    if (skillsRequired !== undefined) taskData.skillsRequired = skillsRequired;

    const doc = await this.TaskModel.create(taskData);
    return doc.toObject();
  }

  async getTask(id, userId = null) {
    const doc = await this.TaskModel.findById(id)
      .populate("creator", "username")
      .lean();

    if (!doc) return null;

    // Get participant count and check if user is participant
    const participantCount = await this.TaskParticipantModel.countDocuments({ task: id });
    let isParticipant = false;
    if (userId) {
      const participant = await this.TaskParticipantModel.findOne({
        task: id,
        user: userId,
      }).lean();
      isParticipant = !!participant;
    }

    // Get task logs
    const logs = await this.TaskLogModel.find({ task: id })
      .populate("user", "username")
      .sort({ timestamp: -1 })
      .lean();

    // Get participants with user info for avatars and names
    const participants = await this.TaskParticipantModel.find({ task: id })
      .populate("user", "username")
      .sort({ joinedAt: 1 })
      .limit(10)
      .lean();

    // Format helper avatars
    const helperAvatars = participants.map((p) => {
      const username = p.user?.username || "";
      const initials = username
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      // Generate a color based on username hash
      const colors = [
        "#f97316", "#0ea5e9", "#22c55e", "#6366f1", "#a855f7", "#facc15",
        "#ef4444", "#14b8a6", "#8b5cf6", "#ec4899",
      ];
      const hash = username.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const color = colors[hash % colors.length];
      return { initials, color };
    });

    // Participant names list
    const participantNames = participants
      .map((p) => p.user?.username)
      .filter((name) => typeof name === "string" && name.trim().length > 0);

    return {
      id: doc._id,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      helpers: doc.helpers,
      emergencyLevel: doc.emergencyLevel,
      taskType: doc.taskType,
      dueDate: doc.dueDate,
      location: doc.location,
      resourcesNeeded: doc.resourcesNeeded || {},
      skillsRequired: doc.skillsRequired || [],
      isOpen: doc.isOpen,
      creator: doc.creator,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      helpersJoined: participantCount,
      isParticipant: isParticipant,
      helperAvatars: helperAvatars,
      participantNames: participantNames,
      taskLogs: logs.map((log) => ({
        timestamp: log.timestamp,
        summary: log.summary,
        user: log.user,
      })),
    };
  }

  async getAllTasks({
    emergencyLevel,
    category,
    isOpen,
    sortBy = "createdAt",
    sortOrder = "desc",
    limit,
    skip,
  } = {}) {
    const filter = {};

    // Apply filters
    if (emergencyLevel) {
      filter.emergencyLevel = emergencyLevel;
    }
    if (category) {
      filter.category = category;
    }
    if (isOpen !== undefined) {
      filter.isOpen = isOpen;
    }

    // Build sort object
    let sort = {};
    switch (sortBy) {
      case "emergencyLevel":
        // Note: MongoDB doesn't support custom sort orders directly,
        // so we'll sort by the field and handle ordering in application logic if needed
        sort.emergencyLevel = sortOrder === "asc" ? 1 : -1;
        break;
      case "helpers":
        sort.helpers = sortOrder === "asc" ? 1 : -1;
        break;
      case "category":
        sort.category = sortOrder === "asc" ? 1 : -1;
        break;
      case "createdAt":
        sort.createdAt = sortOrder === "asc" ? 1 : -1;
        break;
      case "updatedAt":
        sort.updatedAt = sortOrder === "asc" ? 1 : -1;
        break;
      case "isOpen":
        sort.isOpen = sortOrder === "asc" ? 1 : -1;
        break;
      default:
        sort.createdAt = -1; // Default: newest first
    }

    const query = this.TaskModel.find(filter)
      .sort(sort)
      .populate("creator", "username");

    if (skip !== undefined) query.skip(skip);
    if (limit !== undefined) query.limit(limit);

    const docs = await query.lean();

    console.log("All tasks: ", docs);

    // Get participant counts for all tasks
    const taskIds = docs.map((doc) => doc._id);
    const participantCounts = await this.TaskParticipantModel.aggregate([
      { $match: { task: { $in: taskIds } } },
      { $group: { _id: "$task", count: { $sum: 1 } } },
    ]);

    // Create a map of task ID to participant count
    const countMap = {};
    participantCounts.forEach((pc) => {
      countMap[pc._id.toString()] = pc.count;
    });

    return docs.map((doc) => ({
      id: doc._id,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      helpers: doc.helpers,
      emergencyLevel: doc.emergencyLevel,
      taskType: doc.taskType,
      dueDate: doc.dueDate,
      location: doc.location,
      resourcesNeeded: doc.resourcesNeeded || {},
      skillsRequired: doc.skillsRequired || [],
      isOpen: doc.isOpen,
      creator: doc.creator,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      helpersJoined: countMap[doc._id.toString()] || 0,
    }));
  }

  async getTasksByCreator(
    creatorId,
    {
      emergencyLevel,
      category,
      isOpen,
      sortBy = "createdAt",
      sortOrder = "desc",
      limit,
      skip,
    } = {},
  ) {
    const filter = { creator: creatorId };

    // Apply filters
    if (emergencyLevel) {
      filter.emergencyLevel = emergencyLevel;
    }
    if (category) {
      filter.category = category;
    }
    if (isOpen !== undefined) {
      filter.isOpen = isOpen;
    }

    // Build sort object (same logic as getAllTasks)
    let sort = {};
    switch (sortBy) {
      case "emergencyLevel":
        sort.emergencyLevel = sortOrder === "asc" ? 1 : -1;
        break;
      case "helpers":
        sort.helpers = sortOrder === "asc" ? 1 : -1;
        break;
      case "category":
        sort.category = sortOrder === "asc" ? 1 : -1;
        break;
      case "createdAt":
        sort.createdAt = sortOrder === "asc" ? 1 : -1;
        break;
      case "updatedAt":
        sort.updatedAt = sortOrder === "asc" ? 1 : -1;
        break;
      case "isOpen":
        sort.isOpen = sortOrder === "asc" ? 1 : -1;
        break;
      default:
        sort.createdAt = -1;
    }

    const query = this.TaskModel.find(filter)
      .sort(sort)
      .populate("creator", "username");

    if (skip !== undefined) query.skip(skip);
    if (limit !== undefined) query.limit(limit);

    const docs = await query.lean();

    // Get participant counts for all tasks
    const taskIds = docs.map((doc) => doc._id);
    const participantCounts = await this.TaskParticipantModel.aggregate([
      { $match: { task: { $in: taskIds } } },
      { $group: { _id: "$task", count: { $sum: 1 } } },
    ]);

    // Create a map of task ID to participant count
    const countMap = {};
    participantCounts.forEach((pc) => {
      countMap[pc._id.toString()] = pc.count;
    });

    return docs.map((doc) => ({
      id: doc._id,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      helpers: doc.helpers,
      emergencyLevel: doc.emergencyLevel,
      taskType: doc.taskType,
      dueDate: doc.dueDate,
      location: doc.location,
      resourcesNeeded: doc.resourcesNeeded || {},
      skillsRequired: doc.skillsRequired || [],
      isOpen: doc.isOpen,
      creator: doc.creator,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      helpersJoined: countMap[doc._id.toString()] || 0,
    }));
  }

  async updateTask(taskId, creatorId, updateData) {
    // First verify ownership
    const existingTask = await this.TaskModel.findById(taskId).lean();
    if (!existingTask) {
      return null; // Task not found
    }
    if (existingTask.creator?.toString() !== creatorId?.toString()) {
      throw new Error("Unauthorized: Only the task owner can update this task");
    }

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Always update updatedAt timestamp
    updateData.updatedAt = new Date();

    const doc = await this.TaskModel.findByIdAndUpdate(
      taskId,
      { $set: updateData },
      { new: true, runValidators: true },
    )
      .populate("creator", "username")
      .lean();

    if (!doc) return null;

    return {
      id: doc._id,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      helpers: doc.helpers,
      emergencyLevel: doc.emergencyLevel,
      taskType: doc.taskType,
      dueDate: doc.dueDate,
      location: doc.location,
      resourcesNeeded: doc.resourcesNeeded || {},
      skillsRequired: doc.skillsRequired || [],
      isOpen: doc.isOpen,
      creator: doc.creator,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async deleteTask(taskId, creatorId) {
    // First verify ownership
    const existingTask = await this.TaskModel.findById(taskId).lean();
    if (!existingTask) {
      return false; // Task not found
    }
    if (existingTask.creator?.toString() !== creatorId?.toString()) {
      throw new Error("Unauthorized: Only the task owner can delete this task");
    }

    const result = await this.TaskModel.findByIdAndDelete(taskId);
    return result !== null;
  }

  async countTasks({ emergencyLevel, category, isOpen } = {}) {
    const filter = {};

    if (emergencyLevel) filter.emergencyLevel = emergencyLevel;
    if (category) filter.category = category;
    if (isOpen !== undefined) filter.isOpen = isOpen;

    return await this.TaskModel.countDocuments(filter);
  }

  async countTasksByCreator(
    creatorId,
    { emergencyLevel, category, isOpen } = {},
  ) {
    const filter = { creator: creatorId };

    if (emergencyLevel) filter.emergencyLevel = emergencyLevel;
    if (category) filter.category = category;
    if (isOpen !== undefined) filter.isOpen = isOpen;

    return await this.TaskModel.countDocuments(filter);
  }

  /**
   * Join a task
   * @param {String} taskId - Task ID
   * @param {String} userId - User ID
   * @param {String} note - Optional note from user
   * @returns {Promise<Object>} Created participant document
   */
  async joinTask(taskId, userId, note = "") {
    // Check if task exists
    const task = await this.TaskModel.findById(taskId).lean();
    if (!task) {
      throw new Error("Task not found");
    }

    // Check if task is open
    if (!task.isOpen) {
      throw new Error("Task is closed");
    }

    // Check if user is already a participant
    const existingParticipant = await this.TaskParticipantModel.findOne({
      task: taskId,
      user: userId,
    }).lean();

    if (existingParticipant) {
      throw new Error("User is already a participant in this task");
    }

    // Check if task is full
    const participantCount = await this.TaskParticipantModel.countDocuments({ task: taskId });
    if (participantCount >= task.helpers) {
      throw new Error("Task is full");
    }

    // Create participant
    const participant = await this.TaskParticipantModel.create({
      task: taskId,
      user: userId,
      note: note || "",
      joinedAt: new Date(),
    });

    return participant.toObject();
  }

  /**
   * Quit a task
   * @param {String} taskId - Task ID
   * @param {String} userId - User ID
   * @returns {Promise<Boolean>} True if quit successfully
   */
  async quitTask(taskId, userId) {
    // Check if user is a participant
    const participant = await this.TaskParticipantModel.findOne({
      task: taskId,
      user: userId,
    });

    if (!participant) {
      throw new Error("User is not a participant in this task");
    }

    // Remove participant
    await this.TaskParticipantModel.findByIdAndDelete(participant._id);

    return true;
  }

  /**
   * Add a task log
   * @param {String} taskId - Task ID
   * @param {String} userId - User ID
   * @param {String} summary - Log summary
   * @returns {Promise<Object>} Created log document
   */
  async addTaskLog(taskId, userId, summary) {
    // Check if task exists
    const task = await this.TaskModel.findById(taskId).lean();
    if (!task) {
      throw new Error("Task not found");
    }

    // Check if user is a participant
    const participant = await this.TaskParticipantModel.findOne({
      task: taskId,
      user: userId,
    }).lean();

    if (!participant) {
      throw new Error("Only participants can add task logs");
    }

    // Create log
    const log = await this.TaskLogModel.create({
      task: taskId,
      user: userId,
      summary: summary,
      timestamp: new Date(),
    });

    return log.toObject();
  }

  /**
   * Check if user is a participant in a task
   * @param {String} taskId - Task ID
   * @param {String} userId - User ID
   * @returns {Promise<Boolean>} True if user is a participant
   */
  async isUserParticipant(taskId, userId) {
    if (!userId) return false;
    const participant = await this.TaskParticipantModel.findOne({
      task: taskId,
      user: userId,
    }).lean();
    return !!participant;
  }
}
