import { jest } from "@jest/globals";
import TaskDao from "../daos/TaskDao.js";
import { USER_STATUS } from "../constants/userStatus.js";

describe("TaskDao", () => {
  let dao;
  let mockTaskModel;
  let mockTaskParticipantModel;
  let mockTaskLogModel;

  beforeEach(() => {
    mockTaskModel = {
      create: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
    };

    mockTaskParticipantModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      countDocuments: jest.fn(),
      findByIdAndDelete: jest.fn(),
      deleteMany: jest.fn(),
    };

    mockTaskLogModel = {
      find: jest.fn(),
      create: jest.fn(),
    };

    dao = new TaskDao({
      TaskModel: mockTaskModel,
      TaskParticipantModel: mockTaskParticipantModel,
      TaskLogModel: mockTaskLogModel,
    });
  });

  describe("create", () => {
    test("should create a new task", async () => {
      const taskData = {
        title: "Test Task",
        description: "Test description",
        category: "First Aid",
        helpers: 2,
        emergencyLevel: "medium",
        taskType: "normal",
        dueDate: new Date("2024-12-31"),
        location: "Test Location",
        resourcesNeeded: new Map(),
        skillsRequired: ["CPR"],
        creator: "user1",
      };

      const mockTask = {
        _id: "task1",
        ...taskData,
        toObject: jest.fn().mockReturnValue({
          _id: "task1",
          ...taskData,
        }),
      };

      mockTaskModel.create.mockResolvedValue(mockTask);

      const result = await dao.create(taskData);

      expect(mockTaskModel.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result._id).toBe("task1");
    });
  });

  describe("getTask", () => {
    test("should return task with active creator and participants", async () => {
      const taskId = "task1";
      const userId = "user2";

      const mockTask = {
        _id: taskId,
        creator: { _id: "user1", username: "user1", status: USER_STATUS.ACTIVE },
        title: "Test Task",
      };

      const mockParticipants = [
        {
          _id: "participant1",
          user: { _id: "user2", username: "user2", status: USER_STATUS.ACTIVE },
          task: taskId,
        },
      ];

      const mockLogs = [
        {
          _id: "log1",
          user: { _id: "user1", username: "user1", status: USER_STATUS.ACTIVE },
          task: taskId,
          summary: "Task started",
        },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTask),
      };

      mockTaskModel.findById.mockReturnValue(mockQuery);

      const mockParticipantQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockParticipants),
      };

      mockTaskParticipantModel.find.mockReturnValueOnce(mockParticipantQuery);
      mockTaskParticipantModel.find.mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockParticipants),
      });

      const mockLogQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockLogs),
      };

      mockTaskLogModel.find.mockReturnValue(mockLogQuery);

      const result = await dao.getTask(taskId, userId);

      expect(mockTaskModel.findById).toHaveBeenCalledWith(taskId);
      expect(result).toBeDefined();
    });

    test("should return null when task not found", async () => {
      const taskId = "task1";

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };

      mockTaskModel.findById.mockReturnValue(mockQuery);

      const result = await dao.getTask(taskId);

      expect(result).toBeNull();
    });

    test("should return null when creator is inactive", async () => {
      const taskId = "task1";

      const mockTask = {
        _id: taskId,
        creator: null, // Inactive creator
        title: "Test Task",
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTask),
      };

      mockTaskModel.findById.mockReturnValue(mockQuery);

      const result = await dao.getTask(taskId);

      expect(result).toBeNull();
    });
  });

  describe("updateTask", () => {
    test("should update task when user is creator", async () => {
      const taskId = "task1";
      const creatorId = "user1";
      const updateData = {
        title: "Updated Task",
        description: "Updated description",
      };

      const existingTask = {
        _id: taskId,
        creator: creatorId,
        title: "Original Task",
      };

      const updatedTask = {
        _id: taskId,
        creator: { _id: creatorId, username: "user1", status: USER_STATUS.ACTIVE },
        ...updateData,
      };

      const mockFindByIdQuery = {
        lean: jest.fn().mockResolvedValue(existingTask),
      };
      mockTaskModel.findById.mockReturnValue(mockFindByIdQuery);

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(updatedTask),
      };

      mockTaskModel.findByIdAndUpdate.mockReturnValue(mockQuery);

      const result = await dao.updateTask(taskId, creatorId, updateData);

      expect(mockTaskModel.findById).toHaveBeenCalledWith(taskId);
      expect(mockTaskModel.findByIdAndUpdate).toHaveBeenCalledWith(
        taskId,
        { $set: expect.objectContaining(updateData) },
        { new: true, runValidators: true }
      );
      expect(result).toBeDefined();
    });

    test("should return null when task not found", async () => {
      const taskId = "task1";
      const creatorId = "user1";
      const updateData = { title: "Updated Task" };

      const mockFindByIdQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };
      mockTaskModel.findById.mockReturnValue(mockFindByIdQuery);

      const result = await dao.updateTask(taskId, creatorId, updateData);

      expect(result).toBeNull();
    });

    test("should throw error when user is not creator", async () => {
      const taskId = "task1";
      const creatorId = "user1";
      const wrongCreatorId = "user2";
      const updateData = { title: "Updated Task" };

      const existingTask = {
        _id: taskId,
        creator: creatorId,
        title: "Original Task",
      };

      const mockFindByIdQuery = {
        lean: jest.fn().mockResolvedValue(existingTask),
      };
      mockTaskModel.findById.mockReturnValue(mockFindByIdQuery);

      await expect(
        dao.updateTask(taskId, wrongCreatorId, updateData)
      ).rejects.toThrow("Unauthorized");
    });
  });

  describe("deleteTask", () => {
    test("should delete task when user is creator", async () => {
      const taskId = "task1";
      const creatorId = "user1";

      const existingTask = {
        _id: taskId,
        creator: creatorId,
        title: "Test Task",
      };

      const mockFindByIdQuery = {
        lean: jest.fn().mockResolvedValue(existingTask),
      };
      mockTaskModel.findById.mockReturnValue(mockFindByIdQuery);
      mockTaskModel.findByIdAndDelete.mockResolvedValue(existingTask);

      const result = await dao.deleteTask(taskId, creatorId);

      expect(mockTaskModel.findById).toHaveBeenCalledWith(taskId);
      expect(mockTaskModel.findByIdAndDelete).toHaveBeenCalledWith(taskId);
      expect(result).toBe(true);
    });

    test("should return false when task not found", async () => {
      const taskId = "task1";
      const creatorId = "user1";

      const mockFindByIdQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };
      mockTaskModel.findById.mockReturnValue(mockFindByIdQuery);

      const result = await dao.deleteTask(taskId, creatorId);

      expect(result).toBe(false);
    });

    test("should throw error when user is not creator", async () => {
      const taskId = "task1";
      const creatorId = "user1";
      const wrongCreatorId = "user2";

      const existingTask = {
        _id: taskId,
        creator: creatorId,
        title: "Test Task",
      };

      const mockFindByIdQuery = {
        lean: jest.fn().mockResolvedValue(existingTask),
      };
      mockTaskModel.findById.mockReturnValue(mockFindByIdQuery);

      await expect(dao.deleteTask(taskId, wrongCreatorId)).rejects.toThrow(
        "Unauthorized"
      );
    });
  });

  describe("joinTask", () => {
    test("should join an open task", async () => {
      const taskId = "task1";
      const userId = "user2";
      const note = "I can help";

      const mockTask = {
        _id: taskId,
        isOpen: true,
        helpers: 3,
      };

      const mockParticipant = {
        _id: "participant1",
        task: taskId,
        user: userId,
        note: note,
        joinedAt: new Date(),
        toObject: jest.fn().mockReturnValue({
          _id: "participant1",
          task: taskId,
          user: userId,
          note: note,
        }),
      };

      const mockFindByIdQuery = {
        lean: jest.fn().mockResolvedValue(mockTask),
      };
      mockTaskModel.findById.mockReturnValue(mockFindByIdQuery);
      
      const mockFindOneQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };
      mockTaskParticipantModel.findOne.mockReturnValue(mockFindOneQuery);
      
      mockTaskParticipantModel.countDocuments.mockResolvedValue(1);
      mockTaskParticipantModel.create.mockResolvedValue(mockParticipant);

      const result = await dao.joinTask(taskId, userId, note);

      expect(mockTaskModel.findById).toHaveBeenCalledWith(taskId);
      expect(mockTaskParticipantModel.findOne).toHaveBeenCalledWith({
        task: taskId,
        user: userId,
      });
      expect(mockTaskParticipantModel.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test("should throw error when task not found", async () => {
      const taskId = "task1";
      const userId = "user2";

      const mockFindByIdQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };
      mockTaskModel.findById.mockReturnValue(mockFindByIdQuery);

      await expect(dao.joinTask(taskId, userId)).rejects.toThrow("Task not found");
    });

    test("should throw error when task is closed", async () => {
      const taskId = "task1";
      const userId = "user2";

      const mockTask = {
        _id: taskId,
        isOpen: false,
      };

      const mockFindByIdQuery = {
        lean: jest.fn().mockResolvedValue(mockTask),
      };
      mockTaskModel.findById.mockReturnValue(mockFindByIdQuery);

      await expect(dao.joinTask(taskId, userId)).rejects.toThrow("Task is closed");
    });

    test("should throw error when user is already a participant", async () => {
      const taskId = "task1";
      const userId = "user2";

      const mockTask = {
        _id: taskId,
        isOpen: true,
      };

      const existingParticipant = {
        _id: "participant1",
        task: taskId,
        user: userId,
      };

      const mockFindByIdQuery = {
        lean: jest.fn().mockResolvedValue(mockTask),
      };
      mockTaskModel.findById.mockReturnValue(mockFindByIdQuery);
      
      const mockFindOneQuery = {
        lean: jest.fn().mockResolvedValue(existingParticipant),
      };
      mockTaskParticipantModel.findOne.mockReturnValue(mockFindOneQuery);

      await expect(dao.joinTask(taskId, userId)).rejects.toThrow(
        "already a participant"
      );
    });

    test("should throw error when task is full", async () => {
      const taskId = "task1";
      const userId = "user2";

      const mockTask = {
        _id: taskId,
        isOpen: true,
        helpers: 2,
      };

      const mockFindByIdQuery = {
        lean: jest.fn().mockResolvedValue(mockTask),
      };
      mockTaskModel.findById.mockReturnValue(mockFindByIdQuery);
      
      const mockFindOneQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };
      mockTaskParticipantModel.findOne.mockReturnValue(mockFindOneQuery);
      
      mockTaskParticipantModel.countDocuments.mockResolvedValue(2); // Already full

      await expect(dao.joinTask(taskId, userId)).rejects.toThrow("Task is full");
    });
  });

  describe("quitTask", () => {
    test("should quit a task", async () => {
      const taskId = "task1";
      const userId = "user2";

      const participant = {
        _id: "participant1",
        task: taskId,
        user: userId,
      };

      mockTaskParticipantModel.findOne.mockResolvedValue(participant);
      mockTaskParticipantModel.findByIdAndDelete.mockResolvedValue(participant);

      const result = await dao.quitTask(taskId, userId);

      expect(mockTaskParticipantModel.findOne).toHaveBeenCalledWith({
        task: taskId,
        user: userId,
      });
      expect(mockTaskParticipantModel.findByIdAndDelete).toHaveBeenCalledWith(
        participant._id
      );
      expect(result).toBe(true);
    });

    test("should throw error when user is not a participant", async () => {
      const taskId = "task1";
      const userId = "user2";

      mockTaskParticipantModel.findOne.mockResolvedValue(null);

      await expect(dao.quitTask(taskId, userId)).rejects.toThrow(
        "not a participant"
      );
    });
  });

  describe("addTaskLog", () => {
    test("should add a task log", async () => {
      const taskId = "task1";
      const userId = "user2";
      const summary = "Task progress update";

      const mockTask = {
        _id: taskId,
        title: "Test Task",
      };

      const participant = {
        _id: "participant1",
        task: taskId,
        user: userId,
      };

      const mockLog = {
        _id: "log1",
        task: taskId,
        user: userId,
        summary: summary,
        timestamp: new Date(),
        toObject: jest.fn().mockReturnValue({
          _id: "log1",
          task: taskId,
          user: userId,
          summary: summary,
        }),
      };

      const mockFindByIdQuery = {
        lean: jest.fn().mockResolvedValue(mockTask),
      };
      mockTaskModel.findById.mockReturnValue(mockFindByIdQuery);
      
      const mockFindOneQuery = {
        lean: jest.fn().mockResolvedValue(participant),
      };
      mockTaskParticipantModel.findOne.mockReturnValue(mockFindOneQuery);
      
      mockTaskLogModel.create.mockResolvedValue(mockLog);

      const result = await dao.addTaskLog(taskId, userId, summary);

      expect(mockTaskModel.findById).toHaveBeenCalledWith(taskId);
      expect(mockTaskParticipantModel.findOne).toHaveBeenCalledWith({
        task: taskId,
        user: userId,
      });
      expect(mockTaskLogModel.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test("should throw error when task not found", async () => {
      const taskId = "task1";
      const userId = "user2";
      const summary = "Task progress update";

      const mockFindByIdQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };
      mockTaskModel.findById.mockReturnValue(mockFindByIdQuery);

      await expect(dao.addTaskLog(taskId, userId, summary)).rejects.toThrow(
        "Task not found"
      );
    });

    test("should throw error when user is not a participant", async () => {
      const taskId = "task1";
      const userId = "user2";
      const summary = "Task progress update";

      const mockTask = {
        _id: taskId,
        title: "Test Task",
      };

      const mockFindByIdQuery = {
        lean: jest.fn().mockResolvedValue(mockTask),
      };
      mockTaskModel.findById.mockReturnValue(mockFindByIdQuery);
      
      const mockFindOneQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };
      mockTaskParticipantModel.findOne.mockReturnValue(mockFindOneQuery);

      await expect(dao.addTaskLog(taskId, userId, summary)).rejects.toThrow(
        "Only participants"
      );
    });
  });

  describe("isUserParticipant", () => {
    test("should return true when user is a participant", async () => {
      const taskId = "task1";
      const userId = "user2";

      const participant = {
        _id: "participant1",
        task: taskId,
        user: userId,
      };

      const mockFindOneQuery = {
        lean: jest.fn().mockResolvedValue(participant),
      };
      mockTaskParticipantModel.findOne.mockReturnValue(mockFindOneQuery);

      const result = await dao.isUserParticipant(taskId, userId);

      expect(result).toBe(true);
    });

    test("should return false when user is not a participant", async () => {
      const taskId = "task1";
      const userId = "user2";

      const mockFindOneQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };
      mockTaskParticipantModel.findOne.mockReturnValue(mockFindOneQuery);

      const result = await dao.isUserParticipant(taskId, userId);

      expect(result).toBe(false);
    });

    test("should return false when userId is not provided", async () => {
      const taskId = "task1";

      const result = await dao.isUserParticipant(taskId, null);

      expect(result).toBe(false);
    });
  });

  describe("removeUserFromAllTasks", () => {
    test("should remove user from all tasks", async () => {
      const userId = "user1";

      const participants = [
        { _id: "participant1", task: "task1", user: userId },
        { _id: "participant2", task: "task2", user: userId },
      ];

      const mockFindQuery = {
        lean: jest.fn().mockResolvedValue(participants),
      };
      mockTaskParticipantModel.find.mockReturnValue(mockFindQuery);
      mockTaskParticipantModel.deleteMany.mockResolvedValue({ deletedCount: 2 });

      const result = await dao.removeUserFromAllTasks(userId);

      expect(mockTaskParticipantModel.find).toHaveBeenCalledWith({ user: userId });
      expect(mockTaskParticipantModel.deleteMany).toHaveBeenCalledWith({
        user: userId,
      });
      expect(result).toBe(2);
    });

    test("should return 0 when user is not in any tasks", async () => {
      const userId = "user1";

      const mockFindQuery = {
        lean: jest.fn().mockResolvedValue([]),
      };
      mockTaskParticipantModel.find.mockReturnValue(mockFindQuery);

      const result = await dao.removeUserFromAllTasks(userId);

      expect(result).toBe(0);
    });

    test("should return 0 when userId is not provided", async () => {
      const result = await dao.removeUserFromAllTasks(null);

      expect(result).toBe(0);
    });
  });
});

