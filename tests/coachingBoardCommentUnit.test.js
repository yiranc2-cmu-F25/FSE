import {
	addComment,
	getBoard,
	getMoreComments,
	toggleCommentLike,
	deleteComment
} from "../controllers/coachingBoardController.js";
import CoachingBoard from "../entities/CoachingBoard.js";
import User from "../entities/User.js";

describe("Coaching Board Controller - Unit Tests (Comments)", () => {
	let originalGetById;
	let originalAddComment;
	let originalToggleCommentLike;
	let originalDeleteComment;
	let originalGetUsernameById;

	beforeEach(() => {
		originalGetById = CoachingBoard.getById;
		originalAddComment = CoachingBoard.addComment;
		originalToggleCommentLike = CoachingBoard.toggleCommentLike;
		originalDeleteComment = CoachingBoard.deleteComment;
		originalGetUsernameById = User.getUsernameById;
	});

	afterEach(() => {
		CoachingBoard.getById = originalGetById;
		CoachingBoard.addComment = originalAddComment;
		CoachingBoard.toggleCommentLike = originalToggleCommentLike;
		CoachingBoard.deleteComment = originalDeleteComment;
		User.getUsernameById = originalGetUsernameById;
	});

	describe("addComment - Comments", () => {
		test("returns 401 when user is not authenticated (negative test)", async () => {
			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123" },
				body: { comment: "Test comment" },
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

			expect(statusCode).toBe(401);
			expect(jsonBody.error).toBe("Unauthorized");
		});

		test("returns 400 when comment is empty (negative test)", async () => {
			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123" },
				body: { comment: "   " },
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

			expect(statusCode).toBe(400);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("Missing required fields");
		});

		test("successfully adds comment (positive test)", async () => {
			const mockBoard = {
				id: "board123",
				title: "Test Board",
				comments: [],
				subscribers: ["user123"]
			};

			CoachingBoard.getById = async () => mockBoard;
			CoachingBoard.addComment = async () => mockBoard;

			const mockSocket = {
				emitCoachingBoardComment: () => {},
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
				body: { comment: "Test comment" },
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
			expect(jsonBody.message).toBe("Comment added successfully");
		});

		test("handles database error (negative test)", async () => {
			CoachingBoard.addComment = async () => {
				throw new Error("Database error");
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123" },
				body: { comment: "Test comment" },
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

			expect(statusCode).toBe(500);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Server error");
		});
	});

	describe("getBoard", () => {
		test("returns 400 when board id is missing (negative test)", async () => {
			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: {},
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

			await getBoard(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("Missing board id");
		});

		test("returns 404 when board not found (negative test)", async () => {
			CoachingBoard.getById = async () => null;

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "nonexistent" },
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

			await getBoard(req, res);

			expect(statusCode).toBe(404);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Board not found");
		});

		test("successfully returns board with comments sorted by likes (positive test)", async () => {
			const mockBoard = {
				id: "board123",
				title: "Test Board",
				author: "author123",
				comments: [
					{ id: "comment1", author: "user1", comment: "Comment 1", likes: ["user2"], timestamp: new Date("2024-01-01") },
					{ id: "comment2", author: "user2", comment: "Comment 2", likes: ["user1", "user3"], timestamp: new Date("2024-01-02") }
				]
			};

			CoachingBoard.getById = async () => mockBoard;
			User.getUsernameById = async (id) => {
				if (id === "author123") return "author";
				if (id === "user1") return "user1";
				if (id === "user2") return "user2";
				return "unknown";
			};

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

			await getBoard(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.comments).toBeDefined();
			expect(jsonBody.comments[0].id).toBe("comment2");
			expect(jsonBody.comments[0].likes.length).toBe(2);
		});

		test("highlights comment when highlightCommentId is provided (positive test)", async () => {
			const mockBoard = {
				id: "board123",
				title: "Test Board",
				author: "author123",
				comments: [
					{ id: "comment1", author: "user1", comment: "Comment 1", likes: [], timestamp: new Date("2024-01-01") },
					{ id: "comment2", author: "user2", comment: "Comment 2", likes: ["user1"], timestamp: new Date("2024-01-02") }
				]
			};

			CoachingBoard.getById = async () => mockBoard;
			User.getUsernameById = async (id) => {
				if (id === "author123") return "author";
				if (id === "user1") return "user1";
				if (id === "user2") return "user2";
				return "unknown";
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123" },
				query: { highlightComment: "comment1" },
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

			await getBoard(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.comments[0].id).toBe("comment1");
		});

		test("returns specific comment when cid is provided (positive test)", async () => {
			const mockBoard = {
				id: "board123",
				title: "Test Board",
				author: "author123",
				comments: [
					{ id: "comment1", author: "user1", comment: "Comment 1", replies: [] },
					{ id: "comment2", author: "user2", comment: "Comment 2", replies: [] }
				]
			};

			CoachingBoard.getById = async () => mockBoard;
			User.getUsernameById = async (id) => {
				if (id === "author123") return "author";
				if (id === "user1") return "user1";
				return "unknown";
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123" },
				query: { cid: "comment1" },
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

			await getBoard(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.comments.length).toBe(1);
			expect(jsonBody.comments[0].id).toBe("comment1");
		});

		test("returns 404 when comment not found with cid (negative test)", async () => {
			const mockBoard = {
				id: "board123",
				title: "Test Board",
				author: "author123",
				comments: [
					{ id: "comment1", author: "user1", comment: "Comment 1", replies: [] }
				]
			};

			CoachingBoard.getById = async () => mockBoard;
			User.getUsernameById = async () => "author";

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123" },
				query: { cid: "nonexistent" },
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

			await getBoard(req, res);

			expect(statusCode).toBe(404);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Comment not found");
		});

		test("handles database error (negative test)", async () => {
			CoachingBoard.getById = async () => {
				throw new Error("Database error");
			};

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

			await getBoard(req, res);

			expect(statusCode).toBe(500);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Server error");
		});
	});

	describe("getMoreComments", () => {
		test("returns 400 when board id is missing (negative test)", async () => {
			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: {},
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

			await getMoreComments(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("Missing board id");
		});

		test("returns 404 when board not found (negative test)", async () => {
			CoachingBoard.getById = async () => null;

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "nonexistent" },
				query: { skip: "0", limit: "10" },
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

			await getMoreComments(req, res);

			expect(statusCode).toBe(404);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Board not found");
		});

		test("handles database error (negative test)", async () => {
			CoachingBoard.getById = async () => {
				throw new Error("Database error");
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123" },
				query: { skip: "0", limit: "10" },
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

			await getMoreComments(req, res);

			expect(statusCode).toBe(500);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Server error");
		});
	});

	describe("toggleCommentLike", () => {
		test("returns 401 when user is not authenticated (negative test)", async () => {
			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123", cid: "comment123" },
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

			await toggleCommentLike(req, res);

			expect(statusCode).toBe(401);
			expect(jsonBody.error).toBe("Unauthorized");
		});

		test("returns 400 when missing required fields (negative test)", async () => {
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

			await toggleCommentLike(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("Missing required fields");
		});

		test("returns 404 when board or comment not found (negative test)", async () => {
			CoachingBoard.toggleCommentLike = async () => null;

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

			await toggleCommentLike(req, res);

			expect(statusCode).toBe(404);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("not found");
		});

		test("successfully toggles comment like (positive test)", async () => {
			const mockBoard = { id: "board123" };
			CoachingBoard.toggleCommentLike = async () => mockBoard;

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

			await toggleCommentLike(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.message).toBe("Like toggled successfully");
		});

		test("handles database error (negative test)", async () => {
			CoachingBoard.toggleCommentLike = async () => {
				throw new Error("Database error");
			};

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

			await toggleCommentLike(req, res);

			expect(statusCode).toBe(500);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Server error");
		});
	});

	describe("deleteComment", () => {
		test("returns 400 when missing required fields (negative test)", async () => {
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

			await deleteComment(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("Missing required fields");
		});

		test("handles socket notification error gracefully (negative test)", async () => {
			CoachingBoard.deleteComment = async () => ({ id: "board123" });

			const mockSocket = {
				emitCoachingBoardCommentDeleted: () => {
					throw new Error("Socket error");
				}
			};
			const mockApp = {
				get: (key) => key === "socketInstance" ? mockSocket : null
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { bid: "board123", cid: "comment123" },
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

			await deleteComment(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.message).toBe("Comment deleted successfully");
		});

		test("handles database error (negative test)", async () => {
			CoachingBoard.deleteComment = async () => {
				throw new Error("Database error");
			};

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

			await deleteComment(req, res);

			expect(statusCode).toBe(500);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Server error");
		});
	});
});

