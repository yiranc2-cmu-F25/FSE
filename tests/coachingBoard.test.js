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
			expect(firstResponse.body.message).toBe("Board published successfully");
			expect(firstResponse.body.boardId).toBeTruthy();

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
			expect(getBeforeResponse.body.id).toBe(boardId);
			expect(getBeforeResponse.body.title).toBe(createData.title);
			expect(getBeforeResponse.body.publicationState).toBe("published");

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
			expect(getResponse.body.comments[0].id).toBeTruthy();
			expect(getResponse.body.comments[0].timestamp).toBeTruthy();
			expect(Array.isArray(getResponse.body.comments[0].likes)).toBe(true);
			expect(Array.isArray(getResponse.body.comments[0].replies)).toBe(true);
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
		test("should reject reply when missing required fields (negative test)", async () => {
			const agentClient = request.agent();
			const author = await registerUser(agentClient, `reply_validation_author_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Board for Reply Validation",
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

			// Add comment
			await agentClient
				.post(`${BOARD_BASE}/${boardId}/comments`)
				.set("Accept", "application/json")
				.send({
					comment: "Comment",
					uid: author.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			// Get commentId
			const getBoardResponse = await agentClient
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const commentId = getBoardResponse.body.comments[0].id;

			// Try to add reply with missing reply field
			const replyResponse = await agentClient
				.post(`${BOARD_BASE}/${boardId}/comments/${commentId}/replies`)
				.set("Accept", "application/json")
				.send({
					// Missing reply field
				})
				.ok((res) => true);

			expect(replyResponse.status).toBe(400);
			expect(replyResponse.body.status).toBe("error");
			expect(replyResponse.body.message).toBe("Missing required fields");
		});

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

			expect(commentResponse.status).toBe(201);
			expect(commentResponse.body.message).toBe("Comment added successfully");

			// Get commentId from the board
			const getBoardResponse = await authorAgent
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);
			
			expect(getBoardResponse.status).toBe(200);
			expect(getBoardResponse.body.comments).toBeDefined();
			expect(getBoardResponse.body.comments.length).toBe(1);
			expect(getBoardResponse.body.comments[0].comment).toBe("Original comment");
			expect(String(getBoardResponse.body.comments[0].author)).toBe(String(author.id));
			const commentId = getBoardResponse.body.comments[0].id;
			expect(commentId).toBeTruthy();

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
			expect(comment.replies[0].id).toBeTruthy();
			expect(comment.replies[0].timestamp).toBeTruthy();
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

			expect(commentResponse.status).toBe(201);
			expect(commentResponse.body.message).toBe("Comment added successfully");

			// Get commentId from the board
			const getBoardForCommentId = await authorAgent
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);
			
			expect(getBoardForCommentId.status).toBe(200);
			expect(getBoardForCommentId.body.comments).toBeDefined();
			expect(getBoardForCommentId.body.comments.length).toBe(1);
			expect(getBoardForCommentId.body.comments[0].comment).toBe("Comment to like");
			expect(String(getBoardForCommentId.body.comments[0].author)).toBe(String(author.id));
			const commentId = getBoardForCommentId.body.comments[0].id;
			expect(commentId).toBeTruthy();

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
			expect(getAfterResponse.body.comments[0].comment).toBe("Comment to like");
			expect(Array.isArray(getAfterResponse.body.comments[0].likes)).toBe(true);
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
			expect(board1.publicationState).toBe("published");
			expect(board1.steps).toEqual(board1Data.steps);

			expect(board2).toBeDefined();
			expect(board2.id).toBeTruthy();
			expect(board2.title).toBe(board2Data.title);
			expect(board2.category).toBe(board2Data.category);
			expect(board2.description).toBe(board2Data.description);
			expect(board2.objective).toBe(board2Data.objective);
			expect(board2.relatedSkills).toEqual(board2Data.relatedSkills);
			expect(board2.publicationState).toBe("published");
		});
	});

	describe("GET /api/coaching-boards/duplications - Check duplicate title", () => {
		test("should return false for non-duplicate title (positive test)", async () => {
			const agentClient = request.agent();
			const author = await registerUser(agentClient, `dup_check_author_${Date.now()}`, "password", ["CPR"]);

			const response = await agentClient
				.get(`${BOARD_BASE}/duplications?title=Unique Title&category=First Aid`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(response.body.isDuplicate).toBe(false);
			expect(response.body.titleValid).toBe(true);
		});

		test("should return true for duplicate title (positive test)", async () => {
			const agentClient = request.agent();
			const author = await registerUser(agentClient, `dup_check2_author_${Date.now()}`, "password", ["CPR"]);

			// Create board first
			const createData = {
				title: "Duplicate Check Title",
				category: "First Aid",
				description: "Description",
				objective: "Objective",
				steps: ["Step 1"],
				relatedSkills: ["CPR"],
			};

			await agentClient
				.post(BOARD_BASE)
				.set("Accept", "application/json")
				.send(createData)
				.ok((res) => true);

			// Check for duplicate
			const response = await agentClient
				.get(`${BOARD_BASE}/duplications?title=Duplicate Check Title&category=First Aid`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(response.body.isDuplicate).toBe(true);
		});

		test("should return 400 when title parameter is missing (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `dup_check3_author_${Date.now()}`, "password", ["CPR"]);

			const response = await agentClient
				.get(`${BOARD_BASE}/duplications?category=First Aid`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(response.status).toBe(400);
			expect(response.body.status).toBe("error");
		});
	});

	describe("GET /api/coaching-boards/:bid - Get board by ID", () => {
		test("should successfully get board by ID (positive test)", async () => {
			const agentClient = request.agent();
			const author = await registerUser(agentClient, `get_board_author_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Board to Get",
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

			// Get board
			const getResponse = await agentClient
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.status).toBe(200);
			expect(getResponse.body.id).toBe(boardId);
			expect(getResponse.body.title).toBe(createData.title);
			expect(getResponse.body.category).toBe(createData.category);
		});

		test("should return 404 when board not found (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `get_board2_author_${Date.now()}`, "password", ["CPR"]);

			const fakeBoardId = "507f1f77bcf86cd799439011";
			const getResponse = await agentClient
				.get(`${BOARD_BASE}/${fakeBoardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.status).toBe(404);
			expect(getResponse.body.status).toBe("error");
		});
	});

	describe("GET /api/coaching-boards/:bid/comments - Get more comments", () => {
		test("should successfully get paginated comments (positive test)", async () => {
			const agentClient = request.agent();
			const author = await registerUser(agentClient, `more_comments_author_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Board with Comments",
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

			// Add multiple comments
			for (let i = 0; i < 3; i++) {
				await agentClient
					.post(`${BOARD_BASE}/${boardId}/comments`)
					.set("Accept", "application/json")
					.send({
						comment: `Comment ${i}`,
						uid: author.id,
						ts: Date.now(),
					})
					.ok((res) => true);
			}

			// Get more comments
			const getResponse = await agentClient
				.get(`${BOARD_BASE}/${boardId}/comments?skip=0&limit=2`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.status).toBe(200);
			expect(getResponse.body.comments).toBeDefined();
			expect(Array.isArray(getResponse.body.comments)).toBe(true);
			expect(getResponse.body.hasMore).toBeDefined();
			expect(getResponse.body.total).toBeDefined();
		});
	});

	describe("GET /api/coaching-boards/:bid/comments/:cid/replies - Get more replies", () => {
		test("should successfully get paginated replies (positive test)", async () => {
			const agentClient = request.agent();
			const author = await registerUser(agentClient, `more_replies_author_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Board with Replies",
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

			// Add comment
			const commentResponse = await agentClient
				.post(`${BOARD_BASE}/${boardId}/comments`)
				.set("Accept", "application/json")
				.send({
					comment: "Original comment",
					uid: author.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			// Get commentId
			const getBoardResponse = await agentClient
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const commentId = getBoardResponse.body.comments[0].id;

			// Add multiple replies
			for (let i = 0; i < 3; i++) {
				await agentClient
					.post(`${BOARD_BASE}/${boardId}/comments/${commentId}/replies`)
					.set("Accept", "application/json")
					.send({
						reply: `Reply ${i}`,
						uid: author.id,
						ts: Date.now(),
					})
					.ok((res) => true);
			}

			// Get more replies
			const getResponse = await agentClient
				.get(`${BOARD_BASE}/${boardId}/comments/${commentId}/replies?skip=0&limit=2`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.status).toBe(200);
			expect(getResponse.body.replies).toBeDefined();
			expect(Array.isArray(getResponse.body.replies)).toBe(true);
			expect(getResponse.body.hasMore).toBeDefined();
			expect(getResponse.body.total).toBeDefined();
		});
	});

	describe("POST /api/coaching-boards/:bid/comments/:cid/replies/:rid/likes - Toggle reply like", () => {
		test("should successfully like reply and verify like count increases (positive test)", async () => {
			const agentClient = request.agent();
			const author = await registerUser(agentClient, `like_reply_author_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Board with Reply Likes",
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

			// Add comment
			await agentClient
				.post(`${BOARD_BASE}/${boardId}/comments`)
				.set("Accept", "application/json")
				.send({
					comment: "Comment",
					uid: author.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			// Get commentId
			const getBoardForCommentId = await agentClient
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const commentId = getBoardForCommentId.body.comments[0].id;

			// Add reply
			await agentClient
				.post(`${BOARD_BASE}/${boardId}/comments/${commentId}/replies`)
				.set("Accept", "application/json")
				.send({
					reply: "Reply to like",
					uid: author.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			// Get replyId
			const getBoardForReplyId = await agentClient
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const replyId = getBoardForReplyId.body.comments[0].replies[0].id;

			// Like reply
			const likeResponse = await agentClient
				.post(`${BOARD_BASE}/${boardId}/comments/${commentId}/replies/${replyId}/likes`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(likeResponse.status).toBe(200);
			expect(likeResponse.body.message).toBe("Like toggled successfully");
		});
	});

	describe("DELETE /api/coaching-boards/:bid/comments/:cid - Delete comment", () => {
		test("should successfully delete comment (positive test)", async () => {
			const agentClient = request.agent();
			const author = await registerUser(agentClient, `delete_comment_author_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Board with Comment to Delete",
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

			// Add comment
			await agentClient
				.post(`${BOARD_BASE}/${boardId}/comments`)
				.set("Accept", "application/json")
				.send({
					comment: "Comment to delete",
					uid: author.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			// Get commentId
			const getBoardResponse = await agentClient
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const commentId = getBoardResponse.body.comments[0].id;

			// Delete comment
			const deleteResponse = await agentClient
				.delete(`${BOARD_BASE}/${boardId}/comments/${commentId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(deleteResponse.status).toBe(200);
			expect(deleteResponse.body.message).toBe("Comment deleted successfully");

			// Verify comment is deleted
			const getAfterResponse = await agentClient
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getAfterResponse.body.comments.length).toBe(0);
		});

		test("should reject deletion when user is not the author (negative test)", async () => {
			const authorAgent = request.agent();
			const author = await registerUser(authorAgent, `comment_author_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Board with Protected Comment",
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
			await authorAgent
				.post(`${BOARD_BASE}/${boardId}/comments`)
				.set("Accept", "application/json")
				.send({
					comment: "Protected comment",
					uid: author.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			// Get commentId
			const getBoardResponse = await authorAgent
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const commentId = getBoardResponse.body.comments[0].id;

			// Try to delete as different user
			const otherAgent = request.agent();
			await registerUser(otherAgent, `other_user_${Date.now()}`, "password", ["CPR"]);

			const deleteResponse = await otherAgent
				.delete(`${BOARD_BASE}/${boardId}/comments/${commentId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(deleteResponse.status).toBe(403);
			expect(deleteResponse.body.status).toBe("error");
		});
	});

	describe("DELETE /api/coaching-boards/:bid/comments/:cid/replies/:rid - Delete reply", () => {
		test("should successfully delete reply (positive test)", async () => {
			const agentClient = request.agent();
			const author = await registerUser(agentClient, `delete_reply_author_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Board with Reply to Delete",
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

			// Add comment
			await agentClient
				.post(`${BOARD_BASE}/${boardId}/comments`)
				.set("Accept", "application/json")
				.send({
					comment: "Comment",
					uid: author.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			// Get commentId
			const getBoardForCommentId = await agentClient
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const commentId = getBoardForCommentId.body.comments[0].id;

			// Add reply
			await agentClient
				.post(`${BOARD_BASE}/${boardId}/comments/${commentId}/replies`)
				.set("Accept", "application/json")
				.send({
					reply: "Reply to delete",
					uid: author.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			// Get replyId
			const getBoardForReplyId = await agentClient
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const replyId = getBoardForReplyId.body.comments[0].replies[0].id;

			// Delete reply
			const deleteResponse = await agentClient
				.delete(`${BOARD_BASE}/${boardId}/comments/${commentId}/replies/${replyId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(deleteResponse.status).toBe(200);
			expect(deleteResponse.body.message).toBe("Reply deleted successfully");
		});

		test("should reject deletion when user is not the author (negative test)", async () => {
			const authorAgent = request.agent();
			const author = await registerUser(authorAgent, `reply_author2_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Board with Protected Reply",
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
			await authorAgent
				.post(`${BOARD_BASE}/${boardId}/comments`)
				.set("Accept", "application/json")
				.send({
					comment: "Comment",
					uid: author.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			// Get commentId
			const getBoardForCommentId = await authorAgent
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const commentId = getBoardForCommentId.body.comments[0].id;

			// Add reply
			await authorAgent
				.post(`${BOARD_BASE}/${boardId}/comments/${commentId}/replies`)
				.set("Accept", "application/json")
				.send({
					reply: "Protected reply",
					uid: author.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			// Get replyId
			const getBoardForReplyId = await authorAgent
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const replyId = getBoardForReplyId.body.comments[0].replies[0].id;

			// Try to delete as different user
			const otherAgent = request.agent();
			await registerUser(otherAgent, `other_user2_${Date.now()}`, "password", ["CPR"]);

			const deleteResponse = await otherAgent
				.delete(`${BOARD_BASE}/${boardId}/comments/${commentId}/replies/${replyId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(deleteResponse.status).toBe(403);
			expect(deleteResponse.body.status).toBe("error");
		});
	});

	describe("POST /api/coaching-boards/drafts - Save draft", () => {
		test("should successfully save draft (positive test)", async () => {
			const agentClient = request.agent();
			const author = await registerUser(agentClient, `draft_author_${Date.now()}`, "password", ["CPR"]);

			const draftData = {
				title: "Draft Title",
				category: "First Aid",
				description: "Draft description",
				objective: "Draft objective",
				steps: ["Step 1"],
				relatedSkills: ["CPR"],
			};

			const response = await agentClient
				.post(`${BOARD_BASE}/drafts`)
				.set("Accept", "application/json")
				.send(draftData)
				.ok((res) => true);

			expect(response.status).toBe(200);
			expect(response.body.message).toBe("Your draft has been saved.");
			expect(response.body.draftId).toBeTruthy();
		});

		test("should reject draft with title too long (negative test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `draft_author2_${Date.now()}`, "password", ["CPR"]);

			const draftData = {
				title: "A".repeat(51), // Title longer than 50 characters
				category: "First Aid",
				description: "Description",
				objective: "Objective",
				steps: ["Step 1"],
				relatedSkills: ["CPR"],
			};

			const response = await agentClient
				.post(`${BOARD_BASE}/drafts`)
				.set("Accept", "application/json")
				.send(draftData)
				.ok((res) => true);

			expect(response.status).toBe(400);
			expect(response.body.status).toBe("error");
			expect(response.body.message).toContain("Title must be < 50 characters");
		});
	});

	describe("GET /api/coaching-boards/drafts/me - Get my draft", () => {
		test("should successfully get user's draft (positive test)", async () => {
			const agentClient = request.agent();
			const author = await registerUser(agentClient, `get_draft_author_${Date.now()}`, "password", ["CPR"]);

			// Save draft first
			const draftData = {
				title: "My Draft",
				category: "First Aid",
				description: "Description",
				objective: "Objective",
				steps: ["Step 1"],
				relatedSkills: ["CPR"],
			};

			await agentClient
				.post(`${BOARD_BASE}/drafts`)
				.set("Accept", "application/json")
				.send(draftData)
				.ok((res) => true);

			// Get draft
			const getResponse = await agentClient
				.get(`${BOARD_BASE}/drafts/me`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.status).toBe(200);
			expect(getResponse.body.title).toBe(draftData.title);
			expect(getResponse.body.publicationState).toBe("draft");
		});

		test("should return 204 when no draft exists (positive test)", async () => {
			const agentClient = request.agent();
			await registerUser(agentClient, `no_draft_author_${Date.now()}`, "password", ["CPR"]);

			const getResponse = await agentClient
				.get(`${BOARD_BASE}/drafts/me`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.status).toBe(204);
		});
	});

	describe("POST /api/coaching-boards/:bid/subscriptions - Subscribe to board", () => {
		test("should successfully subscribe to board (positive test)", async () => {
			const authorAgent = request.agent();
			const author = await registerUser(authorAgent, `board_author_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Board to Subscribe",
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

			// Subscribe as different user
			const subscriberAgent = request.agent();
			await registerUser(subscriberAgent, `subscriber_${Date.now()}`, "password", ["CPR"]);

			const subscribeResponse = await subscriberAgent
				.post(`${BOARD_BASE}/${boardId}/subscriptions`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(subscribeResponse.status).toBe(204);
		});
	});

	describe("DELETE /api/coaching-boards/:bid/subscriptions - Unsubscribe from board", () => {
		test("should successfully unsubscribe from board (positive test)", async () => {
			const authorAgent = request.agent();
			const author = await registerUser(authorAgent, `board_author2_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Board to Unsubscribe",
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

			// Subscribe first
			const subscriberAgent = request.agent();
			await registerUser(subscriberAgent, `subscriber2_${Date.now()}`, "password", ["CPR"]);

			await subscriberAgent
				.post(`${BOARD_BASE}/${boardId}/subscriptions`)
				.set("Accept", "application/json")
				.ok((res) => true);

			// Unsubscribe
			const unsubscribeResponse = await subscriberAgent
				.delete(`${BOARD_BASE}/${boardId}/subscriptions`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(unsubscribeResponse.status).toBe(204);
		});
	});

	describe("GET /api/coaching-boards/notifications - Get pending notifications", () => {
		test("should successfully get pending notifications (positive test)", async () => {
			const authorAgent = request.agent();
			const author = await registerUser(authorAgent, `notif_author_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Board for Notifications",
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

			// Subscribe as different user
			const subscriberAgent = request.agent();
			const subscriber = await registerUser(subscriberAgent, `subscriber3_${Date.now()}`, "password", ["CPR"]);

			await subscriberAgent
				.post(`${BOARD_BASE}/${boardId}/subscriptions`)
				.set("Accept", "application/json")
				.ok((res) => true);

			// Add comment to trigger notification
			await authorAgent
				.post(`${BOARD_BASE}/${boardId}/comments`)
				.set("Accept", "application/json")
				.send({
					comment: "New comment",
					uid: author.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			// Get notifications
			const getResponse = await subscriberAgent
				.get(`${BOARD_BASE}/notifications`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.status).toBe(200);
			expect(getResponse.body.notifications).toBeDefined();
			expect(Array.isArray(getResponse.body.notifications)).toBe(true);
		});

		test("should get new_reply notification with authorName (positive test)", async () => {
			const authorAgent = request.agent();
			const author = await registerUser(authorAgent, `notif_reply_author_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Board for Reply Notifications",
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

			// Add comment as author
			await authorAgent
				.post(`${BOARD_BASE}/${boardId}/comments`)
				.set("Accept", "application/json")
				.send({
					comment: "Comment from author",
					uid: author.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			// Get commentId
			const getBoardResponse = await authorAgent
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const commentId = getBoardResponse.body.comments[0].id;

			// Add reply as different user (this will trigger new_reply notification)
			const replierAgent = request.agent();
			const replier = await registerUser(replierAgent, `replier_${Date.now()}`, "password", ["CPR"]);

			await replierAgent
				.post(`${BOARD_BASE}/${boardId}/comments/${commentId}/replies`)
				.set("Accept", "application/json")
				.send({
					reply: "Reply to author's comment",
					uid: replier.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			// Get notifications as author (should have new_reply notification)
			const getResponse = await authorAgent
				.get(`${BOARD_BASE}/notifications`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(getResponse.status).toBe(200);
			expect(getResponse.body.notifications).toBeDefined();
			expect(Array.isArray(getResponse.body.notifications)).toBe(true);

			// Check for new_reply notification
			const replyNotifications = getResponse.body.notifications.filter(n => n.type === "new_reply");
			if (replyNotifications.length > 0) {
				expect(replyNotifications[0].authorName).toBeDefined();
			}
		});
	});

	describe("PATCH /api/coaching-boards/:bid/notifications/seen - Mark notification as seen", () => {
		test("should successfully mark notification as seen (positive test)", async () => {
			const authorAgent = request.agent();
			const author = await registerUser(authorAgent, `notif_seen_author_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Board for Notification Seen",
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

			// Subscribe as different user
			const subscriberAgent = request.agent();
			await registerUser(subscriberAgent, `subscriber4_${Date.now()}`, "password", ["CPR"]);

			await subscriberAgent
				.post(`${BOARD_BASE}/${boardId}/subscriptions`)
				.set("Accept", "application/json")
				.ok((res) => true);

			// Mark as seen
			const markSeenResponse = await subscriberAgent
				.patch(`${BOARD_BASE}/${boardId}/notifications`)
				.set("Accept", "application/json")
				.ok((res) => true);

			expect(markSeenResponse.status).toBe(200);
			expect(markSeenResponse.body.message).toBe("Notification marked as seen");
		});
	});

	describe("POST /api/coaching-boards/:bid/comments - Add comment with @username format (reply)", () => {
		test("should successfully add reply using @username format (positive test)", async () => {
			const authorAgent = request.agent();
			const author = await registerUser(authorAgent, `reply_author_${Date.now()}`, "password", ["CPR"]);

			// Create board
			const createData = {
				title: "Board for Reply Format",
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
			await authorAgent
				.post(`${BOARD_BASE}/${boardId}/comments`)
				.set("Accept", "application/json")
				.send({
					comment: "Original comment",
					uid: author.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			// Get commentId
			const getBoardResponse = await authorAgent
				.get(`${BOARD_BASE}/${boardId}`)
				.set("Accept", "application/json")
				.ok((res) => true);

			const commentId = getBoardResponse.body.comments[0].id;

			// Add reply using @username format
			const replyResponse = await authorAgent
				.post(`${BOARD_BASE}/${boardId}/comments`)
				.set("Accept", "application/json")
				.send({
					comment: `@${author.username}: This is a reply`,
					uid: author.id,
					ts: Date.now(),
				})
				.ok((res) => true);

			expect(replyResponse.status).toBe(201);
			expect(replyResponse.body.message).toBe("Reply added successfully");
		});
	});
});

