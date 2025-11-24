import { UserDao } from "../daos/UserDao.js";

describe("User Skills DAO - Unit Tests", () => {
	let dao;
	let mockModel;

	beforeEach(() => {
		const createChainableMock = (result) => ({
			select: () => ({
				lean: () => Promise.resolve(result)
			})
		});

		mockModel = {
			findById: () => createChainableMock(null),
			findByIdAndUpdate: async () => null
		};
		dao = new UserDao({ UserModel: mockModel });
	});

	describe("getSkillsById", () => {
		test("returns skills for existing user (positive test)", async () => {
			const mockDoc = { skills: ["JavaScript", "Python"] };
			mockModel.findById = () => ({
				select: () => ({
					lean: () => Promise.resolve(mockDoc)
				})
			});

			const result = await dao.getSkillsById("user123");

			expect(result).toEqual(["JavaScript", "Python"]);
		});

		test("returns empty array when user has no skills (positive test)", async () => {
			const mockDoc = { skills: [] };
			mockModel.findById = () => ({
				select: () => ({
					lean: () => Promise.resolve(mockDoc)
				})
			});

			const result = await dao.getSkillsById("user123");

			expect(result).toEqual([]);
		});

		test("returns empty array when user does not exist (negative test)", async () => {
			mockModel.findById = () => ({
				select: () => ({
					lean: () => Promise.resolve(null)
				})
			});

			const result = await dao.getSkillsById("nonexistent");

			expect(result).toEqual([]);
		});

		test("calls Model.findById with correct parameters (positive test)", async () => {
			let calledWith = null;
			const mockDoc = { skills: [] };
			mockModel.findById = (id) => {
				calledWith = id;
				return {
					select: () => ({
						lean: () => Promise.resolve(mockDoc)
					})
				};
			};

			await dao.getSkillsById("user123");

			expect(calledWith).toBe("user123");
		});
	});

	describe("updateSkillsById", () => {
		test("updates skills for existing user (positive test)", async () => {
			let calledWith = null;
			mockModel.findByIdAndUpdate = async (id, update, options) => {
				calledWith = { id, update, options };
			};

			await dao.updateSkillsById("user123", ["JavaScript", "Python"]);

			expect(calledWith.id).toBe("user123");
			expect(calledWith.update.skills).toEqual(["JavaScript", "Python"]);
		});

		test("converts non-array to empty array (positive test)", async () => {
			let calledWith = null;
			mockModel.findByIdAndUpdate = async (id, update, options) => {
				calledWith = { id, update, options };
			};

			await dao.updateSkillsById("user123", null);

			expect(calledWith.update.skills).toEqual([]);
		});

		test("preserves array skills (positive test)", async () => {
			let calledWith = null;
			mockModel.findByIdAndUpdate = async (id, update, options) => {
				calledWith = { id, update, options };
			};

			await dao.updateSkillsById("user123", ["React", "Vue"]);

			expect(calledWith.update.skills).toEqual(["React", "Vue"]);
		});
	});
});
