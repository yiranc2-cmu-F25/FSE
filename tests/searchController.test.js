import { jest } from "@jest/globals";
import { search } from "../controllers/searchController.js";
import { announcementsStrategy } from "../services/search/announcementsStrategy.js";

describe("search controller", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("returns 400 for unsupported type", async () => {
    const req = { query: { type: "nope" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await search(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ code: 400, error: "Unsupported type: nope" });
  });

  test("propagates non-200 strategy result code and body", async () => {
    const req = { query: { type: "announcements" }, user: undefined };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    jest
      .spyOn(announcementsStrategy, "execute")
      .mockResolvedValue({ code: 404, message: "not found" });

    await search(req, res);

    expect(announcementsStrategy.execute).toHaveBeenCalledWith({
      req,
      user: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ code: 404, message: "not found" });
  });

  test("returns 200 and body when strategy returns code 200", async () => {
    const req = { query: { type: "announcements" }, user: undefined };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    const payload = {
      code: 200,
      count: 1,
      results: [{ id: "1" }],
      nextCursor: null,
    };
    jest.spyOn(announcementsStrategy, "execute").mockResolvedValue(payload);

    await search(req, res);

    expect(announcementsStrategy.execute).toHaveBeenCalledWith({
      req,
      user: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(payload);
  });

  test("returns 500 when strategy throws an error", async () => {
    const req = { query: { type: "announcements" }, user: undefined };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    jest.spyOn(announcementsStrategy, "execute").mockImplementation(() => {
      throw new Error("boom");
    });

    await search(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Server error",
    });
  });
});
