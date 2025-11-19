import request from "superagent";
import app from "../app.js";
import { setupTestDb, cleanupTestDb } from "../config/testDbConfig.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import { inMemoryCoachingBoardDao } from "../daos/inMemoryCoachingBoardDao.js";
import { inMemoryCategorySkillPresetDao } from "../daos/inMemoryCategorySkillPresetDao.js";
import userDac from "../dacs/userDac.js";
import CoachingBoardDac from "../dacs/coachingBoardDac.js";
import CategorySkillPresetDac from "../dacs/categorySkillPresetDac.js";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.SPEED_TEST_BLOCK_ENABLED = "false";

const PORT = 3001;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const AUTH_BASE = `${BASE_URL}/api/authentications`;
const BOARD_BASE = `${BASE_URL}/api/coaching-boards`;

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

describe("Coaching Board REST API Integration Tests", () => {
	beforeAll(async () => {
		await setupTestDb();
		
		userDac.DAO = new inMemoryUserDao();
		CoachingBoardDac.DAO = new inMemoryCoachingBoardDao();
		CategorySkillPresetDac.DAO = new inMemoryCategorySkillPresetDao();

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
		CoachingBoardDac.DAO = new inMemoryCoachingBoardDao();
		
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
		CoachingBoardDac.DAO = null;
		CategorySkillPresetDac.DAO = null;
	});

	describe("POST /api/coaching-boards - Publish a new coaching board", () => {
		test("should successfully publish a board and verify it exists in the database (positive test)", async () => {
			const agentClient = request.agent();
			const author = await registerUser(agentClient, `author_${Date.now()}`, "password", ["CPR", "Emergency Communication"]);

			const boardData = {
				title: "Basic CPR for Adults",
				category: "First Aid",
				description: "Learn how to perform CPR on adults",
				objective: "Save lives during cardiac arrest",
				steps: ["Check scene safety", "Call 911", "Start chest compressions"],
				relatedSkills: ["CPR"],
				tools: ["AED"],
				notes: "Practice regularly",
			};

			const response = await agentClient
				.post(BOARD_BASE)
				.set("Accept", "application/json")
				.send(boardData)
				.ok((res) => true);

			expect(response.status).toBe(201);
			expect(response.body.message).toBe("Board published successfully");
			expect(response.body.boardId).toBeTruthy();

			// Verify state: GET the board and check all fields match
			const getResponse = await agentClient
				.get(`${BOARD_BASE}/${response.body.boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.status).toBe(200);
			expect(getResponse.body.id).toBe(response.body.boardId);
			expect(getResponse.body.title).toBe(boardData.title);
			expect(getResponse.body.category).toBe(boardData.category);
			expect(getResponse.body.description).toBe(boardData.description);
			expect(getResponse.body.objective).toBe(boardData.objective);
			expect(getResponse.body.steps).toEqual(boardData.steps);
			expect(getResponse.body.relatedSkills).toEqual(boardData.relatedSkills);
			expect(getResponse.body.tools).toEqual(boardData.tools);
			expect(getResponse.body.notes).toBe(boardData.notes);
			expect(String(getResponse.body.author)).toBe(String(author.id));
			expect(getResponse.body.publicationState).toBe("published");
		});

		test("should reject board creation when user lacks required skills (negative test)", async () => {
			const agentClient = request.agent();
			const author = await registerUser(agentClient, `no_skill_user_${Date.now()}`, "password", []);

			const boardData = {
				title: "Advanced JavaScript",
				category: "Technical",
				description: "Learn advanced JS",
				objective: "Master JS",
				steps: ["Step 1"],
				relatedSkills: ["JavaScript"],
			};

			const response = await agentClient
				.post(BOARD_BASE)
				.set("Accept", "application/json")
				.send(boardData)
				.ok((res) => true);

			expect(response.status).toBe(400);
			expect(response.body.status).toBe("error");
			expect(response.body.message).toContain("At least one related skill must be a verified skill");

			// Verify state: Board should not exist
			const listResponse = await agentClient
				.get(BOARD_BASE)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(listResponse.status).toBe(200);
			expect(listResponse.body).toEqual([]);
		});

		test("should reject duplicate title in same category (negative test)", async () => {
			const agentClient = request.agent();
			const author = await registerUser(agentClient, `duplicate_author_${Date.now()}`, "password", ["CPR"]);

			const boardData = {
				title: "Unique Title",
				category: "First Aid",
				description: "First board",
				objective: "Objective",
				steps: ["Step 1"],
				relatedSkills: ["CPR"],
			};

			// Create first board
			const firstResponse = await agentClient
				.post(BOARD_BASE)
				.set("Accept", "application/json")
				.send(boardData)
				.ok((res) => true);

			expect(firstResponse.status).toBe(201);

			// Try to create duplicate
			const duplicateResponse = await agentClient
				.post(BOARD_BASE)
				.set("Accept", "application/json")
				.send(boardData)
				.ok((res) => true);

			expect(duplicateResponse.status).toBe(409);
			expect(duplicateResponse.body.errorStatus).toBe("DUPLICATE_TITLE");
			expect(duplicateResponse.body.message).toContain("already exists");

			// Verify state: Only one board should exist
			const listResponse = await agentClient
				.get(BOARD_BASE)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(listResponse.status).toBe(200);
			expect(listResponse.body.length).toBe(1);
			expect(listResponse.body[0].title).toBe(boardData.title);
		});
	});

	describe("PUT /api/coaching-boards/:bid - Update a coaching board", () => {
		test("should successfully update board content and verify changes persist (positive test)", async () => {
			const agentClient = request.agent();
			const author = await registerUser(agentClient, `update_author_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Original Title",
				category: "First Aid",
				description: "Original description",
				objective: "Original objective",
				steps: ["Step 1"],
				relatedSkills: ["CPR"],
			};

			const createResponse = await agentClient
				.post(BOARD_BASE)
				.set("Accept", "application/json")
				.send(createData)
				.ok((res) => true);

			const boardId = createResponse.body.boardId;

			// Update board
			const updateData = {
				title: "Updated Title",
				description: "Updated description",
				objective: "Updated objective",
				steps: ["Step 1", "Step 2", "Step 3"],
				tools: ["Tool 1", "Tool 2"],
			};

			const updateResponse = await agentClient
				.put(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.send(updateData)
				.ok((res) => true);

			expect(updateResponse.status).toBe(200);
			expect(updateResponse.body.message).toBe("Board updated successfully");

			// Verify state: GET board and verify all updates
			const getResponse = await agentClient
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.status).toBe(200);
			expect(getResponse.body.title).toBe(updateData.title);
			expect(getResponse.body.description).toBe(updateData.description);
			expect(getResponse.body.objective).toBe(updateData.objective);
			expect(getResponse.body.steps).toEqual(updateData.steps);
			expect(getResponse.body.tools).toEqual(updateData.tools);
			expect(getResponse.body.category).toBe(createData.category); // Unchanged field
		});

		test("should reject update when user is not the author (negative test)", async () => {
			const authorAgent = request.agent();
			const author = await registerUser(authorAgent, `author_${Date.now()}`, "password", ["CPR"]);

			// Create board as author
			const createData = {
				title: "Author's Board",
				category: "First Aid",
				description: "Description",
				objective: "Objective",
				steps: ["Step 1"],
				relatedSkills: ["CPR"],
			};

			const createResponse = await authorAgent
				.post(BOARD_BASE)
				.set("Accept", "application/json")
				.send(createData)
				.ok((res) => true);

			const boardId = createResponse.body.boardId;

			// Try to update as different user
			const otherAgent = request.agent();
			await registerUser(otherAgent, `other_user_${Date.now()}`, "password", ["CPR"]);

			const updateResponse = await otherAgent
				.put(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.send({ title: "Hacked Title" })
				.ok((res) => true);

			expect(updateResponse.status).toBe(403);
			expect(updateResponse.body.status).toBe("error");
			expect(updateResponse.body.message).toContain("permission");

			// Verify state: Board should remain unchanged
			const getResponse = await authorAgent
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.body.title).toBe(createData.title);
		});
	});

	describe("DELETE /api/coaching-boards/:bid - Delete a coaching board", () => {
		test("should successfully delete board and verify it no longer exists (positive test)", async () => {
			const agentClient = request.agent();
			const author = await registerUser(agentClient, `delete_author_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Board to Delete",
				category: "First Aid",
				description: "Description",
				objective: "Objective",
				steps: ["Step 1"],
				relatedSkills: ["CPR"],
			};

			const createResponse = await agentClient
				.post(BOARD_BASE)
				.set("Accept", "application/json")
				.send(createData)
				.ok((res) => true);

			const boardId = createResponse.body.boardId;

			// Verify board exists
			const getBeforeResponse = await agentClient
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getBeforeResponse.status).toBe(200);

			// Delete board
			const deleteResponse = await agentClient
				.delete(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(deleteResponse.status).toBe(200);
			expect(deleteResponse.body.message).toBe("Board deleted successfully");

			// Verify state: Board should not exist
			const getAfterResponse = await agentClient
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getAfterResponse.status).toBe(404);
			expect(getAfterResponse.body.status).toBe("error");
			expect(getAfterResponse.body.message).toBe("Board not found");
		});

		test("should reject deletion when user is not the author (negative test)", async () => {
			const authorAgent = request.agent();
			const author = await registerUser(authorAgent, `author_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Protected Board",
				category: "First Aid",
				description: "Description",
				objective: "Objective",
				steps: ["Step 1"],
				relatedSkills: ["CPR"],
			};

			const createResponse = await authorAgent
				.post(BOARD_BASE)
				.set("Accept", "application/json")
				.send(createData)
				.ok((res) => true);

			const boardId = createResponse.body.boardId;

			// Try to delete as different user
			const otherAgent = request.agent();
			await registerUser(otherAgent, `other_user_${Date.now()}`, "password", ["CPR"]);

			const deleteResponse = await otherAgent
				.delete(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(deleteResponse.status).toBe(403);
			expect(deleteResponse.body.status).toBe("error");
			expect(deleteResponse.body.message).toContain("permission");

			// Verify state: Board should still exist
			const getResponse = await authorAgent
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.status).toBe(200);
			expect(getResponse.body.id).toBe(boardId);
		});
	});

	describe("POST /api/coaching-boards/:bid/comments - Add comment to board", () => {
		test("should successfully add comment and verify it appears in board details (positive test)", async () => {
			const authorAgent = request.agent();
			const author = await registerUser(authorAgent, `author_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Board with Comments",
				category: "First Aid",
				description: "Description",
				objective: "Objective",
				steps: ["Step 1"],
				relatedSkills: ["CPR"],
			};

			const createResponse = await authorAgent
				.post(BOARD_BASE)
				.set("Accept", "application/json")
				.send(createData)
				.ok((res) => true);

			const boardId = createResponse.body.boardId;

			// Add comment
			const commentText = "This is a helpful board!";
			const commentResponse = await authorAgent
				.post(`${BOARD_BASE}/${boardId}/comments`)
				.set("Accept", "application/json")
				.send({
					comment: commentText,
					uid: author.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			expect(commentResponse.status).toBe(201);
			expect(commentResponse.body.message).toBe("Comment added successfully");

			// Verify state: GET board and verify comment exists
			const getResponse = await authorAgent
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.status).toBe(200);
			expect(getResponse.body.comments).toBeDefined();
			expect(getResponse.body.comments.length).toBe(1);
			expect(getResponse.body.comments[0].comment).toBe(commentText);
			expect(String(getResponse.body.comments[0].author)).toBe(String(author.id));
			expect(getResponse.body.comments[0].authorName).toBe(author.username);
		});

		test("should reject comment when board does not exist (negative test)", async () => {
			const agentClient = request.agent();
			const user = await registerUser(agentClient, `user_${Date.now()}`, "password", ["CPR"]);

			const fakeBoardId = "507f1f77bcf86cd799439011";

			const commentResponse = await agentClient
				.post(`${BOARD_BASE}/${fakeBoardId}/comments`)
				.set("Accept", "application/json")
				.send({
					comment: "Test comment",
					uid: user.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			expect(commentResponse.status).toBe(404);
			expect(commentResponse.body.status).toBe("error");
			expect(commentResponse.body.message).toBe("Board not found");
		});
	});

	describe("POST /api/coaching-boards/:bid/comments/:cid/replies - Add reply to comment", () => {
		test("should successfully add reply and verify it appears in comment replies (positive test)", async () => {
			const authorAgent = request.agent();
			const author = await registerUser(authorAgent, `author_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Board with Replies",
				category: "First Aid",
				description: "Description",
				objective: "Objective",
				steps: ["Step 1"],
				relatedSkills: ["CPR"],
			};

			const createResponse = await authorAgent
				.post(BOARD_BASE)
				.set("Accept", "application/json")
				.send(createData)
				.ok((res) => true);

			const boardId = createResponse.body.boardId;

			// Add comment
			const commentResponse = await authorAgent
				.post(`${BOARD_BASE}/${boardId}/comments`)
				.set("Accept", "application/json")
				.send({
					comment: "Original comment",
					uid: author.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			// Get commentId from the board
			const getBoardResponse = await authorAgent
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);
			
			expect(getBoardResponse.status).toBe(200);
			expect(getBoardResponse.body.comments.length).toBe(1);
			const commentId = getBoardResponse.body.comments[0].id;

			// Add reply
			const replyText = "This is a reply";
			const replyResponse = await authorAgent
				.post(`${BOARD_BASE}/${boardId}/comments/${commentId}/replies`)
				.set("Accept", "application/json")
				.send({
					reply: replyText,
					uid: author.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			expect(replyResponse.status).toBe(201);
			expect(replyResponse.body.message).toBe("Reply added successfully");

			// Verify state: GET board and verify reply exists in comment
			const getResponse = await authorAgent
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.status).toBe(200);
			expect(getResponse.body.comments.length).toBe(1);
			const comment = getResponse.body.comments[0];
			expect(comment.replies).toBeDefined();
			expect(comment.replies.length).toBe(1);
			expect(comment.replies[0].reply).toBe(replyText);
			expect(String(comment.replies[0].author)).toBe(String(author.id));
		});
	});

	describe("POST /api/coaching-boards/:bid/comments/:cid/likes - Toggle comment like", () => {
		test("should successfully like comment and verify like count increases (positive test)", async () => {
			const authorAgent = request.agent();
			const author = await registerUser(authorAgent, `author_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Board with Likes",
				category: "First Aid",
				description: "Description",
				objective: "Objective",
				steps: ["Step 1"],
				relatedSkills: ["CPR"],
			};

			const createResponse = await authorAgent
				.post(BOARD_BASE)
				.set("Accept", "application/json")
				.send(createData)
				.ok((res) => true);

			const boardId = createResponse.body.boardId;

			// Add comment
			const commentResponse = await authorAgent
				.post(`${BOARD_BASE}/${boardId}/comments`)
				.set("Accept", "application/json")
				.send({
					comment: "Comment to like",
					uid: author.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			// Get commentId from the board
			const getBoardForCommentId = await authorAgent
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);
			
			expect(getBoardForCommentId.status).toBe(200);
			expect(getBoardForCommentId.body.comments.length).toBe(1);
			const commentId = getBoardForCommentId.body.comments[0].id;

			// Get initial state
			const getBeforeResponse = await authorAgent
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const initialLikes = getBeforeResponse.body.comments[0].likes?.length || 0;

			// Like comment
			const likeResponse = await authorAgent
				.post(`${BOARD_BASE}/${boardId}/comments/${commentId}/likes`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(likeResponse.status).toBe(200);
			expect(likeResponse.body.message).toBe("Like toggled successfully");

			// Verify state: GET board and verify like count increased
			const getAfterResponse = await authorAgent
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const afterLikes = getAfterResponse.body.comments[0].likes?.length || 0;
			expect(afterLikes).toBe(initialLikes + 1);
			const likesArray = getAfterResponse.body.comments[0].likes || [];
			expect(likesArray.some(likeId => String(likeId) === String(author.id))).toBe(true);
		});
	});

	describe("GET /api/coaching-boards - List all boards", () => {
		test("should return all published boards with correct structure (positive test)", async () => {
			const agentClient = request.agent();
			const author = await registerUser(agentClient, `list_author_${Date.now()}`, "password", ["CPR", "JavaScript"]);

			// Create multiple boards
			const board1Data = {
				title: "First Board",
				category: "First Aid",
				description: "Description 1",
				objective: "Objective 1",
				steps: ["Step 1"],
				relatedSkills: ["CPR"],
			};

			const board2Data = {
				title: "Second Board",
				category: "Technical",
				description: "Description 2",
				objective: "Objective 2",
				steps: ["Step 1"],
				relatedSkills: ["JavaScript"],
			};

			await agentClient
				.post(BOARD_BASE)
				.set("Accept", "application/json")
				.send(board1Data)
				.ok((res) => true);

			await agentClient
				.post(BOARD_BASE)
				.set("Accept", "application/json")
				.send(board2Data)
				.ok((res) => true);

			// List boards
			const listResponse = await agentClient
				.get(BOARD_BASE)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(listResponse.status).toBe(200);
			expect(Array.isArray(listResponse.body)).toBe(true);
			expect(listResponse.body.length).toBe(2);

			// Verify board structure
			const board1 = listResponse.body.find((b) => b.title === board1Data.title);
			const board2 = listResponse.body.find((b) => b.title === board2Data.title);

			expect(board1).toBeDefined();
			expect(board1.id).toBeTruthy();
			expect(board1.title).toBe(board1Data.title);
			expect(board1.category).toBe(board1Data.category);
			expect(board1.description).toBe(board1Data.description);
			expect(board1.objective).toBe(board1Data.objective);
			expect(board1.relatedSkills).toEqual(board1Data.relatedSkills);

			expect(board2).toBeDefined();
			expect(board2.id).toBeTruthy();
			expect(board2.title).toBe(board2Data.title);
		});
	});
});

