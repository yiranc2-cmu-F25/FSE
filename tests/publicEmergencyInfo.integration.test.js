import request from "superagent";
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
import { setupTestDb, cleanupTestDb } from "../config/testDbConfig.js";

const PORT = 3002;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const AUTH_BASE = `${BASE_URL}/api/authentications`;
const PUBLIC_PROFILE_BASE = `${BASE_URL}/api/public/emergency-profiles`;

let server;

describe("Public Emergency Info Integration Tests", () => {
  beforeAll(async () => {
    // Setup in-memory MongoDB
    await setupTestDb();

    // Set up in-memory DAOs
    UserDac.DAO = new inMemoryUserDao();
    StatusDac.DAO = new inMemoryStatusDao();
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
    StatusDac.DAO = new inMemoryStatusDao();
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
    StatusDac.DAO = null;
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

  const createEmergencyProfile = async (userClient, userId, profileData) => {
    const profileBase = `${BASE_URL}/api/emergency-profiles`;
    const res = await userClient
      .put(profileBase)
      .set("Accept", "application/json")
      .send(profileData)
      .ok((res) => true);
    
    expect([200, 201]).toContain(res.status);
    return res.body;
  };

  describe("GET /api/public/emergency-profiles", () => {
    test("returns empty arrays when no profiles exist", async () => {
      const agentClient = request.agent();
      await registerUser(agentClient, `empty_profiles_${Date.now()}`);

      const res = await agentClient
        .get(`${PUBLIC_PROFILE_BASE}`)
        .set("Accept", "application/json")
        .ok((res) => true);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("emergency");
      expect(res.body).toHaveProperty("others");
      expect(Array.isArray(res.body.emergency)).toBe(true);
      expect(Array.isArray(res.body.others)).toBe(true);
      expect(res.body.emergency).toHaveLength(0);
      expect(res.body.others).toHaveLength(0);
    });

    test("categorizes profiles by user status", async () => {
      const aliceClient = request.agent();
      const bobClient = request.agent();
      const charlieClient = request.agent();

      const alice = await registerUser(aliceClient, `alice_${Date.now()}`);
      const bob = await registerUser(bobClient, `bob_${Date.now()}`);
      const charlie = await registerUser(charlieClient, `charlie_${Date.now()}`);

      // Create profiles for each user
      await createEmergencyProfile(aliceClient, alice.id, {
        weight: 70,
        height: 175,
        bloodType: "A_POSITIVE",
        allergies: [],
        currentMedications: [],
        chronicConditions: [],
        emergencyContacts: [],
      });

      await createEmergencyProfile(bobClient, bob.id, {
        weight: 65,
        height: 160,
        bloodType: "O_POSITIVE",
        allergies: [],
        currentMedications: [],
        chronicConditions: [],
        emergencyContacts: [],
      });

      await createEmergencyProfile(charlieClient, charlie.id, {
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

      const res = await aliceClient
        .get(`${PUBLIC_PROFILE_BASE}`)
        .set("Accept", "application/json")
        .ok((res) => true);

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

    test("returns 401 when unauthorized", async () => {
      const res = await request
        .get(`${PUBLIC_PROFILE_BASE}`)
        .set("Accept", "application/json")
        .ok((res) => true);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toBe("Unauthorized");
    });
  });

  describe("GET /api/public/emergency-profiles/bookmarks", () => {
    test("returns empty array when no bookmarks", async () => {
      const agentClient = request.agent();
      await registerUser(agentClient, `no_bookmarks_${Date.now()}`);

      const res = await agentClient
        .get(`${PUBLIC_PROFILE_BASE}/bookmarks`)
        .set("Accept", "application/json")
        .ok((res) => true);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });
  });

  describe("POST /api/public/emergency-profiles/bookmarks", () => {
    test("bookmarks a profile", async () => {
      const aliceClient = request.agent();
      const bobClient = request.agent();

      const alice = await registerUser(aliceClient, `alice_bookmark_${Date.now()}`);
      const bob = await registerUser(bobClient, `bob_bookmark_${Date.now()}`);

      // Create profile for Bob
      const bobProfile = await createEmergencyProfile(bobClient, bob.id, {
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
      const res = await aliceClient
        .post(`${PUBLIC_PROFILE_BASE}/bookmarks`)
        .set("Accept", "application/json")
        .send({ profileId: String(profileId) })
        .ok((res) => true);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toContain("bookmarked");

      // Verify bookmark appears in bookmarks list
      const getRes = await aliceClient
        .get(`${PUBLIC_PROFILE_BASE}/bookmarks`)
        .set("Accept", "application/json")
        .ok((res) => true);

      expect(getRes.status).toBe(200);
      expect(Array.isArray(getRes.body)).toBe(true);
      expect(getRes.body.length).toBeGreaterThanOrEqual(1);
      const bookmarkedProfile = getRes.body.find(p => {
        const pId = p._id || p.id;
        return String(pId) === String(profileId);
      });
      expect(bookmarkedProfile).toBeDefined();
    });

    test("returns 401 when unauthorized", async () => {
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

  describe("DELETE /api/public/emergency-profiles/bookmarks", () => {
    test("unbookmarks a profile", async () => {
      const aliceClient = request.agent();
      const bobClient = request.agent();

      const alice = await registerUser(aliceClient, `alice_unbookmark_${Date.now()}`);
      const bob = await registerUser(bobClient, `bob_unbookmark_${Date.now()}`);

      // Create profile for Bob
      const bobProfile = await createEmergencyProfile(bobClient, bob.id, {
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
      await aliceClient
        .post(`${PUBLIC_PROFILE_BASE}/bookmarks`)
        .set("Accept", "application/json")
        .send({ profileId: String(profileId) })
        .ok((res) => true);

      // Alice unbookmarks Bob's profile
      const res = await aliceClient
        .delete(`${PUBLIC_PROFILE_BASE}/bookmarks`)
        .set("Accept", "application/json")
        .send({ profileId: String(profileId) })
        .ok((res) => true);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toContain("unbookmarked");

      // Verify bookmark is removed
      const getRes = await aliceClient
        .get(`${PUBLIC_PROFILE_BASE}/bookmarks`)
        .set("Accept", "application/json")
        .ok((res) => true);

      expect(getRes.status).toBe(200);
      const bookmarkedProfile = getRes.body.find(p => {
        const pId = p._id || p.id;
        return String(pId) === String(profileId);
      });
      expect(bookmarkedProfile).toBeUndefined();
    });
  });

  describe("GET /api/public/emergency-profiles/:profileId/photo", () => {
    test("returns photo", async () => {
      const aliceClient = request.agent();
      const bobClient = request.agent();

      const alice = await registerUser(aliceClient, `alice_photo_${Date.now()}`);
      const bob = await registerUser(bobClient, `bob_photo_${Date.now()}`);

      // Create profile for Bob
      const bobProfile = await createEmergencyProfile(bobClient, bob.id, {
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

      await bobClient
        .post(`${BASE_URL}/api/emergency-profiles/photo`)
        .attach("photo", imageBuffer, "test.png")
        .field("visibility", "emergencyOnly")
        .ok((res) => true);

      // Get photo via public API
      const res = await aliceClient
        .get(`${PUBLIC_PROFILE_BASE}/${profileId}/photo`)
        .ok((res) => true);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("image/");
      expect(Buffer.isBuffer(res.body)).toBe(true);
    });

    test("returns 404 when photo does not exist", async () => {
      const aliceClient = request.agent();
      const bobClient = request.agent();

      const alice = await registerUser(aliceClient, `alice_no_photo_${Date.now()}`);
      const bob = await registerUser(bobClient, `bob_no_photo_${Date.now()}`);

      // Create profile for Bob
      const bobProfile = await createEmergencyProfile(bobClient, bob.id, {
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
      const res = await aliceClient
        .get(`${PUBLIC_PROFILE_BASE}/${profileId}/photo`)
        .ok((res) => true);

      expect(res.status).toBe(404);
    });
  });
});

