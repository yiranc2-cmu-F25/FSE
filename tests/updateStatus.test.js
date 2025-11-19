import request from "superagent";
import app from "../app.js";
import UserDac from "../dacs/userDac.js";
import StatusDac from "../dacs/statusDac.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import { inMemoryStatusDao } from "../daos/inMemoryStatusDao.js";
import { setupTestDb, cleanupTestDb } from "../config/testDbConfig.js";

const PORT = 3001;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const AUTH_BASE = `${BASE_URL}/api/authentications`;

let server;

describe("Authentications REST API Integration Tests", () => {
  beforeAll(async () => {
    // Setup in-memory MongoDB
    await setupTestDb();

    // Set up in-memory DAOs
    UserDac.DAO = new inMemoryUserDao();
    StatusDac.DAO = new inMemoryStatusDao();
    
    await new Promise((resolve) => {
      server = app.listen(PORT, resolve);
    });
  });

  beforeEach(() => {
    UserDac.DAO = new inMemoryUserDao();
    StatusDac.DAO = new inMemoryStatusDao();
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => {
        server.close(() => {
          resolve();
        });
      });
    }
    
    // Cleanup test database
    await cleanupTestDb();
    
    UserDac.DAO = null;
    StatusDac.DAO = null;
  });

  const registerUser = async (agentClient, username) => {
    const registration = await agentClient
      .post(`${AUTH_BASE}/registrations`)
      .set("Accept", "application/json")
      .send({ username, password: "testPassword" })
      .ok((res) => true);

    expect(registration.status).toBe(201);

    const cookieHeader = registration.headers["set-cookie"];
    const cookie = Array.isArray(cookieHeader)
      ? cookieHeader[0]?.split(";")[0]
      : cookieHeader?.split(";")[0];
    expect(cookie).toBeTruthy();

    const profile = await agentClient
      .get(`${AUTH_BASE}/accounts`)
      .set("Accept", "application/json")
      .ok((res) => true);

    expect(profile.status).toBe(200);
    expect(profile.body?.id).toBeTruthy();

    return {
      username,
      id: profile.body.id,
      cookie, 
      client: agentClient,
    };
  };

  describe("PATCH /api/authentications/statuses/new - Update user status and broadcast", () => {
    test("should update status and broadcast", async () => {
      const agentClient = request.agent();
      const user = await registerUser(
        agentClient,
        `status_user_${Date.now()}`
      );

      const mockSocket = {
        called: false,
        last: null,
        broadcastNewStatus(userId, status) {
          this.called = true;
          this.last = { userId, status };
        },
      };
      app.set("socketInstance", mockSocket);
      app.locals.socketInstance = mockSocket;


      try {
            const resp = await agentClient
              .patch(`${AUTH_BASE}/statuses/new`)
              .set("Accept", "application/json")
              .send({ userId: user.id, newStatus: "OK" })
              .ok(res => true); 
            
            expect(resp.status).toBe(200);
            expect(resp.body).toEqual({ message: "User status updated" });
          } catch (err) {
            console.error("Request failed:", err.response?.body || err);
            throw err; 
          }

      const profileAfter = await agentClient
        .get(`${AUTH_BASE}/accounts`)
        .set("Accept", "application/json")
        .ok((res) => true);

      expect(profileAfter.status).toBe(200);
      expect(profileAfter.body?.status).toBe("OK");


      expect(mockSocket.called).toBe(true);
      expect(mockSocket.last).toEqual({ userId: user.id, status: "OK" });
    });

    test("should return 400 when required fields are missing", async () => {
      const agentClient = request.agent();
      await registerUser(agentClient, `status_missing_${Date.now()}`);

      const resp = await agentClient
        .patch(`${AUTH_BASE}/statuses/new`)
        .set("Accept", "application/json")
        .send({}) 
        .ok((res) => true);

      expect(resp.status).toBe(400);
      expect(resp.body).toEqual({ error: "Missing required fields" });
    });

    test("should return 401 when unauthorized (no cookie)", async () => {
      const resp = await request
        .patch(`${AUTH_BASE}/statuses/new`)
        .set("Accept", "application/json")
        .send({ userId: 1, newStatus: "OK" })
        .ok((res) => true);

      expect(resp.status).toBe(401);
      expect(resp.body).toEqual({ error: "Unauthorized" });
    });
  });

  describe("GET /api/authentications/accounts - Get user status", () => {
    test("should get user status", async () => {
      const agentClient = request.agent();
      const user = await registerUser(
        agentClient,
        `getstatus_user_${Date.now()}`
      );

      const resp = await agentClient
        .get(`${AUTH_BASE}/accounts`)
        .set("Accept", "application/json")
        .ok((res) => true);

      expect(resp.status).toBe(200);
      expect(resp.body?.status).toBe("undefined");
    });

    test("should return 401 when unauthorized (no cookie)", async () => {
      const resp = await request
        .get(`${AUTH_BASE}/accounts`)
        .set("Accept", "application/json")
        .ok((res) => true);

      expect(resp.status).toBe(401);
      expect(resp.body).toEqual({ error: "Unauthorized" });
    });
  });
});