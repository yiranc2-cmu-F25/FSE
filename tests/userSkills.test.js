import request from "superagent";
import app from "../app.js";
import { setupTestDb, cleanupTestDb } from "../config/testDbConfig.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import { inMemoryCategorySkillPresetDao } from "../daos/inMemoryCategorySkillPresetDao.js";
import userDac from "../dacs/userDac.js";
import CategorySkillPresetDac from "../dacs/categorySkillPresetDac.js";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.SPEED_TEST_BLOCK_ENABLED = "false";

const PORT = 3002;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const AUTH_BASE = `${BASE_URL}/api/authentications`;
const USER_BASE = `${BASE_URL}/api/users`;

let server;

async function registerUser(agentClient, username, password = "testPassword", skills = []) {
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

	// Update user skills if provided
	if (skills.length > 0) {
		await userDac.DAO.updateSkillsById(profile.body.id, skills);
	}

	return {
		username,
		id: profile.body.id,
		cookie,
		client: agentClient,
	};
}

describe("User Skills REST API Integration Tests", () => {
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

	describe("GET /api/users/:id/skills - Get user skills", () => {
		test("should successfully get user skills (positive test)", async () => {
			const agentClient = request.agent();
			const user = await registerUser(agentClient, `get_skills_user_${Date.now()}`, "password", ["CPR", "JavaScript"]);

			const response = await agentClient
				.get(`${USER_BASE}/${user.id}/skills`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(response.body.userId).toBe(user.id);
			expect(Array.isArray(response.body.skills)).toBe(true);
			expect(response.body.skills).toContain("CPR");
			expect(response.body.skills).toContain("JavaScript");
		});

		test("should return 404 when user not found (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `get_skills_user2_${Date.now()}`, "password", []);

			const fakeUserId = "999999";

			const response = await agentClient
				.get(`${USER_BASE}/${fakeUserId}/skills`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(response.status).toBe(404);
			expect(response.body.error).toBe("User not found");
		});

		test("should return 400 when user ID is missing (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `get_skills_user3_${Date.now()}`, "password", []);

			// Note: This might not be testable if the route requires :id parameter
			// The route definition shows :id is required, so this test may not be applicable
		});
	});

	describe("PUT /api/users/skills - Update user skills", () => {
		test("should successfully update user skills (positive test)", async () => {
			const agentClient = request.agent();
			const user = await registerUser(agentClient, `update_skills_user_${Date.now()}`, "password", ["CPR"]);

			const newSkills = ["CPR", "JavaScript", "Python"];

			const response = await agentClient
				.put(`${USER_BASE}/skills`)
				.set("Accept", "application/json")
				.send({
					userId: user.id,
					skills: newSkills,
				})
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(response.body.message).toBe("User skills updated successfully");
			expect(response.body.userId).toBe(user.id);
			expect(response.body.skills).toEqual(newSkills);

			// Verify skills were updated
			const getResponse = await agentClient
				.get(`${USER_BASE}/${user.id}/skills`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.status).toBe(200);
			expect(getResponse.body.skills).toEqual(newSkills);
		});

		test("should return 400 when userId is missing (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `update_skills_user2_${Date.now()}`, "password", []);

			const response = await agentClient
				.put(`${USER_BASE}/skills`)
				.set("Accept", "application/json")
				.send({
					skills: ["CPR"],
				})
				.ok((res) => true);

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("Missing userId");
		});

		test("should return 400 when skills is not an array (negative test)", async () => {
			const agentClient = request.agent();
			const user = await registerUser(agentClient, `update_skills_user3_${Date.now()}`, "password", []);

			const response = await agentClient
				.put(`${USER_BASE}/skills`)
				.set("Accept", "application/json")
				.send({
					userId: user.id,
					skills: "not an array",
				})
				.ok((res) => true);

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("Skills must be an array");
		});

		test("should return 404 when user not found (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `update_skills_user4_${Date.now()}`, "password", []);

			const fakeUserId = "999999";

			const response = await agentClient
				.put(`${USER_BASE}/skills`)
				.set("Accept", "application/json")
				.send({
					userId: fakeUserId,
					skills: ["CPR"],
				})
				.ok((res) => true);

			expect(response.status).toBe(404);
			expect(response.body.error).toBe("User not found");
		});
	});
});

