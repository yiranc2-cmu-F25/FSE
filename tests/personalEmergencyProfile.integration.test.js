import request from "superagent";
import app from "../app.js";
import UserDac from "../dacs/userDac.js";
import EmergencyProfileDac from "../dacs/emergencyprofileDac.js";
import ProfilePhotoDac from "../dacs/profilephotoDac.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import { inMemoryEmergencyProfileDao } from "../daos/inMemoryEmergencyProfileDao.js";
import { inMemoryProfilePhotoDao } from "../daos/inMemoryProfilePhotoDao.js";
import { setupTestDb, cleanupTestDb } from "../config/testDbConfig.js";

const PORT = 3001;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const AUTH_BASE = `${BASE_URL}/api/authentications`;
const PROFILE_BASE = `${BASE_URL}/api/emergency-profiles`;

let server;

describe("Personal Emergency Profile Integration Tests", () => {
  beforeAll(async () => {
    // Setup in-memory MongoDB
    await setupTestDb();

    // Set up in-memory DAOs
    UserDac.DAO = new inMemoryUserDao();
    EmergencyProfileDac.DAO = new inMemoryEmergencyProfileDao();
    ProfilePhotoDac.DAO = new inMemoryProfilePhotoDao();
    
    // Link photos to emergency profile DAO for testing
    const profileDao = EmergencyProfileDac.DAO;
    const photoDao = ProfilePhotoDac.DAO;
    profileDao.photos = photoDao.photos;

    const fakeSocket = {
      emitMessageFromAndTo() {
        console.log("[TEST] emitMessageFromAndTo called");
      },
      emitPrivateMessage() {
        console.log("[TEST] emitPrivateMessage called");
      },
      emitMessageFrom() {
        console.log("[TEST] emitMessageFrom called");
      },
    };
    app.set("socketInstance", fakeSocket);
    app.locals.socketInstance = fakeSocket;

    await new Promise((resolve) => {
      server = app.listen(PORT, resolve);
    });
  });

  beforeEach(() => {
    UserDac.DAO = new inMemoryUserDao();
    EmergencyProfileDac.DAO = new inMemoryEmergencyProfileDao();
    ProfilePhotoDac.DAO = new inMemoryProfilePhotoDao();
    
    // Link photos to emergency profile DAO for testing
    const profileDao = EmergencyProfileDac.DAO;
    const photoDao = ProfilePhotoDac.DAO;
    profileDao.photos = photoDao.photos;
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
    EmergencyProfileDac.DAO = null;
    ProfilePhotoDac.DAO = null;
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

  describe("GET /api/emergency-profiles", () => {
    test("returns 404 when profile does not exist", async () => {
      const agentClient = request.agent();
      const user = await registerUser(
        agentClient,
        `get_profile_${Date.now()}`
      );

      const res = await agentClient
        .get(`${PROFILE_BASE}`)
        .set("Accept", "application/json")
        .ok((res) => true);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toBe("Emergency profile not found");
    });

    test("returns created profile", async () => {
      const agentClient = request.agent();
      const user = await registerUser(
        agentClient,
        `get_created_${Date.now()}`
      );

      // Create profile
      const profileData = {
        weight: 65,
        height: 160,
        bloodType: "O_POSITIVE",
        allergies: ["Shellfish"],
        currentMedications: [],
        chronicConditions: [],
        emergencyContacts: ["9876543210"],
      };

      await agentClient
        .put(`${PROFILE_BASE}`)
        .set("Accept", "application/json")
        .send(profileData);

      // Get profile
      const res = await agentClient
        .get(`${PROFILE_BASE}`)
        .set("Accept", "application/json")
        .ok((res) => true);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("userId");
      expect(String(res.body.userId)).toBe(String(user.id));
      expect(res.body.weight).toBe(65);
      expect(res.body.height).toBe(160);
      expect(res.body.bloodType).toBe("O_POSITIVE");
      expect(res.body.allergies).toEqual(["Shellfish"]);
      expect(res.body.emergencyContacts).toEqual(["9876543210"]);
    });

    test("returns 401 when unauthorized", async () => {
      const res = await request
        .get(`${PROFILE_BASE}`)
        .set("Accept", "application/json")
        .ok((res) => true);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toBe("Unauthorized");
    });
  });

  describe("PUT /api/emergency-profiles", () => {
    test("creates a new profile", async () => {
      const agentClient = request.agent();
      const user = await registerUser(
        agentClient,
        `create_profile_${Date.now()}`
      );

      const profileData = {
        weight: 70,
        height: 175,
        bloodType: "A_POSITIVE",
        allergies: ["Peanuts"],
        currentMedications: ["Aspirin"],
        chronicConditions: ["Diabetes"],
        emergencyContacts: ["1234567890"],
        visibility: {
          weight: "EMERGENCY_ONLY",
          height: "EMERGENCY_ONLY",
        },
      };

      const res = await agentClient
        .put(`${PROFILE_BASE}`)
        .set("Accept", "application/json")
        .send(profileData)
        .ok((res) => true);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("userId");
      expect(String(res.body.userId)).toBe(String(user.id));
      expect(res.body.weight).toBe(70);
      expect(res.body.height).toBe(175);
      expect(res.body.bloodType).toBe("A_POSITIVE");
      expect(res.body.allergies).toEqual(["Peanuts"]);
      expect(res.body.currentMedications).toEqual(["Aspirin"]);
      expect(res.body.chronicConditions).toEqual(["Diabetes"]);
      expect(res.body.emergencyContacts).toEqual(["1234567890"]);
    });

    test("updates existing profile", async () => {
      const agentClient = request.agent();
      const user = await registerUser(
        agentClient,
        `update_profile_${Date.now()}`
      );

      // Create initial profile
      const initialData = {
        weight: 70,
        height: 175,
        bloodType: "A_POSITIVE",
        allergies: ["Peanuts"],
        currentMedications: [],
        chronicConditions: [],
        emergencyContacts: ["1111111111"],
      };

      await agentClient
        .put(`${PROFILE_BASE}`)
        .set("Accept", "application/json")
        .send(initialData)
        .ok((res) => true);

      // Update profile
      const updatedData = {
        weight: 72,
        height: 175,
        bloodType: "B_POSITIVE",
        allergies: ["Peanuts", "Dairy"],
        currentMedications: ["Metformin"],
        chronicConditions: ["Diabetes", "Hypertension"],
        emergencyContacts: ["1111111111", "2222222222"],
      };

      const res = await agentClient
        .put(`${PROFILE_BASE}`)
        .set("Accept", "application/json")
        .send(updatedData)
        .ok((res) => true);

      expect(res.status).toBe(200);
      expect(res.body.weight).toBe(72);
      expect(res.body.bloodType).toBe("B_POSITIVE");
      expect(res.body.allergies).toEqual(["Peanuts", "Dairy"]);
      expect(res.body.currentMedications).toEqual(["Metformin"]);
      expect(res.body.chronicConditions).toEqual(["Diabetes", "Hypertension"]);
      expect(res.body.emergencyContacts).toEqual(["1111111111", "2222222222"]);
    });

    test("returns 401 when unauthorized", async () => {
      const res = await request
        .put(`${PROFILE_BASE}`)
        .set("Accept", "application/json")
        .send({ weight: 70 })
        .ok((res) => true);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toBe("Unauthorized");
    });
  });

  describe("DELETE /api/emergency-profiles", () => {
    test("deletes profile", async () => {
      const agentClient = request.agent();
      const user = await registerUser(
        agentClient,
        `delete_profile_${Date.now()}`
      );

      // Create profile
      const profileData = {
        weight: 70,
        height: 175,
        bloodType: "A_POSITIVE",
        allergies: [],
        currentMedications: [],
        chronicConditions: [],
        emergencyContacts: [],
      };

      await agentClient
        .put(`${PROFILE_BASE}`)
        .set("Accept", "application/json")
        .send(profileData)
        .ok((res) => true);

      // Delete profile
      const res = await agentClient
        .delete(`${PROFILE_BASE}`)
        .set("Accept", "application/json")
        .ok((res) => true);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toBe("Emergency profile deleted");

      // Verify profile is deleted
      const getRes = await agentClient
        .get(`${PROFILE_BASE}`)
        .set("Accept", "application/json")
        .ok((res) => true);

      expect(getRes.status).toBe(404);
    });
  });

  describe("POST /api/emergency-profiles/photo", () => {
    test("uploads photo", async () => {
      const agentClient = request.agent();
      const user = await registerUser(
        agentClient,
        `upload_photo_${Date.now()}`
      );

      // Create profile first
      const profileData = {
        weight: 70,
        height: 175,
        bloodType: "A_POSITIVE",
        allergies: [],
        currentMedications: [],
        chronicConditions: [],
        emergencyContacts: [],
      };

      await agentClient
        .put(`${PROFILE_BASE}`)
        .set("Accept", "application/json")
        .send(profileData)
        .ok((res) => true);

      // Create a simple image buffer (1x1 PNG)
      const imageBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      );

      const res = await agentClient
        .post(`${PROFILE_BASE}/photo`)
        .attach("photo", imageBuffer, "test.png")
        .field("visibility", "emergencyOnly")
        .ok((res) => true);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toBe("Profile photo updated successfully");

      // Verify photo is associated with profile
      const getRes = await agentClient
        .get(`${PROFILE_BASE}`)
        .set("Accept", "application/json")
        .ok((res) => true);

      expect(getRes.status).toBe(200);
      expect(getRes.body).toHaveProperty("facePhoto");
      expect(getRes.body.facePhoto).toHaveProperty("data");
      expect(getRes.body.facePhoto.data).toContain("data:image/png;base64,");
    });
  });
});

