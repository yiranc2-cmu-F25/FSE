import request from "superagent";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.SPEED_TEST_BLOCK_ENABLED = "false";

import app from "../app.js";
import UserDac from "../dacs/userDac.js";
import EmergencyProfileDac from "../dacs/emergencyprofileDac.js";
import ProfilePhotoDac from "../dacs/profilephotoDac.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import { inMemoryEmergencyProfileDao } from "../daos/inMemoryEmergencyProfileDao.js";
import { inMemoryProfilePhotoDao } from "../daos/inMemoryProfilePhotoDao.js";

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const AUTH_BASE = `${BASE_URL}/api/authentications`;
const PROFILE_BASE = `${BASE_URL}/api/emergency-profiles`;

let server;
let alice;
let aliceAgent;

beforeAll(async () => {
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
  console.log(`[TEST] Server started on port ${PORT}`);
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    console.log("[TEST] Server closed");
  }
});

beforeEach(async () => {
  console.log("\n[TEST] ===== Starting new test =====");
  
  // Clear in-memory data for each test
  UserDac.DAO = new inMemoryUserDao();
  EmergencyProfileDac.DAO = new inMemoryEmergencyProfileDao();
  ProfilePhotoDac.DAO = new inMemoryProfilePhotoDao();
  
  // Link photos to emergency profile DAO for testing
  const profileDao = EmergencyProfileDac.DAO;
  const photoDao = ProfilePhotoDac.DAO;
  profileDao.photos = photoDao.photos;

  aliceAgent = request.agent();

  // Register user
  alice = await registerUser(aliceAgent, `alice_${Date.now()}`);
  console.log("[TEST] Alice registered:", { id: alice.id, username: alice.username });
});

async function registerUser(agentClient, username) {
  try {
    console.log(`[TEST] Registering user: ${username}`);
    
    const reg = await agentClient
      .post(`${AUTH_BASE}/registrations`)
      .set("Accept", "application/json")
      .send({ username, password: "testPassword" });

    console.log(`[TEST] Registration response status: ${reg.status}`);
    expect([200, 201]).toContain(reg.status);

    const me = await agentClient
      .get(`${AUTH_BASE}/accounts`)
      .set("Accept", "application/json");

    console.log(`[TEST] Account info response:`, JSON.stringify(me.body, null, 2));
    
    expect(me.status).toBe(200);
    expect(me.body).toHaveProperty("username");

    const userId = me.body.id || me.body._id || me.body.userId;
    
    if (!userId) {
      console.error("[TEST] ERROR: Could not find user ID in response:", me.body);
      throw new Error(`Could not find user ID in response`);
    }

    console.log(`[TEST] User ID found: ${userId}`);

    return {
      id: userId,
      username: me.body.username,
      client: agentClient,
    };
  } catch (error) {
    console.error(`[TEST] ERROR: Registration failed for ${username}:`, error.message);
    if (error.response) {
      console.error("[TEST] Response status:", error.response.status);
      console.error("[TEST] Response body:", error.response.body || error.response.text);
    }
    throw error;
  }
}

describe("Personal Emergency Profile Integration Tests", () => {
  test("GET /api/emergency-profiles returns 404 when profile does not exist", async () => {
    console.log(`[TEST] Getting non-existent profile`);
    
    const res = await alice.client
      .get(`${PROFILE_BASE}`)
      .set("Accept", "application/json")
      .ok((res) => true);

    console.log(`[TEST] GET response status: ${res.status}`);
    console.log(`[TEST] GET response body:`, JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toBe("Emergency profile not found");
  });

  test("PUT /api/emergency-profiles creates a new profile", async () => {
    console.log(`[TEST] Creating new emergency profile`);
    
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

    const res = await alice.client
      .put(`${PROFILE_BASE}`)
      .set("Accept", "application/json")
      .send(profileData);

    console.log(`[TEST] PUT response status: ${res.status}`);
    console.log(`[TEST] PUT response body:`, JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("userId");
    expect(String(res.body.userId)).toBe(String(alice.id));
    expect(res.body.weight).toBe(70);
    expect(res.body.height).toBe(175);
    expect(res.body.bloodType).toBe("A_POSITIVE");
    expect(res.body.allergies).toEqual(["Peanuts"]);
    expect(res.body.currentMedications).toEqual(["Aspirin"]);
    expect(res.body.chronicConditions).toEqual(["Diabetes"]);
    expect(res.body.emergencyContacts).toEqual(["1234567890"]);
  });

  test("GET /api/emergency-profiles returns created profile", async () => {
    console.log(`[TEST] Creating and then getting profile`);
    
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

    await alice.client
      .put(`${PROFILE_BASE}`)
      .set("Accept", "application/json")
      .send(profileData);

    // Get profile
    const res = await alice.client
      .get(`${PROFILE_BASE}`)
      .set("Accept", "application/json");

    console.log(`[TEST] GET response status: ${res.status}`);
    console.log(`[TEST] GET response body:`, JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("userId");
    expect(String(res.body.userId)).toBe(String(alice.id));
    expect(res.body.weight).toBe(65);
    expect(res.body.height).toBe(160);
    expect(res.body.bloodType).toBe("O_POSITIVE");
    expect(res.body.allergies).toEqual(["Shellfish"]);
    expect(res.body.emergencyContacts).toEqual(["9876543210"]);
  });

  test("PUT /api/emergency-profiles updates existing profile", async () => {
    console.log(`[TEST] Creating and updating profile`);
    
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

    await alice.client
      .put(`${PROFILE_BASE}`)
      .set("Accept", "application/json")
      .send(initialData);

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

    const res = await alice.client
      .put(`${PROFILE_BASE}`)
      .set("Accept", "application/json")
      .send(updatedData);

    console.log(`[TEST] PUT response status: ${res.status}`);
    console.log(`[TEST] PUT response body:`, JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(200);
    expect(res.body.weight).toBe(72);
    expect(res.body.bloodType).toBe("B_POSITIVE");
    expect(res.body.allergies).toEqual(["Peanuts", "Dairy"]);
    expect(res.body.currentMedications).toEqual(["Metformin"]);
    expect(res.body.chronicConditions).toEqual(["Diabetes", "Hypertension"]);
    expect(res.body.emergencyContacts).toEqual(["1111111111", "2222222222"]);
  });

  test("DELETE /api/emergency-profiles deletes profile", async () => {
    console.log(`[TEST] Creating and deleting profile`);
    
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

    await alice.client
      .put(`${PROFILE_BASE}`)
      .set("Accept", "application/json")
      .send(profileData);

    // Delete profile
    const res = await alice.client
      .delete(`${PROFILE_BASE}`)
      .set("Accept", "application/json");

    console.log(`[TEST] DELETE response status: ${res.status}`);
    console.log(`[TEST] DELETE response body:`, JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toBe("Emergency profile deleted");

    // Verify profile is deleted
    const getRes = await alice.client
      .get(`${PROFILE_BASE}`)
      .set("Accept", "application/json")
      .ok((res) => true);

    expect(getRes.status).toBe(404);
  });

  test("POST /api/emergency-profiles/photo uploads photo", async () => {
    console.log(`[TEST] Uploading profile photo`);
    
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

    await alice.client
      .put(`${PROFILE_BASE}`)
      .set("Accept", "application/json")
      .send(profileData);

    // Create a simple image buffer (1x1 PNG)
    const imageBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    const res = await alice.client
      .post(`${PROFILE_BASE}/photo`)
      .attach("photo", imageBuffer, "test.png")
      .field("visibility", "emergencyOnly");

    console.log(`[TEST] POST photo response status: ${res.status}`);
    console.log(`[TEST] POST photo response body:`, JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toBe("Profile photo updated successfully");

    // Verify photo is associated with profile
    const getRes = await alice.client
      .get(`${PROFILE_BASE}`)
      .set("Accept", "application/json");

    expect(getRes.status).toBe(200);
    expect(getRes.body).toHaveProperty("facePhoto");
    expect(getRes.body.facePhoto).toHaveProperty("data");
    expect(getRes.body.facePhoto.data).toContain("data:image/png;base64,");
  });

  test("GET /api/emergency-profiles returns 401 when unauthorized", async () => {
    const res = await request
      .get(`${PROFILE_BASE}`)
      .set("Accept", "application/json")
      .ok((res) => true);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toBe("Unauthorized");
  });

  test("PUT /api/emergency-profiles returns 401 when unauthorized", async () => {
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

