import request from "superagent";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.SPEED_TEST_BLOCK_ENABLED = "false";

import app from "../app.js";
import UserDac from "../dacs/userDac.js";
import StatusDac from "../dacs/statusDac.js";
import EmergencyProfileDac from "../dacs/emergencyprofileDac.js";
import ProfilePhotoDac from "../dacs/profilephotoDac.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import { inMemoryStatusDao } from "../daos/inMemoryStatusDao.js";
import { inMemoryEmergencyProfileDao } from "../daos/inMemoryEmergencyProfileDao.js";
import { inMemoryProfilePhotoDao } from "../daos/inMemoryProfilePhotoDao.js";
import User from "../entities/User.js";
import { SHARED_STATUS } from "../constants/sharedStatus.js";

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const AUTH_BASE = `${BASE_URL}/api/authentications`;
const PUBLIC_PROFILE_BASE = `${BASE_URL}/api/public/emergency-profiles`;

let server;
let alice, bob, charlie;
let aliceAgent, bobAgent, charlieAgent;

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
  StatusDac.DAO = new inMemoryStatusDao();
  EmergencyProfileDac.DAO = new inMemoryEmergencyProfileDao();
  ProfilePhotoDac.DAO = new inMemoryProfilePhotoDao();
  
  // Link photos to emergency profile DAO for testing
  const profileDao = EmergencyProfileDac.DAO;
  const photoDao = ProfilePhotoDac.DAO;
  profileDao.photos = photoDao.photos;

  aliceAgent = request.agent();
  bobAgent = request.agent();
  charlieAgent = request.agent();

  // Register users
  alice = await registerUser(aliceAgent, `alice_${Date.now()}`);
  console.log("[TEST] Alice registered:", { id: alice.id, username: alice.username });
  
  await new Promise((r) => setTimeout(r, 10));
  
  bob = await registerUser(bobAgent, `bob_${Date.now()}`);
  console.log("[TEST] Bob registered:", { id: bob.id, username: bob.username });
  
  await new Promise((r) => setTimeout(r, 10));
  
  charlie = await registerUser(charlieAgent, `charlie_${Date.now()}`);
  console.log("[TEST] Charlie registered:", { id: charlie.id, username: charlie.username });
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

async function createEmergencyProfile(userClient, userId, profileData) {
  const profileBase = `${BASE_URL}/api/emergency-profiles`;
  const res = await userClient
    .put(profileBase)
    .set("Accept", "application/json")
    .send(profileData);
  
  expect([200, 201]).toContain(res.status);
  return res.body;
}

describe("Public Emergency Info Integration Tests", () => {
  test("GET /api/public/emergency-profiles returns empty arrays when no profiles exist", async () => {
    console.log(`[TEST] Getting all emergency profiles (empty)`);
    
    const res = await alice.client
      .get(`${PUBLIC_PROFILE_BASE}`)
      .set("Accept", "application/json");

    console.log(`[TEST] GET response status: ${res.status}`);
    console.log(`[TEST] GET response body:`, JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("emergency");
    expect(res.body).toHaveProperty("others");
    expect(Array.isArray(res.body.emergency)).toBe(true);
    expect(Array.isArray(res.body.others)).toBe(true);
    expect(res.body.emergency).toHaveLength(0);
    expect(res.body.others).toHaveLength(0);
  });

  test("GET /api/public/emergency-profiles categorizes profiles by user status", async () => {
    console.log(`[TEST] Creating profiles with different user statuses`);
    
    // Create profiles for each user
    await createEmergencyProfile(alice.client, alice.id, {
      weight: 70,
      height: 175,
      bloodType: "A_POSITIVE",
      allergies: [],
      currentMedications: [],
      chronicConditions: [],
      emergencyContacts: [],
    });

    await createEmergencyProfile(bob.client, bob.id, {
      weight: 65,
      height: 160,
      bloodType: "O_POSITIVE",
      allergies: [],
      currentMedications: [],
      chronicConditions: [],
      emergencyContacts: [],
    });

    await createEmergencyProfile(charlie.client, charlie.id, {
      weight: 80,
      height: 180,
      bloodType: "B_POSITIVE",
      allergies: [],
      currentMedications: [],
      chronicConditions: [],
      emergencyContacts: [],
    });

    // Set user statuses
    await User.updateStatusById(alice.id, SHARED_STATUS.EMERGENCY);
    await User.updateStatusById(bob.id, SHARED_STATUS.OK);
    await User.updateStatusById(charlie.id, SHARED_STATUS.HELP);

    await new Promise((r) => setTimeout(r, 100));

    const res = await alice.client
      .get(`${PUBLIC_PROFILE_BASE}`)
      .set("Accept", "application/json");

    console.log(`[TEST] GET response status: ${res.status}`);
    console.log(`[TEST] GET response body:`, JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("emergency");
    expect(res.body).toHaveProperty("others");
    
    // Alice should be in emergency array
    const emergencyProfiles = res.body.emergency;
    expect(emergencyProfiles.length).toBeGreaterThanOrEqual(1);
    const aliceProfile = emergencyProfiles.find(p => String(p.userId) === String(alice.id));
    expect(aliceProfile).toBeDefined();
    
    // Bob and Charlie should be in others array
    const otherProfiles = res.body.others;
    expect(otherProfiles.length).toBeGreaterThanOrEqual(2);
    const bobProfile = otherProfiles.find(p => String(p.userId) === String(bob.id));
    const charlieProfile = otherProfiles.find(p => String(p.userId) === String(charlie.id));
    expect(bobProfile).toBeDefined();
    expect(charlieProfile).toBeDefined();
  });

  test("GET /api/public/emergency-profiles/bookmarks returns empty array when no bookmarks", async () => {
    console.log(`[TEST] Getting bookmarked profiles (empty)`);
    
    const res = await alice.client
      .get(`${PUBLIC_PROFILE_BASE}/bookmarks`)
      .set("Accept", "application/json");

    console.log(`[TEST] GET bookmarks response status: ${res.status}`);
    console.log(`[TEST] GET bookmarks response body:`, JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  test("POST /api/public/emergency-profiles/bookmarks bookmarks a profile", async () => {
    console.log(`[TEST] Bookmarking a profile`);
    
    // Create profile for Bob
    const bobProfile = await createEmergencyProfile(bob.client, bob.id, {
      weight: 65,
      height: 160,
      bloodType: "O_POSITIVE",
      allergies: [],
      currentMedications: [],
      chronicConditions: [],
      emergencyContacts: [],
    });

    const profileId = bobProfile._id || bobProfile.id;
    expect(profileId).toBeDefined();

    // Alice bookmarks Bob's profile
    const res = await alice.client
      .post(`${PUBLIC_PROFILE_BASE}/bookmarks`)
      .set("Accept", "application/json")
      .send({ profileId: String(profileId) });

    console.log(`[TEST] POST bookmark response status: ${res.status}`);
    console.log(`[TEST] POST bookmark response body:`, JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toContain("bookmarked");

    // Verify bookmark appears in bookmarks list
    const getRes = await alice.client
      .get(`${PUBLIC_PROFILE_BASE}/bookmarks`)
      .set("Accept", "application/json");

    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body)).toBe(true);
    expect(getRes.body.length).toBeGreaterThanOrEqual(1);
    const bookmarkedProfile = getRes.body.find(p => {
      const pId = p._id || p.id;
      return String(pId) === String(profileId);
    });
    expect(bookmarkedProfile).toBeDefined();
  });

  test("DELETE /api/public/emergency-profiles/bookmarks unbookmarks a profile", async () => {
    console.log(`[TEST] Unbookmarking a profile`);
    
    // Create profile for Bob
    const bobProfile = await createEmergencyProfile(bob.client, bob.id, {
      weight: 65,
      height: 160,
      bloodType: "O_POSITIVE",
      allergies: [],
      currentMedications: [],
      chronicConditions: [],
      emergencyContacts: [],
    });

    const profileId = bobProfile._id || bobProfile.id;

    // Alice bookmarks Bob's profile
    await alice.client
      .post(`${PUBLIC_PROFILE_BASE}/bookmarks`)
      .set("Accept", "application/json")
      .send({ profileId: String(profileId) });

    // Alice unbookmarks Bob's profile
    const res = await alice.client
      .delete(`${PUBLIC_PROFILE_BASE}/bookmarks`)
      .set("Accept", "application/json")
      .send({ profileId: String(profileId) });

    console.log(`[TEST] DELETE bookmark response status: ${res.status}`);
    console.log(`[TEST] DELETE bookmark response body:`, JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toContain("unbookmarked");

    // Verify bookmark is removed
    const getRes = await alice.client
      .get(`${PUBLIC_PROFILE_BASE}/bookmarks`)
      .set("Accept", "application/json");

    expect(getRes.status).toBe(200);
    const bookmarkedProfile = getRes.body.find(p => {
      const pId = p._id || p.id;
      return String(pId) === String(profileId);
    });
    expect(bookmarkedProfile).toBeUndefined();
  });

  test("GET /api/public/emergency-profiles/:profileId/photo returns photo", async () => {
    console.log(`[TEST] Getting profile photo`);
    
    // Create profile for Bob
    const bobProfile = await createEmergencyProfile(bob.client, bob.id, {
      weight: 65,
      height: 160,
      bloodType: "O_POSITIVE",
      allergies: [],
      currentMedications: [],
      chronicConditions: [],
      emergencyContacts: [],
    });

    const profileId = bobProfile._id || bobProfile.id;

    // Upload photo for Bob's profile
    const imageBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    await bob.client
      .post(`${BASE_URL}/api/emergency-profiles/photo`)
      .attach("photo", imageBuffer, "test.png")
      .field("visibility", "emergencyOnly");

    // Get photo via public API
    const res = await alice.client
      .get(`${PUBLIC_PROFILE_BASE}/${profileId}/photo`)
      .ok((res) => true);

    console.log(`[TEST] GET photo response status: ${res.status}`);
    console.log(`[TEST] GET photo content-type: ${res.headers["content-type"]}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("image/");
    expect(Buffer.isBuffer(res.body)).toBe(true);
  });

  test("GET /api/public/emergency-profiles/:profileId/photo returns 404 when photo does not exist", async () => {
    console.log(`[TEST] Getting non-existent photo`);
    
    // Create profile for Bob
    const bobProfile = await createEmergencyProfile(bob.client, bob.id, {
      weight: 65,
      height: 160,
      bloodType: "O_POSITIVE",
      allergies: [],
      currentMedications: [],
      chronicConditions: [],
      emergencyContacts: [],
    });

    const profileId = bobProfile._id || bobProfile.id;

    // Try to get photo that doesn't exist
    const res = await alice.client
      .get(`${PUBLIC_PROFILE_BASE}/${profileId}/photo`)
      .ok((res) => true);

    console.log(`[TEST] GET photo response status: ${res.status}`);

    expect(res.status).toBe(404);
  });

  test("GET /api/public/emergency-profiles returns 401 when unauthorized", async () => {
    const res = await request
      .get(`${PUBLIC_PROFILE_BASE}`)
      .set("Accept", "application/json")
      .ok((res) => true);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toBe("Unauthorized");
  });

  test("POST /api/public/emergency-profiles/bookmarks returns 401 when unauthorized", async () => {
    const res = await request
      .post(`${PUBLIC_PROFILE_BASE}/bookmarks`)
      .set("Accept", "application/json")
      .send({ profileId: "123" })
      .ok((res) => true);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toBe("Unauthorized");
  });
});

