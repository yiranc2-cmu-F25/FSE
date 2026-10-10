import { jest } from "@jest/globals";
import { UserDao } from "../daos/UserDao.js";

function makeDoc(overrides = {}) {
  const doc = {
    _id: "abc123",
    username: "oldname",
    status: "active",
    role: "citizen",
    password: "hashed",
    save: jest.fn(async () => doc),
    markModified: jest.fn(),
    toObject() {
      const { save, markModified, toObject, ...plain } = this;
      return plain;
    },
    ...overrides,
  };
  return doc;
}

describe("UserDao.updateProfileById", () => {
  let dao;
  let model;

  beforeEach(() => {
    model = { findById: jest.fn() };
    dao = new UserDao({ UserModel: model });
  });

  test("returns null when the user does not exist", async () => {
    model.findById.mockResolvedValue(null);
    await expect(
      dao.updateProfileById("missing", { status: "inactive" }),
    ).resolves.toBeNull();
  });

  test("applies only the provided fields and saves once", async () => {
    const doc = makeDoc();
    model.findById.mockResolvedValue(doc);

    const result = await dao.updateProfileById("abc123", {
      role: "admin",
      username: "NewName",
    });

    expect(doc.role).toBe("admin");
    expect(doc.username).toBe("newname");
    expect(doc.status).toBe("active");
    expect(doc.save).toHaveBeenCalledTimes(1);
    expect(doc.markModified).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      id: "abc123",
      username: "newname",
      role: "admin",
    });
  });

  test("marks the password as modified so the hashing hook runs", async () => {
    const doc = makeDoc();
    model.findById.mockResolvedValue(doc);

    await dao.updateProfileById("abc123", { password: "newpass" });

    expect(doc.password).toBe("newpass");
    expect(doc.markModified).toHaveBeenCalledWith("password");
    expect(doc.save).toHaveBeenCalledTimes(1);
  });

  test("maps a duplicate-key error to 'Username already exists'", async () => {
    const dup = Object.assign(new Error("E11000 duplicate key"), {
      code: 11000,
    });
    model.findById.mockResolvedValue(
      makeDoc({ save: jest.fn().mockRejectedValue(dup) }),
    );

    await expect(
      dao.updateProfileById("abc123", { username: "taken" }),
    ).rejects.toThrow("Username already exists");
  });

  test("rethrows unrelated errors", async () => {
    model.findById.mockRejectedValue(new Error("boom"));
    await expect(
      dao.updateProfileById("abc123", { role: "admin" }),
    ).rejects.toThrow("boom");
  });
});
