import { jest } from "@jest/globals";

// ESM mocking for MemberList
await jest.unstable_mockModule("../entities/MemberList.js", () => ({
  getOnlineOfflineMembers: jest.fn(),
}));

// Import after mocks are set up
const { citizensByUsernameStrategy } = await import(
  "../services/search/citizensByUsernameStrategy.js"
);
const { citizensByStatusStrategy } = await import(
  "../services/search/citizensByStatusStrategy.js"
);
const { publicMessagesStrategy } = await import(
  "../services/search/publicMessagesStrategy.js"
);
const { privateMessagesStrategy } = await import(
  "../services/search/privateMessagesStrategy.js"
);

const MemberList = await import("../entities/MemberList.js");
import Msg from "../entities/Msg.js";
import Status from "../entities/Status.js";

describe("Search strategies - citizens by username", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("returns online first, then offline; within groups alphabetical", async () => {
    const app = { get: () => ({ getOnline: () => ["alice"] }) };
    const req = { app, query: { username: "a" } };

    // MemberList enforces alphabetical order; mock it sorted per group
    MemberList.getOnlineOfflineMembers.mockResolvedValue({
      onlineUsers: [
        { id: "2", name: "alice", status: "ok" },
        { id: "1", name: "bob", status: "ok" }, // filtered out by 'a'
      ],
      offlineUsers: [
        { id: "3", name: "charlie", status: "ok" },
        { id: "4", name: "dave", status: "help" },
      ],
    });

    const res = await citizensByUsernameStrategy.execute({ req });
    expect(res.code).toBe(200);
    const namesByGroup = res.results.map((r) => `${r.availability}:${r.u.name}`);
    // Filter with needle 'a' → online: alice; offline: charlie, dave
    expect(namesByGroup).toEqual([
      "online:alice",
      "offline:charlie",
      "offline:dave",
    ]);
  });

  test("supports limit and offset for citizens by username", async () => {
    const req = { app: {}, query: { username: "e", limit: "2", offset: "1" } };
    MemberList.getOnlineOfflineMembers.mockResolvedValue({
      onlineUsers: [
        { id: "11", name: "ed", status: "ok" },
        { id: "12", name: "erin", status: "ok" },
        { id: "10", name: "eve", status: "ok" },
      ],
      offlineUsers: [],
    });

    const res = await citizensByUsernameStrategy.execute({ req });
    expect(res.code).toBe(200);
    // offset 1, limit 2 → expect two results starting from second alphabetical entry
    const names = res.results.map((r) => r.u.name);
    expect(names).toEqual(["erin", "eve"]);
  });
});

describe("Search strategies - citizens by status", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("returns exact status matches, online first, alphabetical within groups", async () => {
    const req = { app: {}, query: { status: "ok" } };
    MemberList.getOnlineOfflineMembers.mockResolvedValue({
      onlineUsers: [
        { id: "2", name: "Alice", status: "OK" },
        { id: "1", name: "Bob", status: "OK" },
        { id: "3", name: "Zed", status: "HELP" },
      ],
      offlineUsers: [
        { id: "5", name: "charlie", status: "ok" },
        { id: "4", name: "dave", status: "ok" },
      ],
    });

    const res = await citizensByStatusStrategy.execute({ req });
    expect(res.code).toBe(200);
    const names = res.results.map((r) => r.u.name);
    // Online OK (Alice, Bob) then Offline OK (charlie, dave)
    expect(names).toEqual(["Alice", "Bob", "charlie", "dave"]);
  });

  test("supports limit and offset for citizens by status", async () => {
    const req = { app: {}, query: { status: "ok", limit: "1", offset: "2" } };
    jest.spyOn(MemberList, "getOnlineOfflineMembers").mockResolvedValue({
      onlineUsers: [
        { id: "1", name: "amy", status: "ok" },
        { id: "2", name: "anna", status: "ok" },
      ],
      offlineUsers: [
        { id: "3", name: "andrew", status: "ok" },
      ],
    });

    const res = await citizensByStatusStrategy.execute({ req });
    expect(res.code).toBe(200);
    const names = res.results.map((r) => r.u.name);
    // Alphabetical merged list would be: amy, anna, andrew → offset 2, limit 1 → [andrew]
    expect(names).toEqual(["andrew"]);
  });
});

describe("Search strategies - public messages", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("returns early empty when only stop-words provided", async () => {
    const req = { query: { content: "the and or" } };
    const res = await publicMessagesStrategy.execute({ req });
    expect(res.code).toBe(200);
    expect(res.count).toBe(0);
    expect(res.results).toEqual([]);
  });

  test("calls Msg.searchPublicMsg with parsed terms and maps results", async () => {
    jest.spyOn(Msg, "searchPublicMsg").mockResolvedValue({
      count: 1,
      nextCursor: null,
      items: [
        { _id: "1", sender: { username: "alice" }, content: "hello", timestamp: "t", status: "ok" },
      ],
    });

    const req = { query: { content: "hello world", limit: "10" }, username: "bob" };
    const res = await publicMessagesStrategy.execute({ req });
    expect(Msg.searchPublicMsg).toHaveBeenCalled();
    expect(res.code).toBe(200);
    expect(res.count).toBe(1);
    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results[0]).toMatchObject({ sender: "alice", content: "hello" });
  });

  test("forwards cursor and enforces default/clamp semantics for limit", async () => {
    const spy = jest
      .spyOn(Msg, "searchPublicMsg")
      .mockResolvedValue({ count: 0, nextCursor: "n", items: [] });

    // limit = 0 → treated as falsy, defaults to 10 per strategy implementation
    await publicMessagesStrategy.execute({ req: { query: { content: "x", limit: "0", cursor: "c1" } } });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, cursor: "c1" }));

    // limit > 100 → expect 100 (clamped)
    await publicMessagesStrategy.execute({ req: { query: { content: "x", limit: "1000", cursor: "c2" } } });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ limit: 100, cursor: "c2" }));
  });
});

describe("Search strategies - private messages", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("when query is 'status' returns status history", async () => {
    jest.spyOn(Status, "getHistory").mockResolvedValue({
      total: 2,
      nextCursor: null,
      items: [
        { _id: "s2", status: "OK", timestamp: "t2" },
        { _id: "s1", status: "HELP", timestamp: "t1" },
      ],
    });

    const req = { userId: "4", query: { peerId: "5", content: "status" } };
    const res = await privateMessagesStrategy.execute({ req });
    expect(Status.getHistory).toHaveBeenCalledWith({ userId: "5", limit: 10, cursor: "" });
    expect(res.code).toBe(200);
    expect(res.mode).toBe("status_history");
    expect(res.count).toBe(2);
    expect(res.results[0]).toMatchObject({ id: "s2", status: "OK" });
  });

  test("searches messages when query is not 'status'", async () => {
    jest.spyOn(Msg, "searchPrivateMsg").mockResolvedValue({
      count: 1,
      nextCursor: null,
      items: [
        { _id: "m1", sender: { username: "alice" }, receiver: { username: "bob" }, content: "hello", timestamp: "t", status: "ok" },
      ],
    });

    const req = { userId: "4", username: "alice", query: { peerId: "5", content: "hello" } };
    const res = await privateMessagesStrategy.execute({ req });
    expect(Msg.searchPrivateMsg).toHaveBeenCalled();
    expect(res.code).toBe(200);
    expect(res.mode).toBe("messages");
    expect(res.results[0]).toMatchObject({ content: "hello" });
  });

  test("forwards limit (default 10) and cursor to Msg.searchPrivateMsg", async () => {
    const spy = jest
      .spyOn(Msg, "searchPrivateMsg")
      .mockResolvedValue({ count: 0, items: [], nextCursor: null });

    await privateMessagesStrategy.execute({ req: { userId: "4", username: "alice", query: { peerId: "5", content: "hello", cursor: "abc" } } });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, cursor: "abc" }));

    await privateMessagesStrategy.execute({ req: { userId: "4", username: "alice", query: { peerId: "5", content: "hello", limit: "101" } } });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }));
  });
});


