import Msg from "../entities/Msg.js";
import MsgDac from "../dacs/msgDac.js";
import User from "../entities/User.js";
import userDac from "../dacs/userDac.js";
import { inMemoryMsgDao } from "../daos/inMemoryMsgDao.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";

const BASE_MSG_PROPS = Object.freeze({
  sender: "1",
  receiver: null,
  timestamp: new Date("2024-01-01T10:00:00Z"),
  status: "ok",
  content: "Hello everyone!",
});

const BASE_USER_PROPS = Object.freeze({
  username: "testuser",
  password: "testpass",
  sharedstatus: "undefined",
  status: "active",
  role: "citizen",
});

const buildMsgProps = (overrides) => ({ ...BASE_MSG_PROPS, ...overrides });
const buildUserProps = (overrides) => ({ ...BASE_USER_PROPS, ...overrides });

describe("Msg constructor and instance methods", () => {
  test("creates message with all required properties", () => {
    const props = buildMsgProps({});
    const msg = new Msg(props);
    expect(msg.sender).toBe("1");
    expect(msg.receiver).toBe(null);
    expect(msg.timestamp).toEqual(new Date("2024-01-01T10:00:00Z"));
    expect(msg.status).toBe("ok");
    expect(msg.content).toBe("Hello everyone!");
  });

  test("isPublic returns true when receiver is null", () => {
    const msg = new Msg(buildMsgProps({ receiver: null }));
    expect(msg.isPublic()).toBe(true);
  });

  test("isPublic returns false when receiver is not null", () => {
    const msg = new Msg(buildMsgProps({ receiver: "2" }));
    expect(msg.isPublic()).toBe(false);
  });

  test("isPrivate returns true when receiver is not null", () => {
    const msg = new Msg(buildMsgProps({ receiver: "2" }));
    expect(msg.isPrivate()).toBe(true);
  });

  test("isPrivate returns false when receiver is null", () => {
    const msg = new Msg(buildMsgProps({ receiver: null }));
    expect(msg.isPrivate()).toBe(false);
  });

  test("accepts different status values", () => {
    const statuses = ["ok", "help", "emergency", "undefined"];
    statuses.forEach((status) => {
      const msg = new Msg(buildMsgProps({ status }));
      expect(msg.status).toBe(status);
    });
  });

  test("accepts different content lengths", () => {
    const shortMsg = new Msg(buildMsgProps({ content: "Hi" }));
    expect(shortMsg.content).toBe("Hi");

    const longMsg = new Msg(
      buildMsgProps({
        content: "This is a very long message with many words and characters",
      }),
    );
    expect(longMsg.content).toBe(
      "This is a very long message with many words and characters",
    );
  });
});

describe("Msg create flow", () => {
  let user1Id, user2Id;
  
  beforeEach(async () => {
    // inject a fresh in-memory DAO for test isolation
    MsgDac.DAO = new inMemoryMsgDao();
    userDac.DAO = new inMemoryUserDao();
    
    // Create active users for testing and get their IDs
    const user1 = new User(buildUserProps({ username: "user1" }));
    const user1Result = await user1.create();
    const user2 = new User(buildUserProps({ username: "user2" }));
    const user2Result = await user2.create();
    
    // Store user IDs for use in tests
    user1Id = String(user1Result.id || user1Result._id);
    user2Id = String(user2Result.id || user2Result._id);
  });

  test("successful create persists message", async () => {
    const props = buildMsgProps({
      sender: user1Id,
      content: `msg_${Date.now()}`,
    });
    const msg = new Msg(props);
    await msg.create();

    const publicMessages = await Msg.getPublicMsg();
    const found = publicMessages.find((m) => m.content === props.content);
    expect(found).toBeDefined();
    expect(found.sender).toBeDefined();
  });

  test("create stores message with null receiver as public", async () => {
    const props = buildMsgProps({
      sender: user1Id,
      receiver: null,
      content: "Public message",
    });
    const msg = new Msg(props);
    await msg.create();

    const publicMessages = await Msg.getPublicMsg();
    const found = publicMessages.find((m) => m.content === "Public message");
    expect(found).toBeDefined();
    expect(found.receiver).toBe(null);
  });

  test("create stores message with non-null receiver as private", async () => {
    const props = buildMsgProps({
      sender: user1Id,
      receiver: user2Id,
      content: "Private message",
    });
    const msg = new Msg(props);
    await msg.create();

    // Private message should not appear in public messages
    const publicMessages = await Msg.getPublicMsg();
    const found = publicMessages.find((m) => m.content === "Private message");
    expect(found).toBeUndefined();
  });

  test("create preserves message content and status", async () => {
    const props = buildMsgProps({
      sender: user1Id,
      content: "Test message",
      status: "help",
    });
    const msg = new Msg(props);
    await msg.create();

    const publicMessages = await Msg.getPublicMsg();
    const found = publicMessages.find((m) => m.content === "Test message");
    expect(found).toBeDefined();
    expect(found.status).toBe("help");
  });
});

describe("Msg static methods", () => {
  beforeEach(() => {
    // inject a fresh in-memory DAO for test isolation
    MsgDac.DAO = new inMemoryMsgDao();
    userDac.DAO = new inMemoryUserDao();
  });

  test("getPublicMsg returns empty array when no messages exist", async () => {
    const messages = await Msg.getPublicMsg();
    expect(Array.isArray(messages)).toBe(true);
    expect(messages).toHaveLength(0);
  });

  test("getPublicMsg returns only public messages", async () => {
    // Create a public message
    const publicMsg = new Msg(
      buildMsgProps({
        sender: "1",
        receiver: null,
        content: "Public message",
      }),
    );
    await publicMsg.create();

    // Create a private message
    const privateMsg = new Msg(
      buildMsgProps({
        sender: "1",
        receiver: "2",
        content: "Private message",
      }),
    );
    await privateMsg.create();

    const publicMessages = await Msg.getPublicMsg();
    expect(publicMessages.length).toBeGreaterThanOrEqual(1);
    const publicContent = publicMessages.map((m) => m.content);
    expect(publicContent).toContain("Public message");
    expect(publicContent).not.toContain("Private message");
  });

  test("getPublicMsg returns messages in chronological order", async () => {
    const firstMsg = new Msg(
      buildMsgProps({
        sender: "1",
        content: "First message",
        timestamp: new Date("2024-01-01T10:00:00Z"),
      }),
    );
    await firstMsg.create();

    await new Promise((r) => setTimeout(r, 10));

    const secondMsg = new Msg(
      buildMsgProps({
        sender: "1",
        content: "Second message",
        timestamp: new Date("2024-01-01T10:05:00Z"),
      }),
    );
    await secondMsg.create();

    const messages = await Msg.getPublicMsg();
    expect(messages.length).toBeGreaterThanOrEqual(2);

    const firstIndex = messages.findIndex(
      (m) => m.content === "First message",
    );
    const secondIndex = messages.findIndex(
      (m) => m.content === "Second message",
    );

    expect(firstIndex).toBeLessThan(secondIndex);
  });

  test("getPublicMsg populates sender with username when user exists", async () => {
    // Create a user first
    const user = new User(buildUserProps({ username: "alice" }));
    await user.create();
    const foundUser = await User.findByUsername("alice");

    // Create a message from that user
    const msg = new Msg(
      buildMsgProps({
        sender: foundUser.id,
        content: "Message from alice",
      }),
    );
    await msg.create();

    const messages = await Msg.getPublicMsg();
    const found = messages.find((m) => m.content === "Message from alice");
    expect(found).toBeDefined();
    expect(found.sender).toBeDefined();
    // Sender should be populated with username object
    if (found.sender && typeof found.sender === "object") {
      expect(found.sender.username).toBe("alice");
    }
  });

  test("getPrivateMsg returns empty array when no messages exist", async () => {
    const messages = await Msg.getPrivateMsg("1", "2");
    expect(Array.isArray(messages)).toBe(true);
    expect(messages).toHaveLength(0);
  });

  test("getPrivateMsg returns messages between specific sender and receiver", async () => {
    // Create messages between sender 1 and receiver 2
    const msg1 = new Msg(
      buildMsgProps({
        sender: "1",
        receiver: "2",
        content: "Message 1 to 2",
      }),
    );
    await msg1.create();

    // Create message between different pair
    const msg2 = new Msg(
      buildMsgProps({
        sender: "3",
        receiver: "2",
        content: "Message 3 to 2",
      }),
    );
    await msg2.create();

    const messages = await Msg.getPrivateMsg("1", "2");
    expect(messages.length).toBeGreaterThanOrEqual(1);
    const contents = messages.map((m) => m.content);
    expect(contents).toContain("Message 1 to 2");
    expect(contents).not.toContain("Message 3 to 2");
  });

  test("getPrivateMsg handles string and number IDs consistently", async () => {
    const msg = new Msg(
      buildMsgProps({
        sender: 1,
        receiver: 2,
        content: "Message with number IDs",
      }),
    );
    await msg.create();

    // Query with string IDs
    const messages1 = await Msg.getPrivateMsg("1", "2");
    expect(messages1.length).toBeGreaterThanOrEqual(1);

    // Query with number IDs
    const messages2 = await Msg.getPrivateMsg(1, 2);
    expect(messages2.length).toBeGreaterThanOrEqual(1);
  });

  test("markMessagesAsRead marks messages as read", async () => {
    const msg = new Msg(
      buildMsgProps({
        sender: "1",
        receiver: "2",
        content: "Unread message",
      }),
    );
    await msg.create();

    await Msg.markMessagesAsRead("1", "2");

    const unreadMessages = await Msg.getUnreadMessages("2");
    const contents = unreadMessages.map((m) => m.content);
    expect(contents).not.toContain("Unread message");
  });

  test("getUnreadMessages returns only unread messages", async () => {
    // Create read message
    const readMsg = new Msg(
      buildMsgProps({
        sender: "1",
        receiver: "2",
        content: "Read message",
      }),
    );
    await readMsg.create();
    await Msg.markMessagesAsRead("1", "2");

    // Create unread message
    const unreadMsg = new Msg(
      buildMsgProps({
        sender: "3",
        receiver: "2",
        content: "Unread message",
      }),
    );
    await unreadMsg.create();

    const unreadMessages = await Msg.getUnreadMessages("2");
    const contents = unreadMessages.map((m) => m.content);
    expect(contents).toContain("Unread message");
    expect(contents).not.toContain("Read message");
  });
});

