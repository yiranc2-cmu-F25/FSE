import request from "superagent";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.SPEED_TEST_BLOCK_ENABLED = "false";

import app from "../app.js";
import UserDac from "../dacs/userDac.js";
import MsgDac from "../dacs/msgDac.js";
import AnnouncementDac from "../dacs/announcementDac.js";
import StatusDac from "../dacs/statusDac.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import { inMemoryMsgDao } from "../daos/inMemoryMsgDao.js";
import { inMemoryAnnouncementDao } from "../daos/inMemoryAnnouncementDao.js";
import { inMemoryStatusDao } from "../daos/inMemoryStatusDao.js";
import Announcement from "../entities/Announcement.js";
import Msg from "../entities/Msg.js";
import Status from "../entities/Status.js";
import User from "../entities/User.js";

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const AUTH_BASE = `${BASE_URL}/api/authentications`;
const QUERIES_BASE = `${BASE_URL}/api/queries`;

let server;
let alice, bob, charlie;
let aliceAgent, bobAgent, charlieAgent;

let onlineUsers = [];

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
    getOnline() {
      return onlineUsers.map(u => u.toLowerCase());
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
  
  UserDac.DAO = new inMemoryUserDao();
  MsgDac.DAO = new inMemoryMsgDao();
  AnnouncementDac.DAO = new inMemoryAnnouncementDao();
  StatusDac.DAO = new inMemoryStatusDao();
  onlineUsers = [];

  aliceAgent = request.agent();
  bobAgent = request.agent();
  charlieAgent = request.agent();

  alice = await registerUser(aliceAgent, `alice_${Date.now()}`);
  console.log("[TEST] Alice registered:", { id: alice.id, username: alice.username });
  
  await new Promise((r) => setTimeout(r, 10));
  
  bob = await registerUser(bobAgent, `bob_${Date.now()}`);
  console.log("[TEST] Bob registered:", { id: bob.id, username: bob.username });
  
  await new Promise((r) => setTimeout(r, 10));
  
  charlie = await registerUser(charlieAgent, `charlie_${Date.now()}`);
  console.log("[TEST] Charlie registered:", { id: charlie.id, username: charlie.username });
  
  onlineUsers = [alice.username, bob.username, charlie.username].filter(Boolean);
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

// Test 1: announcements search
test("GET /api/queries?type=announcements returns announcements matching content search", async () => {
  console.log(`[TEST] Testing announcements search`);
  
  const announcement1 = new Announcement({
    sender: alice.id,
    content: "System maintenance scheduled for tonight",
    status: "ok",
    timestamp: new Date(),
  });
  await announcement1.create();

  await new Promise((r) => setTimeout(r, 10));

  const announcement2 = new Announcement({
    sender: bob.id,
    content: "Emergency alert system activated",
    status: "emergency",
    timestamp: new Date(),
  });
  await announcement2.create();

  await new Promise((r) => setTimeout(r, 10));

  const announcement3 = new Announcement({
    sender: charlie.id,
    content: "Regular system update notification",
    status: "ok",
    timestamp: new Date(),
  });
  await announcement3.create();

  await new Promise((r) => setTimeout(r, 100));

  const res = await alice.client
    .get(`${QUERIES_BASE}?type=announcements&content=system`)
    .set("Accept", "application/json");

  console.log(`[TEST] GET response status: ${res.status}`);
  console.log(`[TEST] GET response body:`, JSON.stringify(res.body, null, 2));

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("count");
  expect(res.body).toHaveProperty("results");
  expect(Array.isArray(res.body.results)).toBe(true);
  expect(res.body.count).toBeGreaterThanOrEqual(2);
  
  const contents = res.body.results.map((r) => r.content.toLowerCase());
  expect(contents.some((c) => c.includes("system"))).toBe(true);
  
  if (res.body.results.length > 0) {
    const firstResult = res.body.results[0];
    expect(firstResult).toHaveProperty("id");
    expect(firstResult).toHaveProperty("content");
    expect(firstResult).toHaveProperty("timestamp");
    expect(firstResult).toHaveProperty("status");
  }
});

// Test 2: citizens by username search
test("GET /api/queries?type=citizens returns users matching username search", async () => {
  console.log(`[TEST] Testing citizens by username search`);
  
  onlineUsers = [alice.username, bob.username, charlie.username].filter(Boolean);

  await new Promise((r) => setTimeout(r, 100));

  const res = await alice.client
    .get(`${QUERIES_BASE}?type=citizens&username=alice`)
    .set("Accept", "application/json");

  console.log(`[TEST] GET response status: ${res.status}`);
  console.log(`[TEST] GET response body:`, JSON.stringify(res.body, null, 2));

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("count");
  expect(res.body).toHaveProperty("results");
  expect(Array.isArray(res.body.results)).toBe(true);
  expect(res.body.count).toBeGreaterThanOrEqual(1);
  
  const usernames = res.body.results.map((r) => r.u?.name || r.u?.username || "");
  const matchingUsernames = usernames.filter((name) => 
    name.toLowerCase().includes("alice")
  );
  expect(matchingUsernames.length).toBeGreaterThanOrEqual(1);
  
  if (res.body.results.length > 0) {
    const firstResult = res.body.results[0];
    expect(firstResult).toHaveProperty("u");
    expect(firstResult).toHaveProperty("availability");
    expect(["online", "offline"]).toContain(firstResult.availability);
    expect(firstResult.u).toHaveProperty("id");
    expect(firstResult.u).toHaveProperty("name");
  }
});

// Test 3: public messages search
test("GET /api/queries?type=messages_public returns public messages matching content search", async () => {
  console.log(`[TEST] Testing public messages search`);
  
  const msg1 = new Msg({
    sender: alice.id,
    receiver: null,
    content: "Hello everyone! How is everyone doing?",
    status: "ok",
    timestamp: new Date(),
  });
  await msg1.create();

  await new Promise((r) => setTimeout(r, 10));

  const msg2 = new Msg({
    sender: bob.id,
    receiver: null,
    content: "Testing public message system",
    status: "ok",
    timestamp: new Date(),
  });
  await msg2.create();

  await new Promise((r) => setTimeout(r, 10));

  const msg3 = new Msg({
    sender: charlie.id,
    receiver: null,
    content: "Another public message for testing",
    status: "ok",
    timestamp: new Date(),
  });
  await msg3.create();

  await new Promise((r) => setTimeout(r, 100));

  const res = await alice.client
    .get(`${QUERIES_BASE}?type=messages_public&content=message`)
    .set("Accept", "application/json");

  console.log(`[TEST] GET response status: ${res.status}`);
  console.log(`[TEST] GET response body:`, JSON.stringify(res.body, null, 2));

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("count");
  expect(res.body).toHaveProperty("results");
  expect(Array.isArray(res.body.results)).toBe(true);
  expect(res.body.count).toBeGreaterThanOrEqual(2);
  
  const contents = res.body.results.map((r) => r.content.toLowerCase());
  expect(contents.some((c) => c.includes("message"))).toBe(true);
  
  if (res.body.results.length > 0) {
    const firstResult = res.body.results[0];
    expect(firstResult).toHaveProperty("id");
    expect(firstResult).toHaveProperty("content");
    expect(firstResult).toHaveProperty("timestamp");
    expect(firstResult).toHaveProperty("status");
    expect(firstResult).toHaveProperty("isOwn");
    expect(typeof firstResult.isOwn).toBe("boolean");
  }
  
  const aliceResults = res.body.results.filter((r) => 
    r.sender?.username?.toLowerCase() === alice.username.toLowerCase()
  );
  if (aliceResults.length > 0) {
    expect(aliceResults[0].isOwn).toBe(true);
  }
});

// Test 4: citizens by status search
test("GET /api/queries?type=citizens_status returns users matching status search", async () => {
  console.log(`[TEST] Testing citizens by status search`);
  
  await User.updateStatusById(alice.id, "OK");
  await User.updateStatusById(bob.id, "EMERGENCY");
  await User.updateStatusById(charlie.id, "OK");

  onlineUsers = [alice.username, bob.username, charlie.username].filter(Boolean);

  await new Promise((r) => setTimeout(r, 100));

  const res = await alice.client
    .get(`${QUERIES_BASE}?type=citizens_status&status=ok`)
    .set("Accept", "application/json");

  console.log(`[TEST] GET response status: ${res.status}`);
  console.log(`[TEST] GET response body:`, JSON.stringify(res.body, null, 2));

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("count");
  expect(res.body).toHaveProperty("results");
  expect(Array.isArray(res.body.results)).toBe(true);
  expect(res.body.count).toBeGreaterThanOrEqual(2);
  
  const statuses = res.body.results.map((r) => r.u?.status || "");
  const matchingStatuses = statuses.filter((status) => 
    status.toLowerCase() === "ok"
  );
  expect(matchingStatuses.length).toBeGreaterThanOrEqual(2);
  
  if (res.body.results.length > 0) {
    const firstResult = res.body.results[0];
    expect(firstResult).toHaveProperty("u");
    expect(firstResult).toHaveProperty("availability");
    expect(["online", "offline"]).toContain(firstResult.availability);
    expect(firstResult.u).toHaveProperty("id");
    expect(firstResult.u).toHaveProperty("name");
    expect(firstResult.u).toHaveProperty("status");
    expect(firstResult.u.status.toLowerCase()).toBe("ok");
  }
});

// Test 5: private messages search
test("GET /api/queries?type=messages_private returns private messages when content is not 'status'", async () => {
  console.log(`[TEST] Testing private messages search (non-status branch)`);
  
  const msg1 = new Msg({
    sender: alice.id,
    receiver: bob.id,
    content: "Hello Bob, how are you doing?",
    status: "ok",
    timestamp: new Date(),
  });
  await msg1.create();

  await new Promise((r) => setTimeout(r, 10));

  const msg2 = new Msg({
    sender: bob.id,
    receiver: alice.id,
    content: "Hi Alice! I'm doing great, thanks for asking.",
    status: "ok",
    timestamp: new Date(),
  });
  await msg2.create();

  await new Promise((r) => setTimeout(r, 10));

  const msg3 = new Msg({
    sender: alice.id,
    receiver: bob.id,
    content: "That's wonderful to hear!",
    status: "ok",
    timestamp: new Date(),
  });
  await msg3.create();

  await new Promise((r) => setTimeout(r, 100));

  const res = await alice.client
    .get(`${QUERIES_BASE}?type=messages_private&peerId=${encodeURIComponent(bob.id)}&content=hello`)
    .set("Accept", "application/json");

  console.log(`[TEST] GET response status: ${res.status}`);
  console.log(`[TEST] GET response body:`, JSON.stringify(res.body, null, 2));

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("mode");
  expect(res.body.mode).toBe("messages"); 
  expect(res.body).toHaveProperty("count");
  expect(res.body).toHaveProperty("results");
  expect(Array.isArray(res.body.results)).toBe(true);
  expect(res.body.count).toBeGreaterThanOrEqual(1);
  
  const contents = res.body.results.map((r) => r.content.toLowerCase());
  expect(contents.some((c) => c.includes("hello"))).toBe(true);
  
  if (res.body.results.length > 0) {
    const firstResult = res.body.results[0];
    expect(firstResult).toHaveProperty("id");
    expect(firstResult).toHaveProperty("content");
    expect(firstResult).toHaveProperty("timestamp");
    expect(firstResult).toHaveProperty("status");
    expect(firstResult).toHaveProperty("isOwn");
    expect(typeof firstResult.isOwn).toBe("boolean");
  }
  
  const aliceResults = res.body.results.filter((r) => 
    r.sender?.username?.toLowerCase() === alice.username.toLowerCase()
  );
  if (aliceResults.length > 0) {
    expect(aliceResults[0].isOwn).toBe(true);
  }
});

// Test 6: private messages search (status branch)
test("GET /api/queries?type=messages_private returns status history when content is 'status'", async () => {
  console.log(`[TEST] Testing private messages search (status branch)`);
  
  await Status.recordChange({
    userId: bob.id,
    status: "OK",
    timestamp: new Date(Date.now() - 20000),
  });

  await new Promise((r) => setTimeout(r, 10));

  await Status.recordChange({
    userId: bob.id,
    status: "EMERGENCY",
    timestamp: new Date(Date.now() - 10000),
  });

  await new Promise((r) => setTimeout(r, 10));

  await Status.recordChange({
    userId: bob.id,
    status: "OK",
    timestamp: new Date(), 
  });

  await new Promise((r) => setTimeout(r, 100));

  const res = await alice.client
    .get(`${QUERIES_BASE}?type=messages_private&peerId=${encodeURIComponent(bob.id)}&content=status`)
    .set("Accept", "application/json");

  console.log(`[TEST] GET response status: ${res.status}`);
  console.log(`[TEST] GET response body:`, JSON.stringify(res.body, null, 2));

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("mode");
  expect(res.body.mode).toBe("status_history"); 
  expect(res.body).toHaveProperty("count");
  expect(res.body).toHaveProperty("results");
  expect(Array.isArray(res.body.results)).toBe(true);
  expect(res.body.count).toBeGreaterThanOrEqual(3); 
  
  if (res.body.results.length > 0) {
    const firstResult = res.body.results[0];
    expect(firstResult).toHaveProperty("id");
    expect(firstResult).toHaveProperty("status");
    expect(firstResult).toHaveProperty("changedAt");
    expect(typeof firstResult.status).toBe("string");
    expect(firstResult.changedAt).toBeDefined();
    expect(firstResult.content).toBeUndefined();
  }
  
  const statuses = res.body.results.map((r) => r.status);
  expect(statuses).toContain("OK");
  expect(statuses).toContain("EMERGENCY");
});

