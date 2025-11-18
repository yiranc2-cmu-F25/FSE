import { Router } from "express";
import TaskController from "../controllers/taskController.js";
import { auth } from "../middleware/JWT.js";

const router = Router();

/**
 * @openapi
 * /api/tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create a new task
 *     description: Creates a new task in the ESN Task Center. The task will be visible to all citizens and default to OPEN status.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - category
 *               - helpers
 *               - emergencyLevel
 *               - taskType
 *             properties:
 *               title:
 *                 type: string
 *                 description: Task title (max 50 characters)
 *                 example: "Help clear debris from Main Street"
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 description: Brief description of task goals and constraints
 *                 example: "Need help clearing fallen branches and debris from Main Street after the storm"
 *               category:
 *                 type: string
 *                 enum: [debris_removal_and_cleanup, temporary_repair, animal_care, others]
 *                 description: Task category
 *                 example: "debris_removal_and_cleanup"
 *               helpers:
 *                 type: integer
 *                 description: Number of helpers needed (minimum 1)
 *                 example: 3
 *                 minimum: 1
 *               emergencyLevel:
 *                 type: string
 *                 enum: [critical, urgent, standard, scheduled]
 *                 description: Emergency level of the task
 *                 example: "urgent"
 *               taskType:
 *                 type: string
 *                 enum: [normal, asap, schedule]
 *                 description: Task type - normal requires dueDate, asap and schedule don't
 *                 example: "normal"
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 description: Due date (required for normal type, optional for asap/schedule)
 *                 example: "2024-10-25T18:00:00.000Z"
 *               location:
 *                 type: string
 *                 description: Optional location where the task will be performed
 *                 example: "123 Main Street"
 *               resourcesNeeded:
 *                 type: object
 *                 description: Map of resource names to quantities needed
 *                 example: { "shovels": 5, "gloves": 10 }
 *               skillsRequired:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of required skills
 *                 example: ["heavy_lifting", "first_aid"]
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Task created successfully"
 *                 task:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     title:
 *                       type: string
 *                       example: "Help clear debris from Main Street"
 *                     description:
 *                       type: string
 *                     category:
 *                       type: string
 *                     helpers:
 *                       type: integer
 *                     emergencyLevel:
 *                       type: string
 *                     taskType:
 *                       type: string
 *                     isOpen:
 *                       type: boolean
 *                       example: true
 *                     creator:
 *                       type: object
 *                       properties:
 *                         username:
 *                           type: string
 *       400:
 *         description: Invalid input or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Invalid title: must be a string with max 50 characters"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.post("/", auth, TaskController.createTask);

/**
 * @openapi
 * /api/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Get all tasks with filtering and sorting
 *     description: Retrieves all tasks visible to all citizens. Supports filtering by emergency level, category, and status, as well as sorting and pagination.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: emergencyLevel
 *         schema:
 *           type: string
 *           enum: [critical, urgent, standard, scheduled]
 *         description: Filter by emergency level
 *         example: "urgent"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [debris_removal_and_cleanup, temporary_repair, animal_care, others]
 *         description: Filter by category
 *         example: "debris_removal_and_cleanup"
 *       - in: query
 *         name: isOpen
 *         schema:
 *           type: boolean
 *         description: Filter by open/closed status
 *         example: true
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [emergencyLevel, helpers, category, createdAt, updatedAt, isOpen]
 *           default: createdAt
 *         description: Field to sort by
 *         example: "createdAt"
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *         example: "desc"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit number of results
 *         example: 10
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *         description: Skip number of results for pagination
 *         example: 0
 *     responses:
 *       200:
 *         description: Array of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: "507f1f77bcf86cd799439011"
 *                   title:
 *                     type: string
 *                     example: "Help clear debris from Main Street"
 *                   description:
 *                     type: string
 *                   category:
 *                     type: string
 *                   helpers:
 *                     type: integer
 *                   emergencyLevel:
 *                     type: string
 *                   taskType:
 *                     type: string
 *                   dueDate:
 *                     type: string
 *                     format: date-time
 *                   location:
 *                     type: string
 *                   resourcesNeeded:
 *                     type: object
 *                   skillsRequired:
 *                     type: array
 *                     items:
 *                       type: string
 *                   isOpen:
 *                     type: boolean
 *                   creator:
 *                     type: object
 *                     properties:
 *                       username:
 *                         type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.get("/", auth, TaskController.getAllTasks);

/**
 * @openapi
 * /api/tasks/count:
 *   get:
 *     tags: [Tasks]
 *     summary: Count tasks matching filters
 *     description: Returns the count of tasks matching the specified filters (useful for pagination)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: emergencyLevel
 *         schema:
 *           type: string
 *           enum: [critical, urgent, standard, scheduled]
 *         description: Filter by emergency level
 *         example: "urgent"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [debris_removal_and_cleanup, temporary_repair, animal_care, others]
 *         description: Filter by category
 *         example: "debris_removal_and_cleanup"
 *       - in: query
 *         name: isOpen
 *         schema:
 *           type: boolean
 *         description: Filter by open/closed status
 *         example: true
 *     responses:
 *       200:
 *         description: Task count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 42
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.get("/count", auth, TaskController.countTasks);

/**
 * @openapi
 * /api/tasks/self:
 *   get:
 *     tags: [Tasks]
 *     summary: Get all tasks created by the current user
 *     description: Retrieves all tasks created by the authenticated user (My Tasks page). Supports filtering, sorting, and pagination.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: emergencyLevel
 *         schema:
 *           type: string
 *           enum: [critical, urgent, standard, scheduled]
 *         description: Filter by emergency level
 *         example: "urgent"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [debris_removal_and_cleanup, temporary_repair, animal_care, others]
 *         description: Filter by category
 *         example: "debris_removal_and_cleanup"
 *       - in: query
 *         name: isOpen
 *         schema:
 *           type: boolean
 *         description: Filter by open/closed status
 *         example: true
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [emergencyLevel, helpers, category, createdAt, updatedAt, isOpen]
 *           default: createdAt
 *         description: Field to sort by
 *         example: "createdAt"
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *         example: "desc"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit number of results
 *         example: 10
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *         description: Skip number of results for pagination
 *         example: 0
 *     responses:
 *       200:
 *         description: Array of tasks created by the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   category:
 *                     type: string
 *                   helpers:
 *                     type: integer
 *                   emergencyLevel:
 *                     type: string
 *                   taskType:
 *                     type: string
 *                   isOpen:
 *                     type: boolean
 *                   creator:
 *                     type: object
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.get("/self", auth, TaskController.getMyTasks);

/**
 * @openapi
 * /api/tasks/self/count:
 *   get:
 *     tags: [Tasks]
 *     summary: Count tasks created by the current user
 *     description: Returns the count of tasks created by the authenticated user matching the specified filters
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: emergencyLevel
 *         schema:
 *           type: string
 *           enum: [critical, urgent, standard, scheduled]
 *         description: Filter by emergency level
 *         example: "urgent"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [debris_removal_and_cleanup, temporary_repair, animal_care, others]
 *         description: Filter by category
 *         example: "debris_removal_and_cleanup"
 *       - in: query
 *         name: isOpen
 *         schema:
 *           type: boolean
 *         description: Filter by open/closed status
 *         example: true
 *     responses:
 *       200:
 *         description: Task count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.get("/self/count", auth, TaskController.countMyTasks);

// Note: Specific routes (/self, /self/count, /count, /single) are defined before parameterized routes

/**
 * @openapi
 * /api/tasks/single/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Get a single task by ID
 *     description: Retrieves detailed information about a specific task
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Task details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439011"
 *                 title:
 *                   type: string
 *                   example: "Help clear debris from Main Street"
 *                 description:
 *                   type: string
 *                 category:
 *                   type: string
 *                 helpers:
 *                   type: integer
 *                 emergencyLevel:
 *                   type: string
 *                 taskType:
 *                   type: string
 *                 dueDate:
 *                   type: string
 *                   format: date-time
 *                 location:
 *                   type: string
 *                 resourcesNeeded:
 *                   type: object
 *                 skillsRequired:
 *                   type: array
 *                   items:
 *                     type: string
 *                 isOpen:
 *                   type: boolean
 *                 creator:
 *                   type: object
 *                   properties:
 *                     username:
 *                       type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Missing task ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Task ID is required"
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Task not found"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.get("/single/:id", auth, TaskController.getTask);

/**
 * @openapi
 * /api/tasks/single/{id}:
 *   put:
 *     tags: [Tasks]
 *     summary: Update a task
 *     description: Updates a task. Only the task owner can update their own tasks. The updatedAt timestamp is automatically updated.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Task title (max 50 characters)
 *                 maxLength: 50
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [debris_removal_and_cleanup, temporary_repair, animal_care, others]
 *               helpers:
 *                 type: integer
 *                 minimum: 1
 *               emergencyLevel:
 *                 type: string
 *                 enum: [critical, urgent, standard, scheduled]
 *               taskType:
 *                 type: string
 *                 enum: [normal, asap, schedule]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *               resourcesNeeded:
 *                 type: object
 *               skillsRequired:
 *                 type: array
 *                 items:
 *                   type: string
 *               isOpen:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Task updated successfully"
 *                 task:
 *                   type: object
 *       400:
 *         description: Invalid input or missing task ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Task ID is required"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       403:
 *         description: Forbidden - Only task owner can update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Only the task owner can update this task"
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Task not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.put("/single/:id", auth, TaskController.updateTask);

/**
 * @openapi
 * /api/tasks/single/{id}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete a task
 *     description: Deletes a task. Only the task owner can delete their own tasks.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Task deleted successfully"
 *       400:
 *         description: Missing task ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Task ID is required"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       403:
 *         description: Forbidden - Only task owner can delete
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Only the task owner can delete this task"
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Task not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.delete("/single/:id", auth, TaskController.deleteTask);

export default router;
