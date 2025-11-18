import Task from "../entities/Task.js";

// Helper function to normalize ID
// This is used to convert the ID to a string (in case browser throws something strange at us)
const normId = (idLike) => {
  if (idLike == null) return "";
  if (typeof idLike === "string") return idLike;
  if (typeof idLike === "object") {
    return String(idLike._id ?? idLike.id ?? "");
  }
  return idLike.toString ? idLike.toString() : String(idLike);
};

export default class TaskController {
  /**
   * Create a new task
   * POST /tasks
   */
  static async createTask(req, res) {
    try {
      const creatorIdRaw = req.user?.id ?? req.userId;
      if (!creatorIdRaw) {
        return res
          .status(401)
          .json({ status: "error", message: "Unauthorized" });
      }
      const creatorId = normId(creatorIdRaw);

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
      const taskId = req.params.id;
      if (!taskId) {
        return res
          .status(400)
          .json({ status: "error", message: "Task ID is required" });
      }

      const task = await Task.getTask(taskId);
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
      const {
        emergencyLevel,
        category,
        isOpen,
        sortBy,
        sortOrder,
        limit,
        skip,
      } = req.query;

      // Parse boolean and number query parameters
      const filters = {};
      if (emergencyLevel) filters.emergencyLevel = emergencyLevel;
      if (category) filters.category = category;
      if (isOpen !== undefined) {
        filters.isOpen = isOpen === "true" || isOpen === true;
      }

      const options = {
        ...filters,
        sortBy: sortBy || "createdAt",
        sortOrder: sortOrder || "desc",
        limit: limit ? parseInt(limit, 10) : undefined,
        skip: skip ? parseInt(skip, 10) : undefined,
      };

      const tasks = await Task.getAllTasks(options);

      return res.status(200).json(tasks);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      return res.status(500).json({ status: "error", message: "Server error" });
    }
  }

  /**
   * Get all tasks created by the current user (My Tasks)
   * GET /tasks/my-tasks
   */
  static async getMyTasks(req, res) {
    try {
      const creatorIdRaw = req.user?.id ?? req.userId;
      if (!creatorIdRaw) {
        return res
          .status(401)
          .json({ status: "error", message: "Unauthorized" });
      }
      const creatorId = normId(creatorIdRaw);

      const {
        emergencyLevel,
        category,
        isOpen,
        sortBy,
        sortOrder,
        limit,
        skip,
      } = req.query;

      // Parse boolean and number query parameters
      const filters = {};
      if (emergencyLevel) filters.emergencyLevel = emergencyLevel;
      if (category) filters.category = category;
      if (isOpen !== undefined) {
        filters.isOpen = isOpen === "true" || isOpen === true;
      }

      const options = {
        ...filters,
        sortBy: sortBy || "createdAt",
        sortOrder: sortOrder || "desc",
        limit: limit ? parseInt(limit, 10) : undefined,
        skip: skip ? parseInt(skip, 10) : undefined,
      };

      const tasks = await Task.getTasksByCreator(creatorId, options);

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
      const taskId = req.params.id;
      if (!taskId) {
        return res
          .status(400)
          .json({ status: "error", message: "Task ID is required" });
      }

      const creatorIdRaw = req.user?.id ?? req.userId;
      if (!creatorIdRaw) {
        return res
          .status(401)
          .json({ status: "error", message: "Unauthorized" });
      }
      const creatorId = normId(creatorIdRaw);

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
      const taskId = req.params.id;
      if (!taskId) {
        return res
          .status(400)
          .json({ status: "error", message: "Task ID is required" });
      }

      const creatorIdRaw = req.user?.id ?? req.userId;
      if (!creatorIdRaw) {
        return res
          .status(401)
          .json({ status: "error", message: "Unauthorized" });
      }
      const creatorId = normId(creatorIdRaw);

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
      const { emergencyLevel, category, isOpen } = req.query;

      const filters = {};
      if (emergencyLevel) filters.emergencyLevel = emergencyLevel;
      if (category) filters.category = category;
      if (isOpen !== undefined) {
        filters.isOpen = isOpen === "true" || isOpen === true;
      }

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
      const creatorIdRaw = req.user?.id ?? req.userId;
      if (!creatorIdRaw) {
        return res
          .status(401)
          .json({ status: "error", message: "Unauthorized" });
      }
      const creatorId = normId(creatorIdRaw);

      const { emergencyLevel, category, isOpen } = req.query;

      const filters = {};
      if (emergencyLevel) filters.emergencyLevel = emergencyLevel;
      if (category) filters.category = category;
      if (isOpen !== undefined) {
        filters.isOpen = isOpen === "true" || isOpen === true;
      }

      const count = await Task.countTasksByCreator(creatorId, filters);

      return res.status(200).json({ count });
    } catch (err) {
      console.error("Error counting my tasks:", err);
      return res.status(500).json({ status: "error", message: "Server error" });
    }
  }
}
