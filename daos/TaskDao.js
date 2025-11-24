import iTaskDao from "./iTaskDao.js";
import { transformTaskDoc, transformTaskDocSimple, generateHelperAvatars, extractParticipantNames } from "../utils/task/taskTransformers.js";
import { buildTaskFilter, buildTaskSort, buildParticipantCountMap } from "../utils/task/filterBuilders.js";
import { queryTasksWithParticipantCounts, queryTasksWithParticipantStatus } from "../utils/task/daoHelpers.js";
import { buildBaseTaskData } from "../utils/task/taskCreators.js";

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
    const taskData = buildBaseTaskData({
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
    });

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

    // Format helper avatars and participant names
    const helperAvatars = generateHelperAvatars(participants);
    const participantNames = extractParticipantNames(participants);

    return transformTaskDoc(doc, {
      participantCount,
      isParticipant,
      helperAvatars,
      participantNames,
      taskLogs: logs,
    });
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
    const filter = buildTaskFilter({ emergencyLevel, category, isOpen });
    const sort = buildTaskSort(sortBy, sortOrder);

    const tasks = await queryTasksWithParticipantCounts({
      TaskModel: this.TaskModel,
      TaskParticipantModel: this.TaskParticipantModel,
      filter,
      sort,
      skip,
      limit,
    });

    console.log("All tasks: ", tasks);
    return tasks;
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
    const filter = buildTaskFilter({ emergencyLevel, category, isOpen, creatorId });
    const sort = buildTaskSort(sortBy, sortOrder);

    return await queryTasksWithParticipantCounts({
      TaskModel: this.TaskModel,
      TaskParticipantModel: this.TaskParticipantModel,
      filter,
      sort,
      skip,
      limit,
    });
  }

  /**
   * Get all tasks where user is either creator or participant
   * @param {String} userId - User ID
   * @param {Object} options - Filter and sort options
   * @returns {Promise<Array>} Array of task documents
   */
  async getTasksByUser(userId, {
    emergencyLevel,
    category,
    isOpen,
    sortBy = "createdAt",
    sortOrder = "desc",
    limit,
    skip,
  } = {}) {
    // Get all task IDs where user is a participant
    const participantTasks = await this.TaskParticipantModel.find({ user: userId })
      .select("task")
      .lean();
    const participantTaskIds = participantTasks.map((p) => p.task);

    // Build filter: tasks where user is creator OR participant
    const filter = buildTaskFilter({ 
      emergencyLevel, 
      category, 
      isOpen, 
      creatorId: userId, 
      participantTaskIds 
    });

    const sort = buildTaskSort(sortBy, sortOrder);

    return await queryTasksWithParticipantStatus({
      TaskModel: this.TaskModel,
      TaskParticipantModel: this.TaskParticipantModel,
      userId,
      filter,
      sort,
      skip,
      limit,
    });
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

    return transformTaskDocSimple(doc);
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
    const filter = buildTaskFilter({ emergencyLevel, category, isOpen });
    return await this.TaskModel.countDocuments(filter);
  }

  async countTasksByCreator(
    creatorId,
    { emergencyLevel, category, isOpen } = {},
  ) {
    const filter = buildTaskFilter({ emergencyLevel, category, isOpen, creatorId });
    return await this.TaskModel.countDocuments(filter);
  }

  /**
   * Count tasks where user is a participant (including tasks they created)
   * @param {String} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Number>} Count of tasks where user is a participant
   */
  async countTasksByParticipant(
    userId,
    { emergencyLevel, category, isOpen } = {},
  ) {
    // Get all task IDs where user is a participant
    const participantTasks = await this.TaskParticipantModel.find({ user: userId })
      .select("task")
      .lean();
    const participantTaskIds = participantTasks.map((p) => p.task);

    if (participantTaskIds.length === 0) {
      return 0;
    }

    // Build filter: tasks where user is participant
    const filter = buildTaskFilter({ 
      emergencyLevel, 
      category, 
      isOpen, 
      participantTaskIds 
    });

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
