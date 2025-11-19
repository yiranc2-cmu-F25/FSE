import TaskDac from "../dacs/taskDac.js";

class Task {
  constructor({
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
    isOpen = true,
  }) {
    // Validate required fields
    if (!title || typeof title !== "string" || title.length > 50) {
      throw new Error("Invalid title: must be a string with max 50 characters");
    }
    if (!description || typeof description !== "string") {
      throw new Error("Invalid description: must be a string");
    }
    if (!category || typeof category !== "string") {
      throw new Error("Invalid category: must be a string");
    }
    if (!helpers || typeof helpers !== "number" || helpers < 1) {
      throw new Error("Invalid helpers: must be a number >= 1");
    }
    if (!emergencyLevel || typeof emergencyLevel !== "string") {
      throw new Error("Invalid emergencyLevel: must be a string");
    }
    if (!taskType || typeof taskType !== "string") {
      throw new Error("Invalid taskType: must be a string");
    }
    if (!creator) {
      throw new Error("Invalid creator: creator ID is required");
    }

    this.title = title;
    this.description = description;
    this.category = category;
    this.helpers = helpers;
    this.emergencyLevel = emergencyLevel;
    this.taskType = taskType;
    this.dueDate = dueDate;
    this.location = location;
    this.resourcesNeeded = resourcesNeeded;
    this.skillsRequired = skillsRequired;
    this.creator = creator;
    this.isOpen = isOpen;
  }

  static get DAO() {
    return TaskDac.DAO;
  }

  async create() {
    return await Task.DAO.create({
      title: this.title,
      description: this.description,
      category: this.category,
      helpers: this.helpers,
      emergencyLevel: this.emergencyLevel,
      taskType: this.taskType,
      dueDate: this.dueDate,
      location: this.location,
      resourcesNeeded: this.resourcesNeeded,
      skillsRequired: this.skillsRequired,
      creator: this.creator,
    });
  }

  static async getTask(id, userId = null) {
    return await Task.DAO.getTask(id, userId);
  }

  static async getAllTasks({
    emergencyLevel,
    category,
    isOpen,
    sortBy = "createdAt",
    sortOrder = "desc",
    limit,
    skip,
  } = {}) {
    return await Task.DAO.getAllTasks({
      emergencyLevel,
      category,
      isOpen,
      sortBy,
      sortOrder,
      limit,
      skip,
    });
  }

  static async getTasksByCreator(
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
    return await Task.DAO.getTasksByCreator(creatorId, {
      emergencyLevel,
      category,
      isOpen,
      sortBy,
      sortOrder,
      limit,
      skip,
    });
  }

  static async getTasksByUser(
    userId,
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
    return await Task.DAO.getTasksByUser(userId, {
      emergencyLevel,
      category,
      isOpen,
      sortBy,
      sortOrder,
      limit,
      skip,
    });
  }

  static async updateTask(taskId, creatorId, updateData) {
    return await Task.DAO.updateTask(taskId, creatorId, updateData);
  }

  static async deleteTask(taskId, creatorId) {
    return await Task.DAO.deleteTask(taskId, creatorId);
  }

  static async countTasks({ emergencyLevel, category, isOpen } = {}) {
    return await Task.DAO.countTasks({ emergencyLevel, category, isOpen });
  }

  static async countTasksByCreator(
    creatorId,
    { emergencyLevel, category, isOpen } = {},
  ) {
    return await Task.DAO.countTasksByCreator(creatorId, {
      emergencyLevel,
      category,
      isOpen,
    });
  }

  static async countTasksByParticipant(
    userId,
    { emergencyLevel, category, isOpen } = {},
  ) {
    return await Task.DAO.countTasksByParticipant(userId, {
      emergencyLevel,
      category,
      isOpen,
    });
  }

  static async joinTask(taskId, userId, note = "") {
    return await Task.DAO.joinTask(taskId, userId, note);
  }

  static async quitTask(taskId, userId) {
    return await Task.DAO.quitTask(taskId, userId);
  }

  static async addTaskLog(taskId, userId, summary) {
    return await Task.DAO.addTaskLog(taskId, userId, summary);
  }

  static async isUserParticipant(taskId, userId) {
    return await Task.DAO.isUserParticipant(taskId, userId);
  }
}

export default Task;
