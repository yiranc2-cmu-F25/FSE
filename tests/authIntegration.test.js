import request from "superagent";
import app from "../app.js";
import { setupTestDb, cleanupTestDb } from "../config/testDbConfig.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import { inMemoryCategorySkillPresetDao } from "../daos/inMemoryCategorySkillPresetDao.js";
import userDac from "../dacs/userDac.js";
import CategorySkillPresetDac from "../dacs/categorySkillPresetDac.js";
import { USER_STATUS } from "../constants/userStatus.js";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.SPEED_TEST_BLOCK_ENABLED = "false";

const PORT = 3004;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const AUTH_BASE = `${BASE_URL}/api/authentications`;

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

describe("Authentication REST API Integration Tests", () => {
	beforeAll(async () => {
		await setupTestDb();
		
		userDac.DAO = new inMemoryUserDao();
		
		const presetDao = new inMemoryCategorySkillPresetDao();
		await presetDao.updatePresets({
			categories: ["First Aid", "Technical", "Communication"],
			skills: ["CPR", "JavaScript", "Python", "Emergency Communication", "Public Speaking"],
		});
		CategorySkillPresetDac.DAO = presetDao;

		const mockSocket = {
			emitCoachingBoardNotification: () => {},
			emitCoachingBoardComment: () => {},
			emitCoachingBoardReply: () => {},
			emitCoachingBoardCommentDeleted: () => {},
			emitCoachingBoardReplyDeleted: () => {},
			disconnectUser: () => {},
		};
		app.set("socketInstance", mockSocket);
		app.locals.socketInstance = mockSocket;

		await new Promise((resolve) => {
			server = app.listen(PORT, resolve);
		});
	});

	beforeEach(async () => {
		userDac.DAO = new inMemoryUserDao();
		
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
		CategorySkillPresetDac.DAO = null;
	});

	describe("POST /api/authentications/registrations - Register user", () => {
		test("should successfully register a new user (positive test)", async () => {
			const agentClient = request.agent();
			const username = `register_user_${Date.now()}`;
			const password = "testPassword123";

			const response = await agentClient
				.post(`${AUTH_BASE}/registrations`)
				.set("Accept", "application/json")
				.send({ username, password })
				.ok((res) => true);

			expect(response.status).toBe(201);
			expect(response.body.message).toBe("User successfully registered");
			expect(response.body.username).toBe(username);

			// Verify cookie is set
			const cookieHeader = response.headers["set-cookie"];
			expect(cookieHeader).toBeTruthy();
		});

		test("should return 400 for invalid username (negative test)", async () => {
			const agentClient = request.agent();

			const response = await agentClient
				.post(`${AUTH_BASE}/registrations`)
				.set("Accept", "application/json")
				.send({ username: "ab", password: "testPassword123" }) // Too short
				.ok((res) => true);

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("Invalid username");
		});

		test("should return 400 for invalid password (negative test)", async () => {
			const agentClient = request.agent();

			const response = await agentClient
				.post(`${AUTH_BASE}/registrations`)
				.set("Accept", "application/json")
				.send({ username: "validuser", password: "abc" }) // Too short
				.ok((res) => true);

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("Invalid password");
		});

		test("should return 400 for banned username (negative test)", async () => {
			const agentClient = request.agent();

			const response = await agentClient
				.post(`${AUTH_BASE}/registrations`)
				.set("Accept", "application/json")
				.send({ username: "admin", password: "testPassword123" }) // Banned username
				.ok((res) => true);

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("Invalid username");
		});

		test("should reject duplicate username registration (negative test)", async () => {
			const agentClient = request.agent();
			const username = `duplicate_user_${Date.now()}`;
			const password = "testPassword123";

			// First registration
			await agentClient
				.post(`${AUTH_BASE}/registrations`)
				.set("Accept", "application/json")
				.send({ username, password })
				.ok((res) => true);

			// Try to register again with same username
			const response = await agentClient
				.post(`${AUTH_BASE}/registrations`)
				.set("Accept", "application/json")
				.send({ username, password })
				.ok((res) => true);

			// Should fail (either 400 or 500 depending on implementation)
			expect([400, 500]).toContain(response.status);
		});
	});

	describe("POST /api/authentications/users/usernames - Check username status", () => {
		test("should return 'available' for new username (positive test)", async () => {
			const agentClient = request.agent();
			const username = `available_user_${Date.now()}`;

			const response = await agentClient
				.post(`${AUTH_BASE}/users/usernames`)
				.set("Accept", "application/json")
				.send({ username })
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(response.body.status).toBe("available");
		});

		test("should return 'exists' for existing username (positive test)", async () => {
			const agentClient = request.agent();
			const username = `exists_user_${Date.now()}`;
			const password = "testPassword123";

			// Register user first
			await agentClient
				.post(`${AUTH_BASE}/registrations`)
				.set("Accept", "application/json")
				.send({ username, password })
				.ok((res) => true);

			// Check username status
			const response = await agentClient
				.post(`${AUTH_BASE}/users/usernames`)
				.set("Accept", "application/json")
				.send({ username })
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(response.body.status).toBe("exists");
		});

		test("should return 'reserved' for banned username (positive test)", async () => {
			const agentClient = request.agent();

			const response = await agentClient
				.post(`${AUTH_BASE}/users/usernames`)
				.set("Accept", "application/json")
				.send({ username: "admin" })
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(response.body.status).toBe("reserved");
			expect(response.body.reason).toBe("banned_username");
			expect(response.body.message).toBe("This username is not allowed.");
		});

		test("should return 'available' when excluding current user ID (positive test)", async () => {
			const agentClient = request.agent();
			const username = `exclude_user_${Date.now()}`;
			const password = "testPassword123";

			// Register user first
			const registerResponse = await agentClient
				.post(`${AUTH_BASE}/registrations`)
				.set("Accept", "application/json")
				.send({ username, password })
				.ok((res) => true);

			// Get user ID
			const profileResponse = await agentClient
				.get(`${AUTH_BASE}/accounts`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const userId = profileResponse.body.id;

			// Check username status excluding this user ID
			const response = await agentClient
				.post(`${AUTH_BASE}/users/usernames`)
				.set("Accept", "application/json")
				.send({ username, excludeUserId: userId })
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(response.body.status).toBe("available");
		});
	});

	describe("POST /api/authentications/sessions - Login", () => {
		test("should successfully login with valid credentials (positive test)", async () => {
			const agentClient = request.agent();
			const username = `login_user_${Date.now()}`;
			const password = "testPassword123";

			// Register user first
			await agentClient
				.post(`${AUTH_BASE}/registrations`)
				.set("Accept", "application/json")
				.send({ username, password })
				.ok((res) => true);

			// Login
			const response = await agentClient
				.post(`${AUTH_BASE}/sessions`)
				.set("Accept", "application/json")
				.send({ username, password })
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(response.body.username).toBe(username);
			expect(response.body.ok).toBe(true);

			// Verify cookie is set
			const cookieHeader = response.headers["set-cookie"];
			expect(cookieHeader).toBeTruthy();
		});

		test("should return 404 for non-existent user (negative test)", async () => {
			const agentClient = request.agent();

			const response = await agentClient
				.post(`${AUTH_BASE}/sessions`)
				.set("Accept", "application/json")
				.send({ username: "nonexistentuser", password: "testPassword123" })
				.ok((res) => true);

			expect(response.status).toBe(404);
			expect(response.body.error).toBe("User not found");
		});

		test("should return 401 for invalid password (negative test)", async () => {
			const agentClient = request.agent();
			const username = `login_user2_${Date.now()}`;
			const password = "testPassword123";

			// Register user first
			await agentClient
				.post(`${AUTH_BASE}/registrations`)
				.set("Accept", "application/json")
				.send({ username, password })
				.ok((res) => true);

			// Try to login with wrong password
			const response = await agentClient
				.post(`${AUTH_BASE}/sessions`)
				.set("Accept", "application/json")
				.send({ username, password: "wrongPassword" })
				.ok((res) => true);

			expect(response.status).toBe(401);
			expect(response.body.error).toBe("Invalid password");
		});

		test("should return 403 for inactive user (negative test)", async () => {
			const agentClient = request.agent();
			const username = `inactive_user_${Date.now()}`;
			const password = "testPassword123";

			// Register user first
			const registerResponse = await agentClient
				.post(`${AUTH_BASE}/registrations`)
				.set("Accept", "application/json")
				.send({ username, password })
				.ok((res) => true);

			// Get user ID
			const profileResponse = await agentClient
				.get(`${AUTH_BASE}/accounts`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const userId = profileResponse.body.id;

			// Set user account status to inactive (not sharedstatus)
			await userDac.DAO.updateAccountStatusById(userId, USER_STATUS.INACTIVE);

			// Try to login
			const response = await agentClient
				.post(`${AUTH_BASE}/sessions`)
				.set("Accept", "application/json")
				.send({ username, password })
				.ok((res) => true);

			expect(response.status).toBe(403);
			expect(response.body.error).toBe("Account inactive");
			expect(response.body.reason).toBe("Your account has been deactivated");
		});
	});

	describe("GET /api/authentications/accounts - Get current user", () => {
		test("should successfully get current user profile (positive test)", async () => {
			const agentClient = request.agent();
			const user = await registerUser(agentClient, `getme_user_${Date.now()}`, "testPassword123");

			const response = await agentClient
				.get(`${AUTH_BASE}/accounts`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(response.body.id).toBe(user.id);
			expect(response.body.username).toBe(user.username);
			expect(response.body.status).toBeDefined();
			expect(response.body.role).toBeDefined();
			expect(response.body.image).toBeDefined();
		});

		test("should return 401 when user not found (negative test)", async () => {
			const agentClient = request.agent();
			// Register and get cookie
			const user = await registerUser(agentClient, `getme_user2_${Date.now()}`, "testPassword123");

			// Delete user from DAO to simulate user not found
			// Find and remove the user from the current DAO
			const currentDao = userDac.DAO;
			if (currentDao && currentDao.users) {
				const userIndex = currentDao.users.findIndex(u => String(u.id) === String(user.id));
				if (userIndex !== -1) {
					currentDao.users.splice(userIndex, 1);
				}
			}

			const response = await agentClient
				.get(`${AUTH_BASE}/accounts`)
				.set("Accept", "application/json")
				.ok((res) => true);

			// JWT middleware checks user existence before getMe, so it returns 401
			expect(response.status).toBe(401);
			expect(response.body.error).toBe("Unauthorized");
			expect(response.body.reason).toBe("User not found");
		});
	});

	describe("DELETE /api/authentications/sessions - Logout", () => {
		test("should successfully logout user (positive test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `logout_user_${Date.now()}`, "testPassword123");

			const response = await agentClient
				.delete(`${AUTH_BASE}/sessions`)
				.set("Accept", "application/json")
				.ok((res) => true);

			// Logout returns 204, but superagent may handle it as 200
			// Check that it's either 204 or 200 (both indicate success)
			expect([200, 204]).toContain(response.status);
		});
	});

	describe("GET /api/authentications/lists - List members", () => {
		test("should successfully get list of members (positive test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `list_members_user_${Date.now()}`, "testPassword123");

			// Register additional users
			const agentClient2 = request.agent();
			await registerUser(agentClient2, `list_members_user2_${Date.now()}`, "testPassword123");

			const response = await agentClient
				.get(`${AUTH_BASE}/lists`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(response.body).toBeDefined();
			// Response structure depends on getOnlineOfflineMembers implementation
		});
	});
});

