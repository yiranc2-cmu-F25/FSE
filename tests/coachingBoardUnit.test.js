import {
	publishBoard,
	updateBoard,
	deleteBoard
} from "../controllers/coachingBoardController.js";
import CoachingBoard from "../entities/CoachingBoard.js";
import User from "../entities/User.js";
import CoachingBoardDac from "../dacs/coachingBoardDac.js";
import CategorySkillPresetDac from "../dacs/categorySkillPresetDac.js";
import UserDac from "../dacs/userDac.js";
import AnnouncementDac from "../dacs/announcementDac.js";
import { inMemoryCoachingBoardDao } from "../daos/inMemoryCoachingBoardDao.js";
import { inMemoryCategorySkillPresetDao } from "../daos/inMemoryCategorySkillPresetDao.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import { inMemoryAnnouncementDao } from "../daos/inMemoryAnnouncementDao.js";

describe("Coaching Board Controller - Unit Tests (Board Management)", () => {
	let originalCoachingBoardDao;
	let originalCategorySkillPresetDao;
	let originalUserDao;
	let originalAnnouncementDao;

	beforeEach(() => {
		try {
			originalCoachingBoardDao = CoachingBoardDac.DAO;
		} catch {
			originalCoachingBoardDao = null;
		}
		try {
			originalCategorySkillPresetDao = CategorySkillPresetDac.DAO;
		} catch {
			originalCategorySkillPresetDao = null;
		}
		try {
			originalUserDao = UserDac.DAO;
		} catch {
			originalUserDao = null;
		}
		try {
			originalAnnouncementDao = AnnouncementDac.DAO;
		} catch {
			originalAnnouncementDao = null;
		}

		// Inject fresh in-memory DAOs for each test
		CoachingBoardDac.DAO = new inMemoryCoachingBoardDao();
		CategorySkillPresetDac.DAO = new inMemoryCategorySkillPresetDao();
		UserDac.DAO = new inMemoryUserDao();
		AnnouncementDac.DAO = new inMemoryAnnouncementDao();
	});

	afterEach(() => {
		// Restore original DAOs (or set to null if they weren't set)
		if (originalCoachingBoardDao !== null) {
			CoachingBoardDac.DAO = originalCoachingBoardDao;
		} else {
			CoachingBoardDac.DAO = null;
		}
		if (originalCategorySkillPresetDao !== null) {
			CategorySkillPresetDac.DAO = originalCategorySkillPresetDao;
		} else {
			CategorySkillPresetDac.DAO = null;
		}
		if (originalUserDao !== null) {
			UserDac.DAO = originalUserDao;
		} else {
			UserDac.DAO = null;
		}
		if (originalAnnouncementDao !== null) {
			AnnouncementDac.DAO = originalAnnouncementDao;
		} else {
			AnnouncementDac.DAO = null;
		}
	});

	describe("publishBoard", () => {
		test("returns 401 when user is not authenticated (negative test)", async () => {
			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: { title: "Test" },
				app: {}
			};
			const res = {
				status(code) {
					statusCode = code;
					return this;
				},
				json(body) {
					jsonBody = body;
					return this;
				}
			};

			await publishBoard(req, res);

			expect(statusCode).toBe(401);
			expect(jsonBody.error).toBe("Unauthorized");
		});

		test("returns 400 when validation fails (negative test)", async () => {
			// Setup presets
			await CategorySkillPresetDac.updatePresets({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: { title: "" }, 
				user: { id: "user123" },
				userId: "user123",
				app: {}
			};
			const res = {
				status(code) {
					statusCode = code;
					return this;
				},
				json(body) {
					jsonBody = body;
					return this;
				}
			};

			await publishBoard(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("Title must be non-empty");
		});

		test("returns 409 when duplicate title exists (negative test)", async () => {
			// Setup presets
			await CategorySkillPresetDac.updatePresets({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			// Create user with skills
			const user = new User({
				username: "testuser",
				password: "password123",
				skills: ["JavaScript"]
			});
			const createdUser = await user.create();
			const userId = String(createdUser.id);

			// Create a board with the duplicate title first
			const existingBoard = new CoachingBoard({
				title: "Duplicate Title",
				category: "Technical",
				description: "Test",
				objective: "Test",
				steps: ["Step 1"],
				relatedSkills: ["JavaScript"],
				author: userId,
				publicationState: "published"
			});
			await existingBoard.publishNew();

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: {
					title: "Duplicate Title",
					category: "Technical",
					description: "Test",
					objective: "Test",
					steps: ["Step 1"],
					relatedSkills: ["JavaScript"]
				},
				user: { id: userId },
				userId: userId,
				app: {}
			};
			const res = {
				status(code) {
					statusCode = code;
					return this;
				},
				json(body) {
					jsonBody = body;
					return this;
				}
			};

			await publishBoard(req, res);

			expect(statusCode).toBe(409);
			expect(jsonBody.errorStatus).toBe("DUPLICATE_TITLE");
			expect(jsonBody.message).toContain("already exists");
		});

		test("returns 400 when user has no matching skills (negative test)", async () => {
			// Setup presets
			await CategorySkillPresetDac.updatePresets({
				categories: ["Technical"],
				skills: ["JavaScript", "Python"]
			});

			// Create user with only Python skill (not JavaScript)
			const user = new User({
				username: "testuser",
				password: "password123",
				skills: ["Python"]
			});
			const createdUser = await user.create();
			const userId = String(createdUser.id);

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: {
					title: "New Title",
					category: "Technical",
					description: "Test",
					objective: "Test",
					steps: ["Step 1"],
					relatedSkills: ["JavaScript"] 
				},
				user: { id: userId },
				userId: userId,
				app: {}
			};
			const res = {
				status(code) {
					statusCode = code;
					return this;
				},
				json(body) {
					jsonBody = body;
					return this;
				}
			};

			await publishBoard(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("At least one related skill must be a verified skill");
		});

		test("successfully publishes board when all validations pass (positive test)", async () => {
			// Setup presets
			await CategorySkillPresetDac.updatePresets({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			// Create user with matching skills
			const user = new User({
				username: "testuser",
				password: "password123",
				skills: ["JavaScript"]
			});
			const createdUser = await user.create();
			const userId = String(createdUser.id);

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: {
					title: "New Title",
					category: "Technical",
					description: "Test description",
					objective: "Test objective",
					steps: ["Step 1"],
					relatedSkills: ["JavaScript"]
				},
				user: { id: userId },
				userId: userId,
				app: {}
			};
			const res = {
				status(code) {
					statusCode = code;
					return this;
				},
				json(body) {
					jsonBody = body;
					return this;
				}
			};

			await publishBoard(req, res);

			expect(statusCode).toBe(201);
			expect(jsonBody.message).toBe("Board published successfully");
			expect(jsonBody.boardId).toBeDefined();
		});
	});

	describe("updateBoard", () => {
		test("returns 403 when user is not the author (negative test)", async () => {
			// Setup presets
			await CategorySkillPresetDac.updatePresets({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			// Create owner user
			const ownerUser = new User({
				username: "owner",
				password: "password123",
				skills: ["JavaScript"]
			});
			const createdOwner = await ownerUser.create();
			const ownerId = String(createdOwner.id);

			// Create other user
			const otherUser = new User({
				username: "other",
				password: "password123",
				skills: ["JavaScript"]
			});
			const createdOther = await otherUser.create();
			const otherId = String(createdOther.id);

			// Create a board owned by owner
			const board = new CoachingBoard({
				title: "Original Title",
				category: "Technical",
				description: "Description",
				objective: "Objective",
				steps: ["Step 1"],
				relatedSkills: ["JavaScript"],
				author: ownerId,
				publicationState: "published"
			});
			const createdBoard = await board.publishNew();
			const boardId = createdBoard.id;

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: boardId },
				body: { title: "Updated Title" },
				user: { id: otherId },
				userId: otherId,
				app: {}
			};
			const res = {
				status(code) {
					statusCode = code;
					return this;
				},
				json(body) {
					jsonBody = body;
					return this;
				}
			};

			await updateBoard(req, res);

			expect(statusCode).toBe(403);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("permission");
		});

		test("successfully updates board when user is the author (positive test)", async () => {
			// Setup presets
			await CategorySkillPresetDac.updatePresets({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			// Create user
			const user = new User({
				username: "testuser",
				password: "password123",
				skills: ["JavaScript"]
			});
			const createdUser = await user.create();
			const userId = String(createdUser.id);

			// Create a board
			const board = new CoachingBoard({
				title: "Original Title",
				category: "Technical",
				description: "Description",
				objective: "Objective",
				steps: ["Step 1"],
				relatedSkills: ["JavaScript"],
				author: userId,
				publicationState: "published"
			});
			const createdBoard = await board.publishNew();
			const boardId = createdBoard.id;

			// Subscribe another user to test notifications
			const subscriber = new User({
				username: "subscriber",
				password: "password123",
				skills: []
			});
			const createdSubscriber = await subscriber.create();
			await CoachingBoard.subscribe({ id: boardId, userId: String(createdSubscriber.id) });

			const mockSocket = {
				emitCoachingBoardNotification: () => {}
			};
			const mockApp = {
				get: (key) => key === "socketInstance" ? mockSocket : null
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: boardId },
				body: { title: "Updated Title" },
				user: { id: userId },
				userId: userId,
				app: mockApp
			};
			const res = {
				status(code) {
					statusCode = code;
					return this;
				},
				json(body) {
					jsonBody = body;
					return this;
				}
			};

			await updateBoard(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.message).toBe("Board updated successfully");
			expect(jsonBody.boardId).toBe(boardId);
		});

		test("returns 400 when missing board id (negative test)", async () => {
			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: {},
				body: { title: "Updated Title" },
				user: { id: "user123" },
				userId: "user123",
				app: {}
			};
			const res = {
				status(code) {
					statusCode = code;
					return this;
				},
				json(body) {
					jsonBody = body;
					return this;
				}
			};

			await updateBoard(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("Missing board id");
		});

		test("returns 400 when relatedSkills is empty array (negative test)", async () => {
			// Setup presets
			await CategorySkillPresetDac.updatePresets({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			// Create user and board
			const user = new User({
				username: "testuser",
				password: "password123",
				skills: ["JavaScript"]
			});
			const createdUser = await user.create();
			const userId = String(createdUser.id);

			const board = new CoachingBoard({
				title: "Original Title",
				category: "Technical",
				description: "Description",
				objective: "Objective",
				steps: ["Step 1"],
				relatedSkills: ["JavaScript"],
				author: userId,
				publicationState: "published"
			});
			const createdBoard = await board.publishNew();
			const boardId = createdBoard.id;

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: boardId },
				body: { relatedSkills: [] },
				user: { id: userId },
				userId: userId,
				app: {}
			};
			const res = {
				status(code) {
					statusCode = code;
					return this;
				},
				json(body) {
					jsonBody = body;
					return this;
				}
			};

			await updateBoard(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("At least one related skill is required");
		});

		test("returns 400 when relatedSkills contains non-preset skill (negative test)", async () => {
			// Setup presets
			await CategorySkillPresetDac.updatePresets({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			// Create user and board
			const user = new User({
				username: "testuser",
				password: "password123",
				skills: ["JavaScript"]
			});
			const createdUser = await user.create();
			const userId = String(createdUser.id);

			const board = new CoachingBoard({
				title: "Original Title",
				category: "Technical",
				description: "Description",
				objective: "Objective",
				steps: ["Step 1"],
				relatedSkills: ["JavaScript"],
				author: userId,
				publicationState: "published"
			});
			const createdBoard = await board.publishNew();
			const boardId = createdBoard.id;

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: boardId },
				body: { relatedSkills: ["InvalidSkill"] },
				user: { id: userId },
				userId: userId,
				app: {}
			};
			const res = {
				status(code) {
					statusCode = code;
					return this;
				},
				json(body) {
					jsonBody = body;
					return this;
				}
			};

			await updateBoard(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("Related Skills must be from system preset");
		});

		test("handles socket notification error gracefully (negative test)", async () => {
			// Setup presets
			await CategorySkillPresetDac.updatePresets({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			// Create user and board
			const user = new User({
				username: "testuser",
				password: "password123",
				skills: ["JavaScript"]
			});
			const createdUser = await user.create();
			const userId = String(createdUser.id);

			const board = new CoachingBoard({
				title: "Original Title",
				category: "Technical",
				description: "Description",
				objective: "Objective",
				steps: ["Step 1"],
				relatedSkills: ["JavaScript"],
				author: userId,
				publicationState: "published"
			});
			const createdBoard = await board.publishNew();
			const boardId = createdBoard.id;

			// Subscribe another user
			const subscriber = new User({
				username: "subscriber",
				password: "password123",
				skills: []
			});
			const createdSubscriber = await subscriber.create();
			await CoachingBoard.subscribe({ id: boardId, userId: String(createdSubscriber.id) });

			const mockSocket = {
				emitCoachingBoardNotification: () => {
					throw new Error("Socket error");
				}
			};
			const mockApp = {
				get: (key) => key === "socketInstance" ? mockSocket : null
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: boardId },
				body: { title: "Updated Title" },
				user: { id: userId },
				userId: userId,
				app: mockApp
			};
			const res = {
				status(code) {
					statusCode = code;
					return this;
				},
				json(body) {
					jsonBody = body;
					return this;
				}
			};

			await updateBoard(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.message).toBe("Board updated successfully");
		});

		test("handles general database error (negative test)", async () => {
			// Setup presets
			await CategorySkillPresetDac.updatePresets({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			// Mock the DAO's updateBoard method to throw an error
			const originalUpdateBoard = CoachingBoardDac.DAO.updateBoard;
			CoachingBoardDac.DAO.updateBoard = async () => {
				throw new Error("Database error");
			};

			// Create user and board
			const user = new User({
				username: "testuser",
				password: "password123",
				skills: ["JavaScript"]
			});
			const createdUser = await user.create();
			const userId = String(createdUser.id);

			const board = new CoachingBoard({
				title: "Original Title",
				category: "Technical",
				description: "Description",
				objective: "Objective",
				steps: ["Step 1"],
				relatedSkills: ["JavaScript"],
				author: userId,
				publicationState: "published"
			});
			const createdBoard = await board.publishNew();
			const boardId = createdBoard.id;

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: boardId },
				body: { title: "Updated Title" },
				user: { id: userId },
				userId: userId,
				app: {}
			};
			const res = {
				status(code) {
					statusCode = code;
					return this;
				},
				json(body) {
					jsonBody = body;
					return this;
				}
			};

			await updateBoard(req, res);

			expect(statusCode).toBe(500);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Server error");

			// Restore original method
			CoachingBoardDac.DAO.updateBoard = originalUpdateBoard;
		});
	});

	describe("deleteBoard", () => {
		test("returns 403 when user is not the author (negative test)", async () => {
			// Create owner user
			const ownerUser = new User({
				username: "owner",
				password: "password123",
				skills: []
			});
			const createdOwner = await ownerUser.create();
			const ownerId = String(createdOwner.id);

			// Create other user
			const otherUser = new User({
				username: "other",
				password: "password123",
				skills: []
			});
			const createdOther = await otherUser.create();
			const otherId = String(createdOther.id);

			// Setup presets
			await CategorySkillPresetDac.updatePresets({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			// Create a board owned by owner
			const board = new CoachingBoard({
				title: "Test Board",
				category: "Technical",
				description: "Description",
				objective: "Objective",
				steps: ["Step 1"],
				relatedSkills: ["JavaScript"],
				author: ownerId,
				publicationState: "published"
			});
			const createdBoard = await board.publishNew();
			const boardId = createdBoard.id;

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: boardId },
				user: { id: otherId },
				userId: otherId,
				app: {}
			};
			const res = {
				status(code) {
					statusCode = code;
					return this;
				},
				json(body) {
					jsonBody = body;
					return this;
				}
			};

			await deleteBoard(req, res);

			expect(statusCode).toBe(403);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("permission");
		});

		test("successfully deletes board when user is the author (positive test)", async () => {
			// Setup presets
			await CategorySkillPresetDac.updatePresets({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			// Create user
			const user = new User({
				username: "testuser",
				password: "password123",
				skills: ["JavaScript"]
			});
			const createdUser = await user.create();
			const userId = String(createdUser.id);

			// Create a board
			const board = new CoachingBoard({
				title: "Test Board",
				category: "Technical",
				description: "Description",
				objective: "Objective",
				steps: ["Step 1"],
				relatedSkills: ["JavaScript"],
				author: userId,
				publicationState: "published"
			});
			const createdBoard = await board.publishNew();
			const boardId = createdBoard.id;

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: boardId },
				user: { id: userId },
				userId: userId,
				app: {}
			};
			const res = {
				status(code) {
					statusCode = code;
					return this;
				},
				json(body) {
					jsonBody = body;
					return this;
				}
			};

			await deleteBoard(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.message).toBe("Board deleted successfully");

			// Verify board is deleted
			const deletedBoard = await CoachingBoard.getById({ id: boardId });
			expect(deletedBoard).toBeNull();
		});

		test("returns 400 when missing board id (negative test)", async () => {
			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: {},
				user: { id: "user123" },
				userId: "user123",
				app: {}
			};
			const res = {
				status(code) {
					statusCode = code;
					return this;
				},
				json(body) {
					jsonBody = body;
					return this;
				}
			};

			await deleteBoard(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("Missing board id");
		});

		test("handles database error (negative test)", async () => {
			// Mock the DAO's deleteBoard method to throw an error
			const originalDeleteBoard = CoachingBoardDac.DAO.deleteBoard;
			CoachingBoardDac.DAO.deleteBoard = async () => {
				throw new Error("Database error");
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123" },
				user: { id: "user123" },
				userId: "user123",
				app: {}
			};
			const res = {
				status(code) {
					statusCode = code;
					return this;
				},
				json(body) {
					jsonBody = body;
					return this;
				}
			};

			await deleteBoard(req, res);

			expect(statusCode).toBe(500);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Server error");

			// Restore original method
			CoachingBoardDac.DAO.deleteBoard = originalDeleteBoard;
		});
	});
});
