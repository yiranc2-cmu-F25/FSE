import { CoachingBoardDao } from "../daos/CoachingBoardDao.js";
import User from "../entities/User.js";
import userDac from "../dacs/userDac.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import { USER_STATUS } from "../constants/userStatus.js";

describe("Coaching Board DAO - Unit Tests", () => {
	let dao;
	let mockModel;

	beforeEach(async () => {
		const createChainableMock = (result) => ({
			lean: () => Promise.resolve(result),
			select: () => createChainableMock(result),
			sort: () => createChainableMock(result)
		});

		mockModel = {
			exists: async () => false,
			findOneAndUpdate: () => createChainableMock(null),
			findOne: () => createChainableMock(null),
			create: async () => ({ toObject: () => ({ _id: "123", title: "Test" }) }),
			deleteOne: async () => ({ deletedCount: 0 }),
			find: () => createChainableMock([]),
			countDocuments: async () => 0,
			findById: () => createChainableMock(null),
			updateOne: async () => {}
		};
		dao = new CoachingBoardDao({ CoachingBoardModel: mockModel });
		
		// Inject User DAO for filtering inactive users
		userDac.DAO = new inMemoryUserDao();
		
		// Create active test users
		const user1 = new User({
			username: "user1",
			password: "pass1",
			sharedstatus: "undefined",
			status: USER_STATUS.ACTIVE,
			role: "citizen"
		});
		await user1.create();
		const user2 = new User({
			username: "user2",
			password: "pass2",
			sharedstatus: "undefined",
			status: USER_STATUS.ACTIVE,
			role: "citizen"
		});
		await user2.create();
	});

	describe("checkDuplicateTitle", () => {
		test("returns false when no duplicate exists (positive test)", async () => {
			mockModel.exists = async () => false;

			const result = await dao.checkDuplicateTitle({ title: "New Title", category: "Technical" });

			expect(result).toBe(false);
		});

		test("returns true when duplicate exists (positive test)", async () => {
			mockModel.exists = async () => true;

			const result = await dao.checkDuplicateTitle({ title: "Existing Title", category: "Technical" });

			expect(result).toBe(true);
		});

		test("calls Model.exists with correct parameters (positive test)", async () => {
			let calledWith = null;
			mockModel.exists = async (query) => {
				calledWith = query;
				return false;
			};

			await dao.checkDuplicateTitle({ title: "Test Title", category: "Technical" });

			expect(calledWith.publicationState).toBe("published");
			expect(calledWith.category).toBe("Technical");
		});
	});

	describe("createDraftOrUpdate", () => {
		test("creates new draft when no draft exists (positive test)", async () => {
			const mockDoc = { _id: "123", title: "Draft Title", author: "user1", publicationState: "draft" };
			mockModel.findOneAndUpdate = () => ({
				lean: () => Promise.resolve(mockDoc)
			});

			const result = await dao.createDraftOrUpdate({
				author: "user1",
				payload: {
					title: "Draft Title",
					category: "Technical",
					description: "Desc",
					objective: "Obj",
					steps: ["Step 1"],
					relatedSkills: ["JavaScript"]
				}
			});

			expect(result.title).toBe("Draft Title");
			expect(result.author).toBe("user1");
		});

		test("updates existing draft when draft exists (positive test)", async () => {
			const mockDoc = { _id: "123", title: "Updated Title", author: "user1", publicationState: "draft" };
			mockModel.findOneAndUpdate = () => ({
				lean: () => Promise.resolve(mockDoc)
			});

			const result = await dao.createDraftOrUpdate({
				author: "user1",
				payload: { title: "Updated Title" }
			});

			expect(result.title).toBe("Updated Title");
		});
	});

	describe("getMyDraft", () => {
		test("returns draft when draft exists (positive test)", async () => {
			const mockDoc = { _id: "123", title: "Draft Title", author: "user1", publicationState: "draft" };
			mockModel.findOne = () => ({
				lean: () => Promise.resolve(mockDoc)
			});

			const result = await dao.getMyDraft({ author: "user1" });

			expect(result).not.toBeNull();
			expect(result.title).toBe("Draft Title");
		});

		test("returns null when no draft exists (negative test)", async () => {
			mockModel.findOne = () => ({
				lean: () => Promise.resolve(null)
			});

			const result = await dao.getMyDraft({ author: "user1" });

			expect(result).toBeNull();
		});
	});

	describe("publishNew", () => {
		test("creates new published board (positive test)", async () => {
			const mockDoc = {
				toObject: () => ({
					_id: "123",
					title: "Published Title",
					author: "user1",
					publicationState: "published",
					subscribers: ["user1"]
				})
			};
			mockModel.create = async () => mockDoc;

			const result = await dao.publishNew({
				author: "user1",
				payload: {
					title: "Published Title",
					category: "Technical",
					description: "Desc",
					objective: "Obj",
					steps: ["Step 1"],
					relatedSkills: ["JavaScript"]
				}
			});

			expect(result.title).toBe("Published Title");
			expect(result.author).toBe("user1");
			expect(result.publicationState).toBe("published");
		});

		test("automatically subscribes author (positive test)", async () => {
			let createCalledWith = null;
			const mockDoc = {
				toObject: () => ({
					_id: "123",
					title: "Published Title",
					author: "user1",
					publicationState: "published",
					subscribers: ["user1"]
				})
			};
			mockModel.create = async (data) => {
				createCalledWith = data;
				return mockDoc;
			};

			await dao.publishNew({
				author: "user1",
				payload: {
					title: "Published Title",
					category: "Technical",
					description: "Desc",
					objective: "Obj",
					steps: ["Step 1"],
					relatedSkills: ["JavaScript"]
				}
			});

			expect(createCalledWith.subscribers).toContain("user1");
			expect(createCalledWith.publicationState).toBe("published");
		});
	});

	describe("deleteDraft", () => {
		test("calls Model.deleteOne with correct parameters (positive test)", async () => {
			let calledWith = null;
			mockModel.deleteOne = async (query) => {
				calledWith = query;
				return { deletedCount: 1 };
			};

			await dao.deleteDraft({ author: "user1" });

			expect(calledWith.author).toBe("user1");
			expect(calledWith.publicationState).toBe("draft");
		});
	});

	describe("publishFromDraft", () => {
		test("deletes draft and publishes new board (positive test)", async () => {
			let deleteCalled = false;
			let createCalled = false;

			mockModel.deleteOne = async () => {
				deleteCalled = true;
			};

			const mockDoc = {
				toObject: () => ({
					_id: "123",
					title: "Published Title",
					author: "user1",
					publicationState: "published"
				})
			};
			mockModel.create = async () => {
				createCalled = true;
				return mockDoc;
			};

			const result = await dao.publishFromDraft({
				author: "user1",
				payload: {
					title: "Published Title",
					category: "Technical",
					description: "Desc",
					objective: "Obj",
					steps: ["Step 1"],
					relatedSkills: ["JavaScript"]
				}
			});

			expect(deleteCalled).toBe(true);
			expect(createCalled).toBe(true);
			expect(result.title).toBe("Published Title");
		});
	});

	describe("listPublished", () => {
		test("returns only published boards (positive test)", async () => {
			// Get active user IDs
			const user1 = await User.findByUsername("user1");
			const user2 = await User.findByUsername("user2");
			const user1Id = String(user1.id || user1._id);
			const user2Id = String(user2.id || user2._id);
			
			const mockDocs = [
				{ _id: "1", title: "Published 1", publicationState: "published", author: user1Id },
				{ _id: "2", title: "Published 2", publicationState: "published", author: user2Id }
			];
			mockModel.find = () => ({
				sort: () => ({
					select: () => ({
						lean: () => Promise.resolve(mockDocs)
					})
				})
			});

			const result = await dao.listPublished();

			expect(result.length).toBe(2);
		});

		test("returns empty array when no published boards (negative test)", async () => {
			mockModel.find = () => ({
				sort: () => ({
					select: () => ({
						lean: () => Promise.resolve([])
					})
				})
			});

			const result = await dao.listPublished();

			expect(result).toEqual([]);
		});
	});

	describe("getById", () => {
		test("returns board when board exists (positive test)", async () => {
			// Get active user ID
			const user1 = await User.findByUsername("user1");
			const user1Id = String(user1.id || user1._id);
			
			const mockDoc = { _id: "123", title: "Test Board", author: user1Id, comments: [] };
			mockModel.findById = () => ({
				lean: () => Promise.resolve(mockDoc)
			});

			const result = await dao.getById({ id: "123" });

			expect(result).not.toBeNull();
			expect(result.id).toBe("123");
		});

		test("returns null when board does not exist (negative test)", async () => {
			mockModel.findById = () => ({
				lean: () => Promise.resolve(null)
			});

			const result = await dao.getById({ id: "nonexistent" });

			expect(result).toBeNull();
		});
	});

	describe("updateBoard", () => {
		test("updates board when author matches (positive test)", async () => {
			const mockDoc = { _id: "123", title: "New Title", author: "user1", publicationState: "published" };
			mockModel.findOneAndUpdate = () => ({
				lean: () => Promise.resolve(mockDoc)
			});

			const result = await dao.updateBoard({
				id: "123",
				author: "user1",
				update: { title: "New Title" }
			});

			expect(result).not.toBeNull();
			expect(result.title).toBe("New Title");
		});

		test("returns null when author does not match (negative test)", async () => {
			mockModel.findOneAndUpdate = () => ({
				lean: () => Promise.resolve(null)
			});

			const result = await dao.updateBoard({
				id: "123",
				author: "user2",
				update: { title: "New Title" }
			});

			expect(result).toBeNull();
		});
	});

	describe("deleteBoard", () => {
		test("returns true when board deleted (positive test)", async () => {
			mockModel.deleteOne = async () => ({ deletedCount: 1 });

			const result = await dao.deleteBoard({ id: "123", author: "user1" });

			expect(result).toBe(true);
		});

		test("returns false when board not found (negative test)", async () => {
			mockModel.deleteOne = async () => ({ deletedCount: 0 });

			const result = await dao.deleteBoard({ id: "nonexistent", author: "user1" });

			expect(result).toBe(false);
		});
	});

	describe("existsPublishedByTitle", () => {
		test("returns false when no duplicate exists (positive test)", async () => {
			mockModel.exists = async () => false;

			const result = await dao.existsPublishedByTitle({ title: "New Title" });

			expect(result).toBe(false);
		});

		test("returns true when duplicate exists (positive test)", async () => {
			mockModel.exists = async () => true;

			const result = await dao.existsPublishedByTitle({ title: "Existing Title" });

			expect(result).toBe(true);
		});

		test("excludes specified ID from check (positive test)", async () => {
			let calledWith = null;
			mockModel.exists = async (query) => {
				calledWith = query;
				return false;
			};

			await dao.existsPublishedByTitle({ title: "Test Title", excludeId: "exclude123" });

			expect(calledWith._id.$ne).toBe("exclude123");
		});
	});

	describe("findPublishedByTitle", () => {
		test("returns board ID when found (positive test)", async () => {
			const mockDoc = { _id: "board123" };
			mockModel.findOne = () => ({
				select: () => ({
					lean: () => Promise.resolve(mockDoc)
				})
			});

			const result = await dao.findPublishedByTitle({ title: "Existing Title" });

			expect(result).toBe("board123");
		});

		test("returns null when not found (negative test)", async () => {
			mockModel.findOne = () => ({
				select: () => ({
					lean: () => Promise.resolve(null)
				})
			});

			const result = await dao.findPublishedByTitle({ title: "Nonexistent Title" });

			expect(result).toBeNull();
		});
	});
});
