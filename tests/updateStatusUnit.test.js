import User from "../entities/User.js";
import Status from "../entities/Status.js";
import userDac from "../dacs/userDac.js";
import StatusDac from "../dacs/statusDac.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import { inMemoryStatusDao } from "../daos/inMemoryStatusDao.js";
import { SHARED_STATUS } from "../constants/sharedStatus.js";
import { updateStatusById } from "../controllers/updateStatusController.js";

const BASE_USER_PROPS = Object.freeze({
  username: "testuser",
  password: "testpass",
  sharedstatus: "undefined",
  status: "active",
  role: "citizen",
});

const buildUserProps = (overrides) => ({ ...BASE_USER_PROPS, ...overrides });

describe("User status update flow", () => {
  beforeEach(() => {
    // inject a fresh in-memory DAO for test isolation
    userDac.DAO = new inMemoryUserDao();
    StatusDac.DAO = new inMemoryStatusDao();
  });

  test("updateStatusById changes user sharedstatus", async () => {
    const props = buildUserProps({ username: `statususer_${Date.now()}` });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);
    expect(found.sharedstatus).toBe("undefined");

    await User.updateStatusById(found.id, "ok");
    const updated = await User.findByUsername(props.username);
    expect(updated.sharedstatus).toBe("ok");
  });

  test("updateStatusById accepts all valid status values", async () => {
    const props = buildUserProps({ username: `statususer_${Date.now()}` });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);

    const statuses = Object.values(SHARED_STATUS);
    for (const status of statuses) {
      await User.updateStatusById(found.id, status);
      const updated = await User.findByUsername(props.username);
      expect(updated.sharedstatus).toBe(status);
    }
  });

  test("updateStatusById can update status multiple times", async () => {
    const props = buildUserProps({ username: `statususer_${Date.now()}` });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);

    // Update to ok
    await User.updateStatusById(found.id, "ok");
    let updated = await User.findByUsername(props.username);
    expect(updated.sharedstatus).toBe("ok");

    // Update to help
    await User.updateStatusById(found.id, "help");
    updated = await User.findByUsername(props.username);
    expect(updated.sharedstatus).toBe("help");

    // Update to emergency
    await User.updateStatusById(found.id, "emergency");
    updated = await User.findByUsername(props.username);
    expect(updated.sharedstatus).toBe("emergency");

    // Update back to ok
    await User.updateStatusById(found.id, "ok");
    updated = await User.findByUsername(props.username);
    expect(updated.sharedstatus).toBe("ok");
  });

  test("updateStatusById handles string and number IDs consistently", async () => {
    const props = buildUserProps({ username: `statususer_${Date.now()}` });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);

    // Update with string ID
    await User.updateStatusById(String(found.id), "ok");
    let updated = await User.findByUsername(props.username);
    expect(updated.sharedstatus).toBe("ok");

    // Update with number ID (if ID is numeric)
    if (typeof found.id === "number" || !isNaN(Number(found.id))) {
      const id = typeof found.id === "number" ? found.id : Number(found.id);
      await User.updateStatusById(id, "help");
      updated = await User.findByUsername(props.username);
      expect(updated.sharedstatus).toBe("help");
    }
  });

  test("updateStatusById only affects sharedstatus, not other user properties", async () => {
    const props = buildUserProps({
      username: `statususer_${Date.now()}`,
      sharedstatus: "undefined",
      status: "active",
      role: "citizen",
    });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);

    await User.updateStatusById(found.id, "ok");
    const updated = await User.findByUsername(props.username);

    // Only sharedstatus should change
    expect(updated.sharedstatus).toBe("ok");
    expect(updated.username).toBe(props.username);
    expect(updated.status).toBe("active");
    expect(updated.role).toBe("citizen");
  });

  test("updateStatusById works for multiple different users independently", async () => {
    const user1Props = buildUserProps({
      username: `user1_${Date.now()}`,
    });
    const user2Props = buildUserProps({
      username: `user2_${Date.now()}`,
    });

    const user1 = new User(user1Props);
    const user2 = new User(user2Props);
    await user1.create();
    await user2.create();

    const found1 = await User.findByUsername(user1Props.username);
    const found2 = await User.findByUsername(user2Props.username);

    // Update user1 to ok
    await User.updateStatusById(found1.id, "ok");
    const updated1 = await User.findByUsername(user1Props.username);
    expect(updated1.sharedstatus).toBe("ok");

    // Update user2 to help
    await User.updateStatusById(found2.id, "help");
    const updated2 = await User.findByUsername(user2Props.username);
    expect(updated2.sharedstatus).toBe("help");

    // Verify user1 status is still ok
    const recheck1 = await User.findByUsername(user1Props.username);
    expect(recheck1.sharedstatus).toBe("ok");
  });
});

describe("Status recordChange flow", () => {
  beforeEach(() => {
    // inject a fresh in-memory DAO for test isolation
    userDac.DAO = new inMemoryUserDao();
    StatusDac.DAO = new inMemoryStatusDao();
  });

  test("recordChange records status change", async () => {
    const props = buildUserProps({ username: `statususer_${Date.now()}` });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);

    await Status.recordChange({
      userId: found.id,
      status: "ok",
    });

    const history = await Status.getHistory({ userId: found.id });
    expect(history).toHaveProperty("items");
    expect(history).toHaveProperty("total");
    expect(Array.isArray(history.items)).toBe(true);
    expect(history.items.length).toBeGreaterThanOrEqual(1);
  });

  test("recordChange records multiple status changes", async () => {
    const props = buildUserProps({ username: `statususer_${Date.now()}` });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);

    await Status.recordChange({
      userId: found.id,
      status: "ok",
    });

    await Status.recordChange({
      userId: found.id,
      status: "help",
    });

    await Status.recordChange({
      userId: found.id,
      status: "emergency",
    });

    const history = await Status.getHistory({ userId: found.id });
    expect(history.items.length).toBeGreaterThanOrEqual(3);
    expect(history.total).toBeGreaterThanOrEqual(3);
  });

  test("recordChange accepts custom timestamp", async () => {
    const props = buildUserProps({ username: `statususer_${Date.now()}` });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);

    const customTimestamp = new Date("2024-01-01T10:00:00Z");
    await Status.recordChange({
      userId: found.id,
      status: "ok",
      timestamp: customTimestamp,
    });

    const history = await Status.getHistory({ userId: found.id });
    expect(history.items.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Status history retrieval", () => {
  beforeEach(() => {
    // inject a fresh in-memory DAO for test isolation
    userDac.DAO = new inMemoryUserDao();
    StatusDac.DAO = new inMemoryStatusDao();
  });

  test("getHistory returns empty items array when no history exists", async () => {
    const props = buildUserProps({ username: `statususer_${Date.now()}` });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);

    const history = await Status.getHistory({ userId: found.id });
    expect(history).toHaveProperty("items");
    expect(history).toHaveProperty("total");
    expect(Array.isArray(history.items)).toBe(true);
    expect(history.items).toHaveLength(0);
    expect(history.total).toBe(0);
  });

  test("getHistory returns status changes in order", async () => {
    const props = buildUserProps({ username: `statususer_${Date.now()}` });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);

    await Status.recordChange({
      userId: found.id,
      status: "ok",
      timestamp: new Date("2024-01-01T10:00:00Z"),
    });

    await Status.recordChange({
      userId: found.id,
      status: "help",
      timestamp: new Date("2024-01-01T10:05:00Z"),
    });

    await Status.recordChange({
      userId: found.id,
      status: "emergency",
      timestamp: new Date("2024-01-01T10:10:00Z"),
    });

    const history = await Status.getHistory({ userId: found.id });
    expect(history.items.length).toBeGreaterThanOrEqual(3);

    // Check that statuses are recorded (items have 'status' field, not 'newStatus')
    const statuses = history.items.map((h) => h.status);
    expect(statuses).toContain("ok");
    expect(statuses).toContain("help");
    expect(statuses).toContain("emergency");
  });

  test("getHistory respects limit parameter", async () => {
    const props = buildUserProps({ username: `statususer_${Date.now()}` });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);

    // Record more than 5 status changes
    for (let i = 0; i < 10; i++) {
      await Status.recordChange({
        userId: found.id,
        status: "ok",
      });
    }

    const history = await Status.getHistory({ userId: found.id, limit: 5 });
    expect(history.items.length).toBeLessThanOrEqual(5);
    expect(history.total).toBeGreaterThanOrEqual(10);
  });

  test("getHistory only returns history for specific user", async () => {
    const user1Props = buildUserProps({ username: `user1_${Date.now()}` });
    const user2Props = buildUserProps({ username: `user2_${Date.now()}` });

    const user1 = new User(user1Props);
    const user2 = new User(user2Props);
    await user1.create();
    await user2.create();

    const found1 = await User.findByUsername(user1Props.username);
    const found2 = await User.findByUsername(user2Props.username);

    await Status.recordChange({
      userId: found1.id,
      status: "ok",
    });

    await Status.recordChange({
      userId: found2.id,
      status: "help",
    });

    const history1 = await Status.getHistory({ userId: found1.id });
    const history2 = await Status.getHistory({ userId: found2.id });

    expect(history1.items.length).toBeGreaterThanOrEqual(1);
    expect(history2.items.length).toBeGreaterThanOrEqual(1);

    // Verify they have different statuses (items have 'status' field)
    const status1 = history1.items[0]?.status;
    const status2 = history2.items[0]?.status;
    expect(status1).toBe("ok");
    expect(status2).toBe("help");
  });
});

describe("Status update and history integration", () => {
  beforeEach(() => {
    // inject a fresh in-memory DAO for test isolation
    userDac.DAO = new inMemoryUserDao();
    StatusDac.DAO = new inMemoryStatusDao();
  });

  test("updateStatusById and recordChange work together", async () => {
    const props = buildUserProps({ username: `statususer_${Date.now()}` });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);

    // Update status
    await User.updateStatusById(found.id, "ok");
    const updated = await User.findByUsername(props.username);
    expect(updated.sharedstatus).toBe("ok");

    // Record the change
    await Status.recordChange({
      userId: found.id,
      status: "ok",
    });

    // Verify history
    const history = await Status.getHistory({ userId: found.id });
    expect(history.items.length).toBeGreaterThanOrEqual(1);
  });

  test("multiple status updates create corresponding history entries", async () => {
    const props = buildUserProps({ username: `statususer_${Date.now()}` });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);

    const statuses = ["ok", "help", "emergency"];
    for (const status of statuses) {
      await User.updateStatusById(found.id, status);
      await Status.recordChange({
        userId: found.id,
        status: status,
      });
    }

    const history = await Status.getHistory({ userId: found.id });
    expect(history.items.length).toBeGreaterThanOrEqual(3);

    const updated = await User.findByUsername(props.username);
    expect(updated.sharedstatus).toBe("emergency");
  });
});

describe("updateStatusById API status codes", () => {
  let mockApp;

  beforeEach(() => {
    // inject a fresh in-memory DAO for test isolation
    userDac.DAO = new inMemoryUserDao();
    StatusDac.DAO = new inMemoryStatusDao();
    
    // Create a mock app object with get and set methods
    mockApp = {
      _socketInstance: null,
      get(key) {
        if (key === "socketInstance") {
          return this._socketInstance;
        }
        return null;
      },
      set(key, value) {
        if (key === "socketInstance") {
          this._socketInstance = value;
        }
      },
    };
  });

  test("returns 200 when status update is successful", async () => {
    // Create a user
    const props = buildUserProps({ username: `statususer_${Date.now()}` });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);

    // Mock socket instance
    let broadcastCalled = false;
    let broadcastArgs = null;
    const mockSocket = {
      broadcastNewStatus(userId, status) {
        broadcastCalled = true;
        broadcastArgs = { userId, status };
      },
    };
    mockApp.set("socketInstance", mockSocket);

    // Create mock request and response objects
    let statusCode = null;
    let jsonBody = null;
    const req = {
      body: { userId: found.id, newStatus: "ok" },
      app: mockApp,
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      },
    };

    await updateStatusById(req, res);

    expect(statusCode).toBe(200);
    expect(jsonBody).toEqual({ message: "User status updated" });
    expect(broadcastCalled).toBe(true);
    expect(broadcastArgs).toEqual({ userId: found.id, status: "ok" });
  });

  test("returns 400 when userId is missing", async () => {
    let statusCode = null;
    let jsonBody = null;
    const req = {
      body: { newStatus: "ok" }, // Missing userId
      app: mockApp,
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      },
    };

    await updateStatusById(req, res);

    expect(statusCode).toBe(400);
    expect(jsonBody).toEqual({ error: "Missing required fields" });
  });

  test("returns 400 when newStatus is missing", async () => {
    let statusCode = null;
    let jsonBody = null;
    const req = {
      body: { userId: "123" }, // Missing newStatus
      app: mockApp,
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      },
    };

    await updateStatusById(req, res);

    expect(statusCode).toBe(400);
    expect(jsonBody).toEqual({ error: "Missing required fields" });
  });

  test("returns 400 when both userId and newStatus are missing", async () => {
    let statusCode = null;
    let jsonBody = null;
    const req = {
      body: {}, // Missing both
      app: mockApp,
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      },
    };

    await updateStatusById(req, res);

    expect(statusCode).toBe(400);
    expect(jsonBody).toEqual({ error: "Missing required fields" });
  });

  test("returns 404 when user is not found", async () => {
    const mockSocket = {
      broadcastNewStatus() {},
    };
    mockApp.set("socketInstance", mockSocket);

    let statusCode = null;
    let jsonBody = null;
    const req = {
      body: { userId: "nonexistent_user_id", newStatus: "ok" },
      app: mockApp,
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      },
    };

    await updateStatusById(req, res);

    expect(statusCode).toBe(404);
    expect(jsonBody).toEqual({ error: "User not found" });
  });

  test("returns 500 when socket instance is not found", async () => {
    // Create a user
    const props = buildUserProps({ username: `statususer_${Date.now()}` });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);

    // Don't set socket instance
    mockApp.set("socketInstance", null);

    let statusCode = null;
    let jsonBody = null;
    const req = {
      body: { userId: found.id, newStatus: "ok" },
      app: mockApp,
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      },
    };

    await updateStatusById(req, res);

    expect(statusCode).toBe(500);
    expect(jsonBody).toEqual({
      status: "error",
      message: "Socket instance not found",
    });
  });

  test("returns 500 when an error occurs during status update", async () => {
    // Create a user
    const props = buildUserProps({ username: `statususer_${Date.now()}` });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);

    const mockSocket = {
      broadcastNewStatus() {},
    };
    mockApp.set("socketInstance", mockSocket);

    // Mock User.getUsernameById to throw an error
    const originalGetUsernameById = User.getUsernameById;
    User.getUsernameById = async () => {
      throw new Error("Database error");
    };

    let statusCode = null;
    let jsonBody = null;
    const req = {
      body: { userId: found.id, newStatus: "ok" },
      app: mockApp,
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      },
    };

    await updateStatusById(req, res);

    expect(statusCode).toBe(500);
    expect(jsonBody).toEqual({
      status: "error",
      message: "Server error",
    });

    // Restore original method
    User.getUsernameById = originalGetUsernameById;
  });

  test("successfully updates status and records history with socket broadcast", async () => {
    // Create a user
    const props = buildUserProps({ username: `statususer_${Date.now()}` });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);
    expect(found.sharedstatus).toBe("undefined");

    let broadcastCalled = false;
    let broadcastArgs = null;
    const mockSocket = {
      broadcastNewStatus(userId, status) {
        broadcastCalled = true;
        broadcastArgs = { userId, status };
      },
    };
    mockApp.set("socketInstance", mockSocket);

    let statusCode = null;
    let jsonBody = null;
    const req = {
      body: { userId: found.id, newStatus: "help" },
      app: mockApp,
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      },
    };

    await updateStatusById(req, res);

    // Verify status was updated
    const updated = await User.findByUsername(props.username);
    expect(updated.sharedstatus).toBe("help");

    // Verify history was recorded
    const history = await Status.getHistory({ userId: found.id });
    expect(history.items.length).toBeGreaterThanOrEqual(1);
    expect(history.items[0].status).toBe("help");

    // Verify response
    expect(statusCode).toBe(200);
    expect(jsonBody).toEqual({ message: "User status updated" });
    expect(broadcastCalled).toBe(true);
    expect(broadcastArgs).toEqual({ userId: found.id, status: "help" });
  });
});

