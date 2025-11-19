import {
	getPresets,
	updatePresets,
	addCategory,
	deleteCategory,
	addSkill,
	deleteSkill
} from "../controllers/categorySkillPresetController.js";
import CategorySkillPresetDac from "../dacs/categorySkillPresetDac.js";

describe("Category Skill Preset Controller - Unit Tests", () => {
	let originalGetPresets;
	let originalUpdatePresets;

	beforeEach(() => {
		originalGetPresets = CategorySkillPresetDac.getPresets;
		originalUpdatePresets = CategorySkillPresetDac.updatePresets;
	});

	afterEach(() => {
		CategorySkillPresetDac.getPresets = originalGetPresets;
		CategorySkillPresetDac.updatePresets = originalUpdatePresets;
	});

	describe("getPresets", () => {
		test("successfully returns presets (positive test)", async () => {
			const mockPresets = {
				categories: ["Technical", "Soft Skills"],
				skills: ["JavaScript", "Python", "Communication"]
			};

			CategorySkillPresetDac.getPresets = async () => mockPresets;

			let statusCode = null;
			let jsonBody = null;
			const req = {};
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

			await getPresets(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.categories).toEqual(["Technical", "Soft Skills"]);
			expect(jsonBody.skills).toEqual(["JavaScript", "Python", "Communication"]);
		});

		test("returns empty arrays when presets are missing (positive test)", async () => {
			const mockPresets = {};

			CategorySkillPresetDac.getPresets = async () => mockPresets;

			let statusCode = null;
			let jsonBody = null;
			const req = {};
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

			await getPresets(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.categories).toEqual([]);
			expect(jsonBody.skills).toEqual([]);
		});

		test("returns 500 when getPresets throws error (negative test)", async () => {
			CategorySkillPresetDac.getPresets = async () => {
				throw new Error("Database error");
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {};
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

			await getPresets(req, res);

			expect(statusCode).toBe(500);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Server error");
		});
	});

	describe("updatePresets", () => {
		test("successfully updates presets with valid arrays (positive test)", async () => {
			const updatedPresets = {
				categories: ["Technical", "Leadership"],
				skills: ["JavaScript", "Python"]
			};

			CategorySkillPresetDac.updatePresets = async ({ categories, skills }) => ({
				categories,
				skills
			});

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: {
					categories: ["Technical", "Leadership"],
					skills: ["JavaScript", "Python"]
				}
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

			await updatePresets(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.categories).toEqual(["Technical", "Leadership"]);
			expect(jsonBody.skills).toEqual(["JavaScript", "Python"]);
		});

		test("returns 400 when categories is not an array (negative test)", async () => {
			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: {
					categories: "not an array",
					skills: ["JavaScript"]
				}
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

			await updatePresets(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("must be arrays");
		});

		test("returns 400 when skills is not an array (negative test)", async () => {
			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: {
					categories: ["Technical"],
					skills: "not an array"
				}
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

			await updatePresets(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("must be arrays");
		});

		test("returns 500 when updatePresets throws error (negative test)", async () => {
			CategorySkillPresetDac.updatePresets = async () => {
				throw new Error("Database error");
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: {
					categories: ["Technical"],
					skills: ["JavaScript"]
				}
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

			await updatePresets(req, res);

			expect(statusCode).toBe(500);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Server error");
		});
	});

	describe("addCategory", () => {
		test("successfully adds new category (positive test)", async () => {
			const existingPresets = {
				categories: ["Technical"],
				skills: ["JavaScript"]
			};

			CategorySkillPresetDac.getPresets = async () => existingPresets;
			CategorySkillPresetDac.updatePresets = async ({ categories, skills }) => ({
				categories,
				skills
			});

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: {
					category: "Leadership"
				}
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

			await addCategory(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.categories).toContain("Leadership");
			expect(jsonBody.categories).toContain("Technical");
			expect(jsonBody.categories.length).toBe(2);
		});

		test("returns 400 when category is empty string (negative test)", async () => {
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: {
					category: ""
				}
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

			await addCategory(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toContain("must be a non-empty string");
		});

		test("returns 409 when category already exists (negative test)", async () => {
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical", "Leadership"],
				skills: ["JavaScript"]
			});

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: {
					category: "Technical"
				}
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

			await addCategory(req, res);

			expect(statusCode).toBe(409);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Category already exists");
		});

		test("trims whitespace from category name (positive test)", async () => {
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});
			CategorySkillPresetDac.updatePresets = async ({ categories, skills }) => ({
				categories,
				skills
			});

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: {
					category: "  Leadership  "
				}
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

			await addCategory(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.categories).toContain("Leadership");
			expect(jsonBody.categories).not.toContain("  Leadership  ");
		});
	});

	describe("deleteCategory", () => {
		test("successfully deletes existing category (positive test)", async () => {
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical", "Leadership"],
				skills: ["JavaScript"]
			});
			CategorySkillPresetDac.updatePresets = async ({ categories, skills }) => ({
				categories,
				skills
			});

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: {
					category: "Leadership"
				}
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

			await deleteCategory(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.categories).not.toContain("Leadership");
			expect(jsonBody.categories).toContain("Technical");
			expect(jsonBody.categories.length).toBe(1);
		});

		test("returns 404 when category does not exist (negative test)", async () => {
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: {
					category: "NonExistent"
				}
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

			await deleteCategory(req, res);

			expect(statusCode).toBe(404);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Category not found");
		});
	});

	describe("addSkill", () => {
		test("successfully adds new skill (positive test)", async () => {
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});
			CategorySkillPresetDac.updatePresets = async ({ categories, skills }) => ({
				categories,
				skills
			});

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: {
					skill: "Python"
				}
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

			await addSkill(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.skills).toContain("Python");
			expect(jsonBody.skills).toContain("JavaScript");
			expect(jsonBody.skills.length).toBe(2);
		});

		test("returns 409 when skill already exists (negative test)", async () => {
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical"],
				skills: ["JavaScript", "Python"]
			});

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: {
					skill: "JavaScript"
				}
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

			await addSkill(req, res);

			expect(statusCode).toBe(409);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Skill already exists");
		});
	});

	describe("deleteSkill", () => {
		test("successfully deletes existing skill (positive test)", async () => {
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical"],
				skills: ["JavaScript", "Python"]
			});
			CategorySkillPresetDac.updatePresets = async ({ categories, skills }) => ({
				categories,
				skills
			});

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: {
					skill: "Python"
				}
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

			await deleteSkill(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.skills).not.toContain("Python");
			expect(jsonBody.skills).toContain("JavaScript");
			expect(jsonBody.skills.length).toBe(1);
		});

		test("returns 404 when skill does not exist (negative test)", async () => {
			CategorySkillPresetDac.getPresets = async () => ({
				categories: ["Technical"],
				skills: ["JavaScript"]
			});

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: {
					skill: "NonExistent"
				}
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

			await deleteSkill(req, res);

			expect(statusCode).toBe(404);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Skill not found");
		});
	});
});

