import { CoachingBoardDao } from "../daos/CoachingBoardDao.js";

describe("Coaching Board Reply DAO - Unit Tests", () => {
	let dao;
	let mockModel;

	beforeEach(() => {
		mockModel = {
			findOneAndUpdate: () => ({ lean: () => Promise.resolve(null) }),
			findOne: () => null
		};
		dao = new CoachingBoardDao({ CoachingBoardModel: mockModel });
	});

	describe("addReply", () => {
		test("adds reply to comment (positive test)", async () => {
			const mockDoc = {
				_id: "board123",
				comments: [
					{
						_id: "comment123",
						replies: [
							{
								_id: "reply123",
								reply: "I agree!",
								author: "user3",
								timestamp: new Date()
							}
						]
					}
				]
			};
			mockModel.findOneAndUpdate = () => ({ lean: () => Promise.resolve(mockDoc) });

			const result = await dao.addReply({
				id: "board123",
				commentId: "comment123",
				author: "user3",
				reply: "I agree!",
				timestamp: new Date()
			});

			expect(result).not.toBeNull();
			expect(result.comments[0].replies.length).toBe(1);
			expect(result.comments[0].replies[0].reply).toBe("I agree!");
		});

		test("returns null when board does not exist (negative test)", async () => {
			mockModel.findOneAndUpdate = () => ({ lean: () => Promise.resolve(null) });

			const result = await dao.addReply({
				id: "nonexistent",
				commentId: "comment123",
				author: "user3",
				reply: "I agree!",
				timestamp: new Date()
			});

			expect(result).toBeNull();
		});

		test("sets replyTo when provided (positive test)", async () => {
			const mockDoc = {
				_id: "board123",
				comments: [
					{
						_id: "comment123",
						replies: [
							{
								_id: "reply123",
								reply: "I agree!",
								replyTo: "reply1"
							}
						]
					}
				]
			};
			mockModel.findOneAndUpdate = () => ({ lean: () => Promise.resolve(mockDoc) });

			const result = await dao.addReply({
				id: "board123",
				commentId: "comment123",
				author: "user3",
				reply: "I agree!",
				timestamp: new Date(),
				replyTo: "reply1"
			});

			expect(result.comments[0].replies[0].replyTo).toBe("reply1");
		});
	});

	describe("toggleReplyLike", () => {
		test("toggles like on reply (positive test)", async () => {
			const mockReply = {
				_id: "reply123",
				likes: []
			};
			const mockComment = {
				_id: "comment123",
				replies: {
					id: () => mockReply
				}
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
							replies: [
								{
									_id: "reply123",
									likes: ["user4"]
								}
							]
						}
					]
				})
			};
			mockModel.findOne = async () => mockBoard;
			mockBoard.comments.id = () => mockComment;
			mockComment.replies.id = () => mockReply;

			const result = await dao.toggleReplyLike({
				id: "board123",
				commentId: "comment123",
				replyId: "reply123",
				userId: "user4"
			});

			expect(result).not.toBeNull();
		});

		test("returns null when board does not exist (negative test)", async () => {
			mockModel.findOne = () => null;

			const result = await dao.toggleReplyLike({
				id: "nonexistent",
				commentId: "comment123",
				replyId: "reply123",
				userId: "user4"
			});

			expect(result).toBeNull();
		});

		test("returns null when reply does not exist (negative test)", async () => {
			const mockComment = {
				_id: "comment123",
				replies: {
					id: () => null
				}
			};
			const mockBoard = {
				_id: "board123",
				comments: {
					id: () => mockComment
				}
			};
			mockModel.findOne = async () => mockBoard;
			mockBoard.comments.id = () => mockComment;

			const result = await dao.toggleReplyLike({
				id: "board123",
				commentId: "comment123",
				replyId: "nonexistent",
				userId: "user4"
			});

			expect(result).toBeNull();
		});
	});

	describe("deleteReply", () => {
		test("deletes reply when author matches (positive test)", async () => {
			const mockReply = {
				_id: "reply123",
				author: "user3",
				replyTo: null
			};
			const mockRepliesArray = [mockReply];
			mockRepliesArray.id = (id) => {
				if (String(id) === String(mockReply._id)) return mockReply;
				return null;
			};
			mockRepliesArray.pull = (id) => {
				const index = mockRepliesArray.findIndex(r => String(r._id) === String(id));
				if (index !== -1) mockRepliesArray.splice(index, 1);
			};
			
			const mockComment = {
				_id: "comment123",
				replies: mockRepliesArray
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
							replies: []
						}
					]
				})
			};
			mockModel.findOne = () => Promise.resolve(mockBoard);
			mockBoard.comments.id = () => mockComment;

			const result = await dao.deleteReply({
				id: "board123",
				commentId: "comment123",
				replyId: "reply123",
				author: "user3"
			});

			expect(result).not.toBeNull();
		});

		test("returns null when author does not match (negative test)", async () => {
			const mockReply = {
				_id: "reply123",
				author: "user3"
			};
			const mockComment = {
				_id: "comment123",
				replies: {
					id: () => mockReply
				}
			};
			const mockBoard = {
				_id: "board123",
				comments: {
					id: () => mockComment
				}
			};
			mockModel.findOne = async () => mockBoard;
			mockBoard.comments.id = () => mockComment;
			mockComment.replies.id = () => mockReply;

			const result = await dao.deleteReply({
				id: "board123",
				commentId: "comment123",
				replyId: "reply123",
				author: "user4"
			});

			expect(result).toBeNull();
		});
	});
});
