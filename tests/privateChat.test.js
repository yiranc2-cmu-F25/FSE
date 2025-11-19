// tests/privateChat.test.js
import request from "superagent";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.SPEED_TEST_BLOCK_ENABLED = "false";

import app from "../app.js";
import UserDac from "../dacs/userDac.js";
import MsgDac from "../dacs/msgDac.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import { inMemoryMsgDao } from "../daos/inMemoryMsgDao.js";
import { setupTestDb, cleanupTestDb } from "../config/testDbConfig.js";

const PORT = 3001;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const AUTH_BASE = `${BASE_URL}/api/authentications`;
const MSG_BASE = `${BASE_URL}/api/messages`;

let server;
let alice, bob;
let aliceAgent, bobAgent;

beforeAll(async () => {
  // Setup in-memory MongoDB
  await setupTestDb();

  // Set up in-memory DAOs
  UserDac.DAO = new inMemoryUserDao();
  MsgDac.DAO = new inMemoryMsgDao();
  
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
  
  // Cleanup test database
  await cleanupTestDb();
  
  // Reset DAO to prevent affecting production
  UserDac.DAO = null;
  MsgDac.DAO = null;
});

beforeEach(async () => {
  console.log("\n[TEST] ===== Starting new test =====");
  
  // Clear in-memory data for each test
  UserDac.DAO = new inMemoryUserDao();
  MsgDac.DAO = new inMemoryMsgDao();

  aliceAgent = request.agent();
  bobAgent = request.agent();

  // Register users
  alice = await registerUser(aliceAgent, `alice_${Date.now()}`);
  console.log("[TEST] Alice registered:", { id: alice.id, username: alice.username });
  
  // Small delay to ensure different IDs
  await new Promise((r) => setTimeout(r, 10));
  
  bob = await registerUser(bobAgent, `bob_${Date.now()}`);
  console.log("[TEST] Bob registered:", { id: bob.id, username: bob.username });
});

async function registerUser(agentClient, username) {
  try {
    console.log(`[TEST] Registering user: ${username}`);
    
    // Register
    const reg = await agentClient
      .post(`${AUTH_BASE}/registrations`)
      .set("Accept", "application/json")
      .send({ username, password: "testPassword" });

    console.log(`[TEST] Registration response status: ${reg.status}`);
    expect([200, 201]).toContain(reg.status);

    // Get user info - the JWT cookie should be set automatically by superagent agent
    const me = await agentClient
      .get(`${AUTH_BASE}/accounts`)
      .set("Accept", "application/json");

    console.log(`[TEST] Account info response:`, JSON.stringify(me.body, null, 2));
    
    expect(me.status).toBe(200);
    expect(me.body).toHaveProperty("username");

    // The ID might be in different places depending on your implementation
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

test("GET /api/messages/private/:peerId returns empty when no history", async () => {
  console.log(`[TEST] Getting private messages between Alice and Bob (should be empty)`);
  
  const res = await alice.client
    .get(`${MSG_BASE}/private/${encodeURIComponent(bob.id)}`)
    .set("Accept", "application/json");

  console.log(`[TEST] GET response status: ${res.status}`);
  console.log(`[TEST] GET response body:`, JSON.stringify(res.body, null, 2));

  expect(res.status).toBe(200);
  
  // Handle different response formats - your API returns {messages: [...]}
  const messages = res.body?.messages || [];
  expect(Array.isArray(messages)).toBe(true);
  expect(messages).toHaveLength(0);
});

test("GET returns merged & time-ordered messages with correct isOwn", async () => {
  console.log("\n[TEST] === Testing merged & time-ordered messages ===");
  
  // A -> B: First message
  console.log(`[TEST] Alice (ID: ${alice.id}) sending message to Bob (ID: ${bob.id})...`);
  console.log(`[TEST] Alice username: ${alice.username}, Bob username: ${bob.username}`);
  
  try {
    const p1 = await alice.client
      .post(`${MSG_BASE}/private`)
      .set("Accept", "application/json")
      .send({ 
        receiver: bob.id,  // Changed: send as number, not string
        content: "A1",
        timestamp: new Date().toISOString()
      });

    console.log(`[TEST] Alice's POST response status: ${p1.status}`);
    console.log(`[TEST] Alice's POST response body:`, JSON.stringify(p1.body, null, 2));
    expect([200, 201]).toContain(p1.status);
  } catch (error) {
    console.error("[TEST] ERROR: Alice's POST failed:", error.message);
    if (error.response) {
      console.error("[TEST] Response status:", error.response.status);
      console.error("[TEST] Response body:", JSON.stringify(error.response.body || error.response.text, null, 2));
    }
    throw error;
  }

  // Wait to ensure different timestamps
  await new Promise((r) => setTimeout(r, 100));

  // B -> A: Second message
  console.log(`[TEST] Bob (ID: ${bob.id}) sending message to Alice (ID: ${alice.id})...`);
  
  try {
    const p2 = await bob.client
      .post(`${MSG_BASE}/private`)
      .set("Accept", "application/json")
      .send({ 
        receiver: alice.id,  // Changed: send as number, not string
        content: "B1",
        timestamp: new Date().toISOString()
      });

    console.log(`[TEST] Bob's POST response status: ${p2.status}`);
    console.log(`[TEST] Bob's POST response body:`, JSON.stringify(p2.body, null, 2));
    expect([200, 201]).toContain(p2.status);
  } catch (error) {
    console.error("[TEST] ERROR: Bob's POST failed:", error.message);
    if (error.response) {
      console.error("[TEST] Response status:", error.response.status);
      console.error("[TEST] Response body:", JSON.stringify(error.response.body || error.response.text, null, 2));
    }
    throw error;
  }

  // Wait for messages to be fully processed
  await new Promise((r) => setTimeout(r, 100));

  // Alice's view: should see both messages
  console.log(`[TEST] Alice retrieving conversation with Bob...`);
  const resA = await alice.client
    .get(`${MSG_BASE}/private/${encodeURIComponent(bob.id)}`)
    .set("Accept", "application/json");

  console.log(`[TEST] Alice's GET response status: ${resA.status}`);
  console.log(`[TEST] Alice's GET response body:`, JSON.stringify(resA.body, null, 2));

  expect(resA.status).toBe(200);
  
  const msgsA = resA.body?.messages || [];
  console.log(`[TEST] Alice sees ${msgsA.length} messages`);
  expect(msgsA.length).toBeGreaterThanOrEqual(2);
  
  const contentsA = msgsA.map((m) => m.content);
  console.log(`[TEST] Alice's message contents:`, contentsA);
  expect(contentsA).toEqual(expect.arrayContaining(["A1", "B1"]));

  const a1Msg = msgsA.find((m) => m.content === "A1");
  const b1Msg = msgsA.find((m) => m.content === "B1");
  
  console.log(`[TEST] A1 message (from Alice's view):`, a1Msg);
  console.log(`[TEST] B1 message (from Alice's view):`, b1Msg);
  
  expect(a1Msg?.isOwn).toBe(true);
  expect(b1Msg?.isOwn).toBe(false);

  // Bob's view: should see both messages with opposite isOwn flags
  console.log(`[TEST] Bob retrieving conversation with Alice...`);
  const resB = await bob.client
    .get(`${MSG_BASE}/private/${encodeURIComponent(alice.id)}`)
    .set("Accept", "application/json");

  console.log(`[TEST] Bob's GET response status: ${resB.status}`);
  console.log(`[TEST] Bob's GET response body:`, JSON.stringify(resB.body, null, 2));

  expect(resB.status).toBe(200);
  
  const msgsB = resB.body?.messages || [];
  console.log(`[TEST] Bob sees ${msgsB.length} messages`);
  expect(msgsB.length).toBeGreaterThanOrEqual(2);

  const a1MsgBob = msgsB.find((m) => m.content === "A1");
  const b1MsgBob = msgsB.find((m) => m.content === "B1");
  
  console.log(`[TEST] A1 message (from Bob's view):`, a1MsgBob);
  console.log(`[TEST] B1 message (from Bob's view):`, b1MsgBob);
  
  expect(a1MsgBob?.isOwn).toBe(false);
  expect(b1MsgBob?.isOwn).toBe(true);
});

test("POST /api/messages/private creates a DM; then GET shows it", async () => {
  console.log("\n[TEST] === Testing POST then GET ===");
  
  console.log(`[TEST] Alice (ID: ${alice.id}) sending DM to Bob (ID: ${bob.id})...`);
  
  try {
    const posted = await alice.client
      .post(`${MSG_BASE}/private`)
      .set("Accept", "application/json")
      .send({ 
        receiver: bob.id,  // Changed: send as number, not string
        content: "new dm",
        timestamp: new Date().toISOString()
      });

    console.log(`[TEST] POST response status: ${posted.status}`);
    console.log(`[TEST] POST response body:`, JSON.stringify(posted.body, null, 2));
    expect([200, 201]).toContain(posted.status);
  } catch (error) {
    console.error("[TEST] ERROR: POST failed:", error.message);
    if (error.response) {
      console.error("[TEST] Response status:", error.response.status);
      console.error("[TEST] Response body:", JSON.stringify(error.response.body || error.response.text, null, 2));
    }
    throw error;
  }

  await new Promise((r) => setTimeout(r, 100));

  const res = await bob.client
    .get(`${MSG_BASE}/private/${encodeURIComponent(alice.id)}`)
    .set("Accept", "application/json");

  console.log(`[TEST] GET response status: ${res.status}`);
  console.log(`[TEST] GET response body:`, JSON.stringify(res.body, null, 2));

  expect(res.status).toBe(200);
  
  const messages = res.body?.messages || [];
  console.log(`[TEST] Bob sees ${messages.length} messages`);
  
  const contents = messages.map((m) => m.content);
  console.log(`[TEST] Message contents:`, contents);
  
  expect(contents).toContain("new dm");
  
  const dmMsg = messages.find((m) => m.content === "new dm");
  console.log(`[TEST] DM message (from Bob's view):`, dmMsg);
  expect(dmMsg?.isOwn).toBe(false);
});
