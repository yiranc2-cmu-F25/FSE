import Task from "../entities/Task.js";
import { requireAuth, getTaskIdFromRequest, getUserIdFromRequest } from "../utils/task/controllerHelpers.js";
import { parseTaskQueryParams, parseTaskCountParams } from "../utils/task/queryParsers.js";

export default class TaskController {
  /**
   * Create a new task
   * POST /tasks
   */
  static async createTask(req, res) {
    try {
      const creatorId = requireAuth(req, res);
      if (!creatorId) return;

      const {
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
      } = req.body;

      // Create task entity
      const task = new Task({
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
        creator: creatorId,
      });

      const createdTask = await task.create();

      return res.status(201).json({
        status: "success",
        message: "Task created successfully",
        task: createdTask,
      });
    } catch (err) {
      console.error("Error creating task:", err);
      if (err.message && err.message.startsWith("Invalid")) {
        return res.status(400).json({ status: "error", message: err.message });
      }
      return res.status(500).json({ status: "error", message: "Server error" });
    }
  }

  /**
   * Get a single task by ID
   * GET /tasks/:id
   */
  static async getTask(req, res) {
    try {
      const taskId = getTaskIdFromRequest(req, res);
      if (!taskId) return;

      // Get current user ID if authenticated
      const userId = getUserIdFromRequest(req);

      const task = await Task.getTask(taskId, userId);
      if (!task) {
        return res
          .status(404)
          .json({ status: "error", message: "Task not found" });
      }

      return res.status(200).json(task);
    } catch (err) {
      console.error("Error fetching task:", err);
      return res.status(500).json({ status: "error", message: "Server error" });
    }
  }

  /**
   * Get all tasks with filtering and sorting
   * GET /tasks
   */
  static async getAllTasks(req, res) {
    try {
      const options = parseTaskQueryParams(req.query);
      const tasks = await Task.getAllTasks(options);

      return res.status(200).json(tasks);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      return res.status(500).json({ status: "error", message: "Server error" });
    }
  }

  /**
   * Get all tasks created by or participated by the current user (My Tasks)
   * GET /tasks/my-tasks
   */
  static async getMyTasks(req, res) {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;

      const options = parseTaskQueryParams(req.query);
      // Get tasks where user is either creator or participant
      const tasks = await Task.getTasksByUser(userId, options);

      return res.status(200).json(tasks);
    } catch (err) {
      console.error("Error fetching my tasks:", err);
      return res.status(500).json({ status: "error", message: "Server error" });
    }
  }

  /**
   * Update a task (only by owner)
   * PUT /tasks/:id
   */
  static async updateTask(req, res) {
    try {
      const taskId = getTaskIdFromRequest(req, res);
      if (!taskId) return;

      const creatorId = requireAuth(req, res);
      if (!creatorId) return;

      const updateData = req.body;
      // Remove fields that shouldn't be updated directly
      delete updateData.creator;
      delete updateData.createdAt;
      delete updateData.id;
      delete updateData._id;

      const updatedTask = await Task.updateTask(taskId, creatorId, updateData);

      if (!updatedTask) {
        return res
          .status(404)
          .json({ status: "error", message: "Task not found" });
      }

      return res.status(200).json({
        status: "success",
        message: "Task updated successfully",
        task: updatedTask,
      });
    } catch (err) {
      console.error("Error updating task:", err);
      if (err.message && err.message.includes("Unauthorized")) {
        return res.status(403).json({ status: "error", message: err.message });
      }
      if (err.message && err.message.startsWith("Invalid")) {
        return res.status(400).json({ status: "error", message: err.message });
      }
      return res.status(500).json({ status: "error", message: "Server error" });
    }
  }

  /**
   * Delete a task (only by owner)
   * DELETE /tasks/:id
   */
  static async deleteTask(req, res) {
    try {
      const taskId = getTaskIdFromRequest(req, res);
      if (!taskId) return;

      const creatorId = requireAuth(req, res);
      if (!creatorId) return;

      const deleted = await Task.deleteTask(taskId, creatorId);

      if (!deleted) {
        return res
          .status(404)
          .json({ status: "error", message: "Task not found" });
      }

      return res.status(200).json({
        status: "success",
        message: "Task deleted successfully",
      });
    } catch (err) {
      console.error("Error deleting task:", err);
      if (err.message && err.message.includes("Unauthorized")) {
        return res.status(403).json({ status: "error", message: err.message });
      }
      return res.status(500).json({ status: "error", message: "Server error" });
    }
  }

  /**
   * Count tasks matching filters
   * GET /tasks/count
   */
  static async countTasks(req, res) {
    try {
      const filters = parseTaskCountParams(req.query);
      const count = await Task.countTasks(filters);

      return res.status(200).json({ count });
    } catch (err) {
      console.error("Error counting tasks:", err);
      return res.status(500).json({ status: "error", message: "Server error" });
    }
  }

  /**
   * Count tasks created by the current user
   * GET /tasks/my-tasks/count
   */
  static async countMyTasks(req, res) {
    try {
      const creatorId = requireAuth(req, res);
      if (!creatorId) return;

      const filters = parseTaskCountParams(req.query);
      const count = await Task.countTasksByCreator(creatorId, filters);

      return res.status(200).json({ count });
    } catch (err) {
      console.error("Error counting my tasks:", err);
      return res.status(500).json({ status: "error", message: "Server error" });
    }
  }

  /**
   * Count tasks where current user is a participant (not owner)
   * GET /tasks/participated/count
   */
  static async countParticipatedTasks(req, res) {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;

      const filters = parseTaskCountParams(req.query);
      const count = await Task.countTasksByParticipant(userId, filters);

      return res.status(200).json({ count });
    } catch (err) {
      console.error("Error counting participated tasks:", err);
      return res.status(500).json({ status: "error", message: "Server error" });
    }
  }

  /**
   * Join a task
   * POST /tasks/:id/join
   */
  static async joinTask(req, res) {
    try {
      const taskId = getTaskIdFromRequest(req, res);
      if (!taskId) return;

      const userId = requireAuth(req, res);
      if (!userId) return;

      const { note } = req.body;

      await Task.joinTask(taskId, userId, note || "");

      return res.status(200).json({
        status: "success",
        message: "Task joined successfully",
      });
    } catch (err) {
      console.error("Error joining task:", err);
      if (err.message === "Task not found") {
        return res.status(404).json({ status: "error", message: err.message });
      }
      if (err.message === "Task is closed" || err.message === "Task is full" || err.message === "User is already a participant in this task") {
        return res.status(400).json({ status: "error", message: err.message });
      }
      return res.status(500).json({ status: "error", message: "Server error" });
    }
  }

  /**
   * Quit a task
   * POST /tasks/:id/quit
   */
  static async quitTask(req, res) {
    try {
      const taskId = getTaskIdFromRequest(req, res);
      if (!taskId) return;

      const userId = requireAuth(req, res);
      if (!userId) return;

      await Task.quitTask(taskId, userId);

      return res.status(200).json({
        status: "success",
        message: "Task quit successfully",
      });
    } catch (err) {
      console.error("Error quitting task:", err);
      if (err.message === "User is not a participant in this task") {
        return res.status(400).json({ status: "error", message: err.message });
      }
      return res.status(500).json({ status: "error", message: "Server error" });
    }
  }

  /**
   * Add a task log
   * POST /tasks/:id/logs
   */
  static async addTaskLog(req, res) {
    try {
      const taskId = getTaskIdFromRequest(req, res);
      if (!taskId) return;

      const userId = requireAuth(req, res);
      if (!userId) return;

      const { summary } = req.body;
      if (!summary || typeof summary !== "string" || summary.trim().length === 0) {
        return res
          .status(400)
          .json({ status: "error", message: "Log summary is required" });
      }

      const log = await Task.addTaskLog(taskId, userId, summary.trim());

      return res.status(201).json({
        status: "success",
        message: "Task log added successfully",
        log: log,
      });
    } catch (err) {
      console.error("Error adding task log:", err);
      if (err.message === "Task not found") {
        return res.status(404).json({ status: "error", message: err.message });
      }
      if (err.message === "Only participants can add task logs") {
        return res.status(403).json({ status: "error", message: err.message });
      }
      return res.status(500).json({ status: "error", message: "Server error" });
    }
  }
}
