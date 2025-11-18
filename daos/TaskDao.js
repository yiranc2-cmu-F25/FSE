import iTaskDao from "./iTaskDao.js";

export default class TaskDao extends iTaskDao {
  constructor({ TaskModel }) {
    super({ TaskModel });
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

  async getTask(id) {
    const doc = await this.TaskModel.findById(id)
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
      resourcesNeeded: doc.resourcesNeeded
        ? Object.fromEntries(doc.resourcesNeeded)
        : {},
      skillsRequired: doc.skillsRequired || [],
      isOpen: doc.isOpen,
      creator: doc.creator,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
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
      resourcesNeeded: doc.resourcesNeeded
        ? Object.fromEntries(doc.resourcesNeeded)
        : {},
      skillsRequired: doc.skillsRequired || [],
      isOpen: doc.isOpen,
      creator: doc.creator,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
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
      resourcesNeeded: doc.resourcesNeeded
        ? Object.fromEntries(doc.resourcesNeeded)
        : {},
      skillsRequired: doc.skillsRequired || [],
      isOpen: doc.isOpen,
      creator: doc.creator,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
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
      resourcesNeeded: doc.resourcesNeeded
        ? Object.fromEntries(doc.resourcesNeeded)
        : {},
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
}
