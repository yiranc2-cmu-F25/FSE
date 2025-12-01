import { jest } from "@jest/globals";
import request from "superagent";
import app from "../app.js";
import { setupTestDb, cleanupTestDb } from "../config/testDbConfig.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import { inMemoryMsgDao } from "../daos/inMemoryMsgDao.js";
import { inMemoryCategorySkillPresetDao } from "../daos/inMemoryCategorySkillPresetDao.js";
import userDac from "../dacs/userDac.js";
import MsgDac from "../dacs/msgDac.js";
import CategorySkillPresetDac from "../dacs/categorySkillPresetDac.js";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.SPEED_TEST_BLOCK_ENABLED = "false";

const PORT = 3005;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const AUTH_BASE = `${BASE_URL}/api/authentications`;
const MESSAGE_BASE = `${BASE_URL}/api/messages`;

let server;

async function registerUser(agentClient, username, password = "testPassword") {
	const registration = await agentClient
		.post(`${AUTH_BASE}/registrations`)
		.set("Accept", "application/json")
		.send({ username, password })
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
}

describe("Public Chat REST API Integration Tests", () => {
	beforeAll(async () => {
		await setupTestDb();
		
		userDac.DAO = new inMemoryUserDao();
		MsgDac.DAO = new inMemoryMsgDao();
		
		const presetDao = new inMemoryCategorySkillPresetDao();
		await presetDao.updatePresets({
			categories: ["First Aid", "Technical", "Communication"],
			skills: ["CPR", "JavaScript", "Python", "Emergency Communication", "Public Speaking"],
		});
		CategorySkillPresetDac.DAO = presetDao;

		const mockSocket = {
			emitMessageFrom: jest.fn(),
			disconnectUser: jest.fn(),
		};
		app.set("socketInstance", mockSocket);
		app.locals.socketInstance = mockSocket;

		await new Promise((resolve) => {
			server = app.listen(PORT, resolve);
		});
	});

	beforeEach(async () => {
		userDac.DAO = new inMemoryUserDao();
		MsgDac.DAO = new inMemoryMsgDao();
		
		const presetDao = new inMemoryCategorySkillPresetDao();
		await presetDao.updatePresets({
			categories: ["First Aid", "Technical", "Communication"],
			skills: ["CPR", "JavaScript", "Python", "Emergency Communication", "Public Speaking"],
		});
		CategorySkillPresetDac.DAO = presetDao;
	});

	afterAll(async () => {
		if (server) {
			await new Promise((resolve) => {
				server.close(() => {
					resolve();
				});
			});
		}

		await cleanupTestDb();
		userDac.DAO = null;
		MsgDac.DAO = null;
		CategorySkillPresetDac.DAO = null;
	});

	describe("GET /api/messages/public - Get public messages", () => {
		test("should successfully get public messages (positive test)", async () => {
			const agentClient = request.agent();
			const user = await registerUser(agentClient, `public_msg_user_${Date.now()}`, "testPassword123");

			// Send a public message first
			await agentClient
				.post(`${MESSAGE_BASE}/public`)
				.set("Accept", "application/json")
				.send({
					sender: user.id,
					content: "Hello everyone!",
					status: "OK",
					timestamp: new Date().toISOString(),
				})
				.ok((res) => true);

			// Get public messages
			const response = await agentClient
				.get(`${MESSAGE_BASE}/public`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(Array.isArray(response.body)).toBe(true);
			expect(response.body.length).toBeGreaterThan(0);
			
			const message = response.body.find(m => m.content === "Hello everyone!");
			expect(message).toBeDefined();
			expect(message.sender).toBe(user.username);
			expect(message.status).toBe("OK");
			expect(message.isOwn).toBe(true);
		});

		test("should return empty array when no messages exist (positive test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `public_msg_user2_${Date.now()}`, "testPassword123");

			const response = await agentClient
				.get(`${MESSAGE_BASE}/public`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(Array.isArray(response.body)).toBe(true);
			expect(response.body.length).toBe(0);
		});

		test("should mark messages as own when sent by requester (positive test)", async () => {
			const agentClient = request.agent();
			const user = await registerUser(agentClient, `public_msg_user3_${Date.now()}`, "testPassword123");

			// Send a public message
			await agentClient
				.post(`${MESSAGE_BASE}/public`)
				.set("Accept", "application/json")
				.send({
					sender: user.id,
					content: "My message",
					status: "OK",
					timestamp: new Date().toISOString(),
				})
				.ok((res) => true);

			// Get public messages
			const response = await agentClient
				.get(`${MESSAGE_BASE}/public`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const message = response.body.find(m => m.content === "My message");
			expect(message).toBeDefined();
			expect(message.isOwn).toBe(true);
		});

		test("should mark messages as not own when sent by different user (positive test)", async () => {
			const agentClient1 = request.agent();
			const user1 = await registerUser(agentClient1, `public_msg_user4_${Date.now()}`, "testPassword123");

			// Send a public message as user1
			await agentClient1
				.post(`${MESSAGE_BASE}/public`)
				.set("Accept", "application/json")
				.send({
					sender: user1.id,
					content: "Message from user1",
					status: "OK",
					timestamp: new Date().toISOString(),
				})
				.ok((res) => true);

			// Get messages as different user
			const agentClient2 = request.agent();
			const user2 = await registerUser(agentClient2, `public_msg_user5_${Date.now()}`, "testPassword123");

			const response = await agentClient2
				.get(`${MESSAGE_BASE}/public`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const message = response.body.find(m => m.content === "Message from user1");
			expect(message).toBeDefined();
			expect(message.isOwn).toBe(false);
		});
	});

	describe("POST /api/messages/public - Send public message", () => {
		test("should successfully send public message (positive test)", async () => {
			const agentClient = request.agent();
			const user = await registerUser(agentClient, `send_public_user_${Date.now()}`, "testPassword123");

			const messageData = {
				sender: user.id,
				content: "Test public message",
				status: "OK",
				timestamp: new Date().toISOString(),
			};

			const response = await agentClient
				.post(`${MESSAGE_BASE}/public`)
				.set("Accept", "application/json")
				.send(messageData)
				.ok((res) => true);

			expect(response.status).toBe(201);
			expect(response.body.message).toBe("Message sent successfully");

			// Verify message was created
			const getResponse = await agentClient
				.get(`${MESSAGE_BASE}/public`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const message = getResponse.body.find(m => m.content === "Test public message");
			expect(message).toBeDefined();
			expect(message.sender).toBe(user.username);
		});

		test("should return 400 when sender is missing (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `send_public_user2_${Date.now()}`, "testPassword123");

			const response = await agentClient
				.post(`${MESSAGE_BASE}/public`)
				.set("Accept", "application/json")
				.send({
					content: "Test message",
					status: "OK",
				})
				.ok((res) => true);

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("Missing required fields");
		});

		test("should return 400 when content is missing (negative test)", async () => {
			const agentClient = request.agent();
			const user = await registerUser(agentClient, `send_public_user3_${Date.now()}`, "testPassword123");

			const response = await agentClient
				.post(`${MESSAGE_BASE}/public`)
				.set("Accept", "application/json")
				.send({
					sender: user.id,
					status: "OK",
				})
				.ok((res) => true);

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("Missing required fields");
		});

		test("should return 400 when status is missing (negative test)", async () => {
			const agentClient = request.agent();
			const user = await registerUser(agentClient, `send_public_user4_${Date.now()}`, "testPassword123");

			const response = await agentClient
				.post(`${MESSAGE_BASE}/public`)
				.set("Accept", "application/json")
				.send({
					sender: user.id,
					content: "Test message",
				})
				.ok((res) => true);

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("Missing required fields");
		});

		test("should return 404 when sender not found (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `send_public_user5_${Date.now()}`, "testPassword123");

			const fakeUserId = "999999";

			const response = await agentClient
				.post(`${MESSAGE_BASE}/public`)
				.set("Accept", "application/json")
				.send({
					sender: fakeUserId,
					content: "Test message",
					status: "OK",
				})
				.ok((res) => true);

			expect(response.status).toBe(404);
			expect(response.body.error).toBe("Sender not found");
		});

		test("should trim content whitespace (positive test)", async () => {
			const agentClient = request.agent();
			const user = await registerUser(agentClient, `send_public_user6_${Date.now()}`, "testPassword123");

			const response = await agentClient
				.post(`${MESSAGE_BASE}/public`)
				.set("Accept", "application/json")
				.send({
					sender: user.id,
					content: "  Trimmed message  ",
					status: "OK",
					timestamp: new Date().toISOString(),
				})
				.ok((res) => true);

			expect(response.status).toBe(201);

			// Verify message content was trimmed
			const getResponse = await agentClient
				.get(`${MESSAGE_BASE}/public`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const message = getResponse.body.find(m => m.content === "Trimmed message");
			expect(message).toBeDefined();
		});
	});
});

