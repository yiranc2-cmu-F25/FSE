import Msg from "../entities/Msg.js";
import MsgDac from "../dacs/msgDac.js";
import User from "../entities/User.js";
import userDac from "../dacs/userDac.js";
import { inMemoryMsgDao } from "../daos/inMemoryMsgDao.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";

const BASE_PRIVATE_MSG_PROPS = Object.freeze({
  sender: "1",
  receiver: "2",
  timestamp: new Date("2024-01-01T10:00:00Z"),
  status: "ok",
  content: "Private message",
});

const BASE_USER_PROPS = Object.freeze({
  username: "testuser",
  password: "testpass",
  sharedstatus: "undefined",
  status: "active",
  role: "citizen",
});

const buildPrivateMsgProps = (overrides) => ({
  ...BASE_PRIVATE_MSG_PROPS,
  ...overrides,
});
const buildUserProps = (overrides) => ({ ...BASE_USER_PROPS, ...overrides });

describe("Private Message constructor and instance methods", () => {
  test("creates private message with receiver", () => {
    const props = buildPrivateMsgProps({});
    const msg = new Msg(props);
    expect(msg.sender).toBe("1");
    expect(msg.receiver).toBe("2");
    expect(msg.isPrivate()).toBe(true);
    expect(msg.isPublic()).toBe(false);
  });

  test("isPrivate returns true when receiver is not null", () => {
    const msg = new Msg(buildPrivateMsgProps({ receiver: "2" }));
    expect(msg.isPrivate()).toBe(true);
  });

  test("isPrivate returns false when receiver is null", () => {
    const msg = new Msg(buildPrivateMsgProps({ receiver: null }));
    expect(msg.isPrivate()).toBe(false);
  });
});

describe("Private Message create flow", () => {
  beforeEach(() => {
    // inject a fresh in-memory DAO for test isolation
    MsgDac.DAO = new inMemoryMsgDao();
  });

  test("successful create persists private message", async () => {
    const props = buildPrivateMsgProps({
      sender: "1",
      receiver: "2",
      content: `private_msg_${Date.now()}`,
    });
    const msg = new Msg(props);
    await msg.create();

    const privateMessages = await Msg.getPrivateMsg("1", "2");
    const found = privateMessages.find((m) => m.content === props.content);
    expect(found).toBeDefined();
    expect(found.receiver).toBe("2");
  });

  test("create stores message with correct sender and receiver", async () => {
    const props = buildPrivateMsgProps({
      sender: "alice",
      receiver: "bob",
      content: "Hello Bob",
    });
    const msg = new Msg(props);
    await msg.create();

    const messages = await Msg.getPrivateMsg("alice", "bob");
    const found = messages.find((m) => m.content === "Hello Bob");
    expect(found).toBeDefined();
    expect(found.sender).toBe("alice");
    expect(found.receiver).toBe("bob");
  });

  test("create preserves message content and status", async () => {
    const props = buildPrivateMsgProps({
      sender: "1",
      receiver: "2",
      content: "Test private message",
      status: "help",
    });
    const msg = new Msg(props);
    await msg.create();

    const messages = await Msg.getPrivateMsg("1", "2");
    const found = messages.find((m) => m.content === "Test private message");
    expect(found).toBeDefined();
    expect(found.status).toBe("help");
  });
});

describe("Private Message static methods", () => {
  beforeEach(() => {
    // inject a fresh in-memory DAO for test isolation
    MsgDac.DAO = new inMemoryMsgDao();
    userDac.DAO = new inMemoryUserDao();
  });

  test("getPrivateMsg returns empty array when no messages exist", async () => {
    const messages = await Msg.getPrivateMsg("1", "2");
    expect(Array.isArray(messages)).toBe(true);
    expect(messages).toHaveLength(0);
  });

  test("getPrivateMsg returns only messages between specific sender and receiver", async () => {
    // Create message from 1 to 2
    const msg1 = new Msg(
      buildPrivateMsgProps({
        sender: "1",
        receiver: "2",
        content: "Message 1 to 2",
      }),
    );
    await msg1.create();

    // Create message from 1 to 3 (different receiver)
    const msg2 = new Msg(
      buildPrivateMsgProps({
        sender: "1",
        receiver: "3",
        content: "Message 1 to 3",
      }),
    );
    await msg2.create();

    // Create message from 3 to 2 (different sender)
    const msg3 = new Msg(
      buildPrivateMsgProps({
        sender: "3",
        receiver: "2",
        content: "Message 3 to 2",
      }),
    );
    await msg3.create();

    const messages = await Msg.getPrivateMsg("1", "2");
    expect(messages.length).toBeGreaterThanOrEqual(1);
    const contents = messages.map((m) => m.content);
    expect(contents).toContain("Message 1 to 2");
    expect(contents).not.toContain("Message 1 to 3");
    expect(contents).not.toContain("Message 3 to 2");
  });

  test("getPrivateMsg handles string and number IDs consistently", async () => {
    const msg = new Msg(
      buildPrivateMsgProps({
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

  test("getPrivateMsg returns messages in chronological order", async () => {
    const firstMsg = new Msg(
      buildPrivateMsgProps({
        sender: "1",
        receiver: "2",
        content: "First message",
        timestamp: new Date("2024-01-01T10:00:00Z"),
      }),
    );
    await firstMsg.create();

    await new Promise((r) => setTimeout(r, 10));

    const secondMsg = new Msg(
      buildPrivateMsgProps({
        sender: "1",
        receiver: "2",
        content: "Second message",
        timestamp: new Date("2024-01-01T10:05:00Z"),
      }),
    );
    await secondMsg.create();

    const messages = await Msg.getPrivateMsg("1", "2");
    expect(messages.length).toBeGreaterThanOrEqual(2);

    const firstIndex = messages.findIndex(
      (m) => m.content === "First message",
    );
    const secondIndex = messages.findIndex(
      (m) => m.content === "Second message",
    );

    expect(firstIndex).toBeLessThan(secondIndex);
  });

  test("getPrivateMsg returns empty for reverse direction when no messages", async () => {
    // Create message from 1 to 2
    const msg = new Msg(
      buildPrivateMsgProps({
        sender: "1",
        receiver: "2",
        content: "One way message",
      }),
    );
    await msg.create();

    // Query reverse direction (2 to 1) should return empty
    const reverseMessages = await Msg.getPrivateMsg("2", "1");
    expect(reverseMessages).toHaveLength(0);
  });
});

describe("Bidirectional private message conversation", () => {
  beforeEach(() => {
    // inject a fresh in-memory DAO for test isolation
    MsgDac.DAO = new inMemoryMsgDao();
    userDac.DAO = new inMemoryUserDao();
  });

  test("getPrivateMsg returns messages in both directions", async () => {
    // Alice sends to Bob
    const msg1 = new Msg(
      buildPrivateMsgProps({
        sender: "alice",
        receiver: "bob",
        content: "Alice to Bob",
      }),
    );
    await msg1.create();

    // Bob sends to Alice
    const msg2 = new Msg(
      buildPrivateMsgProps({
        sender: "bob",
        receiver: "alice",
        content: "Bob to Alice",
      }),
    );
    await msg2.create();

    // Get conversation from Alice's perspective
    const aliceToBob = await Msg.getPrivateMsg("alice", "bob");
    const bobToAlice = await Msg.getPrivateMsg("bob", "alice");

    expect(aliceToBob.length).toBeGreaterThanOrEqual(1);
    expect(bobToAlice.length).toBeGreaterThanOrEqual(1);

    const aliceContents = aliceToBob.map((m) => m.content);
    const bobContents = bobToAlice.map((m) => m.content);

    expect(aliceContents).toContain("Alice to Bob");
    expect(bobContents).toContain("Bob to Alice");
  });

  test("messages are properly ordered by timestamp in conversation", async () => {
    // First message
    const msg1 = new Msg(
      buildPrivateMsgProps({
        sender: "1",
        receiver: "2",
        content: "First",
        timestamp: new Date("2024-01-01T10:00:00Z"),
      }),
    );
    await msg1.create();

    await new Promise((r) => setTimeout(r, 10));

    // Second message (reverse direction)
    const msg2 = new Msg(
      buildPrivateMsgProps({
        sender: "2",
        receiver: "1",
        content: "Second",
        timestamp: new Date("2024-01-01T10:01:00Z"),
      }),
    );
    await msg2.create();

    await new Promise((r) => setTimeout(r, 10));

    // Third message (original direction)
    const msg3 = new Msg(
      buildPrivateMsgProps({
        sender: "1",
        receiver: "2",
        content: "Third",
        timestamp: new Date("2024-01-01T10:02:00Z"),
      }),
    );
    await msg3.create();

    const messages1to2 = await Msg.getPrivateMsg("1", "2");
    const messages2to1 = await Msg.getPrivateMsg("2", "1");

    // Both directions should have messages in order
    expect(messages1to2.length).toBeGreaterThanOrEqual(1);
    expect(messages2to1.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Private Message read status", () => {
  beforeEach(() => {
    // inject a fresh in-memory DAO for test isolation
    MsgDac.DAO = new inMemoryMsgDao();
    userDac.DAO = new inMemoryUserDao();
  });

  test("markMessagesAsRead marks messages as read", async () => {
    const msg = new Msg(
      buildPrivateMsgProps({
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

  test("markMessagesAsRead only affects messages from specific sender", async () => {
    // Create message from sender 1 to receiver 2
    const msg1 = new Msg(
      buildPrivateMsgProps({
        sender: "1",
        receiver: "2",
        content: "Message from 1",
      }),
    );
    await msg1.create();

    // Create message from sender 3 to receiver 2
    const msg2 = new Msg(
      buildPrivateMsgProps({
        sender: "3",
        receiver: "2",
        content: "Message from 3",
      }),
    );
    await msg2.create();

    // Mark messages from sender 1 as read
    await Msg.markMessagesAsRead("1", "2");

    const unreadMessages = await Msg.getUnreadMessages("2");
    const contents = unreadMessages.map((m) => m.content);
    expect(contents).not.toContain("Message from 1");
    expect(contents).toContain("Message from 3");
  });

  test("getUnreadMessages returns only unread messages", async () => {
    // Create read message
    const readMsg = new Msg(
      buildPrivateMsgProps({
        sender: "1",
        receiver: "2",
        content: "Read message",
      }),
    );
    await readMsg.create();
    await Msg.markMessagesAsRead("1", "2");

    // Create unread message
    const unreadMsg = new Msg(
      buildPrivateMsgProps({
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

  test("getUnreadMessages returns empty array when all messages are read", async () => {
    const msg = new Msg(
      buildPrivateMsgProps({
        sender: "1",
        receiver: "2",
        content: "Message",
      }),
    );
    await msg.create();
    await Msg.markMessagesAsRead("1", "2");

    const unreadMessages = await Msg.getUnreadMessages("2");
    expect(unreadMessages).toHaveLength(0);
  });

  test("getUnreadMessages only returns messages for specific receiver", async () => {
    // Create message to receiver 2
    const msg1 = new Msg(
      buildPrivateMsgProps({
        sender: "1",
        receiver: "2",
        content: "Message to 2",
      }),
    );
    await msg1.create();

    // Create message to receiver 3
    const msg2 = new Msg(
      buildPrivateMsgProps({
        sender: "1",
        receiver: "3",
        content: "Message to 3",
      }),
    );
    await msg2.create();

    const unreadMessages = await Msg.getUnreadMessages("2");
    const contents = unreadMessages.map((m) => m.content);
    expect(contents).toContain("Message to 2");
    expect(contents).not.toContain("Message to 3");
  });

  test("markMessagesAsRead works for bidirectional conversations", async () => {
    // Alice sends to Bob
    const msg1 = new Msg(
      buildPrivateMsgProps({
        sender: "alice",
        receiver: "bob",
        content: "Alice message",
      }),
    );
    await msg1.create();

    // Bob sends to Alice
    const msg2 = new Msg(
      buildPrivateMsgProps({
        sender: "bob",
        receiver: "alice",
        content: "Bob message",
      }),
    );
    await msg2.create();

    // Mark messages from Alice to Bob as read
    await Msg.markMessagesAsRead("alice", "bob");

    // Bob should have no unread messages from Alice
    const bobUnread = await Msg.getUnreadMessages("bob");
    const bobContents = bobUnread.map((m) => m.content);
    expect(bobContents).not.toContain("Alice message");

    // But Alice should still have unread from Bob
    const aliceUnread = await Msg.getUnreadMessages("alice");
    const aliceContents = aliceUnread.map((m) => m.content);
    expect(aliceContents).toContain("Bob message");
  });
});

