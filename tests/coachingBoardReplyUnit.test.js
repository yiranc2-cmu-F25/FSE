import {
	addComment,
	getMoreReplies,
	toggleReplyLike,
	deleteReply
} from "../controllers/coachingBoardController.js";
import CoachingBoard from "../entities/CoachingBoard.js";
import User from "../entities/User.js";

describe("Coaching Board Controller - Unit Tests (Replies)", () => {
	let originalGetById;
	let originalAddReply;
	let originalToggleReplyLike;
	let originalDeleteReply;
	let originalGetUsernameById;

	beforeEach(() => {
		originalGetById = CoachingBoard.getById;
		originalAddReply = CoachingBoard.addReply;
		originalToggleReplyLike = CoachingBoard.toggleReplyLike;
		originalDeleteReply = CoachingBoard.deleteReply;
		originalGetUsernameById = User.getUsernameById;
	});

	afterEach(() => {
		CoachingBoard.getById = originalGetById;
		CoachingBoard.addReply = originalAddReply;
		CoachingBoard.toggleReplyLike = originalToggleReplyLike;
		CoachingBoard.deleteReply = originalDeleteReply;
		User.getUsernameById = originalGetUsernameById;
	});

	describe("addComment - Replies", () => {
		test("successfully adds reply to comment with comment ID (positive test)", async () => {
			const mockBoard = {
				id: "board123",
				title: "Test Board",
				comments: [
					{ id: "comment123", author: "user1", comment: "Original comment", replies: [] }
				]
			};

			CoachingBoard.getById = async () => mockBoard;
			CoachingBoard.addReply = async () => mockBoard;

			const mockSocket = {
				emitCoachingBoardReply: () => {},
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
				body: { comment: "@username#comment123: This is a reply" },
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

			await addComment(req, res);

			expect(statusCode).toBe(201);
			expect(jsonBody.message).toBe("Reply added successfully");
		});

		test("successfully adds reply to reply with reply ID (positive test)", async () => {
			const mockBoard = {
				id: "board123",
				title: "Test Board",
				comments: [
					{ 
						id: "comment123", 
						author: "user1", 
						comment: "Original comment", 
						replies: [
							{ id: "reply123", author: "user2", reply: "First reply" }
						]
					}
				]
			};

			CoachingBoard.getById = async () => mockBoard;
			CoachingBoard.addReply = async () => mockBoard;

			const mockSocket = {
				emitCoachingBoardReply: () => {},
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
				body: { comment: "@username#reply:reply123: This is a nested reply" },
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

			await addComment(req, res);

			expect(statusCode).toBe(201);
			expect(jsonBody.message).toBe("Reply added successfully");
		});

		test("successfully adds reply by username lookup (positive test)", async () => {
			const mockBoard = {
				id: "board123",
				title: "Test Board",
				comments: [
					{ 
						id: "comment123", 
						author: "user1", 
						comment: "Original comment", 
						replies: []
					}
				]
			};

			CoachingBoard.getById = async () => mockBoard;
			CoachingBoard.addReply = async () => mockBoard;

			const mockSocket = {
				emitCoachingBoardReply: () => {},
				emitCoachingBoardNotification: () => {}
			};
			const mockApp = {
				get: (key) => key === "socketInstance" ? mockSocket : null
			};

			User.getUsernameById = async (id) => {
				if (id === "user1") return "targetuser";
				return "testuser";
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123" },
				body: { comment: "@targetuser: This is a reply" },
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

			await addComment(req, res);

			expect(statusCode).toBe(201);
			expect(jsonBody.message).toBe("Reply added successfully");
		});

		test("returns 404 when board not found for reply (negative test)", async () => {
			CoachingBoard.getById = async () => null;

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "nonexistent" },
				body: { comment: "@username: Reply text" },
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

			await addComment(req, res);

			expect(statusCode).toBe(404);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Board not found");
		});
	});

	describe("getMoreReplies", () => {
		test("returns 400 when board id or comment id is missing (negative test)", async () => {
			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123" },
				query: {},
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

			await getMoreReplies(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("Missing board id or comment id");
		});
	});

	describe("toggleReplyLike", () => {
		test("returns 400 when missing required fields (negative test)", async () => {
			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123", cid: "comment123" },
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

			await toggleReplyLike(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("Missing required fields");
		});

		test("successfully toggles reply like (positive test)", async () => {
			const mockBoard = { id: "board123" };
			CoachingBoard.toggleReplyLike = async () => mockBoard;

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123", cid: "comment123", rid: "reply123" },
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

			await toggleReplyLike(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.message).toBe("Like toggled successfully");
		});

		test("handles database error (negative test)", async () => {
			CoachingBoard.toggleReplyLike = async () => {
				throw new Error("Database error");
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123", cid: "comment123", rid: "reply123" },
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

			await toggleReplyLike(req, res);

			expect(statusCode).toBe(500);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Server error");
		});
	});

	describe("deleteReply", () => {
		test("returns 400 when missing required fields (negative test)", async () => {
			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123", cid: "comment123" },
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

			await deleteReply(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("Missing required fields");
		});

		test("handles socket notification error gracefully (negative test)", async () => {
			CoachingBoard.deleteReply = async () => ({ id: "board123" });

			const mockSocket = {
				emitCoachingBoardReplyDeleted: () => {
					throw new Error("Socket error");
				}
			};
			const mockApp = {
				get: (key) => key === "socketInstance" ? mockSocket : null
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123", cid: "comment123", rid: "reply123" },
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

			await deleteReply(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.message).toBe("Reply deleted successfully");
		});

		test("handles database error (negative test)", async () => {
			CoachingBoard.deleteReply = async () => {
				throw new Error("Database error");
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123", cid: "comment123", rid: "reply123" },
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

			await deleteReply(req, res);

			expect(statusCode).toBe(500);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Server error");
		});
	});
});

