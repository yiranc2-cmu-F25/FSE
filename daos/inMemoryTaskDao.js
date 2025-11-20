import iTaskDao from "./iTaskDao.js";
import { transformTaskDoc, transformTaskDocSimple, generateHelperAvatars, extractParticipantNames } from "../utils/task/taskTransformers.js";
import { filterTasks } from "../utils/task/inMemoryHelpers.js";
import { buildBaseTaskData } from "../utils/task/taskCreators.js";
import { queryInMemoryTasksWithCounts, queryInMemoryTasksWithStatus } from "../utils/task/inMemoryQueryHelpers.js";

export class inMemoryTaskDao extends iTaskDao {
  constructor() {
    super({ TaskModel: null }); // Pass null since we don't use Mongoose models in memory
    this.tasks = [];
    this.participants = [];
    this.logs = [];
    this.nextTaskId = 1;
    this.nextParticipantId = 1;
    this.nextLogId = 1;
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

    const task = {
      _id: `task_${this.nextTaskId++}`,
      id: `task_${this.nextTaskId - 1}`,
      ...taskData,
    };

    this.tasks.push(task);
    return { ...task };
  }

  async getTask(id, userId = null) {
    const task = this.tasks.find((t) => t._id === id || t.id === id);
    if (!task) return null;

    const participantCount = this.participants.filter(
      (p) => p.task === id || p.task === task._id
    ).length;

    let isParticipant = false;
    if (userId) {
      isParticipant = this.participants.some(
        (p) => (p.task === id || p.task === task._id) && p.user === userId
      );
    }

    const taskLogs = this.logs
      .filter((l) => l.task === id || l.task === task._id)
      .sort((a, b) => b.timestamp - a.timestamp);

    const taskParticipants = this.participants
      .filter((p) => p.task === id || p.task === task._id)
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .slice(0, 10);

    // Mock user data for participants - ensure user objects have username
    const participantsWithUsers = taskParticipants.map((p) => ({
      ...p,
      user: p.user?.username ? p.user : { username: `user_${p.user}` },
    }));

    const helperAvatars = generateHelperAvatars(participantsWithUsers);
    const participantNames = extractParticipantNames(participantsWithUsers);

    return transformTaskDoc(task, {
      participantCount,
      isParticipant,
      helperAvatars,
      participantNames,
      taskLogs,
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
    return queryInMemoryTasksWithCounts({
      tasks: this.tasks,
      participants: this.participants,
      filters: { emergencyLevel, category, isOpen },
      sortBy,
      sortOrder,
      skip,
      limit,
    });
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
    return queryInMemoryTasksWithCounts({
      tasks: this.tasks,
      participants: this.participants,
      filters: { emergencyLevel, category, isOpen, creatorId },
      sortBy,
      sortOrder,
      skip,
      limit,
    });
  }

  async getTasksByUser(userId, {
    emergencyLevel,
    category,
    isOpen,
    sortBy = "createdAt",
    sortOrder = "desc",
    limit,
    skip,
  } = {}) {
    const participantTaskIds = this.participants
      .filter((p) => String(p.user) === String(userId))
      .map((p) => p.task);

    return queryInMemoryTasksWithStatus({
      tasks: this.tasks,
      participants: this.participants,
      userId,
      filters: {
        emergencyLevel,
        category,
        isOpen,
        creatorId: userId,
        participantTaskIds,
      },
      sortBy,
      sortOrder,
      skip,
      limit,
    });
  }

  async updateTask(taskId, creatorId, updateData) {
    const taskIndex = this.tasks.findIndex(
      (t) => t._id === taskId || t.id === taskId
    );
    if (taskIndex === -1) return null;

    const task = this.tasks[taskIndex];
    if (String(task.creator) !== String(creatorId)) {
      throw new Error("Unauthorized: Only the task owner can update this task");
    }

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined) {
        task[key] = updateData[key];
      }
    });

    task.updatedAt = new Date();
    this.tasks[taskIndex] = task;

    return transformTaskDocSimple(task);
  }

  async deleteTask(taskId, creatorId) {
    const taskIndex = this.tasks.findIndex(
      (t) => t._id === taskId || t.id === taskId
    );
    if (taskIndex === -1) return false;

    const task = this.tasks[taskIndex];
    if (String(task.creator) !== String(creatorId)) {
      throw new Error("Unauthorized: Only the task owner can delete this task");
    }

    this.tasks.splice(taskIndex, 1);
    // Also remove participants and logs
    this.participants = this.participants.filter(
      (p) => p.task !== taskId && p.task !== task._id
    );
    this.logs = this.logs.filter(
      (l) => l.task !== taskId && l.task !== task._id
    );

    return true;
  }

  async countTasks({ emergencyLevel, category, isOpen } = {}) {
    const filtered = filterTasks(this.tasks, { emergencyLevel, category, isOpen });
    return filtered.length;
  }

  async countTasksByCreator(creatorId, { emergencyLevel, category, isOpen } = {}) {
    const filtered = filterTasks(this.tasks, { 
      emergencyLevel, 
      category, 
      isOpen, 
      creatorId 
    });
    return filtered.length;
  }

  async countTasksByParticipant(userId, { emergencyLevel, category, isOpen } = {}) {
    const participantTaskIds = this.participants
      .filter((p) => String(p.user) === String(userId))
      .map((p) => p.task);

    if (participantTaskIds.length === 0) {
      return 0;
    }

    const filtered = filterTasks(this.tasks, {
      emergencyLevel,
      category,
      isOpen,
      participantTaskIds,
    });

    return filtered.length;
  }

  async joinTask(taskId, userId, note = "") {
    const task = this.tasks.find((t) => t._id === taskId || t.id === taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (!task.isOpen) {
      throw new Error("Task is closed");
    }

    const existingParticipant = this.participants.find(
      (p) =>
        (p.task === taskId || p.task === task._id) &&
        String(p.user) === String(userId)
    );

    if (existingParticipant) {
      throw new Error("User is already a participant in this task");
    }

    const participantCount = this.participants.filter(
      (p) => p.task === taskId || p.task === task._id
    ).length;

    if (participantCount >= task.helpers) {
      throw new Error("Task is full");
    }

    const participant = {
      _id: `participant_${this.nextParticipantId++}`,
      task: task._id,
      user: userId,
      note: note || "",
      joinedAt: new Date(),
    };

    this.participants.push(participant);
    return { ...participant };
  }

  async quitTask(taskId, userId) {
    const participantIndex = this.participants.findIndex(
      (p) =>
        (p.task === taskId || p.task === this.tasks.find((t) => t._id === taskId || t.id === taskId)?._id) &&
        String(p.user) === String(userId)
    );

    if (participantIndex === -1) {
      throw new Error("User is not a participant in this task");
    }

    this.participants.splice(participantIndex, 1);
    return true;
  }

  async addTaskLog(taskId, userId, summary) {
    const task = this.tasks.find((t) => t._id === taskId || t.id === taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    const participant = this.participants.find(
      (p) =>
        (p.task === taskId || p.task === task._id) &&
        String(p.user) === String(userId)
    );

    if (!participant) {
      throw new Error("Only participants can add task logs");
    }

    const log = {
      _id: `log_${this.nextLogId++}`,
      task: task._id,
      user: userId,
      summary: summary,
      timestamp: new Date(),
    };

    this.logs.push(log);
    return { ...log };
  }

  async isUserParticipant(taskId, userId) {
    if (!userId) return false;
    const participant = this.participants.find(
      (p) =>
        (p.task === taskId || p.task === this.tasks.find((t) => t._id === taskId || t.id === taskId)?._id) &&
        String(p.user) === String(userId)
    );
    return !!participant;
  }
}

