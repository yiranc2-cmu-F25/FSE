import TaskController from "../controllers/taskController.js";
import Task from "../entities/Task.js";
import TaskDac from "../dacs/taskDac.js";
import { inMemoryTaskDao } from "../daos/inMemoryTaskDao.js";

describe("TaskController Unit Tests", () => {
  beforeEach(() => {
    // Inject fresh in-memory DAO for test isolation
    TaskDac.DAO = new inMemoryTaskDao();
  });

  // Helper function to create mock request/response objects
  const createMockReq = (overrides = {}) => {
    return {
      user: { id: "user123" },
      userId: "user123",
      params: {},
      query: {},
      body: {},
      ...overrides,
    };
  };

  const createMockRes = () => {
    const res = {
      statusCode: null,
      jsonBody: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.jsonBody = body;
        return this;
      },
    };
    return res;
  };

  // Helper to create a valid task
  const createValidTaskData = (overrides = {}) => ({
    title: "Test Task",
    description: "Test description",
    category: "debris_removal_and_cleanup",
    helpers: 3,
    emergencyLevel: "urgent",
    taskType: "normal",
    dueDate: new Date("2024-12-31T23:59:59Z"),
    location: "Test Location",
    resourcesNeeded: { shovels: 5 },
    skillsRequired: ["heavy_lifting"],
    ...overrides,
  });

  describe("createTask - Positive Tests", () => {
    test("should create a new task successfully with all required fields", async () => {
      const req = createMockReq({
        body: createValidTaskData(),
      });
      const res = createMockRes();

      await TaskController.createTask(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.jsonBody.status).toBe("success");
      expect(res.jsonBody.message).toBe("Task created successfully");
      expect(res.jsonBody.task).toBeDefined();
      expect(res.jsonBody.task.title).toBe("Test Task");
      expect(res.jsonBody.task.creator).toBe("user123");
      expect(res.jsonBody.task.isOpen).toBe(true);
    });

    test("should create a task with optional fields", async () => {
      const req = createMockReq({
        body: createValidTaskData({
          location: "123 Main St",
          resourcesNeeded: { tools: 10 },
          skillsRequired: ["first_aid", "cpr"],
        }),
      });
      const res = createMockRes();

      await TaskController.createTask(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.jsonBody.task.location).toBe("123 Main St");
      expect(res.jsonBody.task.resourcesNeeded).toEqual({ tools: 10 });
      expect(res.jsonBody.task.skillsRequired).toEqual(["first_aid", "cpr"]);
    });

    test("should create task with asap taskType without dueDate", async () => {
      const req = createMockReq({
        body: createValidTaskData({
          taskType: "asap",
          dueDate: undefined,
        }),
      });
      const res = createMockRes();

      await TaskController.createTask(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.jsonBody.task.taskType).toBe("asap");
    });

    test("should create task with schedule taskType", async () => {
      const req = createMockReq({
        body: createValidTaskData({
          taskType: "schedule",
        }),
      });
      const res = createMockRes();

      await TaskController.createTask(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.jsonBody.task.taskType).toBe("schedule");
    });
  });

  describe("createTask - Negative Tests", () => {
    test("should return 401 when user is not authenticated", async () => {
      const req = createMockReq({
        user: null,
        userId: null,
        body: createValidTaskData(),
      });
      const res = createMockRes();

      await TaskController.createTask(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toBe("Unauthorized");
    });

    test("should return 400 when title is missing", async () => {
      const req = createMockReq({
        body: createValidTaskData({ title: undefined }),
      });
      const res = createMockRes();

      await TaskController.createTask(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toContain("Invalid");
    });

    test("should return 400 when title exceeds 50 characters", async () => {
      const req = createMockReq({
        body: createValidTaskData({
          title: "A".repeat(51),
        }),
      });
      const res = createMockRes();

      await TaskController.createTask(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toContain("Invalid title");
    });

    test("should return 400 when helpers is less than 1", async () => {
      const req = createMockReq({
        body: createValidTaskData({ helpers: 0 }),
      });
      const res = createMockRes();

      await TaskController.createTask(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonBody.status).toBe("error");
    });

    test("should return 500 on unexpected server error", async () => {
      // Mock Task.create to throw an error
      const originalCreate = Task.prototype.create;
      Task.prototype.create = async function () {
        throw new Error("Database connection failed");
      };

      const req = createMockReq({
        body: createValidTaskData(),
      });
      const res = createMockRes();

      await TaskController.createTask(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toBe("Server error");

      // Restore original method
      Task.prototype.create = originalCreate;
    });
  });

  describe("getTask - Positive Tests", () => {
    test("should retrieve a task by ID successfully", async () => {
      // First create a task
      const createReq = createMockReq({
        body: createValidTaskData(),
      });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      // Now get it
      const req = createMockReq({
        params: { id: taskId },
      });
      const res = createMockRes();

      await TaskController.getTask(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.id).toBe(taskId);
      expect(res.jsonBody.title).toBe("Test Task");
      expect(res.jsonBody.helpersJoined).toBeDefined();
      expect(res.jsonBody.isParticipant).toBeDefined();
    });

    test("should retrieve task with participant information when user is authenticated", async () => {
      const createReq = createMockReq({
        body: createValidTaskData(),
      });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      const req = createMockReq({
        params: { id: taskId },
        user: { id: "user123" },
      });
      const res = createMockRes();

      await TaskController.getTask(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.isParticipant).toBe(false); // User hasn't joined yet
    });
  });

  describe("getTask - Negative Tests", () => {
    test("should return 400 when task ID is missing", async () => {
      const req = createMockReq({
        params: {},
      });
      const res = createMockRes();

      await TaskController.getTask(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toBe("Task ID is required");
    });

    test("should return 404 when task does not exist", async () => {
      const req = createMockReq({
        params: { id: "nonexistent_task_id" },
      });
      const res = createMockRes();

      await TaskController.getTask(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toBe("Task not found");
    });
  });

  describe("getAllTasks - Positive Tests", () => {
    test("should retrieve all tasks successfully", async () => {
      // Create multiple tasks
      for (let i = 0; i < 3; i++) {
        const req = createMockReq({
          body: createValidTaskData({ title: `Task ${i}` }),
        });
        const res = createMockRes();
        await TaskController.createTask(req, res);
      }

      const req = createMockReq({ query: {} });
      const res = createMockRes();

      await TaskController.getAllTasks(req, res);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.jsonBody)).toBe(true);
      expect(res.jsonBody.length).toBeGreaterThanOrEqual(3);
    });

    test("should filter tasks by emergencyLevel", async () => {
      // Create tasks with different emergency levels
      await TaskController.createTask(
        createMockReq({ body: createValidTaskData({ emergencyLevel: "critical" }) }),
        createMockRes()
      );
      await TaskController.createTask(
        createMockReq({ body: createValidTaskData({ emergencyLevel: "urgent" }) }),
        createMockRes()
      );

      const req = createMockReq({
        query: { emergencyLevel: "critical" },
      });
      const res = createMockRes();

      await TaskController.getAllTasks(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.every((t) => t.emergencyLevel === "critical")).toBe(true);
    });

    test("should filter tasks by category", async () => {
      await TaskController.createTask(
        createMockReq({
          body: createValidTaskData({ category: "animal_care" }),
        }),
        createMockRes()
      );
      await TaskController.createTask(
        createMockReq({
          body: createValidTaskData({ category: "temporary_repair" }),
        }),
        createMockRes()
      );

      const req = createMockReq({
        query: { category: "animal_care" },
      });
      const res = createMockRes();

      await TaskController.getAllTasks(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.every((t) => t.category === "animal_care")).toBe(true);
    });

    test("should filter tasks by isOpen status", async () => {
      const createReq = createMockReq({ body: createValidTaskData() });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      // Close the task
      const updateReq = createMockReq({
        params: { id: taskId },
        body: { isOpen: false },
      });
      const updateRes = createMockRes();
      await TaskController.updateTask(updateReq, updateRes);

      const req = createMockReq({
        query: { isOpen: "false" },
      });
      const res = createMockRes();

      await TaskController.getAllTasks(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.every((t) => t.isOpen === false)).toBe(true);
    });

    test("should sort tasks by createdAt in descending order by default", async () => {
      // Create tasks with delays to ensure different timestamps
      await TaskController.createTask(
        createMockReq({ body: createValidTaskData({ title: "Task 1" }) }),
        createMockRes()
      );
      await new Promise((resolve) => setTimeout(resolve, 10));
      await TaskController.createTask(
        createMockReq({ body: createValidTaskData({ title: "Task 2" }) }),
        createMockRes()
      );

      const req = createMockReq({ query: {} });
      const res = createMockRes();

      await TaskController.getAllTasks(req, res);

      expect(res.statusCode).toBe(200);
      if (res.jsonBody.length >= 2) {
        const dates = res.jsonBody.map((t) => new Date(t.createdAt).getTime());
        expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
      }
    });

    test("should support pagination with limit and skip", async () => {
      // Create multiple tasks
      for (let i = 0; i < 5; i++) {
        await TaskController.createTask(
          createMockReq({ body: createValidTaskData({ title: `Task ${i}` }) }),
          createMockRes()
        );
      }

      const req = createMockReq({
        query: { limit: "2", skip: "1" },
      });
      const res = createMockRes();

      await TaskController.getAllTasks(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.length).toBeLessThanOrEqual(2);
    });
  });

  describe("getMyTasks - Positive Tests", () => {
    test("should retrieve tasks created by the authenticated user", async () => {
      const user1Req = createMockReq({
        user: { id: "user1" },
        userId: "user1",
        body: createValidTaskData({ title: "User1 Task" }),
      });
      const user1Res = createMockRes();
      await TaskController.createTask(user1Req, user1Res);

      const user2Req = createMockReq({
        user: { id: "user2" },
        userId: "user2",
        body: createValidTaskData({ title: "User2 Task" }),
      });
      const user2Res = createMockRes();
      await TaskController.createTask(user2Req, user2Res);

      const req = createMockReq({
        user: { id: "user1" },
        userId: "user1",
        query: {},
      });
      const res = createMockRes();

      await TaskController.getMyTasks(req, res);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.jsonBody)).toBe(true);
      expect(res.jsonBody.every((t) => t.creator === "user1" || t.isParticipant === true)).toBe(true);
    });

    test("should return 401 when user is not authenticated", async () => {
      const req = createMockReq({
        user: null,
        userId: null,
        query: {},
      });
      const res = createMockRes();

      await TaskController.getMyTasks(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toBe("Unauthorized");
    });
  });

  describe("updateTask - Positive Tests", () => {
    test("should update a task successfully by owner", async () => {
      const createReq = createMockReq({
        body: createValidTaskData({ title: "Original Title" }),
      });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      const req = createMockReq({
        params: { id: taskId },
        body: { title: "Updated Title", description: "Updated description" },
      });
      const res = createMockRes();

      await TaskController.updateTask(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.status).toBe("success");
      expect(res.jsonBody.message).toBe("Task updated successfully");
      expect(res.jsonBody.task.title).toBe("Updated Title");
      expect(res.jsonBody.task.description).toBe("Updated description");
      expect(res.jsonBody.task.updatedAt).toBeDefined();
    });

    test("should update task status from open to closed", async () => {
      const createReq = createMockReq({ body: createValidTaskData() });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      const req = createMockReq({
        params: { id: taskId },
        body: { isOpen: false },
      });
      const res = createMockRes();

      await TaskController.updateTask(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.task.isOpen).toBe(false);
    });
  });

  describe("updateTask - Negative Tests", () => {
    test("should return 400 when task ID is missing", async () => {
      const req = createMockReq({
        params: {},
        body: { title: "Updated Title" },
      });
      const res = createMockRes();

      await TaskController.updateTask(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toBe("Task ID is required");
    });

    test("should return 401 when user is not authenticated", async () => {
      const createReq = createMockReq({ body: createValidTaskData() });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      const req = createMockReq({
        params: { id: taskId },
        user: null,
        userId: null,
        body: { title: "Updated Title" },
      });
      const res = createMockRes();

      await TaskController.updateTask(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.jsonBody.status).toBe("error");
    });

    test("should return 403 when non-owner tries to update task", async () => {
      const createReq = createMockReq({
        user: { id: "owner123" },
        userId: "owner123",
        body: createValidTaskData(),
      });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      const req = createMockReq({
        params: { id: taskId },
        user: { id: "other_user" },
        userId: "other_user",
        body: { title: "Hacked Title" },
      });
      const res = createMockRes();

      await TaskController.updateTask(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toContain("Unauthorized");
    });

    test("should return 404 when task does not exist", async () => {
      const req = createMockReq({
        params: { id: "nonexistent_task" },
        body: { title: "Updated Title" },
      });
      const res = createMockRes();

      await TaskController.updateTask(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toBe("Task not found");
    });
  });

  describe("deleteTask - Positive Tests", () => {
    test("should delete a task successfully by owner", async () => {
      const createReq = createMockReq({ body: createValidTaskData() });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      const req = createMockReq({
        params: { id: taskId },
      });
      const res = createMockRes();

      await TaskController.deleteTask(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.status).toBe("success");
      expect(res.jsonBody.message).toBe("Task deleted successfully");

      // Verify task is deleted
      const getReq = createMockReq({ params: { id: taskId } });
      const getRes = createMockRes();
      await TaskController.getTask(getReq, getRes);
      expect(getRes.statusCode).toBe(404);
    });
  });

  describe("deleteTask - Negative Tests", () => {
    test("should return 400 when task ID is missing", async () => {
      const req = createMockReq({ params: {} });
      const res = createMockRes();

      await TaskController.deleteTask(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toBe("Task ID is required");
    });

    test("should return 403 when non-owner tries to delete task", async () => {
      const createReq = createMockReq({
        user: { id: "owner123" },
        userId: "owner123",
        body: createValidTaskData(),
      });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      const req = createMockReq({
        params: { id: taskId },
        user: { id: "other_user" },
        userId: "other_user",
      });
      const res = createMockRes();

      await TaskController.deleteTask(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toContain("Unauthorized");
    });
  });

  describe("countTasks - Positive Tests", () => {
    test("should count all tasks correctly", async () => {
      // Create multiple tasks
      for (let i = 0; i < 5; i++) {
        await TaskController.createTask(
          createMockReq({ body: createValidTaskData() }),
          createMockRes()
        );
      }

      const req = createMockReq({ query: {} });
      const res = createMockRes();

      await TaskController.countTasks(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.count).toBeGreaterThanOrEqual(5);
    });

    test("should count tasks with filters", async () => {
      await TaskController.createTask(
        createMockReq({
          body: createValidTaskData({ emergencyLevel: "critical" }),
        }),
        createMockRes()
      );
      await TaskController.createTask(
        createMockReq({
          body: createValidTaskData({ emergencyLevel: "urgent" }),
        }),
        createMockRes()
      );

      const req = createMockReq({
        query: { emergencyLevel: "critical" },
      });
      const res = createMockRes();

      await TaskController.countTasks(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe("joinTask - Positive Tests", () => {
    test("should allow user to join an open task successfully", async () => {
      const createReq = createMockReq({
        body: createValidTaskData({ helpers: 5 }),
      });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      const req = createMockReq({
        params: { id: taskId },
        body: { note: "I can help!" },
      });
      const res = createMockRes();

      await TaskController.joinTask(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.status).toBe("success");
      expect(res.jsonBody.message).toBe("Task joined successfully");
    });

    test("should allow user to join without a note", async () => {
      const createReq = createMockReq({
        body: createValidTaskData({ helpers: 5 }),
      });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      const req = createMockReq({
        params: { id: taskId },
        body: {},
      });
      const res = createMockRes();

      await TaskController.joinTask(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.status).toBe("success");
    });
  });

  describe("joinTask - Negative Tests", () => {
    test("should return 400 when task is closed", async () => {
      const createReq = createMockReq({ body: createValidTaskData() });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      // Close the task
      const updateReq = createMockReq({
        params: { id: taskId },
        body: { isOpen: false },
      });
      await TaskController.updateTask(updateReq, createMockRes());

      const req = createMockReq({
        params: { id: taskId },
        body: {},
      });
      const res = createMockRes();

      await TaskController.joinTask(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toBe("Task is closed");
    });

    test("should return 400 when task is full", async () => {
      const createReq = createMockReq({
        body: createValidTaskData({ helpers: 1 }),
      });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      // Join with first user
      const joinReq1 = createMockReq({
        params: { id: taskId },
        user: { id: "user1" },
        userId: "user1",
        body: {},
      });
      await TaskController.joinTask(joinReq1, createMockRes());

      // Try to join with second user (should fail - task is full)
      const req = createMockReq({
        params: { id: taskId },
        user: { id: "user2" },
        userId: "user2",
        body: {},
      });
      const res = createMockRes();

      await TaskController.joinTask(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toBe("Task is full");
    });

    test("should return 400 when user is already a participant", async () => {
      const createReq = createMockReq({
        body: createValidTaskData({ helpers: 5 }),
      });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      // Join first time
      const joinReq1 = createMockReq({
        params: { id: taskId },
        body: {},
      });
      await TaskController.joinTask(joinReq1, createMockRes());

      // Try to join again
      const req = createMockReq({
        params: { id: taskId },
        body: {},
      });
      const res = createMockRes();

      await TaskController.joinTask(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toBe("User is already a participant in this task");
    });

    test("should return 404 when task does not exist", async () => {
      const req = createMockReq({
        params: { id: "nonexistent_task" },
        body: {},
      });
      const res = createMockRes();

      await TaskController.joinTask(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toBe("Task not found");
    });
  });

  describe("quitTask - Positive Tests", () => {
    test("should allow participant to quit a task successfully", async () => {
      const createReq = createMockReq({
        body: createValidTaskData({ helpers: 5 }),
      });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      // Join first
      const joinReq = createMockReq({
        params: { id: taskId },
        body: {},
      });
      await TaskController.joinTask(joinReq, createMockRes());

      // Then quit
      const req = createMockReq({
        params: { id: taskId },
      });
      const res = createMockRes();

      await TaskController.quitTask(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.status).toBe("success");
      expect(res.jsonBody.message).toBe("Task quit successfully");
    });
  });

  describe("quitTask - Negative Tests", () => {
    test("should return 400 when user is not a participant", async () => {
      const createReq = createMockReq({ body: createValidTaskData() });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      const req = createMockReq({
        params: { id: taskId },
        user: { id: "non_participant" },
        userId: "non_participant",
      });
      const res = createMockRes();

      await TaskController.quitTask(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toBe("User is not a participant in this task");
    });
  });

  describe("addTaskLog - Positive Tests", () => {
    test("should allow participant to add a task log successfully", async () => {
      const createReq = createMockReq({
        body: createValidTaskData({ helpers: 5 }),
      });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      // Join first
      const joinReq = createMockReq({
        params: { id: taskId },
        body: {},
      });
      await TaskController.joinTask(joinReq, createMockRes());

      // Add log
      const req = createMockReq({
        params: { id: taskId },
        body: { summary: "Made good progress today" },
      });
      const res = createMockRes();

      await TaskController.addTaskLog(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.jsonBody.status).toBe("success");
      expect(res.jsonBody.message).toBe("Task log added successfully");
      expect(res.jsonBody.log).toBeDefined();
      expect(res.jsonBody.log.summary).toBe("Made good progress today");
    });
  });

  describe("addTaskLog - Negative Tests", () => {
    test("should return 400 when summary is missing", async () => {
      const createReq = createMockReq({ body: createValidTaskData() });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      const req = createMockReq({
        params: { id: taskId },
        body: {},
      });
      const res = createMockRes();

      await TaskController.addTaskLog(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toBe("Log summary is required");
    });

    test("should return 400 when summary is empty string", async () => {
      const createReq = createMockReq({ body: createValidTaskData() });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      const req = createMockReq({
        params: { id: taskId },
        body: { summary: "   " },
      });
      const res = createMockRes();

      await TaskController.addTaskLog(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toBe("Log summary is required");
    });

    test("should return 403 when non-participant tries to add log", async () => {
      const createReq = createMockReq({ body: createValidTaskData() });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      const req = createMockReq({
        params: { id: taskId },
        user: { id: "non_participant" },
        userId: "non_participant",
        body: { summary: "I wasn't there but here's a log" },
      });
      const res = createMockRes();

      await TaskController.addTaskLog(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toBe("Only participants can add task logs");
    });

    test("should return 404 when task does not exist", async () => {
      const req = createMockReq({
        params: { id: "nonexistent_task" },
        body: { summary: "Test log" },
      });
      const res = createMockRes();

      await TaskController.addTaskLog(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.jsonBody.status).toBe("error");
      expect(res.jsonBody.message).toBe("Task not found");
    });
  });

  describe("countMyTasks - Positive Tests", () => {
    test("should count tasks created by authenticated user", async () => {
      // Create tasks for user1
      for (let i = 0; i < 3; i++) {
        await TaskController.createTask(
          createMockReq({
            user: { id: "user1" },
            userId: "user1",
            body: createValidTaskData(),
          }),
          createMockRes()
        );
      }

      const req = createMockReq({
        user: { id: "user1" },
        userId: "user1",
        query: {},
      });
      const res = createMockRes();

      await TaskController.countMyTasks(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.count).toBeGreaterThanOrEqual(3);
    });

    test("should return 401 when user is not authenticated", async () => {
      const req = createMockReq({
        user: null,
        userId: null,
        query: {},
      });
      const res = createMockRes();

      await TaskController.countMyTasks(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.jsonBody.status).toBe("error");
    });
  });

  describe("countParticipatedTasks - Positive Tests", () => {
    test("should count tasks where user is a participant", async () => {
      const createReq = createMockReq({
        body: createValidTaskData({ helpers: 5 }),
      });
      const createRes = createMockRes();
      await TaskController.createTask(createReq, createRes);
      const taskId = createRes.jsonBody.task.id;

      // Join task
      const joinReq = createMockReq({
        params: { id: taskId },
        body: {},
      });
      await TaskController.joinTask(joinReq, createMockRes());

      const req = createMockReq({
        query: {},
      });
      const res = createMockRes();

      await TaskController.countParticipatedTasks(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.count).toBeGreaterThanOrEqual(1);
    });

    test("should return 401 when user is not authenticated", async () => {
      const req = createMockReq({
        user: null,
        userId: null,
        query: {},
      });
      const res = createMockRes();

      await TaskController.countParticipatedTasks(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.jsonBody.status).toBe("error");
    });
  });
});

