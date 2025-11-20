import iTaskDao from "./iTaskDao.js";
import { transformTaskDoc, transformTaskDocSimple, generateHelperAvatars, extractParticipantNames } from "../utils/task/taskTransformers.js";

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
    const now = new Date();
    const task = {
      _id: `task_${this.nextTaskId++}`,
      id: `task_${this.nextTaskId - 1}`,
      title,
      description,
      category,
      helpers,
      emergencyLevel,
      taskType,
      isOpen: true,
      creator: creator,
      createdAt: now,
      updatedAt: now,
    };

    if (dueDate !== undefined) task.dueDate = dueDate;
    if (location !== undefined) task.location = location;
    if (resourcesNeeded !== undefined) task.resourcesNeeded = resourcesNeeded;
    if (skillsRequired !== undefined) task.skillsRequired = skillsRequired;

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
    let filtered = [...this.tasks];

    if (emergencyLevel) {
      filtered = filtered.filter((t) => t.emergencyLevel === emergencyLevel);
    }
    if (category) {
      filtered = filtered.filter((t) => t.category === category);
    }
    if (isOpen !== undefined) {
      filtered = filtered.filter((t) => t.isOpen === isOpen);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "emergencyLevel":
          aVal = a.emergencyLevel;
          bVal = b.emergencyLevel;
          break;
        case "helpers":
          aVal = a.helpers;
          bVal = b.helpers;
          break;
        case "category":
          aVal = a.category;
          bVal = b.category;
          break;
        case "createdAt":
          aVal = a.createdAt;
          bVal = b.createdAt;
          break;
        case "updatedAt":
          aVal = a.updatedAt;
          bVal = b.updatedAt;
          break;
        case "isOpen":
          aVal = a.isOpen ? 1 : 0;
          bVal = b.isOpen ? 1 : 0;
          break;
        default:
          aVal = a.createdAt;
          bVal = b.createdAt;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    // Pagination
    if (skip !== undefined) {
      filtered = filtered.slice(skip);
    }
    if (limit !== undefined) {
      filtered = filtered.slice(0, limit);
    }

    // Get participant counts
    const taskIds = filtered.map((t) => t._id);
    const countMap = {};
    taskIds.forEach((taskId) => {
      countMap[taskId] = this.participants.filter(
        (p) => p.task === taskId
      ).length;
    });

    return filtered.map((task) => ({
      id: task._id,
      title: task.title,
      description: task.description,
      category: task.category,
      helpers: task.helpers,
      emergencyLevel: task.emergencyLevel,
      taskType: task.taskType,
      dueDate: task.dueDate,
      location: task.location,
      resourcesNeeded: task.resourcesNeeded || {},
      skillsRequired: task.skillsRequired || [],
      isOpen: task.isOpen,
      creator: task.creator,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      helpersJoined: countMap[task._id] || 0,
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
    let filtered = this.tasks.filter(
      (t) => String(t.creator) === String(creatorId)
    );

    if (emergencyLevel) {
      filtered = filtered.filter((t) => t.emergencyLevel === emergencyLevel);
    }
    if (category) {
      filtered = filtered.filter((t) => t.category === category);
    }
    if (isOpen !== undefined) {
      filtered = filtered.filter((t) => t.isOpen === isOpen);
    }

    // Sort (same logic as getAllTasks)
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "emergencyLevel":
          aVal = a.emergencyLevel;
          bVal = b.emergencyLevel;
          break;
        case "helpers":
          aVal = a.helpers;
          bVal = b.helpers;
          break;
        case "category":
          aVal = a.category;
          bVal = b.category;
          break;
        case "createdAt":
          aVal = a.createdAt;
          bVal = b.createdAt;
          break;
        case "updatedAt":
          aVal = a.updatedAt;
          bVal = b.updatedAt;
          break;
        case "isOpen":
          aVal = a.isOpen ? 1 : 0;
          bVal = b.isOpen ? 1 : 0;
          break;
        default:
          aVal = a.createdAt;
          bVal = b.createdAt;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    if (skip !== undefined) {
      filtered = filtered.slice(skip);
    }
    if (limit !== undefined) {
      filtered = filtered.slice(0, limit);
    }

    const taskIds = filtered.map((t) => t._id);
    const countMap = {};
    taskIds.forEach((taskId) => {
      countMap[taskId] = this.participants.filter(
        (p) => p.task === taskId
      ).length;
    });

    return filtered.map((task) => ({
      id: task._id,
      title: task.title,
      description: task.description,
      category: task.category,
      helpers: task.helpers,
      emergencyLevel: task.emergencyLevel,
      taskType: task.taskType,
      dueDate: task.dueDate,
      location: task.location,
      resourcesNeeded: task.resourcesNeeded || {},
      skillsRequired: task.skillsRequired || [],
      isOpen: task.isOpen,
      creator: task.creator,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      helpersJoined: countMap[task._id] || 0,
    }));
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

    let filtered = this.tasks.filter(
      (t) =>
        String(t.creator) === String(userId) ||
        participantTaskIds.includes(t._id)
    );

    if (emergencyLevel) {
      filtered = filtered.filter((t) => t.emergencyLevel === emergencyLevel);
    }
    if (category) {
      filtered = filtered.filter((t) => t.category === category);
    }
    if (isOpen !== undefined) {
      filtered = filtered.filter((t) => t.isOpen === isOpen);
    }

    // Sort (same logic as getAllTasks)
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "emergencyLevel":
          aVal = a.emergencyLevel;
          bVal = b.emergencyLevel;
          break;
        case "helpers":
          aVal = a.helpers;
          bVal = b.helpers;
          break;
        case "category":
          aVal = a.category;
          bVal = b.category;
          break;
        case "createdAt":
          aVal = a.createdAt;
          bVal = b.createdAt;
          break;
        case "updatedAt":
          aVal = a.updatedAt;
          bVal = b.updatedAt;
          break;
        case "isOpen":
          aVal = a.isOpen ? 1 : 0;
          bVal = b.isOpen ? 1 : 0;
          break;
        default:
          aVal = a.createdAt;
          bVal = b.createdAt;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    if (skip !== undefined) {
      filtered = filtered.slice(skip);
    }
    if (limit !== undefined) {
      filtered = filtered.slice(0, limit);
    }

    const taskIds = filtered.map((t) => t._id);
    const countMap = {};
    taskIds.forEach((taskId) => {
      countMap[taskId] = this.participants.filter(
        (p) => p.task === taskId
      ).length;
    });

    const participationSet = new Set(
      this.participants
        .filter(
          (p) =>
            String(p.user) === String(userId) &&
            taskIds.includes(p.task)
        )
        .map((p) => p.task)
    );

    return filtered.map((task) => ({
      id: task._id,
      title: task.title,
      description: task.description,
      category: task.category,
      helpers: task.helpers,
      emergencyLevel: task.emergencyLevel,
      taskType: task.taskType,
      dueDate: task.dueDate,
      location: task.location,
      resourcesNeeded: task.resourcesNeeded || {},
      skillsRequired: task.skillsRequired || [],
      isOpen: task.isOpen,
      creator: task.creator,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      helpersJoined: countMap[task._id] || 0,
      isParticipant: participationSet.has(task._id),
    }));
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

    return {
      id: task._id,
      title: task.title,
      description: task.description,
      category: task.category,
      helpers: task.helpers,
      emergencyLevel: task.emergencyLevel,
      taskType: task.taskType,
      dueDate: task.dueDate,
      location: task.location,
      resourcesNeeded: task.resourcesNeeded || {},
      skillsRequired: task.skillsRequired || [],
      isOpen: task.isOpen,
      creator: task.creator,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
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
    let filtered = [...this.tasks];

    if (emergencyLevel) {
      filtered = filtered.filter((t) => t.emergencyLevel === emergencyLevel);
    }
    if (category) {
      filtered = filtered.filter((t) => t.category === category);
    }
    if (isOpen !== undefined) {
      filtered = filtered.filter((t) => t.isOpen === isOpen);
    }

    return filtered.length;
  }

  async countTasksByCreator(creatorId, { emergencyLevel, category, isOpen } = {}) {
    let filtered = this.tasks.filter(
      (t) => String(t.creator) === String(creatorId)
    );

    if (emergencyLevel) {
      filtered = filtered.filter((t) => t.emergencyLevel === emergencyLevel);
    }
    if (category) {
      filtered = filtered.filter((t) => t.category === category);
    }
    if (isOpen !== undefined) {
      filtered = filtered.filter((t) => t.isOpen === isOpen);
    }

    return filtered.length;
  }

  async countTasksByParticipant(userId, { emergencyLevel, category, isOpen } = {}) {
    const participantTaskIds = this.participants
      .filter((p) => String(p.user) === String(userId))
      .map((p) => p.task);

    if (participantTaskIds.length === 0) {
      return 0;
    }

    let filtered = this.tasks.filter((t) => participantTaskIds.includes(t._id));

    if (emergencyLevel) {
      filtered = filtered.filter((t) => t.emergencyLevel === emergencyLevel);
    }
    if (category) {
      filtered = filtered.filter((t) => t.category === category);
    }
    if (isOpen !== undefined) {
      filtered = filtered.filter((t) => t.isOpen === isOpen);
    }

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

