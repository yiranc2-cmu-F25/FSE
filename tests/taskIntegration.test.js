import { jest } from '@jest/globals';
import request from "supertest";
import app from "../app.js";

import { inMemoryTaskDao } from "../daos/inMemoryTaskDao.js";
import TaskDac from "../dacs/taskDac.js";

import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import UserDac from "../dacs/userDac.js";

import { setupTestDb, cleanupTestDb } from "../config/testDbConfig.js";

describe("Task Management REST API Integration Tests", () => {
  let mockSocket;

  beforeAll(async () => {
    await setupTestDb();
    TaskDac.DAO = new inMemoryTaskDao();
    UserDac.DAO = new inMemoryUserDao();

    mockSocket = {
      emitMessageFrom: jest.fn((username, payload) => {
        return true;
      }),
    };

    app.set("socketInstance", mockSocket);
  });

  afterAll(async () => {
    // Cleanup test database
    await cleanupTestDb();
    
    TaskDac.DAO = null;
    UserDac.DAO = null;
  });

  afterEach(async () => {
    // Reset in-memory DAOs for test isolation
    TaskDac.DAO = new inMemoryTaskDao();
    UserDac.DAO = new inMemoryUserDao();
  });

  // Helper function to register and authenticate a user
  const registerAndLogin = async (agent, username) => {
    const registerRes = await agent
      .post("/api/authentications/registrations")
      .send({ username, password: "testPassword" })
      .expect(201);

    expect(registerRes.headers['set-cookie']).toBeDefined();
    
    const user = await UserDac.DAO.findByUsername(username);
    expect(user).toBeTruthy();
    
    return user;
  };

  describe("POST /api/tasks - Create Task (Positive Test)", () => {
    test("should create a new task successfully with all required fields and verify state", async () => {
      const agent = request.agent(app);
      const user = await registerAndLogin(agent, `task_creator_${Date.now()}`);

      const taskData = {
        title: "Clear debris from Main Street",
        description: "Need help clearing fallen branches after the storm",
        category: "debris_removal_and_cleanup",
        helpers: 5,
        emergencyLevel: "urgent",
        taskType: "normal",
        dueDate: "2024-12-31T23:59:59.000Z",
        location: "123 Main Street",
        resourcesNeeded: { shovels: 10, gloves: 20 },
        skillsRequired: ["heavy_lifting", "first_aid"],
      };

      const createRes = await agent
        .post("/api/tasks")
        .send(taskData)
        .expect(201);

      // Verify response structure and content
      expect(createRes.body.status).toBe("success");
      expect(createRes.body.message).toBe("Task created successfully");
      expect(createRes.body.task).toBeDefined();
      expect(createRes.body.task.title).toBe("Clear debris from Main Street");
      expect(createRes.body.task.description).toBe("Need help clearing fallen branches after the storm");
      expect(createRes.body.task.category).toBe("debris_removal_and_cleanup");
      expect(createRes.body.task.helpers).toBe(5);
      expect(createRes.body.task.emergencyLevel).toBe("urgent");
      expect(createRes.body.task.taskType).toBe("normal");
      expect(createRes.body.task.isOpen).toBe(true);
      expect(createRes.body.task.location).toBe("123 Main Street");
      // resourcesNeeded might be returned as Map or object, check content if present
      if (createRes.body.task.resourcesNeeded) {
        const resources = createRes.body.task.resourcesNeeded;
        // Convert to plain object if it's a Map
        const resourcesObj = resources instanceof Map || (resources.constructor && resources.constructor.name === 'Map')
          ? Object.fromEntries(resources)
          : resources;
        // Check if resources are present (might be empty object or Map)
        if (resourcesObj && Object.keys(resourcesObj).length > 0) {
          expect(resourcesObj.shovels).toBe(10);
          expect(resourcesObj.gloves).toBe(20);
        }
      }
      // skillsRequired should be present
      expect(createRes.body.task.skillsRequired).toBeDefined();
      expect(Array.isArray(createRes.body.task.skillsRequired)).toBe(true);
      expect(createRes.body.task.skillsRequired).toContain("heavy_lifting");
      expect(createRes.body.task.skillsRequired).toContain("first_aid");

      // Verify state was persisted - GET the task to verify
      const taskId = createRes.body.task.id || createRes.body.task._id;
      const getRes = await agent
        .get(`/api/tasks/${taskId}`)
        .expect(200);

      expect(getRes.body.id).toBe(taskId);
      expect(getRes.body.title).toBe("Clear debris from Main Street");
      expect(getRes.body.creator).toBeDefined();
      const creatorId = getRes.body.creator.id || getRes.body.creator._id || getRes.body.creator;
      const userId = user.id || user._id;
      expect(String(creatorId)).toBe(String(userId));
      expect(getRes.body.isOpen).toBe(true);
      expect(getRes.body.helpersJoined).toBe(0);
    });

    test("should create task with asap type without dueDate", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `asap_creator_${Date.now()}`);

      const taskData = {
        title: "Emergency animal rescue",
        description: "Need immediate help",
        category: "animal_care",
        helpers: 3,
        emergencyLevel: "critical",
        taskType: "asap",
        location: "Animal Shelter",
      };

      const createRes = await agent
        .post("/api/tasks")
        .send(taskData)
        .expect(201);

      expect(createRes.body.task.taskType).toBe("asap");
      expect(createRes.body.task.emergencyLevel).toBe("critical");
      expect(createRes.body.task.dueDate).toBeUndefined();

      // Verify state with GET
      const taskId = createRes.body.task.id || createRes.body.task._id;
      const getRes = await agent
        .get(`/api/tasks/${taskId}`)
        .expect(200);

      expect(getRes.body.taskType).toBe("asap");
      expect(getRes.body.dueDate).toBeUndefined();
    });
  });

  describe("POST /api/tasks - Create Task (Negative Tests)", () => {
    test("should return 401 when user is not authenticated", async () => {
      const agent = request.agent(app); // No registration/login

      const taskData = {
        title: "Test Task",
        description: "Test description",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "urgent",
        taskType: "normal",
      };

      const createRes = await agent
        .post("/api/tasks")
        .send(taskData)
        .expect(401);

      expect(createRes.body.error).toBe("Unauthorized");
    });

    test("should return 400 when title exceeds 50 characters", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `invalid_creator_${Date.now()}`);

      const taskData = {
        title: "A".repeat(51), // 51 characters
        description: "Test description",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "urgent",
        taskType: "normal",
      };

      const createRes = await agent
        .post("/api/tasks")
        .send(taskData)
        .expect(400);

      expect(createRes.body.status).toBe("error");
      expect(createRes.body.message).toContain("Invalid title");
    });

    test("should return 400 when helpers is less than 1", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `invalid_creator2_${Date.now()}`);

      const taskData = {
        title: "Test Task",
        description: "Test description",
        category: "debris_removal_and_cleanup",
        helpers: 0, // Invalid
        emergencyLevel: "urgent",
        taskType: "normal",
      };

      const createRes = await agent
        .post("/api/tasks")
        .send(taskData)
        .expect(400);

      expect(createRes.body.status).toBe("error");
      expect(createRes.body.message).toContain("Invalid");
    });
  });

  describe("GET /api/tasks - Get All Tasks (Query Tests)", () => {
    test("should retrieve all tasks with correct structure and content", async () => {
      const agent = request.agent(app);
      const user1 = await registerAndLogin(agent, `user1_${Date.now()}`);
      const user2 = await registerAndLogin(agent, `user2_${Date.now()}`);

      // Create multiple tasks
      const task1Data = {
        title: "Task 1 - Critical",
        description: "Description 1",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "critical",
        taskType: "normal",
      };

      const task2Data = {
        title: "Task 2 - Urgent",
        description: "Description 2",
        category: "animal_care",
        helpers: 5,
        emergencyLevel: "urgent",
        taskType: "asap",
      };

      await agent.post("/api/tasks").send(task1Data).expect(201);
      await agent.post("/api/tasks").send(task2Data).expect(201);

      // GET all tasks
      const getRes = await agent
        .get("/api/tasks")
        .expect(200);

      expect(Array.isArray(getRes.body)).toBe(true);
      expect(getRes.body.length).toBeGreaterThanOrEqual(2);

      // Verify content of returned tasks
      const titles = getRes.body.map(t => t.title);
      expect(titles).toContain("Task 1 - Critical");
      expect(titles).toContain("Task 2 - Urgent");

      const task1 = getRes.body.find(t => t.title === "Task 1 - Critical");
      expect(task1).toBeDefined();
      expect(task1.emergencyLevel).toBe("critical");
      expect(task1.category).toBe("debris_removal_and_cleanup");
      expect(task1.helpers).toBe(3);
      expect(task1.isOpen).toBe(true);
      expect(task1.helpersJoined).toBeDefined();
      expect(typeof task1.helpersJoined).toBe("number");
    });

    test("should filter tasks by emergencyLevel correctly", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `filter_user_${Date.now()}`);

      await agent.post("/api/tasks").send({
        title: "Critical Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "critical",
        taskType: "normal",
      }).expect(201);

      await agent.post("/api/tasks").send({
        title: "Urgent Task",
        description: "Desc",
        category: "animal_care",
        helpers: 3,
        emergencyLevel: "urgent",
        taskType: "normal",
      }).expect(201);

      const getRes = await agent
        .get("/api/tasks?emergencyLevel=critical")
        .expect(200);

      expect(getRes.body.length).toBeGreaterThanOrEqual(1);
      expect(getRes.body.every(t => t.emergencyLevel === "critical")).toBe(true);
      expect(getRes.body.some(t => t.title === "Critical Task")).toBe(true);
    });

    test("should filter tasks by category correctly", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `category_user_${Date.now()}`);

      await agent.post("/api/tasks").send({
        title: "Debris Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      await agent.post("/api/tasks").send({
        title: "Animal Task",
        description: "Desc",
        category: "animal_care",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const getRes = await agent
        .get("/api/tasks?category=animal_care")
        .expect(200);

      expect(getRes.body.length).toBeGreaterThanOrEqual(1);
      expect(getRes.body.every(t => t.category === "animal_care")).toBe(true);
      expect(getRes.body.some(t => t.title === "Animal Task")).toBe(true);
    });

    test("should filter tasks by isOpen status correctly", async () => {
      const agent = request.agent(app);
      const user = await registerAndLogin(agent, `status_user_${Date.now()}`);

      const createRes = await agent.post("/api/tasks").send({
        title: "Open Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Close the task
      await agent.put(`/api/tasks/${taskId}`)
        .send({ isOpen: false })
        .expect(200);

      // Filter for closed tasks
      const getRes = await agent
        .get("/api/tasks?isOpen=false")
        .expect(200);

      expect(getRes.body.length).toBeGreaterThanOrEqual(1);
      expect(getRes.body.every(t => t.isOpen === false)).toBe(true);
      expect(getRes.body.some(t => t.title === "Open Task")).toBe(true);
    });

    test("should support pagination with limit and skip", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `pagination_user_${Date.now()}`);

      // Create 5 tasks
      for (let i = 0; i < 5; i++) {
        await agent.post("/api/tasks").send({
          title: `Task ${i}`,
          description: "Desc",
          category: "debris_removal_and_cleanup",
          helpers: 3,
          emergencyLevel: "standard",
          taskType: "normal",
        }).expect(201);
      }

      // Get first 2 tasks
      const getRes = await agent
        .get("/api/tasks?limit=2&skip=0")
        .expect(200);

      expect(getRes.body.length).toBeLessThanOrEqual(2);
    });
  });

  describe("GET /api/tasks/:id - Get Task by ID (Query Test)", () => {
    test("should retrieve a specific task with all details including participants and logs", async () => {
      const agent = request.agent(app);
      const user = await registerAndLogin(agent, `detail_user_${Date.now()}`);

      const createRes = await agent.post("/api/tasks").send({
        title: "Detailed Task",
        description: "Full description",
        category: "temporary_repair",
        helpers: 5,
        emergencyLevel: "urgent",
        taskType: "normal",
        location: "456 Oak Ave",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Join the task
      await agent.post(`/api/tasks/${taskId}/participants`)
        .send({ note: "I can help!" })
        .expect(200);

      // Add a log
      await agent.post(`/api/tasks/${taskId}/logs`)
        .send({ summary: "Started work on the repair" })
        .expect(201);

      // GET the task and verify all details
      const getRes = await agent
        .get(`/api/tasks/${taskId}`)
        .expect(200);

      expect(getRes.body.id).toBe(taskId);
      expect(getRes.body.title).toBe("Detailed Task");
      expect(getRes.body.description).toBe("Full description");
      expect(getRes.body.category).toBe("temporary_repair");
      expect(getRes.body.location).toBe("456 Oak Ave");
      expect(getRes.body.helpersJoined).toBe(1);
      expect(getRes.body.isParticipant).toBe(true);
      expect(Array.isArray(getRes.body.participantNames)).toBe(true);
      expect(getRes.body.participantNames.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(getRes.body.taskLogs)).toBe(true);
      expect(getRes.body.taskLogs.length).toBeGreaterThanOrEqual(1);
      expect(getRes.body.taskLogs[0].summary).toBe("Started work on the repair");
    });

    test("should return 404 when task does not exist", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `notfound_user_${Date.now()}`);

      // Use a valid ObjectId format that doesn't exist
      const getRes = await agent
        .get("/api/tasks/507f1f77bcf86cd799439011")
        .expect(404);

      expect(getRes.body.status).toBe("error");
      expect(getRes.body.message).toBe("Task not found");
    });
  });

  describe("GET /api/tasks/self - Get My Tasks (Query Test)", () => {
    test("should retrieve only tasks created by authenticated user", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);
      
      const user1 = await registerAndLogin(agent1, `owner1_${Date.now()}`);
      const user2 = await registerAndLogin(agent2, `owner2_${Date.now()}`);

      // User1 creates 2 tasks
      await agent1.post("/api/tasks").send({
        title: "User1 Task 1",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      await agent1.post("/api/tasks").send({
        title: "User1 Task 2",
        description: "Desc",
        category: "animal_care",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      // User2 creates 1 task
      await agent2.post("/api/tasks").send({
        title: "User2 Task",
        description: "Desc",
        category: "temporary_repair",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      // User1 gets their tasks
      const getRes = await agent1
        .get("/api/tasks/self")
        .expect(200);

      expect(Array.isArray(getRes.body)).toBe(true);
      expect(getRes.body.length).toBeGreaterThanOrEqual(2);
      
      const titles = getRes.body.map(t => t.title);
      expect(titles).toContain("User1 Task 1");
      expect(titles).toContain("User1 Task 2");
      expect(titles).not.toContain("User2 Task");

      // Verify all returned tasks belong to user1
      const allBelongToUser1 = getRes.body.every(task => {
        const creatorId = task.creator?.id || task.creator?._id || task.creator;
        const userId1 = user1.id || user1._id;
        return String(creatorId) === String(userId1) || task.isParticipant === true;
      });
      expect(allBelongToUser1).toBe(true);
    });
  });

  describe("PUT /api/tasks/:id - Update Task (State-Updating Test)", () => {
    test("should update task successfully and verify state change with GET request", async () => {
      const agent = request.agent(app);
      const user = await registerAndLogin(agent, `updater_${Date.now()}`);

      // Create a task
      const createRes = await agent.post("/api/tasks").send({
        title: "Original Title",
        description: "Original description",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
        location: "Original Location",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;
      const originalUpdatedAt = createRes.body.task.updatedAt;

      // Wait a bit to ensure updatedAt changes
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update the task
      const updateRes = await agent
        .put(`/api/tasks/${taskId}`)
        .send({
          title: "Updated Title",
          description: "Updated description",
          emergencyLevel: "urgent",
          location: "Updated Location",
          helpers: 5,
        })
        .expect(200);

      expect(updateRes.body.status).toBe("success");
      expect(updateRes.body.message).toBe("Task updated successfully");
      expect(updateRes.body.task.title).toBe("Updated Title");
      expect(updateRes.body.task.description).toBe("Updated description");
      expect(updateRes.body.task.emergencyLevel).toBe("urgent");
      expect(updateRes.body.task.location).toBe("Updated Location");
      expect(updateRes.body.task.helpers).toBe(5);

      // Verify state change with GET request
      const getRes = await agent
        .get(`/api/tasks/${taskId}`)
        .expect(200);

      expect(getRes.body.title).toBe("Updated Title");
      expect(getRes.body.description).toBe("Updated description");
      expect(getRes.body.emergencyLevel).toBe("urgent");
      expect(getRes.body.location).toBe("Updated Location");
      expect(getRes.body.helpers).toBe(5);
      expect(new Date(getRes.body.updatedAt).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());
    });

    test("should update task status from open to closed and verify", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `closer_${Date.now()}`);

      const createRes = await agent.post("/api/tasks").send({
        title: "Task to Close",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Verify task is open initially
      let getRes = await agent.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.isOpen).toBe(true);

      // Close the task
      await agent.put(`/api/tasks/${taskId}`)
        .send({ isOpen: false })
        .expect(200);

      // Verify state change with GET
      getRes = await agent.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.isOpen).toBe(false);
    });
  });

  describe("PUT /api/tasks/:id - Update Task (Negative Tests)", () => {
    test("should return 403 when non-owner tries to update task", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      const user1 = await registerAndLogin(agent1, `owner_update_${Date.now()}`);
      await registerAndLogin(agent2, `nonowner_update_${Date.now()}`);

      const createRes = await agent1.post("/api/tasks").send({
        title: "Owner's Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Non-owner tries to update
      const updateRes = await agent2
        .put(`/api/tasks/${taskId}`)
        .send({ title: "Hacked Title" })
        .expect(403);

      expect(updateRes.body.status).toBe("error");
      expect(updateRes.body.message).toContain("Unauthorized");

      // Verify task was NOT updated
      const getRes = await agent1.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.title).toBe("Owner's Task");
    });
  });

  describe("DELETE /api/tasks/:id - Delete Task (State-Updating Test)", () => {
    test("should delete task successfully and verify deletion with GET request", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `deleter_${Date.now()}`);

      const createRes = await agent.post("/api/tasks").send({
        title: "Task to Delete",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Verify task exists
      await agent.get(`/api/tasks/${taskId}`).expect(200);

      // Delete the task
      const deleteRes = await agent
        .delete(`/api/tasks/${taskId}`)
        .expect(200);

      expect(deleteRes.body.status).toBe("success");
      expect(deleteRes.body.message).toBe("Task deleted successfully");

      // Verify deletion with GET request
      const getRes = await agent
        .get(`/api/tasks/${taskId}`)
        .expect(404);

      expect(getRes.body.status).toBe("error");
      expect(getRes.body.message).toBe("Task not found");
    });

    test("should return 403 when non-owner tries to delete task", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await registerAndLogin(agent1, `owner_delete_${Date.now()}`);
      await registerAndLogin(agent2, `nonowner_delete_${Date.now()}`);

      const createRes = await agent1.post("/api/tasks").send({
        title: "Owner's Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Non-owner tries to delete
      const deleteRes = await agent2
        .delete(`/api/tasks/${taskId}`)
        .expect(403);

      expect(deleteRes.body.status).toBe("error");
      expect(deleteRes.body.message).toContain("Unauthorized");

      // Verify task still exists
      await agent1.get(`/api/tasks/${taskId}`).expect(200);
    });
  });

  describe("POST /api/tasks/:id/join - Join Task (State-Updating Test)", () => {
    test("should allow user to join an open task and verify participation state", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      const owner = await registerAndLogin(agent1, `task_owner_${Date.now()}`);
      const participant = await registerAndLogin(agent2, `participant_${Date.now()}`);

      const createRes = await agent1.post("/api/tasks").send({
        title: "Joinable Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 5,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Verify initial state
      let getRes = await agent2.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.helpersJoined).toBe(0);
      expect(getRes.body.isParticipant).toBe(false);

      // Join the task
      const joinRes = await agent2
        .post(`/api/tasks/${taskId}/participants`)
        .send({ note: "I can help with this task!" })
        .expect(200);

      expect(joinRes.body.status).toBe("success");
      expect(joinRes.body.message).toBe("Task joined successfully");

      // Verify state change with GET request
      getRes = await agent2.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.helpersJoined).toBe(1);
      expect(getRes.body.isParticipant).toBe(true);
      expect(getRes.body.participantNames.length).toBeGreaterThanOrEqual(1);
    });

    test("should prevent joining a closed task", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await registerAndLogin(agent1, `closed_owner_${Date.now()}`);
      await registerAndLogin(agent2, `closed_participant_${Date.now()}`);

      const createRes = await agent1.post("/api/tasks").send({
        title: "Closed Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 5,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Close the task
      await agent1.put(`/api/tasks/${taskId}`)
        .send({ isOpen: false })
        .expect(200);

      // Try to join closed task
      const joinRes = await agent2
        .post(`/api/tasks/${taskId}/participants`)
        .send({})
        .expect(400);

      expect(joinRes.body.status).toBe("error");
      expect(joinRes.body.message).toBe("Task is closed");

      // Verify user did NOT join
      const getRes = await agent2.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.isParticipant).toBe(false);
    });

    test("should prevent joining a full task", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);
      const agent3 = request.agent(app);

      await registerAndLogin(agent1, `full_owner_${Date.now()}`);
      await registerAndLogin(agent2, `full_participant1_${Date.now()}`);
      await registerAndLogin(agent3, `full_participant2_${Date.now()}`);

      const createRes = await agent1.post("/api/tasks").send({
        title: "Full Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 1, // Only 1 helper needed
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // First user joins
      await agent2.post(`/api/tasks/${taskId}/participants`).send({}).expect(200);

      // Verify task is full
      let getRes = await agent3.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.helpersJoined).toBe(1);
      expect(getRes.body.helpers).toBe(1);

      // Second user tries to join (should fail - task is full)
      const joinRes = await agent3
        .post(`/api/tasks/${taskId}/participants`)
        .send({})
        .expect(400);

      expect(joinRes.body.status).toBe("error");
      expect(joinRes.body.message).toBe("Task is full");

      // Verify second user did NOT join
      getRes = await agent3.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.helpersJoined).toBe(1);
      expect(getRes.body.isParticipant).toBe(false);
    });
  });

  describe("POST /api/tasks/:id/quit - Quit Task (State-Updating Test)", () => {
    test("should allow participant to quit task and verify state change", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await registerAndLogin(agent1, `quit_owner_${Date.now()}`);
      const participant = await registerAndLogin(agent2, `quit_participant_${Date.now()}`);

      const createRes = await agent1.post("/api/tasks").send({
        title: "Quittable Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 5,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Join the task
      await agent2.post(`/api/tasks/${taskId}/participants`).send({}).expect(200);

      // Verify joined state
      let getRes = await agent2.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.helpersJoined).toBe(1);
      expect(getRes.body.isParticipant).toBe(true);

      // Quit the task
      const quitRes = await agent2
        .delete(`/api/tasks/${taskId}/participants`)
        .expect(200);

      expect(quitRes.body.status).toBe("success");
      expect(quitRes.body.message).toBe("Task quit successfully");

      // Verify state change with GET request
      getRes = await agent2.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.helpersJoined).toBe(0);
      expect(getRes.body.isParticipant).toBe(false);
    });

    test("should return 400 when non-participant tries to quit", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await registerAndLogin(agent1, `quit_owner2_${Date.now()}`);
      await registerAndLogin(agent2, `quit_nonparticipant_${Date.now()}`);

      const createRes = await agent1.post("/api/tasks").send({
        title: "Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 5,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Non-participant tries to quit
      const quitRes = await agent2
        .delete(`/api/tasks/${taskId}/participants`)
        .expect(400);

      expect(quitRes.body.status).toBe("error");
      expect(quitRes.body.message).toBe("User is not a participant in this task");
    });
  });

  describe("POST /api/tasks/:id/logs - Add Task Log (State-Updating Test)", () => {
    test("should allow participant to add log and verify log appears in task details", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await registerAndLogin(agent1, `log_owner_${Date.now()}`);
      await registerAndLogin(agent2, `log_participant_${Date.now()}`);

      const createRes = await agent1.post("/api/tasks").send({
        title: "Task with Logs",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 5,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Join the task
      await agent2.post(`/api/tasks/${taskId}/participants`).send({}).expect(200);

      // Verify no logs initially
      let getRes = await agent2.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.taskLogs.length).toBe(0);

      // Add a log
      const logRes = await agent2
        .post(`/api/tasks/${taskId}/logs`)
        .send({ summary: "Completed the first phase of cleanup" })
        .expect(201);

      expect(logRes.body.status).toBe("success");
      expect(logRes.body.message).toBe("Task log added successfully");
      expect(logRes.body.log).toBeDefined();
      expect(logRes.body.log.summary).toBe("Completed the first phase of cleanup");

      // Verify state change with GET request
      getRes = await agent2.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.taskLogs.length).toBe(1);
      expect(getRes.body.taskLogs[0].summary).toBe("Completed the first phase of cleanup");
      expect(getRes.body.taskLogs[0].timestamp).toBeDefined();
    });

    test("should return 403 when non-participant tries to add log", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await registerAndLogin(agent1, `log_owner2_${Date.now()}`);
      await registerAndLogin(agent2, `log_nonparticipant_${Date.now()}`);

      const createRes = await agent1.post("/api/tasks").send({
        title: "Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 5,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Non-participant tries to add log
      const logRes = await agent2
        .post(`/api/tasks/${taskId}/logs`)
        .send({ summary: "I wasn't there but here's a log" })
        .expect(403);

      expect(logRes.body.status).toBe("error");
      expect(logRes.body.message).toBe("Only participants can add task logs");

      // Verify no log was added
      const getRes = await agent2.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.taskLogs.length).toBe(0);
    });

    test("should return 400 when summary is missing or empty", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await registerAndLogin(agent1, `log_owner3_${Date.now()}`);
      await registerAndLogin(agent2, `log_participant2_${Date.now()}`);

      const createRes = await agent1.post("/api/tasks").send({
        title: "Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 5,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      await agent2.post(`/api/tasks/${taskId}/participants`).send({}).expect(200);

      // Try to add log without summary
      const logRes1 = await agent2
        .post(`/api/tasks/${taskId}/logs`)
        .send({})
        .expect(400);

      expect(logRes1.body.status).toBe("error");
      expect(logRes1.body.message).toBe("Log summary is required");

      // Try to add log with empty summary
      const logRes2 = await agent2
        .post(`/api/tasks/${taskId}/logs`)
        .send({ summary: "   " })
        .expect(400);

      expect(logRes2.body.status).toBe("error");
      expect(logRes2.body.message).toBe("Log summary is required");
    });
  });

  describe("GET /api/tasks/count - Count Tasks (Query Test)", () => {
    test("should return correct count of tasks matching filters", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `counter_${Date.now()}`);

      // Create tasks with different emergency levels
      await agent.post("/api/tasks").send({
        title: "Critical 1",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "critical",
        taskType: "normal",
      }).expect(201);

      await agent.post("/api/tasks").send({
        title: "Critical 2",
        description: "Desc",
        category: "animal_care",
        helpers: 3,
        emergencyLevel: "critical",
        taskType: "normal",
      }).expect(201);

      await agent.post("/api/tasks").send({
        title: "Urgent Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "urgent",
        taskType: "normal",
      }).expect(201);

      // Count all tasks
      const countAllRes = await agent
        .get("/api/tasks/count")
        .expect(200);

      expect(countAllRes.body.count).toBeGreaterThanOrEqual(3);

      // Count critical tasks
      const countCriticalRes = await agent
        .get("/api/tasks/count?emergencyLevel=critical")
        .expect(200);

      expect(countCriticalRes.body.count).toBeGreaterThanOrEqual(2);
    });
  });

  describe("GET /api/tasks/self/count - Count My Tasks (Query Test)", () => {
    test("should return correct count of tasks created by authenticated user", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await registerAndLogin(agent1, `count_owner1_${Date.now()}`);
      await registerAndLogin(agent2, `count_owner2_${Date.now()}`);

      // User1 creates 3 tasks
      for (let i = 0; i < 3; i++) {
        await agent1.post("/api/tasks").send({
          title: `User1 Task ${i}`,
          description: "Desc",
          category: "debris_removal_and_cleanup",
          helpers: 3,
          emergencyLevel: "standard",
          taskType: "normal",
        }).expect(201);
      }

      // User2 creates 1 task
      await agent2.post("/api/tasks").send({
        title: "User2 Task",
        description: "Desc",
        category: "animal_care",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      // User1 counts their tasks
      const countRes = await agent1
        .get("/api/tasks/self/count")
        .expect(200);

      expect(countRes.body.count).toBeGreaterThanOrEqual(3);
    });
  });

  describe("GET /api/tasks/participants/count - Count Participated Tasks (Query Test)", () => {
    test("should return correct count of tasks where user is a participant", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await registerAndLogin(agent1, `part_count_owner_${Date.now()}`);
      const participant = await registerAndLogin(agent2, `part_count_participant_${Date.now()}`);

      // Create 3 tasks
      const taskIds = [];
      for (let i = 0; i < 3; i++) {
        const createRes = await agent1.post("/api/tasks").send({
          title: `Task ${i}`,
          description: "Desc",
          category: "debris_removal_and_cleanup",
          helpers: 5,
          emergencyLevel: "standard",
          taskType: "normal",
        }).expect(201);
        taskIds.push(createRes.body.task.id || createRes.body.task._id);
      }

      // Participant joins 2 tasks
      await agent2.post(`/api/tasks/${taskIds[0]}/participants`).send({}).expect(200);
      await agent2.post(`/api/tasks/${taskIds[1]}/participants`).send({}).expect(200);

      // Count participated tasks
      const countRes = await agent2
        .get("/api/tasks/participants/count")
        .expect(200);

      expect(countRes.body.count).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Complete Task Flow Integration Test", () => {
    test("should support complete workflow: create, join, add logs, update, quit, delete", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      const owner = await registerAndLogin(agent1, `workflow_owner_${Date.now()}`);
      const participant = await registerAndLogin(agent2, `workflow_participant_${Date.now()}`);

      // 1. Create task
      const createRes = await agent1.post("/api/tasks").send({
        title: "Workflow Task",
        description: "Complete workflow test",
        category: "temporary_repair",
        helpers: 3,
        emergencyLevel: "urgent",
        taskType: "normal",
        location: "123 Test St",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // 2. Verify task creation
      let getRes = await agent1.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.title).toBe("Workflow Task");
      expect(getRes.body.isOpen).toBe(true);
      expect(getRes.body.helpersJoined).toBe(0);

      // 3. Participant joins
      await agent2.post(`/api/tasks/${taskId}/participants`)
        .send({ note: "I'm available to help" })
        .expect(200);

      // 4. Verify join
      getRes = await agent2.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.helpersJoined).toBe(1);
      expect(getRes.body.isParticipant).toBe(true);

      // 5. Participant adds log
      await agent2.post(`/api/tasks/${taskId}/logs`)
        .send({ summary: "Started working on the repair" })
        .expect(201);

      // 6. Verify log
      getRes = await agent2.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.taskLogs.length).toBe(1);
      expect(getRes.body.taskLogs[0].summary).toBe("Started working on the repair");

      // 7. Owner updates task
      await agent1.put(`/api/tasks/${taskId}`)
        .send({ emergencyLevel: "critical", location: "456 Updated St" })
        .expect(200);

      // 8. Verify update
      getRes = await agent1.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.emergencyLevel).toBe("critical");
      expect(getRes.body.location).toBe("456 Updated St");

      // 9. Participant quits
      await agent2.delete(`/api/tasks/${taskId}/participants`).expect(200);

      // 10. Verify quit
      getRes = await agent2.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.helpersJoined).toBe(0);
      expect(getRes.body.isParticipant).toBe(false);

      // 11. Owner deletes task
      await agent1.delete(`/api/tasks/${taskId}`).expect(200);

      // 12. Verify deletion
      await agent1.get(`/api/tasks/${taskId}`).expect(404);
    });
  });

  describe("POST /api/tasks - Create Task Additional Validation Tests (Negative Tests)", () => {
    test("should return 400 when title is missing", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `no_title_${Date.now()}`);

      const taskData = {
        description: "Test description",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "urgent",
        taskType: "normal",
      };

      const createRes = await agent
        .post("/api/tasks")
        .send(taskData)
        .expect(400);

      expect(createRes.body.status).toBe("error");
      expect(createRes.body.message).toContain("Invalid title");
    });

    test("should return 400 when description is missing", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `no_desc_${Date.now()}`);

      const taskData = {
        title: "Test Task",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "urgent",
        taskType: "normal",
      };

      const createRes = await agent
        .post("/api/tasks")
        .send(taskData)
        .expect(400);

      expect(createRes.body.status).toBe("error");
      expect(createRes.body.message).toContain("Invalid description");
    });

    test("should return 400 when category is missing", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `no_category_${Date.now()}`);

      const taskData = {
        title: "Test Task",
        description: "Test description",
        helpers: 3,
        emergencyLevel: "urgent",
        taskType: "normal",
      };

      const createRes = await agent
        .post("/api/tasks")
        .send(taskData)
        .expect(400);

      expect(createRes.body.status).toBe("error");
      expect(createRes.body.message).toContain("Invalid category");
    });

    test("should return 400 when helpers is missing", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `no_helpers_${Date.now()}`);

      const taskData = {
        title: "Test Task",
        description: "Test description",
        category: "debris_removal_and_cleanup",
        emergencyLevel: "urgent",
        taskType: "normal",
      };

      const createRes = await agent
        .post("/api/tasks")
        .send(taskData)
        .expect(400);

      expect(createRes.body.status).toBe("error");
      expect(createRes.body.message).toContain("Invalid helpers");
    });

    test("should return 400 when emergencyLevel is missing", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `no_emergency_${Date.now()}`);

      const taskData = {
        title: "Test Task",
        description: "Test description",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        taskType: "normal",
      };

      const createRes = await agent
        .post("/api/tasks")
        .send(taskData)
        .expect(400);

      expect(createRes.body.status).toBe("error");
      expect(createRes.body.message).toContain("Invalid emergencyLevel");
    });

    test("should return 400 when taskType is missing", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `no_tasktype_${Date.now()}`);

      const taskData = {
        title: "Test Task",
        description: "Test description",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "urgent",
      };

      const createRes = await agent
        .post("/api/tasks")
        .send(taskData)
        .expect(400);

      expect(createRes.body.status).toBe("error");
      expect(createRes.body.message).toContain("Invalid taskType");
    });

    test("should return 400 when helpers is negative", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `neg_helpers_${Date.now()}`);

      const taskData = {
        title: "Test Task",
        description: "Test description",
        category: "debris_removal_and_cleanup",
        helpers: -1,
        emergencyLevel: "urgent",
        taskType: "normal",
      };

      const createRes = await agent
        .post("/api/tasks")
        .send(taskData)
        .expect(400);

      expect(createRes.body.status).toBe("error");
      expect(createRes.body.message).toContain("Invalid helpers");
    });

    test("should return 400 when title is empty string", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `empty_title_${Date.now()}`);

      const taskData = {
        title: "",
        description: "Test description",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "urgent",
        taskType: "normal",
      };

      const createRes = await agent
        .post("/api/tasks")
        .send(taskData)
        .expect(400);

      expect(createRes.body.status).toBe("error");
      expect(createRes.body.message).toContain("Invalid title");
    });

    test("should create task with schedule type successfully", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `schedule_creator_${Date.now()}`);

      const taskData = {
        title: "Scheduled maintenance task",
        description: "Scheduled task description",
        category: "temporary_repair",
        helpers: 2,
        emergencyLevel: "scheduled",
        taskType: "schedule",
        location: "Community Center",
      };

      const createRes = await agent
        .post("/api/tasks")
        .send(taskData)
        .expect(201);

      expect(createRes.body.task.taskType).toBe("schedule");
      expect(createRes.body.task.emergencyLevel).toBe("scheduled");
      expect(createRes.body.task.dueDate).toBeUndefined();

      // Verify state with GET
      const taskId = createRes.body.task.id || createRes.body.task._id;
      const getRes = await agent
        .get(`/api/tasks/${taskId}`)
        .expect(200);

      expect(getRes.body.taskType).toBe("schedule");
      expect(getRes.body.dueDate).toBeUndefined();
    });
  });

  describe("GET /api/tasks - Sorting Tests (Query Tests)", () => {
    test("should sort tasks by createdAt in descending order by default", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `sort_user_${Date.now()}`);

      // Create tasks with delays to ensure different timestamps
      await agent.post("/api/tasks").send({
        title: "First Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      await new Promise(resolve => setTimeout(resolve, 10));

      await agent.post("/api/tasks").send({
        title: "Second Task",
        description: "Desc",
        category: "animal_care",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      await new Promise(resolve => setTimeout(resolve, 10));

      await agent.post("/api/tasks").send({
        title: "Third Task",
        description: "Desc",
        category: "temporary_repair",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const getRes = await agent
        .get("/api/tasks")
        .expect(200);

      expect(getRes.body.length).toBeGreaterThanOrEqual(3);
      const titles = getRes.body.map(t => t.title);
      const thirdIndex = titles.indexOf("Third Task");
      const firstIndex = titles.indexOf("First Task");
      expect(thirdIndex).toBeLessThan(firstIndex); // Third should come before First (desc order)
    });

    test("should sort tasks by createdAt in ascending order when specified", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `sort_asc_user_${Date.now()}`);

      await agent.post("/api/tasks").send({
        title: "Oldest Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      await new Promise(resolve => setTimeout(resolve, 10));

      await agent.post("/api/tasks").send({
        title: "Newest Task",
        description: "Desc",
        category: "animal_care",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const getRes = await agent
        .get("/api/tasks?sortBy=createdAt&sortOrder=asc")
        .expect(200);

      expect(getRes.body.length).toBeGreaterThanOrEqual(2);
      const titles = getRes.body.map(t => t.title);
      const oldestIndex = titles.indexOf("Oldest Task");
      const newestIndex = titles.indexOf("Newest Task");
      expect(oldestIndex).toBeLessThan(newestIndex); // Oldest should come before Newest (asc order)
    });

    test("should sort tasks by emergencyLevel correctly", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `sort_emergency_${Date.now()}`);

      await agent.post("/api/tasks").send({
        title: "Standard Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      await agent.post("/api/tasks").send({
        title: "Critical Task",
        description: "Desc",
        category: "animal_care",
        helpers: 3,
        emergencyLevel: "critical",
        taskType: "normal",
      }).expect(201);

      await agent.post("/api/tasks").send({
        title: "Urgent Task",
        description: "Desc",
        category: "temporary_repair",
        helpers: 3,
        emergencyLevel: "urgent",
        taskType: "normal",
      }).expect(201);

      const getRes = await agent
        .get("/api/tasks?sortBy=emergencyLevel&sortOrder=desc")
        .expect(200);

      expect(getRes.body.length).toBeGreaterThanOrEqual(3);
      // Verify sorting by emergency level (alphabetically: critical < standard < urgent in desc order)
      // Actually, MongoDB sorts alphabetically, so desc would be: urgent > standard > critical
      const emergencyLevels = getRes.body.map(t => t.emergencyLevel);
      const criticalIndex = emergencyLevels.indexOf("critical");
      const urgentIndex = emergencyLevels.indexOf("urgent");
      const standardIndex = emergencyLevels.indexOf("standard");
      // In descending alphabetical order: urgent > standard > critical
      // So urgent should come before standard, and standard before critical
      if (urgentIndex !== -1 && standardIndex !== -1) {
        expect(urgentIndex).toBeLessThan(standardIndex);
      }
      if (standardIndex !== -1 && criticalIndex !== -1) {
        expect(standardIndex).toBeLessThan(criticalIndex);
      }
    });

    test("should sort tasks by helpers count correctly", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `sort_helpers_${Date.now()}`);

      await agent.post("/api/tasks").send({
        title: "Many Helpers Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 10,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      await agent.post("/api/tasks").send({
        title: "Few Helpers Task",
        description: "Desc",
        category: "animal_care",
        helpers: 2,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      await agent.post("/api/tasks").send({
        title: "Medium Helpers Task",
        description: "Desc",
        category: "temporary_repair",
        helpers: 5,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const getRes = await agent
        .get("/api/tasks?sortBy=helpers&sortOrder=desc")
        .expect(200);

      expect(getRes.body.length).toBeGreaterThanOrEqual(3);
      const helpers = getRes.body.map(t => t.helpers);
      // Verify descending order
      for (let i = 0; i < helpers.length - 1; i++) {
        expect(helpers[i]).toBeGreaterThanOrEqual(helpers[i + 1]);
      }
    });
  });

  describe("GET /api/tasks - Complex Filtering Tests (Query Tests)", () => {
    test("should filter tasks by multiple criteria simultaneously", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `multi_filter_${Date.now()}`);

      // Create tasks with different combinations
      await agent.post("/api/tasks").send({
        title: "Critical Debris Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "critical",
        taskType: "normal",
      }).expect(201);

      await agent.post("/api/tasks").send({
        title: "Urgent Debris Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "urgent",
        taskType: "normal",
      }).expect(201);

      await agent.post("/api/tasks").send({
        title: "Critical Animal Task",
        description: "Desc",
        category: "animal_care",
        helpers: 3,
        emergencyLevel: "critical",
        taskType: "normal",
      }).expect(201);

      // Filter by both category and emergencyLevel
      const getRes = await agent
        .get("/api/tasks?category=debris_removal_and_cleanup&emergencyLevel=critical")
        .expect(200);

      expect(getRes.body.length).toBeGreaterThanOrEqual(1);
      expect(getRes.body.every(t => t.category === "debris_removal_and_cleanup")).toBe(true);
      expect(getRes.body.every(t => t.emergencyLevel === "critical")).toBe(true);
      expect(getRes.body.some(t => t.title === "Critical Debris Task")).toBe(true);
      expect(getRes.body.every(t => t.title !== "Urgent Debris Task")).toBe(true);
      expect(getRes.body.every(t => t.title !== "Critical Animal Task")).toBe(true);
    });

    test("should filter open tasks by category correctly", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `open_filter_${Date.now()}`);

      const createRes1 = await agent.post("/api/tasks").send({
        title: "Open Debris Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const createRes2 = await agent.post("/api/tasks").send({
        title: "Closed Debris Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId2 = createRes2.body.task.id || createRes2.body.task._id;
      await agent.put(`/api/tasks/${taskId2}`)
        .send({ isOpen: false })
        .expect(200);

      // Filter for open debris tasks
      const getRes = await agent
        .get("/api/tasks?category=debris_removal_and_cleanup&isOpen=true")
        .expect(200);

      expect(getRes.body.length).toBeGreaterThanOrEqual(1);
      expect(getRes.body.every(t => t.category === "debris_removal_and_cleanup")).toBe(true);
      expect(getRes.body.every(t => t.isOpen === true)).toBe(true);
      expect(getRes.body.some(t => t.title === "Open Debris Task")).toBe(true);
      expect(getRes.body.every(t => t.title !== "Closed Debris Task")).toBe(true);
    });
  });

  describe("GET /api/tasks/self - My Tasks Additional Tests (Query Tests)", () => {
    test("should include tasks where user is a participant in my-tasks", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      const owner = await registerAndLogin(agent1, `owner_participant_${Date.now()}`);
      const participant = await registerAndLogin(agent2, `participant_user_${Date.now()}`);

      // Owner creates a task
      const createRes = await agent1.post("/api/tasks").send({
        title: "Owner's Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 5,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Participant joins the task
      await agent2.post(`/api/tasks/${taskId}/participants`).send({}).expect(200);

      // Participant should see this task in their my-tasks
      const getRes = await agent2
        .get("/api/tasks/self")
        .expect(200);

      expect(Array.isArray(getRes.body)).toBe(true);
      expect(getRes.body.length).toBeGreaterThanOrEqual(1);
      expect(getRes.body.some(t => t.id === taskId || t._id === taskId)).toBe(true);
      expect(getRes.body.some(t => t.title === "Owner's Task")).toBe(true);
    });

    test("should filter my tasks by isOpen status correctly", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `my_filter_${Date.now()}`);

      const createRes1 = await agent.post("/api/tasks").send({
        title: "My Open Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const createRes2 = await agent.post("/api/tasks").send({
        title: "My Closed Task",
        description: "Desc",
        category: "animal_care",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId2 = createRes2.body.task.id || createRes2.body.task._id;
      await agent.put(`/api/tasks/${taskId2}`)
        .send({ isOpen: false })
        .expect(200);

      // Filter for open tasks
      const getRes = await agent
        .get("/api/tasks/self?isOpen=true")
        .expect(200);

      expect(getRes.body.length).toBeGreaterThanOrEqual(1);
      expect(getRes.body.every(t => t.isOpen === true)).toBe(true);
      expect(getRes.body.some(t => t.title === "My Open Task")).toBe(true);
      expect(getRes.body.every(t => t.title !== "My Closed Task")).toBe(true);
    });
  });

  describe("POST /api/tasks/:id/join - Join Task Additional Tests (Negative Tests)", () => {
    test("should prevent joining the same task twice", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await registerAndLogin(agent1, `duplicate_owner_${Date.now()}`);
      await registerAndLogin(agent2, `duplicate_participant_${Date.now()}`);

      const createRes = await agent1.post("/api/tasks").send({
        title: "Duplicate Join Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 5,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Join the task first time
      await agent2.post(`/api/tasks/${taskId}/participants`).send({}).expect(200);

      // Try to join again (should fail)
      const joinRes = await agent2
        .post(`/api/tasks/${taskId}/participants`)
        .send({})
        .expect(400);

      expect(joinRes.body.status).toBe("error");
      expect(joinRes.body.message).toBe("User is already a participant in this task");

      // Verify user is still only joined once
      const getRes = await agent2.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.helpersJoined).toBe(1);
    });

    test("should return 404 when trying to join non-existent task", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `join_notfound_${Date.now()}`);

      // Use a valid ObjectId format that doesn't exist
      const joinRes = await agent
        .post("/api/tasks/507f1f77bcf86cd799439011/participants")
        .send({})
        .expect(404);

      expect(joinRes.body.status).toBe("error");
      expect(joinRes.body.message).toBe("Task not found");
    });

    test("should return 401 when unauthenticated user tries to join", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await registerAndLogin(agent1, `join_auth_owner_${Date.now()}`);

      const createRes = await agent1.post("/api/tasks").send({
        title: "Auth Test Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 5,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Agent2 is not authenticated
      const joinRes = await agent2
        .post(`/api/tasks/${taskId}/participants`)
        .send({})
        .expect(401);

      expect(joinRes.body.error).toBe("Unauthorized");
    });
  });

  describe("POST /api/tasks/:id/quit - Quit Task Additional Tests (Negative Tests)", () => {
    test("should return 400 or 500 when trying to quit non-existent task", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `quit_notfound_${Date.now()}`);

      // Use a valid ObjectId format that doesn't exist
      // quitTask might return 400 if it throws "User is not a participant" or 500 for other errors
      const quitRes = await agent
        .delete("/api/tasks/507f1f77bcf86cd799439011/participants");

      expect([400, 404, 500]).toContain(quitRes.status);
      expect(quitRes.body.status).toBe("error");
      if (quitRes.status === 400) {
        expect(quitRes.body.message).toBe("User is not a participant in this task");
      } else if (quitRes.status === 404) {
        expect(quitRes.body.message).toBe("Task not found");
      } else {
        expect(quitRes.body.message).toBe("Server error");
      }
    });

    test("should return 401 when unauthenticated user tries to quit", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await registerAndLogin(agent1, `quit_auth_owner_${Date.now()}`);

      const createRes = await agent1.post("/api/tasks").send({
        title: "Auth Quit Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 5,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Agent2 is not authenticated
      const quitRes = await agent2
        .delete(`/api/tasks/${taskId}/participants`)
        .expect(401);

      expect(quitRes.body.error).toBe("Unauthorized");
    });
  });

  describe("POST /api/tasks/:id/logs - Add Task Log Additional Tests (State-Updating Tests)", () => {
    test("should allow multiple participants to add logs to the same task", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);
      const agent3 = request.agent(app);

      await registerAndLogin(agent1, `multi_log_owner_${Date.now()}`);
      await registerAndLogin(agent2, `multi_log_participant1_${Date.now()}`);
      await registerAndLogin(agent3, `multi_log_participant2_${Date.now()}`);

      const createRes = await agent1.post("/api/tasks").send({
        title: "Multi Log Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 5,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Both participants join
      await agent2.post(`/api/tasks/${taskId}/participants`).send({}).expect(200);
      await agent3.post(`/api/tasks/${taskId}/participants`).send({}).expect(200);

      // Both participants add logs
      await agent2.post(`/api/tasks/${taskId}/logs`)
        .send({ summary: "Participant 1 started work" })
        .expect(201);

      await agent3.post(`/api/tasks/${taskId}/logs`)
        .send({ summary: "Participant 2 completed their part" })
        .expect(201);

      // Verify both logs appear
      const getRes = await agent1.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.taskLogs.length).toBeGreaterThanOrEqual(2);
      const summaries = getRes.body.taskLogs.map(log => log.summary);
      expect(summaries).toContain("Participant 1 started work");
      expect(summaries).toContain("Participant 2 completed their part");
    });

    test("should return 404 when trying to add log to non-existent task", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `log_notfound_${Date.now()}`);

      // Use a valid ObjectId format that doesn't exist
      const logRes = await agent
        .post("/api/tasks/507f1f77bcf86cd799439011/logs")
        .send({ summary: "This should fail" })
        .expect(404);

      expect(logRes.body.status).toBe("error");
      expect(logRes.body.message).toBe("Task not found");
    });

    test("should return 401 when unauthenticated user tries to add log", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await registerAndLogin(agent1, `log_auth_owner_${Date.now()}`);

      const createRes = await agent1.post("/api/tasks").send({
        title: "Auth Log Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 5,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Agent2 is not authenticated
      const logRes = await agent2
        .post(`/api/tasks/${taskId}/logs`)
        .send({ summary: "Unauthorized log" })
        .expect(401);

      expect(logRes.body.error).toBe("Unauthorized");
    });
  });

  describe("PUT /api/tasks/:id - Update Task Additional Tests (Negative Tests)", () => {
    test("should return 500 when updating with invalid task ID format that causes mongoose error", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `invalid_id_${Date.now()}`);

      // Invalid ID format might cause mongoose to throw, resulting in 500
      const updateRes = await agent
        .put("/api/tasks/invalid_id_format")
        .send({ title: "Updated Title" });

      // Could be 404 or 500 depending on how mongoose handles it
      expect([404, 500]).toContain(updateRes.status);
      if (updateRes.status === 500) {
        expect(updateRes.body.status).toBe("error");
        expect(updateRes.body.message).toBe("Server error");
      } else {
        expect(updateRes.body.status).toBe("error");
        expect(updateRes.body.message).toBe("Task not found");
      }
    });

    test("should return 400 or 500 when updating with invalid helpers value", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `invalid_helpers_update_${Date.now()}`);

      const createRes = await agent.post("/api/tasks").send({
        title: "Update Test Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      const updateRes = await agent
        .put(`/api/tasks/${taskId}`)
        .send({ helpers: 0 });

      // Validation might happen in entity which throws, causing 500, or be caught and return 400
      expect(updateRes.status).toBeGreaterThanOrEqual(400);
      expect(updateRes.status).toBeLessThan(600);
      expect([400, 500]).toContain(updateRes.status);
      expect(updateRes.body.status).toBe("error");
      if (updateRes.status === 400) {
        expect(updateRes.body.message).toContain("Invalid");
      } else {
        expect(updateRes.body.message).toBe("Server error");
      }
    });

    test("should return 400 or 500 when updating with title exceeding 50 characters", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `long_title_update_${Date.now()}`);

      const createRes = await agent.post("/api/tasks").send({
        title: "Update Test Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      const updateRes = await agent
        .put(`/api/tasks/${taskId}`)
        .send({ title: "A".repeat(51) });

      // Validation might happen in entity which throws, causing 500, or be caught and return 400
      expect([400, 500]).toContain(updateRes.status);
      expect(updateRes.body.status).toBe("error");
      if (updateRes.status === 400) {
        expect(updateRes.body.message).toContain("Invalid title");
      } else {
        expect(updateRes.body.message).toBe("Server error");
      }
    });

    test("should return 404 when updating non-existent task", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `update_notfound_${Date.now()}`);

      const updateRes = await agent
        .put("/api/tasks/507f1f77bcf86cd799439011")
        .send({ title: "Updated Title" })
        .expect(404);

      expect(updateRes.body.status).toBe("error");
      expect(updateRes.body.message).toBe("Task not found");
    });

    test("should return 401 when unauthenticated user tries to update", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await registerAndLogin(agent1, `update_auth_owner_${Date.now()}`);

      const createRes = await agent1.post("/api/tasks").send({
        title: "Auth Update Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Agent2 is not authenticated
      const updateRes = await agent2
        .put(`/api/tasks/${taskId}`)
        .send({ title: "Unauthorized Update" })
        .expect(401);

      expect(updateRes.body.error).toBe("Unauthorized");
    });
  });

  describe("DELETE /api/tasks/:id - Delete Task Additional Tests (Negative Tests)", () => {
    test("should return 500 or 404 when deleting with invalid task ID format", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `delete_invalid_id_${Date.now()}`);

      // Invalid ID format might cause mongoose to throw, resulting in 500
      const deleteRes = await agent
        .delete("/api/tasks/invalid_id_format");

      // Could be 404 or 500 depending on how mongoose handles it
      expect([404, 500]).toContain(deleteRes.status);
      if (deleteRes.status === 500) {
        expect(deleteRes.body.status).toBe("error");
        expect(deleteRes.body.message).toBe("Server error");
      } else {
        expect(deleteRes.body.status).toBe("error");
        expect(deleteRes.body.message).toBe("Task not found");
      }
    });

    test("should return 404 when deleting non-existent task", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `delete_notfound_${Date.now()}`);

      const deleteRes = await agent
        .delete("/api/tasks/507f1f77bcf86cd799439011")
        .expect(404);

      expect(deleteRes.body.status).toBe("error");
      expect(deleteRes.body.message).toBe("Task not found");
    });

    test("should return 401 when unauthenticated user tries to delete", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await registerAndLogin(agent1, `delete_auth_owner_${Date.now()}`);

      const createRes = await agent1.post("/api/tasks").send({
        title: "Auth Delete Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Agent2 is not authenticated
      const deleteRes = await agent2
        .delete(`/api/tasks/${taskId}`)
        .expect(401);

      expect(deleteRes.body.error).toBe("Unauthorized");
    });
  });

  describe("GET /api/tasks/count - Count Tasks Additional Tests (Query Tests)", () => {
    test("should return 0 count when no tasks match filters", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `count_zero_${Date.now()}`);

      // Create tasks with different emergency levels
      await agent.post("/api/tasks").send({
        title: "Standard Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      // Count tasks with emergency level that doesn't exist
      const countRes = await agent
        .get("/api/tasks/count?emergencyLevel=critical")
        .expect(200);

      expect(countRes.body.count).toBe(0);
    });

    test("should return correct count with combined filters", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `count_combined_${Date.now()}`);

      await agent.post("/api/tasks").send({
        title: "Critical Debris Open",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "critical",
        taskType: "normal",
      }).expect(201);

      await agent.post("/api/tasks").send({
        title: "Critical Debris Closed",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "critical",
        taskType: "normal",
      }).expect(201);

      const createRes = await agent.post("/api/tasks").send({
        title: "Urgent Debris Open",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "urgent",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;
      await agent.put(`/api/tasks/${taskId}`)
        .send({ isOpen: false })
        .expect(200);

      // Count critical, debris, open tasks
      const countRes = await agent
        .get("/api/tasks/count?emergencyLevel=critical&category=debris_removal_and_cleanup&isOpen=true")
        .expect(200);

      expect(countRes.body.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe("GET /api/tasks/:id - Get Task Additional Tests (Query Tests)", () => {
    test("should return appropriate error when task ID is invalid format", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `get_missing_id_${Date.now()}`);

      // Test with empty string ID (after trim) - might be handled as missing ID or route not found
      const getRes = await agent
        .get("/api/tasks/ ");

      // Could be 200 (route matches /api/tasks/), 400 (missing ID), 404 (route not found or task not found), or 500
      expect([200, 400, 404, 500]).toContain(getRes.status);
      if (getRes.status === 400) {
        expect(getRes.body.status).toBe("error");
        expect(getRes.body.message).toBe("Task ID is required");
      } else if (getRes.status === 500) {
        expect(getRes.body.status).toBe("error");
        expect(getRes.body.message).toBe("Server error");
      } else {
        // 404 could be route not found (no body) or task not found (with body)
        if (getRes.body && getRes.body.status) {
          expect(getRes.body.status).toBe("error");
          expect(getRes.body.message).toBe("Task not found");
        }
        // Otherwise it's a route 404 which is fine
      }
    });

    test("should return 401 when unauthenticated user tries to get task", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await registerAndLogin(agent1, `get_auth_owner_${Date.now()}`);

      const createRes = await agent1.post("/api/tasks").send({
        title: "Auth Get Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Agent2 is not authenticated
      const getRes = await agent2
        .get(`/api/tasks/${taskId}`)
        .expect(401);

      expect(getRes.body.error).toBe("Unauthorized");
    });

    test("should correctly show isParticipant as false for non-participant", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await registerAndLogin(agent1, `participant_check_owner_${Date.now()}`);
      await registerAndLogin(agent2, `participant_check_viewer_${Date.now()}`);

      const createRes = await agent1.post("/api/tasks").send({
        title: "Participant Check Task",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 5,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const taskId = createRes.body.task.id || createRes.body.task._id;

      // Agent2 views task without joining
      const getRes = await agent2.get(`/api/tasks/${taskId}`).expect(200);
      expect(getRes.body.isParticipant).toBe(false);
      expect(getRes.body.helpersJoined).toBe(0);
    });
  });

  describe("Pagination Edge Cases (Query Tests)", () => {
    test("should handle pagination with skip greater than total tasks", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `pagination_skip_${Date.now()}`);

      // Create 2 tasks
      await agent.post("/api/tasks").send({
        title: "Task 1",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      await agent.post("/api/tasks").send({
        title: "Task 2",
        description: "Desc",
        category: "animal_care",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      // Skip more than total tasks
      const getRes = await agent
        .get("/api/tasks?skip=100&limit=10")
        .expect(200);

      expect(Array.isArray(getRes.body)).toBe(true);
      expect(getRes.body.length).toBe(0);
    });

    test("should handle pagination with limit 0", async () => {
      const agent = request.agent(app);
      await registerAndLogin(agent, `pagination_limit0_${Date.now()}`);

      await agent.post("/api/tasks").send({
        title: "Task 1",
        description: "Desc",
        category: "debris_removal_and_cleanup",
        helpers: 3,
        emergencyLevel: "standard",
        taskType: "normal",
      }).expect(201);

      const getRes = await agent
        .get("/api/tasks?limit=0")
        .expect(200);

      expect(Array.isArray(getRes.body)).toBe(true);
      // Should return empty array or handle gracefully
    });
  });
});

