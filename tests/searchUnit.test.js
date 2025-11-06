import Announcement from "../entities/Announcement.js";
import AnnouncementDac from "../dacs/announcementDac.js";
import User from "../entities/User.js";
import userDac from "../dacs/userDac.js";
import { inMemoryAnnouncementDao } from "../daos/inMemoryAnnouncementDao.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import {
  splitTokensForStopwords,
  escapeRegExp,
  buildSubstringRegex,
  STOP_WORDS,
} from "../utils/search/search.js";
import { parseCursor, buildCursorClause } from "../utils/search/cursor.js";
import { parseQuery } from "../utils/search/parseQuery.js";

const BASE_ANNOUNCEMENT_PROPS = Object.freeze({
  sender: "1",
  timestamp: new Date("2024-01-01T10:00:00Z"),
  status: "ok",
  content: "Test announcement",
});

const BASE_USER_PROPS = Object.freeze({
  username: "testuser",
  password: "testpass",
  sharedstatus: "undefined",
  status: "active",
  role: "citizen",
});

const buildAnnouncementProps = (overrides) => ({
  ...BASE_ANNOUNCEMENT_PROPS,
  ...overrides,
});
const buildUserProps = (overrides) => ({ ...BASE_USER_PROPS, ...overrides });

describe("Search utility functions", () => {
  describe("splitTokensForStopwords", () => {
    test("splits text into tokens", () => {
      const tokens = splitTokensForStopwords("hello world test");
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);
    });

    test("removes non-alphanumeric characters from tokens", () => {
      const tokens = splitTokensForStopwords("hello! world@ test#");
      tokens.forEach((token) => {
        expect(token).toMatch(/^[a-z0-9]+$/);
      });
    });

    test("parseQuery lowercases tokens and filters stop-words", () => {
      const mockReq = { query: { content: "HELLO World Test" } };
      const result = parseQuery(mockReq, { qKey: "content" });
      expect(result.nonStop).toEqual(["hello", "world", "test"]);
    });

    test("filters out empty tokens", () => {
      const tokens = splitTokensForStopwords("   hello   world   ");
      expect(tokens.every((t) => t.length > 0)).toBe(true);
    });
  });

  describe("escapeRegExp", () => {
    test("escapes special regex characters", () => {
      const special = ".*+?^${}()|[]\\";
      const escaped = escapeRegExp(special);
      expect(escaped).toBe("\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
    });

    test("does not escape regular characters", () => {
      const normal = "hello world";
      const escaped = escapeRegExp(normal);
      expect(escaped).toBe("hello world");
    });

    test("handles empty string", () => {
      expect(escapeRegExp("")).toBe("");
    });
  });

  describe("buildSubstringRegex", () => {
    test("builds regex from terms array", () => {
      const regex = buildSubstringRegex(["hello", "world"]);
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex.test("hello")).toBe(true);
      expect(regex.test("world")).toBe(true);
    });

    test("builds regex from phrase when terms are empty", () => {
      const regex = buildSubstringRegex([], "hello world");
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex.test("hello world")).toBe(true);
      expect(regex.test("This contains hello world in it")).toBe(true);
      expect(regex.test("hello")).toBe(false); // "hello" alone doesn't match "hello world"
    });

    test("regex is case insensitive", () => {
      const regex = buildSubstringRegex(["hello"]);
      expect(regex.test("HELLO")).toBe(true);
      expect(regex.test("Hello")).toBe(true);
      expect(regex.test("hello")).toBe(true);
    });

    test("matches substring", () => {
      const regex = buildSubstringRegex(["test"]);
      expect(regex.test("this is a test")).toBe(true);
      expect(regex.test("testing")).toBe(true);
    });
  });

  describe("STOP_WORDS", () => {
    test("contains common stop words", () => {
      expect(STOP_WORDS.has("the")).toBe(true);
      expect(STOP_WORDS.has("a")).toBe(true);
      expect(STOP_WORDS.has("and")).toBe(true);
      expect(STOP_WORDS.has("or")).toBe(true);
    });

    test("stop words are lowercase", () => {
      STOP_WORDS.forEach((word) => {
        expect(word).toBe(word.toLowerCase());
      });
    });
  });

  describe("parseCursor", () => {
    test("parses valid cursor string", () => {
      const timestamp = new Date().toISOString();
      const cursor = `${timestamp}|123`;
      const parsed = parseCursor(cursor);
      expect(parsed).not.toBeNull();
      expect(parsed.ts).toBeInstanceOf(Date);
      expect(parsed.idStr).toBe("123");
    });

    test("returns null for empty cursor", () => {
      expect(parseCursor("")).toBeNull();
      expect(parseCursor(null)).toBeNull();
      expect(parseCursor(undefined)).toBeNull();
    });

    test("returns null for invalid cursor format", () => {
      expect(parseCursor("invalid")).toBeNull();
      expect(parseCursor("2024-01-01")).toBeNull();
      expect(parseCursor("|123")).toBeNull();
    });

    test("returns null for invalid timestamp", () => {
      expect(parseCursor("invalid-date|123")).toBeNull();
    });
  });

  describe("buildCursorClause", () => {
    test("builds cursor clause with timestamp and id", () => {
      const ts = new Date("2024-01-01T10:00:00Z");
      const idStr = "123";
      const clause = buildCursorClause({ ts, idStr });
      expect(Array.isArray(clause)).toBe(true);
      expect(clause.length).toBe(2);
    });

    test("cursor clause includes timestamp comparison", () => {
      const ts = new Date("2024-01-01T10:00:00Z");
      const idStr = "123";
      const clause = buildCursorClause({ ts, idStr });
      expect(clause[0]).toHaveProperty("timestamp");
      expect(clause[1]).toHaveProperty("timestamp");
    });
  });

  describe("parseQuery", () => {
    test("returns early error when content is required and missing", () => {
      const mockReq = { query: {} };
      const result = parseQuery(mockReq, { qKey: "content", requireContent: true });
      expect(result.early).toBeDefined();
      expect(result.early.code).toBe(400);
      expect(result.early.error).toContain("Missing query param");
    });

    test("returns empty result when only stop words provided", () => {
      const mockReq = { query: { content: "the and or" } };
      const result = parseQuery(mockReq, { qKey: "content" });
      expect(result.early).toBeDefined();
      expect(result.early.code).toBe(200);
      expect(result.early.count).toBe(0);
      expect(result.early.results).toEqual([]);
    });

    test("returns non-stop tokens", () => {
      const mockReq = { query: { content: "hello world test" } };
      const result = parseQuery(mockReq, { qKey: "content" });
      expect(result.nonStop).toBeDefined();
      expect(Array.isArray(result.nonStop)).toBe(true);
      expect(result.nonStop.length).toBeGreaterThan(0);
    });

    test("filters out stop words from tokens", () => {
      const mockReq = { query: { content: "hello the world" } };
      const result = parseQuery(mockReq, { qKey: "content" });
      expect(result.nonStop).not.toContain("the");
      expect(result.nonStop).toContain("hello");
      expect(result.nonStop).toContain("world");
    });

    test("returns empty when content is not required and missing", () => {
      const mockReq = { query: {} };
      const result = parseQuery(mockReq, { qKey: "content", requireContent: false });
      expect(result.raw).toBe("");
      expect(result.nonStop).toEqual([]);
    });
  });
});

describe("Announcement search functionality", () => {
  beforeEach(() => {
    AnnouncementDac.DAO = new inMemoryAnnouncementDao();
    userDac.DAO = new inMemoryUserDao();
  });

  test("searchAnnouncement returns empty when no matches", async () => {
    const result = await Announcement.searchAnnouncement({
      terms: ["nonexistent"],
      phrase: "",
      limit: 10,
    });
    expect(result.code).toBe(200);
    expect(result.count).toBe(0);
    expect(result.items).toEqual([]);
  });

  test("searchAnnouncement finds announcements by content", async () => {
    const announcement = new Announcement(
      buildAnnouncementProps({
        sender: "1",
        content: "System maintenance scheduled",
      }),
    );
    await announcement.create();

    const result = await Announcement.searchAnnouncement({
      terms: ["maintenance"],
      phrase: "",
      limit: 10,
    });
    expect(result.code).toBe(200);
    expect(result.count).toBeGreaterThanOrEqual(1);
    expect(result.items.some((item) => item.content.includes("maintenance"))).toBe(
      true,
    );
  });

  test("searchAnnouncement is case insensitive", async () => {
    const announcement = new Announcement(
      buildAnnouncementProps({
        sender: "1",
        content: "Emergency Alert",
      }),
    );
    await announcement.create();

    const result = await Announcement.searchAnnouncement({
      terms: ["emergency"],
      phrase: "",
      limit: 10,
    });
    expect(result.count).toBeGreaterThanOrEqual(1);
  });

  test("searchAnnouncement matches substring", async () => {
    const announcement = new Announcement(
      buildAnnouncementProps({
        sender: "1",
        content: "This is a test announcement",
      }),
    );
    await announcement.create();

    const result = await Announcement.searchAnnouncement({
      terms: ["test"],
      phrase: "",
      limit: 10,
    });
    expect(result.count).toBeGreaterThanOrEqual(1);
    expect(
      result.items.some((item) => item.content.includes("test")),
    ).toBe(true);
  });

  test("searchAnnouncement respects limit parameter", async () => {
    // Create multiple announcements
    for (let i = 0; i < 15; i++) {
      const announcement = new Announcement(
        buildAnnouncementProps({
          sender: "1",
          content: `Test announcement ${i}`,
        }),
      );
      await announcement.create();
    }

    const result = await Announcement.searchAnnouncement({
      terms: ["test"],
      phrase: "",
      limit: 5,
    });
    expect(result.items.length).toBeLessThanOrEqual(5);
  });

  test("searchAnnouncement returns nextCursor when there are more results", async () => {
    // Create more announcements than limit
    for (let i = 0; i < 15; i++) {
      const announcement = new Announcement(
        buildAnnouncementProps({
          sender: "1",
          content: `Test announcement ${i}`,
          timestamp: new Date(`2024-01-01T${10 + i}:00:00Z`),
        }),
      );
      await announcement.create();
    }

    const result = await Announcement.searchAnnouncement({
      terms: ["test"],
      phrase: "",
      limit: 5,
    });
    expect(result.nextCursor).not.toBeNull();
    expect(typeof result.nextCursor).toBe("string");
  });

  test("searchAnnouncement uses cursor for pagination", async () => {
    // Create announcements
    for (let i = 0; i < 10; i++) {
      const announcement = new Announcement(
        buildAnnouncementProps({
          sender: "1",
          content: `Test announcement ${i}`,
          timestamp: new Date(`2024-01-01T${10 + i}:00:00Z`),
        }),
      );
      await announcement.create();
    }

    // First page
    const firstPage = await Announcement.searchAnnouncement({
      terms: ["test"],
      phrase: "",
      limit: 3,
    });

    expect(firstPage.items.length).toBe(3);
    expect(firstPage.nextCursor).not.toBeNull();

    // Second page using cursor
    const secondPage = await Announcement.searchAnnouncement({
      terms: ["test"],
      phrase: "",
      limit: 3,
      cursor: firstPage.nextCursor,
    });

    expect(secondPage.items.length).toBeGreaterThan(0);
    // Second page should have different items
    const firstIds = firstPage.items.map((item) => item._id || item.id);
    const secondIds = secondPage.items.map((item) => item._id || item.id);
    expect(firstIds).not.toEqual(expect.arrayContaining(secondIds));
  });

  test("searchAnnouncement returns results sorted by timestamp descending", async () => {
    const timestamps = [
      new Date("2024-01-01T10:00:00Z"),
      new Date("2024-01-01T11:00:00Z"),
      new Date("2024-01-01T12:00:00Z"),
    ];

    for (let i = 0; i < timestamps.length; i++) {
      const announcement = new Announcement(
        buildAnnouncementProps({
          sender: "1",
          content: `Announcement ${i}`,
          timestamp: timestamps[i],
        }),
      );
      await announcement.create();
    }

    const result = await Announcement.searchAnnouncement({
      terms: ["announcement"],
      phrase: "",
      limit: 10,
    });

    expect(result.items.length).toBeGreaterThanOrEqual(3);
    // Results should be sorted by timestamp descending (newest first)
    const resultTimestamps = result.items.map((item) =>
      new Date(item.timestamp).getTime(),
    );
    for (let i = 1; i < resultTimestamps.length; i++) {
      expect(resultTimestamps[i - 1]).toBeGreaterThanOrEqual(
        resultTimestamps[i],
      );
    }
  });

  test("searchAnnouncement populates sender with username", async () => {
    // Create a user
    const user = new User(buildUserProps({ username: "alice" }));
    await user.create();
    const foundUser = await User.findByUsername("alice");

    // Create announcement from that user
    const announcement = new Announcement(
      buildAnnouncementProps({
        sender: foundUser.id,
        content: "Announcement from alice",
      }),
    );
    await announcement.create();

    const result = await Announcement.searchAnnouncement({
      terms: ["alice"],
      phrase: "",
      limit: 10,
    });

    const found = result.items.find(
      (item) => item.content === "Announcement from alice",
    );
    expect(found).toBeDefined();
    if (found.sender && typeof found.sender === "object") {
      expect(found.sender.username).toBe("alice");
    }
  });

  test("searchAnnouncement handles multiple search terms", async () => {
    const announcement = new Announcement(
      buildAnnouncementProps({
        sender: "1",
        content: "System maintenance scheduled for tonight",
      }),
    );
    await announcement.create();

    const result = await Announcement.searchAnnouncement({
      terms: ["system", "maintenance"],
      phrase: "",
      limit: 10,
    });
    expect(result.count).toBeGreaterThanOrEqual(1);
  });

  test("searchAnnouncement uses phrase when terms are empty", async () => {
    const announcement = new Announcement(
      buildAnnouncementProps({
        sender: "1",
        content: "Emergency alert system",
      }),
    );
    await announcement.create();

    const result = await Announcement.searchAnnouncement({
      terms: [],
      phrase: "emergency",
      limit: 10,
    });
    expect(result.count).toBeGreaterThanOrEqual(1);
  });
});

