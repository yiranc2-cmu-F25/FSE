import {
	updateUserSkills,
	getUserSkills
} from "../controllers/userSkillsController.js";
import User from "../entities/User.js";

describe("User Skills Controller - Unit Tests", () => {
	let originalFindById;
	let originalUpdateSkillsById;
	let originalGetSkillsById;

	beforeEach(() => {
		originalFindById = User.findById;
		originalUpdateSkillsById = User.updateSkillsById;
		originalGetSkillsById = User.getSkillsById;
	});

	afterEach(() => {
		User.findById = originalFindById;
		User.updateSkillsById = originalUpdateSkillsById;
		User.getSkillsById = originalGetSkillsById;
	});

	describe("updateUserSkills", () => {
		test("returns 400 when userId is missing (negative test)", async () => {
			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: { skills: ["JavaScript", "Python"] },
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

			await updateUserSkills(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.error).toBe("Missing userId");
		});

		test("returns 400 when skills is not an array (negative test)", async () => {
			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: { userId: "user123", skills: "JavaScript" },
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

			await updateUserSkills(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.error).toBe("Skills must be an array");
		});

		test("returns 400 when skills is null (negative test)", async () => {
			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: { userId: "user123", skills: null },
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

			await updateUserSkills(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.error).toBe("Skills must be an array");
		});

		test("returns 404 when user not found (negative test)", async () => {
			User.findById = async () => null;

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: { userId: "nonexistent", skills: ["JavaScript"] },
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

			await updateUserSkills(req, res);

			expect(statusCode).toBe(404);
			expect(jsonBody.error).toBe("User not found");
		});

		test("successfully updates user skills when all validations pass (positive test)", async () => {
			const mockUser = { id: "user123", username: "testuser" };
			User.findById = async () => mockUser;
			User.updateSkillsById = async () => {};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: { userId: "user123", skills: ["JavaScript", "Python", "React"] },
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

			await updateUserSkills(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.message).toBe("User skills updated successfully");
			expect(jsonBody.userId).toBe("user123");
			expect(jsonBody.skills).toEqual(["JavaScript", "Python", "React"]);
		});

		test("successfully updates user skills with empty array (positive test)", async () => {
			const mockUser = { id: "user123", username: "testuser" };
			User.findById = async () => mockUser;
			User.updateSkillsById = async () => {};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: { userId: "user123", skills: [] },
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

			await updateUserSkills(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.message).toBe("User skills updated successfully");
			expect(jsonBody.userId).toBe("user123");
			expect(jsonBody.skills).toEqual([]);
		});

		test("handles database error when finding user (negative test)", async () => {
			User.findById = async () => {
				throw new Error("Database connection error");
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: { userId: "user123", skills: ["JavaScript"] },
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

			await updateUserSkills(req, res);

			expect(statusCode).toBe(500);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Server error");
		});

		test("handles database error when updating skills (negative test)", async () => {
			const mockUser = { id: "user123", username: "testuser" };
			User.findById = async () => mockUser;
			User.updateSkillsById = async () => {
				throw new Error("Database update error");
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				body: { userId: "user123", skills: ["JavaScript"] },
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

			await updateUserSkills(req, res);

			expect(statusCode).toBe(500);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Server error");
		});
	});

	describe("getUserSkills", () => {
		test("returns 400 when user ID is missing (negative test)", async () => {
			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: {},
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

			await getUserSkills(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.error).toBe("Missing user ID");
		});

		test("returns 400 when user ID is empty string (negative test)", async () => {
			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { id: "" },
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

			await getUserSkills(req, res);

			expect(statusCode).toBe(400);
			expect(jsonBody.error).toBe("Missing user ID");
		});

		test("returns 404 when user not found (negative test)", async () => {
			User.findById = async () => null;

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { id: "nonexistent" },
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

			await getUserSkills(req, res);

			expect(statusCode).toBe(404);
			expect(jsonBody.error).toBe("User not found");
		});

		test("successfully gets user skills when user exists (positive test)", async () => {
			const mockUser = { id: "user123", username: "testuser" };
			const mockSkills = ["JavaScript", "Python", "React", "Node.js"];

			User.findById = async () => mockUser;
			User.getSkillsById = async () => mockSkills;

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { id: "user123" },
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

			await getUserSkills(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.userId).toBe("user123");
			expect(jsonBody.skills).toEqual(mockSkills);
		});

		test("successfully gets empty skills array when user has no skills (positive test)", async () => {
			const mockUser = { id: "user123", username: "testuser" };
			const mockSkills = [];

			User.findById = async () => mockUser;
			User.getSkillsById = async () => mockSkills;

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { id: "user123" },
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

			await getUserSkills(req, res);

			expect(statusCode).toBe(200);
			expect(jsonBody.userId).toBe("user123");
			expect(jsonBody.skills).toEqual([]);
		});

		test("handles database error when finding user (negative test)", async () => {
			User.findById = async () => {
				throw new Error("Database connection error");
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { id: "user123" },
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

			await getUserSkills(req, res);

			expect(statusCode).toBe(500);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Server error");
		});

		test("handles database error when getting skills (negative test)", async () => {
			const mockUser = { id: "user123", username: "testuser" };
			User.findById = async () => mockUser;
			User.getSkillsById = async () => {
				throw new Error("Database query error");
			};

			let statusCode = null;
			let jsonBody = null;
			const req = {
				params: { id: "user123" },
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

			await getUserSkills(req, res);

			expect(statusCode).toBe(500);
			expect(jsonBody.status).toBe("error");
			expect(jsonBody.message).toBe("Server error");
		});
	});
});

