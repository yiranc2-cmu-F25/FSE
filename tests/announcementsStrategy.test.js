import { jest } from "@jest/globals";
import Announcement from "../entities/Announcement.js";
import { announcementsStrategy } from "../services/search/announcementsStrategy.js";

describe("announcementsStrategy.execute", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("returns 400 early when content query missing", async () => {
    const req = { query: {} };
    const res = await announcementsStrategy.execute({ req });
    expect(res).toBeDefined();
    expect(res.code).toBe(400);
    expect(res.error || res.message).toBeDefined();
  });

  test("returns early 200 when query contains only stop words", async () => {
    const req = { query: { content: "the and or" } };
    const res = await announcementsStrategy.execute({ req });
    expect(res).toBeDefined();
    expect(res.code).toBe(200);
    expect(res.count).toBe(0);
    expect(res.results).toEqual([]);
  });

  test("maps Announcement.searchAnnouncement results into response.results", async () => {
    const fakeItems = [
      {
        _id: "1",
        sender: { username: "alice" },
        content: "hello",
        timestamp: "t1",
        status: "ok",
      },
      {
        _id: "2",
        sender: "bob",
        content: "hey",
        timestamp: "t2",
        status: "help",
      },
    ];

    jest
      .spyOn(Announcement, "searchAnnouncement")
      .mockResolvedValue({ count: 2, items: fakeItems, nextCursor: "next" });

    const req = { query: { content: "hello" } };
    const res = await announcementsStrategy.execute({ req });

    expect(Announcement.searchAnnouncement).toHaveBeenCalled();
    expect(res.code).toBe(200);
    expect(res.count).toBe(2);
    expect(res.nextCursor).toBe("next");
    expect(res.results).toHaveLength(2);
    expect(res.results[0]).toEqual({
      id: "1",
      sender: "alice",
      content: "hello",
      timestamp: "t1",
      status: "ok",
    });
    expect(res.results[1]).toEqual({
      id: "2",
      sender: "bob",
      content: "hey",
      timestamp: "t2",
      status: "help",
    });
  });

  test("returns 500 when searchAnnouncement throws", async () => {
    jest.spyOn(Announcement, "searchAnnouncement").mockImplementation(() => {
      throw new Error("boom");
    });
    const req = { query: { content: "hello" } };
    const res = await announcementsStrategy.execute({ req });
    expect(res.code).toBe(500);
    expect(res.status).toBe("error");
  });
});
