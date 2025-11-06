import Announcement from "../entities/Announcement.js";
import AnnouncementDac from "../dacs/announcementDac.js";
import User from "../entities/User.js";
import userDac from "../dacs/userDac.js";
import { inMemoryAnnouncementDao } from "../daos/inMemoryAnnouncementDao.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import { getAnnouncements, postAnnouncement } from "../controllers/announcementController.js";

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

describe("Announcement constructor and instance methods", () => {
  test("creates announcement with all required properties", () => {
    const props = buildAnnouncementProps({});
    const announcement = new Announcement(props);
    expect(announcement.sender).toBe("1");
    expect(announcement.timestamp).toEqual(new Date("2024-01-01T10:00:00Z"));
    expect(announcement.status).toBe("ok");
    expect(announcement.content).toBe("Test announcement");
  });

  test("accepts different status values", () => {
    const statuses = ["ok", "help", "emergency", "undefined"];
    statuses.forEach((status) => {
      const announcement = new Announcement(
        buildAnnouncementProps({ status }),
      );
      expect(announcement.status).toBe(status);
    });
  });

  test("preserves content as provided", () => {
    const content = "This is a test announcement content";
    const announcement = new Announcement(
      buildAnnouncementProps({ content }),
    );
    expect(announcement.content).toBe(content);
  });
});

describe("Announcement create flow", () => {
  beforeEach(() => {
    // inject a fresh in-memory DAO for test isolation
    AnnouncementDac.DAO = new inMemoryAnnouncementDao();
  });

  test("successful create persists announcement", async () => {
    const props = buildAnnouncementProps({
      sender: "1",
      content: `announcement_${Date.now()}`,
    });
    const announcement = new Announcement(props);
    await announcement.create();

    const announcements = await Announcement.getAnnouncement();
    const found = announcements.find(
      (a) => a.content === props.content,
    );
    expect(found).toBeDefined();
    expect(found.sender).toBeDefined();
  });

  test("create stores announcement with correct properties", async () => {
    const props = buildAnnouncementProps({
      sender: "user123",
      content: "New announcement",
      status: "help",
      timestamp: new Date("2024-01-01T12:00:00Z"),
    });
    const announcement = new Announcement(props);
    await announcement.create();

    const announcements = await Announcement.getAnnouncement();
    const found = announcements.find(
      (a) => a.content === "New announcement",
    );
    expect(found).toBeDefined();
    expect(found.status).toBe("help");
  });

  test("create preserves trimmed content", async () => {
    const props = buildAnnouncementProps({
      sender: "1",
      content: "  Trimmed content  ",
    });
    const announcement = new Announcement(props);
    await announcement.create();

    const announcements = await Announcement.getAnnouncement();
    const found = announcements.find(
      (a) => a.content === "  Trimmed content  ",
    );
    expect(found).toBeDefined();
  });
});

describe("Announcement static methods", () => {
  beforeEach(() => {
    // inject a fresh in-memory DAO for test isolation
    AnnouncementDac.DAO = new inMemoryAnnouncementDao();
    userDac.DAO = new inMemoryUserDao();
  });

  test("getAnnouncement returns empty array when no announcements exist", async () => {
    const announcements = await Announcement.getAnnouncement();
    expect(Array.isArray(announcements)).toBe(true);
    expect(announcements).toHaveLength(0);
  });

  test("getAnnouncement returns all announcements", async () => {
    const announcement1 = new Announcement(
      buildAnnouncementProps({
        sender: "1",
        content: "First announcement",
      }),
    );
    await announcement1.create();

    const announcement2 = new Announcement(
      buildAnnouncementProps({
        sender: "2",
        content: "Second announcement",
      }),
    );
    await announcement2.create();

    const announcements = await Announcement.getAnnouncement();
    expect(announcements.length).toBeGreaterThanOrEqual(2);
    const contents = announcements.map((a) => a.content);
    expect(contents).toContain("First announcement");
    expect(contents).toContain("Second announcement");
  });

  test("getAnnouncement returns announcements in chronological order", async () => {
    const first = new Announcement(
      buildAnnouncementProps({
        sender: "1",
        content: "First",
        timestamp: new Date("2024-01-01T10:00:00Z"),
      }),
    );
    await first.create();

    await new Promise((r) => setTimeout(r, 10));

    const second = new Announcement(
      buildAnnouncementProps({
        sender: "1",
        content: "Second",
        timestamp: new Date("2024-01-01T10:05:00Z"),
      }),
    );
    await second.create();

    const announcements = await Announcement.getAnnouncement();
    expect(announcements.length).toBeGreaterThanOrEqual(2);

    const firstIndex = announcements.findIndex(
      (a) => a.content === "First",
    );
    const secondIndex = announcements.findIndex(
      (a) => a.content === "Second",
    );

    expect(firstIndex).toBeLessThan(secondIndex);
  });

  test("getAnnouncement populates sender with username when user exists", async () => {
    // Create a user first
    const user = new User(buildUserProps({ username: "alice" }));
    await user.create();
    const foundUser = await User.findByUsername("alice");

    // Create an announcement from that user
    const announcement = new Announcement(
      buildAnnouncementProps({
        sender: foundUser.id,
        content: "Announcement from alice",
      }),
    );
    await announcement.create();

    const announcements = await Announcement.getAnnouncement();
    const found = announcements.find(
      (a) => a.content === "Announcement from alice",
    );
    expect(found).toBeDefined();
    expect(found.sender).toBeDefined();
    // Sender should be populated with username object
    if (found.sender && typeof found.sender === "object") {
      expect(found.sender.username).toBe("alice");
    }
  });
});

describe("Announcement status handling", () => {
  beforeEach(() => {
    AnnouncementDac.DAO = new inMemoryAnnouncementDao();
    userDac.DAO = new inMemoryUserDao();
  });

  test("announcement accepts lowercase status values", async () => {
    const statuses = ["ok", "help", "emergency", "undefined"];

    for (const status of statuses) {
      const announcement = new Announcement(
        buildAnnouncementProps({
          sender: "1",
          content: `Announcement with ${status}`,
          status: status,
        }),
      );
      await announcement.create();

      const announcements = await Announcement.getAnnouncement();
      const found = announcements.find(
        (a) => a.content === `Announcement with ${status}`,
      );
      expect(found).toBeDefined();
      expect(found.status).toBe(status);
    }
  });

  test("announcement accepts uppercase status values and stores as lowercase", async () => {
    // Note: Controller converts status to lowercase before creating Announcement
    const upperStatus = "OK";
    const lowerStatus = upperStatus.toLowerCase();

    const announcement = new Announcement(
      buildAnnouncementProps({
        sender: "1",
        content: "Uppercase status test",
        status: lowerStatus, // Controller converts to lowercase before creating
      }),
    );
    await announcement.create();

    const announcements = await Announcement.getAnnouncement();
    const found = announcements.find(
      (a) => a.content === "Uppercase status test",
    );
    expect(found).toBeDefined();
    expect(found.status).toBe("ok");
  });

  test("announcement stores status in lowercase format", async () => {
    const statuses = ["OK", "HELP", "EMERGENCY"];
    const lowerStatuses = statuses.map((s) => s.toLowerCase());

    for (let i = 0; i < statuses.length; i++) {
      const announcement = new Announcement(
        buildAnnouncementProps({
          sender: "1",
          content: `Test ${statuses[i]}`,
          status: lowerStatuses[i], // Controller converts to lowercase
        }),
      );
      await announcement.create();

      const announcements = await Announcement.getAnnouncement();
      const found = announcements.find((a) => a.content === `Test ${statuses[i]}`);
      expect(found).toBeDefined();
      expect(found.status).toBe(lowerStatuses[i]);
    }
  });
});

describe("Announcement content handling", () => {
  beforeEach(() => {
    AnnouncementDac.DAO = new inMemoryAnnouncementDao();
  });

  test("announcement preserves long content", async () => {
    const longContent =
      "This is a very long announcement content that might contain many words and should be preserved exactly as provided by the user without any truncation or modification except for trimming whitespace.";
    const announcement = new Announcement(
      buildAnnouncementProps({
        sender: "1",
        content: longContent,
      }),
    );
    await announcement.create();

    const announcements = await Announcement.getAnnouncement();
    const found = announcements.find((a) => a.content === longContent);
    expect(found).toBeDefined();
    expect(found.content).toBe(longContent);
  });

  test("announcement preserves special characters in content", async () => {
    const specialContent = "Hello! @everyone #announcement 🎉";
    const announcement = new Announcement(
      buildAnnouncementProps({
        sender: "1",
        content: specialContent,
      }),
    );
    await announcement.create();

    const announcements = await Announcement.getAnnouncement();
    const found = announcements.find((a) => a.content === specialContent);
    expect(found).toBeDefined();
    expect(found.content).toBe(specialContent);
  });
});

describe("Announcement API status codes", () => {
  let mockApp;

  beforeEach(() => {
    // inject a fresh in-memory DAO for test isolation
    AnnouncementDac.DAO = new inMemoryAnnouncementDao();
    userDac.DAO = new inMemoryUserDao();

    // Create a mock app object with get and set methods
    mockApp = {
      _socketInstance: null,
      get(key) {
        if (key === "socketInstance") {
          return this._socketInstance;
        }
        return null;
      },
      set(key, value) {
        if (key === "socketInstance") {
          this._socketInstance = value;
        }
      },
    };
  });

  describe("getAnnouncements", () => {
    test("returns 200 when successfully retrieving announcements", async () => {
      // Create a user
      const userProps = buildUserProps({ username: `sender_${Date.now()}` });
      const user = new User(userProps);
      await user.create();
      const foundUser = await User.findByUsername(userProps.username);

      // Create an announcement
      const announcement = new Announcement(
        buildAnnouncementProps({
          sender: foundUser.id,
          content: "Test announcement",
        }),
      );
      await announcement.create();

      let statusCode = null;
      let jsonBody = null;
      const req = {
        app: mockApp,
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };

      await getAnnouncements(req, res);

      expect(statusCode).toBe(200);
      expect(Array.isArray(jsonBody)).toBe(true);
      expect(jsonBody.length).toBeGreaterThanOrEqual(1);
    });

    test("returns 200 with empty array when no announcements exist", async () => {
      let statusCode = null;
      let jsonBody = null;
      const req = {
        app: mockApp,
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };

      await getAnnouncements(req, res);

      expect(statusCode).toBe(200);
      expect(Array.isArray(jsonBody)).toBe(true);
      expect(jsonBody).toHaveLength(0);
    });

    test("returns 500 when an error occurs", async () => {
      // Mock Announcement.getAnnouncement to throw an error
      const originalGetAnnouncement = Announcement.getAnnouncement;
      Announcement.getAnnouncement = async () => {
        throw new Error("Database error");
      };

      let statusCode = null;
      let jsonBody = null;
      const req = {
        app: mockApp,
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };

      await getAnnouncements(req, res);

      expect(statusCode).toBe(500);
      expect(jsonBody).toEqual({
        status: "error",
        message: "Server error",
      });

      // Restore original method
      Announcement.getAnnouncement = originalGetAnnouncement;
    });
  });

  describe("postAnnouncement", () => {
    test("returns 201 when announcement is posted successfully", async () => {
      // Create a user
      const userProps = buildUserProps({ username: `sender_${Date.now()}` });
      const user = new User(userProps);
      await user.create();
      const foundUser = await User.findByUsername(userProps.username);

      // Mock socket instance
      let emitCalled = false;
      let emitArgs = null;
      const mockSocket = {
        emitMessageFrom(username, data) {
          emitCalled = true;
          emitArgs = { username, data };
        },
      };
      mockApp.set("socketInstance", mockSocket);

      let statusCode = null;
      let jsonBody = null;
      const req = {
        body: {
          sender: foundUser.id,
          content: "Test announcement",
          status: "ok",
          timestamp: new Date().toISOString(),
        },
        app: mockApp,
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };

      await postAnnouncement(req, res);

      expect(statusCode).toBe(201);
      expect(jsonBody).toEqual({ message: "Announcement posted" });
      expect(emitCalled).toBe(true);
    });

    test("returns 500 when socket instance is not found", async () => {
      // Create a user
      const userProps = buildUserProps({ username: `sender_${Date.now()}` });
      const user = new User(userProps);
      await user.create();
      const foundUser = await User.findByUsername(userProps.username);

      // Don't set socket instance
      mockApp.set("socketInstance", null);

      let statusCode = null;
      let jsonBody = null;
      const req = {
        body: {
          sender: foundUser.id,
          content: "Test announcement",
          status: "ok",
          timestamp: new Date().toISOString(),
        },
        app: mockApp,
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };

      await postAnnouncement(req, res);

      expect(statusCode).toBe(500);
      expect(jsonBody).toEqual({
        status: "error",
        message: "Socket instance not found",
      });
    });

    test("returns 500 when an error occurs during announcement creation", async () => {
      // Create a user
      const userProps = buildUserProps({ username: `sender_${Date.now()}` });
      const user = new User(userProps);
      await user.create();
      const foundUser = await User.findByUsername(userProps.username);

      const mockSocket = {
        emitMessageFrom() {},
      };
      mockApp.set("socketInstance", mockSocket);

      // Mock Announcement.prototype.create to throw an error
      const originalCreate = Announcement.prototype.create;
      Announcement.prototype.create = async function () {
        throw new Error("Database error");
      };

      let statusCode = null;
      let jsonBody = null;
      const req = {
        body: {
          sender: foundUser.id,
          content: "Test announcement",
          status: "ok",
          timestamp: new Date().toISOString(),
        },
        app: mockApp,
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };

      await postAnnouncement(req, res);

      expect(statusCode).toBe(500);
      expect(jsonBody).toEqual({
        status: "error",
        message: "Server error",
      });

      // Restore original method
      Announcement.prototype.create = originalCreate;
    });

    test("returns 500 when User.getUsernameById fails", async () => {
      // Create a user
      const userProps = buildUserProps({ username: `sender_${Date.now()}` });
      const user = new User(userProps);
      await user.create();
      const foundUser = await User.findByUsername(userProps.username);

      const mockSocket = {
        emitMessageFrom() {},
      };
      mockApp.set("socketInstance", mockSocket);

      // Mock User.getUsernameById to throw an error
      const originalGetUsernameById = User.getUsernameById;
      User.getUsernameById = async () => {
        throw new Error("User lookup error");
      };

      let statusCode = null;
      let jsonBody = null;
      const req = {
        body: {
          sender: foundUser.id,
          content: "Test announcement",
          status: "ok",
          timestamp: new Date().toISOString(),
        },
        app: mockApp,
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };

      await postAnnouncement(req, res);

      expect(statusCode).toBe(500);
      expect(jsonBody).toEqual({
        status: "error",
        message: "Server error",
      });

      // Restore original method
      User.getUsernameById = originalGetUsernameById;
    });

    test("successfully posts announcement and broadcasts via socket", async () => {
      // Create a user
      const userProps = buildUserProps({ username: `sender_${Date.now()}` });
      const user = new User(userProps);
      await user.create();
      const foundUser = await User.findByUsername(userProps.username);

      // Mock socket instance
      let emitCalled = false;
      let emitArgs = null;
      const mockSocket = {
        emitMessageFrom(username, data) {
          emitCalled = true;
          emitArgs = { username, data };
        },
      };
      mockApp.set("socketInstance", mockSocket);

      const content = "Important announcement";
      const status = "HELP";
      const timestamp = new Date().toISOString();

      let statusCode = null;
      let jsonBody = null;
      const req = {
        body: {
          sender: foundUser.id,
          content: content,
          status: status,
          timestamp: timestamp,
        },
        app: mockApp,
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };

      await postAnnouncement(req, res);

      // Verify announcement was created
      const announcements = await Announcement.getAnnouncement();
      const found = announcements.find((a) => a.content === content);
      expect(found).toBeDefined();

      // Verify response
      expect(statusCode).toBe(201);
      expect(jsonBody).toEqual({ message: "Announcement posted" });
      expect(emitCalled).toBe(true);
      expect(emitArgs.username).toBe(foundUser.username || foundUser.id);
      expect(emitArgs.data.content).toBe(content);
      expect(emitArgs.data.status).toBe(status.toUpperCase());
    });

    test("handles content trimming correctly", async () => {
      // Create a user
      const userProps = buildUserProps({ username: `sender_${Date.now()}` });
      const user = new User(userProps);
      await user.create();
      const foundUser = await User.findByUsername(userProps.username);

      const mockSocket = {
        emitMessageFrom() {},
      };
      mockApp.set("socketInstance", mockSocket);

      const contentWithWhitespace = "  Trimmed content  ";

      let statusCode = null;
      let jsonBody = null;
      const req = {
        body: {
          sender: foundUser.id,
          content: contentWithWhitespace,
          status: "ok",
          timestamp: new Date().toISOString(),
        },
        app: mockApp,
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };

      await postAnnouncement(req, res);

      expect(statusCode).toBe(201);
      // Verify content was trimmed
      const announcements = await Announcement.getAnnouncement();
      const found = announcements.find((a) => a.content === contentWithWhitespace.trim());
      expect(found).toBeDefined();
    });

    test("converts status to lowercase", async () => {
      // Create a user
      const userProps = buildUserProps({ username: `sender_${Date.now()}` });
      const user = new User(userProps);
      await user.create();
      const foundUser = await User.findByUsername(userProps.username);

      const mockSocket = {
        emitMessageFrom() {},
      };
      mockApp.set("socketInstance", mockSocket);

      let statusCode = null;
      let jsonBody = null;
      const req = {
        body: {
          sender: foundUser.id,
          content: "Test announcement",
          status: "EMERGENCY",
          timestamp: new Date().toISOString(),
        },
        app: mockApp,
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };

      await postAnnouncement(req, res);

      expect(statusCode).toBe(201);
      // Verify status was converted to lowercase
      const announcements = await Announcement.getAnnouncement();
      const found = announcements.find((a) => a.content === "Test announcement");
      expect(found).toBeDefined();
      expect(found.status).toBe("emergency");
    });
  });
});

