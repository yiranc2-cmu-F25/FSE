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

const PORT = 3003;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const AUTH_BASE = `${BASE_URL}/api/authentications`;
const PRESET_BASE = `${BASE_URL}/api/category-skill-presets`;

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

describe("Category Skill Preset REST API Integration Tests", () => {
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

	describe("GET /api/category-skill-presets - Get presets", () => {
		test("should successfully get presets (positive test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `get_presets_user_${Date.now()}`, "password");

			const response = await agentClient
				.get(PRESET_BASE)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(response.body.categories).toBeDefined();
			expect(response.body.skills).toBeDefined();
			expect(Array.isArray(response.body.categories)).toBe(true);
			expect(Array.isArray(response.body.skills)).toBe(true);
			expect(response.body.categories).toContain("First Aid");
			expect(response.body.skills).toContain("CPR");
		});
	});

	describe("PUT /api/category-skill-presets - Update presets", () => {
		test("should successfully update all presets (positive test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `update_presets_user_${Date.now()}`, "password");

			const newPresets = {
				categories: ["First Aid", "Technical", "Communication", "Fire Safety"],
				skills: ["CPR", "JavaScript", "Python", "AED Operation"],
			};

			const response = await agentClient
				.put(PRESET_BASE)
				.set("Accept", "application/json")
				.send(newPresets)
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(response.body.categories).toEqual(newPresets.categories);
			expect(response.body.skills).toEqual(newPresets.skills);

			// Verify presets were updated
			const getResponse = await agentClient
				.get(PRESET_BASE)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.status).toBe(200);
			expect(getResponse.body.categories).toEqual(newPresets.categories);
			expect(getResponse.body.skills).toEqual(newPresets.skills);
		});

		test("should return 400 when categories is not an array (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `update_presets_user2_${Date.now()}`, "password");

			const response = await agentClient
				.put(PRESET_BASE)
				.set("Accept", "application/json")
				.send({
					categories: "not an array",
					skills: ["CPR"],
				})
				.ok((res) => true);

			expect(response.status).toBe(400);
			expect(response.body.status).toBe("error");
			expect(response.body.message).toBe("Categories and skills must be arrays");
		});

		test("should return 400 when skills is not an array (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `update_presets_user3_${Date.now()}`, "password");

			const response = await agentClient
				.put(PRESET_BASE)
				.set("Accept", "application/json")
				.send({
					categories: ["First Aid"],
					skills: "not an array",
				})
				.ok((res) => true);

			expect(response.status).toBe(400);
			expect(response.body.status).toBe("error");
			expect(response.body.message).toBe("Categories and skills must be arrays");
		});
	});

	describe("POST /api/category-skill-presets/categories - Add category", () => {
		test("should successfully add a new category (positive test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `add_category_user_${Date.now()}`, "password");

			const newCategory = "Fire Safety";

			const response = await agentClient
				.post(`${PRESET_BASE}/categories`)
				.set("Accept", "application/json")
				.send({ category: newCategory })
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(response.body.categories).toContain(newCategory);

			// Verify category was added
			const getResponse = await agentClient
				.get(PRESET_BASE)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.body.categories).toContain(newCategory);
		});

		test("should return 409 when category already exists (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `add_category_user2_${Date.now()}`, "password");

			const existingCategory = "First Aid";

			const response = await agentClient
				.post(`${PRESET_BASE}/categories`)
				.set("Accept", "application/json")
				.send({ category: existingCategory })
				.ok((res) => true);

			expect(response.status).toBe(409);
			expect(response.body.status).toBe("error");
			expect(response.body.message).toBe("Category already exists");
		});

		test("should return 400 when category is missing (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `add_category_user3_${Date.now()}`, "password");

			const response = await agentClient
				.post(`${PRESET_BASE}/categories`)
				.set("Accept", "application/json")
				.send({})
				.ok((res) => true);

			expect(response.status).toBe(400);
			expect(response.body.status).toBe("error");
			expect(response.body.message).toContain("Category must be a non-empty string");
		});

		test("should return 400 when category is empty string (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `add_category_user4_${Date.now()}`, "password");

			const response = await agentClient
				.post(`${PRESET_BASE}/categories`)
				.set("Accept", "application/json")
				.send({ category: "" })
				.ok((res) => true);

			expect(response.status).toBe(400);
			expect(response.body.status).toBe("error");
			expect(response.body.message).toContain("Category must be a non-empty string");
		});
	});

	describe("DELETE /api/category-skill-presets/categories - Delete category", () => {
		test("should successfully delete a category (positive test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `delete_category_user_${Date.now()}`, "password");

			const categoryToDelete = "Technical";

			const response = await agentClient
				.delete(`${PRESET_BASE}/categories`)
				.set("Accept", "application/json")
				.send({ category: categoryToDelete })
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(response.body.categories).not.toContain(categoryToDelete);

			// Verify category was deleted
			const getResponse = await agentClient
				.get(PRESET_BASE)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.body.categories).not.toContain(categoryToDelete);
		});

		test("should return 404 when category not found (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `delete_category_user2_${Date.now()}`, "password");

			const nonExistentCategory = "Non Existent Category";

			const response = await agentClient
				.delete(`${PRESET_BASE}/categories`)
				.set("Accept", "application/json")
				.send({ category: nonExistentCategory })
				.ok((res) => true);

			expect(response.status).toBe(404);
			expect(response.body.status).toBe("error");
			expect(response.body.message).toBe("Category not found");
		});

		test("should return 400 when category is missing (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `delete_category_user3_${Date.now()}`, "password");

			const response = await agentClient
				.delete(`${PRESET_BASE}/categories`)
				.set("Accept", "application/json")
				.send({})
				.ok((res) => true);

			expect(response.status).toBe(400);
			expect(response.body.status).toBe("error");
			expect(response.body.message).toContain("Category must be a non-empty string");
		});
	});

	describe("POST /api/category-skill-presets/skills - Add skill", () => {
		test("should successfully add a new skill (positive test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `add_skill_user_${Date.now()}`, "password");

			const newSkill = "AED Operation";

			const response = await agentClient
				.post(`${PRESET_BASE}/skills`)
				.set("Accept", "application/json")
				.send({ skill: newSkill })
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(response.body.skills).toContain(newSkill);

			// Verify skill was added
			const getResponse = await agentClient
				.get(PRESET_BASE)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.body.skills).toContain(newSkill);
		});

		test("should return 409 when skill already exists (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `add_skill_user2_${Date.now()}`, "password");

			const existingSkill = "CPR";

			const response = await agentClient
				.post(`${PRESET_BASE}/skills`)
				.set("Accept", "application/json")
				.send({ skill: existingSkill })
				.ok((res) => true);

			expect(response.status).toBe(409);
			expect(response.body.status).toBe("error");
			expect(response.body.message).toBe("Skill already exists");
		});

		test("should return 400 when skill is missing (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `add_skill_user3_${Date.now()}`, "password");

			const response = await agentClient
				.post(`${PRESET_BASE}/skills`)
				.set("Accept", "application/json")
				.send({})
				.ok((res) => true);

			expect(response.status).toBe(400);
			expect(response.body.status).toBe("error");
			expect(response.body.message).toContain("Skill must be a non-empty string");
		});

		test("should return 400 when skill is empty string (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `add_skill_user4_${Date.now()}`, "password");

			const response = await agentClient
				.post(`${PRESET_BASE}/skills`)
				.set("Accept", "application/json")
				.send({ skill: "   " })
				.ok((res) => true);

			expect(response.status).toBe(400);
			expect(response.body.status).toBe("error");
			expect(response.body.message).toContain("Skill must be a non-empty string");
		});
	});

	describe("DELETE /api/category-skill-presets/skills - Delete skill", () => {
		test("should successfully delete a skill (positive test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `delete_skill_user_${Date.now()}`, "password");

			const skillToDelete = "Python";

			const response = await agentClient
				.delete(`${PRESET_BASE}/skills`)
				.set("Accept", "application/json")
				.send({ skill: skillToDelete })
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(response.body.skills).not.toContain(skillToDelete);

			// Verify skill was deleted
			const getResponse = await agentClient
				.get(PRESET_BASE)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.body.skills).not.toContain(skillToDelete);
		});

		test("should return 404 when skill not found (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `delete_skill_user2_${Date.now()}`, "password");

			const nonExistentSkill = "Non Existent Skill";

			const response = await agentClient
				.delete(`${PRESET_BASE}/skills`)
				.set("Accept", "application/json")
				.send({ skill: nonExistentSkill })
				.ok((res) => true);

			expect(response.status).toBe(404);
			expect(response.body.status).toBe("error");
			expect(response.body.message).toBe("Skill not found");
		});

		test("should return 400 when skill is missing (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `delete_skill_user3_${Date.now()}`, "password");

			const response = await agentClient
				.delete(`${PRESET_BASE}/skills`)
				.set("Accept", "application/json")
				.send({})
				.ok((res) => true);

			expect(response.status).toBe(400);
			expect(response.body.status).toBe("error");
			expect(response.body.message).toContain("Skill must be a non-empty string");
		});
	});
});

