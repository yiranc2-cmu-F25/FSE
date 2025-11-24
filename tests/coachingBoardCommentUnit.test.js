import { CoachingBoardDao } from "../daos/CoachingBoardDao.js";

describe("Coaching Board Comment DAO - Unit Tests", () => {
	let dao;
	let mockModel;

	beforeEach(() => {
		mockModel = {
			findOneAndUpdate: () => ({ lean: () => Promise.resolve(null) }),
			findOne: () => null,
			findById: () => null
		};
		dao = new CoachingBoardDao({ CoachingBoardModel: mockModel });
	});

	describe("addComment", () => {
		test("adds comment to board (positive test)", async () => {
			const mockDoc = {
				_id: "board123",
				title: "Test Board",
				comments: [
					{
						_id: "comment123",
						comment: "Great post!",
						author: "user2",
						timestamp: new Date()
					}
				]
			};
			mockModel.findOneAndUpdate = () => ({ lean: () => Promise.resolve(mockDoc) });

			const result = await dao.addComment({
				id: "board123",
				author: "user2",
				comment: "Great post!",
				timestamp: new Date()
			});

			expect(result).not.toBeNull();
			expect(result.comments.length).toBe(1);
			expect(result.comments[0].comment).toBe("Great post!");
		});

		test("returns null when board does not exist (negative test)", async () => {
			mockModel.findOneAndUpdate = () => ({ lean: () => Promise.resolve(null) });

			const result = await dao.addComment({
				id: "nonexistent",
				author: "user2",
				comment: "Great post!",
				timestamp: new Date()
			});

			expect(result).toBeNull();
		});

		test("calls Model.findOneAndUpdate with correct parameters (positive test)", async () => {
			let calledWith = null;
			const mockDoc = { _id: "board123", comments: [] };
			mockModel.findOneAndUpdate = (query, update, options) => {
				calledWith = { query, update, options };
				return { lean: () => Promise.resolve(mockDoc) };
			};

			await dao.addComment({
				id: "board123",
				author: "user2",
				comment: "Great post!",
				timestamp: new Date()
			});

			expect(calledWith.query._id).toBe("board123");
			expect(calledWith.query.publicationState).toBe("published");
			expect(calledWith.update.$push.comments).toBeDefined();
		});
	});

	describe("toggleCommentLike", () => {
		test("toggles like on comment (positive test)", async () => {
			const mockComment = {
				_id: "comment123",
				likes: [],
				id: () => "comment123"
			};
			const mockBoard = {
				_id: "board123",
				comments: {
					id: () => mockComment
				},
				save: async () => {},
				toObject: () => ({
					_id: "board123",
					comments: [
						{
							_id: "comment123",
							likes: ["user3"]
						}
					]
				})
			};
			mockModel.findOne = async () => mockBoard;
			mockBoard.comments.id = () => mockComment;

			const result = await dao.toggleCommentLike({
				id: "board123",
				commentId: "comment123",
				userId: "user3"
			});

			expect(result).not.toBeNull();
		});

		test("returns null when board does not exist (negative test)", async () => {
			mockModel.findOne = () => null;

			const result = await dao.toggleCommentLike({
				id: "nonexistent",
				commentId: "comment123",
				userId: "user3"
			});

			expect(result).toBeNull();
		});

		test("returns null when comment does not exist (negative test)", async () => {
			const mockBoard = {
				_id: "board123",
				comments: {
					id: () => null
				}
			};
			mockModel.findOne = async () => mockBoard;

			const result = await dao.toggleCommentLike({
				id: "board123",
				commentId: "nonexistent",
				userId: "user3"
			});

			expect(result).toBeNull();
		});
	});

	describe("deleteComment", () => {
		test("deletes comment when author matches (positive test)", async () => {
			const mockComment = {
				_id: "comment123",
				author: "user2",
				id: () => "comment123"
			};
			const mockBoard = {
				_id: "board123",
				comments: {
					id: () => mockComment,
					pull: () => {}
				},
				save: async () => {},
				toObject: () => ({
					_id: "board123",
					comments: []
				})
			};
			mockModel.findOne = async () => mockBoard;
			mockBoard.comments.id = () => mockComment;

			const result = await dao.deleteComment({
				id: "board123",
				commentId: "comment123",
				author: "user2"
			});

			expect(result).not.toBeNull();
		});

		test("returns null when author does not match (negative test)", async () => {
			const mockComment = {
				_id: "comment123",
				author: "user2"
			};
			const mockBoard = {
				_id: "board123",
				comments: {
					id: () => mockComment
				}
			};
			mockModel.findOne = async () => mockBoard;
			mockBoard.comments.id = () => mockComment;

			const result = await dao.deleteComment({
				id: "board123",
				commentId: "comment123",
				author: "user3"
			});

			expect(result).toBeNull();
		});

		test("returns null when comment does not exist (negative test)", async () => {
			const mockBoard = {
				_id: "board123",
				comments: {
					id: () => null
				}
			};
			mockModel.findOne = async () => mockBoard;

			const result = await dao.deleteComment({
				id: "board123",
				commentId: "nonexistent",
				author: "user2"
			});

			expect(result).toBeNull();
		});
	});
});
