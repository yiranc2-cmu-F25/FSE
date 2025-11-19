import {
	publishBoard,
	updateBoard,
	deleteBoard
} from "../controllers/coachingBoardController.js";
import CoachingBoard from "../entities/CoachingBoard.js";
import User from "../entities/User.js";
import Announcement from "../entities/Announcement.js";
import CategorySkillPresetDac from "../dacs/categorySkillPresetDac.js";

describe("Coaching Board Controller - Unit Tests (Board Management)", () => {
	let originalCheckDuplicateTitle;
	let originalPublishNew;
	let originalDeleteDraft;
	let originalGetSkillsById;
	let originalGetPresets;
	let originalCreate;
	let originalUpdateBoard;
	let originalDeleteBoard;

	beforeEach(() => {
		originalCheckDuplicateTitle = CoachingBoard.checkDuplicateTitle;
		originalPublishNew = CoachingBoard.prototype.publishNew;
		originalDeleteDraft = CoachingBoard.deleteDraft;
		originalGetSkillsById = User.getSkillsById;
		originalGetPresets = CategorySkillPresetDac.getPresets;
		originalCreate = Announcement.prototype.create;
		originalUpdateBoard = CoachingBoard.updateBoard;
		originalDeleteBoard = CoachingBoard.deleteBoard;
	});

	afterEach(() => {
		CoachingBoard.checkDuplicateTitle = originalCheckDuplicateTitle;
		CoachingBoard.prototype.publishNew = originalPublishNew;
		CoachingBoard.deleteDraft = originalDeleteDraft;
		User.getSkillsById = originalGetSkillsById;
		CategorySkillPresetDac.getPresets = originalGetPresets;
		Announcement.prototype.create = originalCreate;
		CoachingBoard.updateBoard = originalUpdateBoard;
		CoachingBoard.deleteBoard = originalDeleteBoard;
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
			CategorySkillPresetDac.getPresets = async () => ({
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
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			let checkDuplicateCalled = false;
			CoachingBoard.checkDuplicateTitle = async (params) => {
				checkDuplicateCalled = true;
				expect(params.title).toBe("Duplicate Title");
				expect(params.category).toBe("Technical");
				return true; 
			};

			User.getSkillsById = async () => ["JavaScript"]; 

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

			expect(statusCode).toBe(409);
			expect(jsonBody.errorStatus).toBe("DUPLICATE_TITLE");
			expect(jsonBody.message).toContain("already exists");

			expect(checkDuplicateCalled).toBe(true);
		});

		test("returns 400 when user has no matching skills (negative test)", async () => {
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical"],
				skills: ["JavaScript", "Python"]
			});

			CoachingBoard.checkDuplicateTitle = async () => false; 

			User.getSkillsById = async () => ["Python"]; 

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
			expect(jsonBody.message).toContain("At least one related skill must be a verified skill");
		});

		test("successfully publishes board when all validations pass (positive test)", async () => {
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			CoachingBoard.checkDuplicateTitle = async () => false; 

			User.getSkillsById = async () => ["JavaScript"]; 

			const mockCreatedBoard = { id: "board123", title: "New Title" };
			CoachingBoard.prototype.publishNew = async function() {
				return mockCreatedBoard; 
			};

			CoachingBoard.deleteDraft = async () => {}; 

			Announcement.prototype.create = async function() {}; 

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

			expect(statusCode).toBe(201);
			expect(jsonBody.message).toBe("Board published successfully");
			expect(jsonBody.boardId).toBe("board123");

		});

		test("handles database duplicate key error (negative test)", async () => {
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			CoachingBoard.checkDuplicateTitle = async () => false;

			User.getSkillsById = async () => ["JavaScript"];

			CoachingBoard.prototype.publishNew = async function() {
				const error = new Error("Duplicate key");
				error.code = 11000; 
				throw error;
			};

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

			expect(statusCode).toBe(409);
			expect(jsonBody.errorStatus).toBe("DUPLICATE_TITLE");
		});
	});

	describe("updateBoard", () => {
		test("returns 403 when user is not the author (negative test)", async () => {
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			CoachingBoard.updateBoard = async () => null;

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123" },
				body: { title: "Updated Title" },
				user: { id: "otherUser" },
				userId: "otherUser",
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
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			const mockUpdatedBoard = { 
				id: "board123", 
				title: "Updated Title",
				author: "user123",
				subscribers: ["user123", "user456"] 
			};
			CoachingBoard.updateBoard = async () => mockUpdatedBoard;

			const mockSocket = {
				emitCoachingBoardNotification: () => {}
			};
			const mockApp = {
				get: (key) => key === "socketInstance" ? mockSocket : null
			};

			User.getUsernameById = async () => "testuser";

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123" },
				body: { title: "Updated Title" },
				user: { id: "user123" },
				userId: "user123",
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
			expect(jsonBody.boardId).toBe("board123");
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
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123" },
				body: { relatedSkills: [] },
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
			expect(jsonBody.message).toContain("At least one related skill is required");
		});

		test("returns 400 when relatedSkills contains non-preset skill (negative test)", async () => {
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123" },
				body: { relatedSkills: ["InvalidSkill"] },
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
			expect(jsonBody.message).toContain("Related Skills must be from preset");
		});

		test("handles socket notification error gracefully (negative test)", async () => {
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			const mockUpdatedBoard = { 
				id: "board123", 
				title: "Updated Title",
				author: "user123",
				subscribers: ["user123", "user456"] 
			};
			CoachingBoard.updateBoard = async () => mockUpdatedBoard;

			const mockSocket = {
				emitCoachingBoardNotification: () => {
					throw new Error("Socket error");
				}
			};
			const mockApp = {
				get: (key) => key === "socketInstance" ? mockSocket : null
			};

			User.getUsernameById = async () => "testuser";

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123" },
				body: { title: "Updated Title" },
				user: { id: "user123" },
				userId: "user123",
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

		test("handles database duplicate key error (negative test)", async () => {
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			CoachingBoard.updateBoard = async () => {
				const error = new Error("Duplicate key");
				error.code = 11000;
				throw error;
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123" },
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

			expect(statusCode).toBe(409);
			expect(jsonBody.errorStatus).toBe("DUPLICATE_TITLE");
		});

		test("handles general database error (negative test)", async () => {
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			CoachingBoard.updateBoard = async () => {
				throw new Error("Database error");
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123" },
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

			expect(statusCode).toBe(500);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Server error");
		});
	});

	describe("deleteBoard", () => {
		test("returns 403 when user is not the author (negative test)", async () => {
			CoachingBoard.deleteBoard = async () => false;

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123" },
				user: { id: "otherUser" },
				userId: "otherUser",
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
			CoachingBoard.deleteBoard = async () => true;

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

			expect(statusCode).toBe(200);
			expect(jsonBody.message).toBe("Board deleted successfully");
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
			CoachingBoard.deleteBoard = async () => {
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
		});
	});
});
