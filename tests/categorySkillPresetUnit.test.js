import { CategorySkillPresetDao } from "../daos/CategorySkillPresetDao.js";

describe("Category Skill Preset DAO - Unit Tests", () => {
	let dao;
	let mockModel;

	beforeEach(() => {
		mockModel = {
			findOne: () => ({ lean: () => Promise.resolve(null) }),
			create: async () => ({ toObject: () => ({ categories: [], skills: [] }) }),
			findOneAndUpdate: () => ({ lean: () => Promise.resolve(null) })
		};
		dao = new CategorySkillPresetDao({ CategorySkillPresetModel: mockModel });
	});

	describe("getPresets", () => {
		test("returns existing presets (positive test)", async () => {
			const mockDoc = { categories: ["Technical"], skills: ["JavaScript"] };
			mockModel.findOne = () => ({ lean: () => Promise.resolve(mockDoc) });

			const result = await dao.getPresets();

			expect(result.categories).toEqual(["Technical"]);
			expect(result.skills).toEqual(["JavaScript"]);
		});

		test("creates default presets when none exist (positive test)", async () => {
			const mockDoc = { toObject: () => ({ categories: [], skills: [] }) };
			mockModel.findOne = () => ({ lean: () => Promise.resolve(null) });
			mockModel.create = async () => mockDoc;

			const result = await dao.getPresets();

			expect(result.categories).toEqual([]);
			expect(result.skills).toEqual([]);
		});
	});

	describe("updatePresets", () => {
		test("updates categories and skills (positive test)", async () => {
			const mockDoc = { categories: ["Technical", "Leadership"], skills: ["JavaScript", "Python"] };
			mockModel.findOneAndUpdate = () => ({ lean: () => Promise.resolve(mockDoc) });

			const result = await dao.updatePresets({
				categories: ["Technical", "Leadership"],
				skills: ["JavaScript", "Python"]
			});

			expect(result.categories).toEqual(["Technical", "Leadership"]);
			expect(result.skills).toEqual(["JavaScript", "Python"]);
		});

		test("creates presets if none exist (positive test)", async () => {
			const mockDoc = { categories: ["Technical"], skills: ["JavaScript"] };
			mockModel.findOneAndUpdate = () => ({ lean: () => Promise.resolve(mockDoc) });

			const result = await dao.updatePresets({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			expect(result.categories).toEqual(["Technical"]);
			expect(result.skills).toEqual(["JavaScript"]);
		});

		test("allows empty arrays (positive test)", async () => {
			const mockDoc = { categories: [], skills: [] };
			mockModel.findOneAndUpdate = () => ({ lean: () => Promise.resolve(mockDoc) });

			const result = await dao.updatePresets({
				categories: [],
				skills: []
			});

			expect(result.categories).toEqual([]);
			expect(result.skills).toEqual([]);
		});
	});
});
