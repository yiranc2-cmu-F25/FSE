import Group from "../entities/Group.js";
import GroupMessage from "../entities/GroupMessage.js";
import GroupDac from "../dacs/groupDac.js";
import GroupMessageDac from "../dacs/groupMessageDac.js";
import User from "../entities/User.js";
import userDac from "../dacs/userDac.js";
import { inMemoryGroupDao } from "../daos/inMemoryGroupDao.js";
import { inMemoryGroupMessageDao } from "../daos/inMemoryGroupMessageDao.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import {
  createGroup,
  addGroupMembers,
  removeGroupMembers,
  deleteGroup,
  getGroupsList,
  getGroupMessages,
  sendGroupMessage,
} from "../controllers/groupChatController.js";

const BASE_GROUP_PROPS = Object.freeze({
  groupName: "Test Group",
  owner: "1",
  members: ["2", "3"],
  timestamp: null,
});

const BASE_GROUP_MSG_PROPS = Object.freeze({
  sender: "1",
  group: "1",
  timestamp: new Date("2024-01-01T10:00:00Z"),
  status: "ok",
  content: "Group message",
});

const BASE_USER_PROPS = Object.freeze({
  username: "testuser",
  password: "testpass",
  sharedstatus: "undefined",
  status: "active",
  role: "citizen",
});

const buildGroupProps = (overrides) => ({
  ...BASE_GROUP_PROPS,
  ...overrides,
});

const buildGroupMsgProps = (overrides) => ({
  ...BASE_GROUP_MSG_PROPS,
  ...overrides,
});

const buildUserProps = (overrides) => ({ ...BASE_USER_PROPS, ...overrides });

describe("Group constructor and instance methods", () => {
  test("creates group with correct properties", () => {
    const props = buildGroupProps({});
    const group = new Group(props);
    expect(group.groupName).toBe("Test Group");
    expect(group.owner).toBe("1");
    expect(group.members).toEqual(["2", "3"]);
    expect(group.timestamp).toBe(null);
  });

  test("creates group with empty members array", () => {
    const group = new Group(buildGroupProps({ members: [] }));
    expect(group.members).toEqual([]);
  });
});

describe("Group create flow", () => {
  beforeEach(() => {
    GroupDac.DAO = new inMemoryGroupDao();
  });

  test("successful create persists group", async () => {
    const props = buildGroupProps({
      groupName: `test_group_${Date.now()}`,
    });
    const group = new Group(props);
    const created = await group.create();

    expect(created).toBeDefined();
    expect(created.groupName).toBe(props.groupName);

    const found = await Group.findById(created._id);
    expect(found).toBeDefined();
    expect(found.groupName).toBe(props.groupName);
  });

  test("create stores group with correct owner and members", async () => {
    const props = buildGroupProps({
      owner: "alice",
      members: ["bob", "charlie"],
    });
    const group = new Group(props);
    const created = await group.create();

    const found = await Group.findById(created._id);
    expect(found.owner).toBe("alice");
    expect(found.members).toEqual(["bob", "charlie"]);
  });
});

describe("Group static methods", () => {
  beforeEach(() => {
    GroupDac.DAO = new inMemoryGroupDao();
  });

  test("findById returns null when group does not exist", async () => {
    const group = await Group.findById("nonexistent");
    expect(group).toBe(null);
  });

  test("findGroupsByUserId returns groups where user is owner", async () => {
    const group1 = new Group(
      buildGroupProps({
        groupName: "Group 1",
        owner: "user1",
        members: [],
      })
    );
    await group1.create();

    const groups = await Group.findGroupsByUserId("user1");
    expect(groups.length).toBeGreaterThanOrEqual(1);
    const groupNames = groups.map((g) => g.groupName);
    expect(groupNames).toContain("Group 1");
  });

  test("findGroupsByUserId returns groups where user is member", async () => {
    const group1 = new Group(
      buildGroupProps({
        groupName: "Group 2",
        owner: "owner1",
        members: ["user2"],
      })
    );
    await group1.create();

    const groups = await Group.findGroupsByUserId("user2");
    expect(groups.length).toBeGreaterThanOrEqual(1);
    const groupNames = groups.map((g) => g.groupName);
    expect(groupNames).toContain("Group 2");
  });

  test("addMembers adds new members to group", async () => {
    const group = new Group(
      buildGroupProps({
        owner: "1",
        members: ["2"],
      })
    );
    const created = await group.create();

    await Group.addMembers(created._id, ["3", "4"]);

    const updated = await Group.findById(created._id);
    expect(updated.members).toContain("2");
    expect(updated.members).toContain("3");
    expect(updated.members).toContain("4");
  });

  test("removeMembers removes members from group", async () => {
    const group = new Group(
      buildGroupProps({
        owner: "1",
        members: ["2", "3", "4"],
      })
    );
    const created = await group.create();

    await Group.removeMembers(created._id, ["3"]);

    const updated = await Group.findById(created._id);
    expect(updated.members).toContain("2");
    expect(updated.members).not.toContain("3");
    expect(updated.members).toContain("4");
  });

  test("deleteGroup removes group", async () => {
    const group = new Group(buildGroupProps({}));
    const created = await group.create();

    await Group.deleteGroup(created._id);

    const found = await Group.findById(created._id);
    expect(found).toBe(null);
  });

  test("updateTimestamp updates group timestamp", async () => {
    const group = new Group(buildGroupProps({}));
    const created = await group.create();

    const newTimestamp = new Date("2024-01-02T10:00:00Z");
    await Group.updateTimestamp(created._id, newTimestamp);

    const updated = await Group.findById(created._id);
    expect(new Date(updated.timestamp).getTime()).toBe(newTimestamp.getTime());
  });

  test("isUserInGroup returns true for owner", async () => {
    const group = new Group(
      buildGroupProps({
        owner: "user1",
        members: ["user2"],
      })
    );
    const created = await group.create();

    const isMember = await Group.isUserInGroup(created._id, "user1");
    expect(isMember).toBe(true);
  });

  test("isUserInGroup returns true for member", async () => {
    const group = new Group(
      buildGroupProps({
        owner: "user1",
        members: ["user2"],
      })
    );
    const created = await group.create();

    const isMember = await Group.isUserInGroup(created._id, "user2");
    expect(isMember).toBe(true);
  });

  test("isUserInGroup returns false for non-member", async () => {
    const group = new Group(
      buildGroupProps({
        owner: "user1",
        members: ["user2"],
      })
    );
    const created = await group.create();

    const isMember = await Group.isUserInGroup(created._id, "user3");
    expect(isMember).toBe(false);
  });

  test("isUserOwner returns true for owner", async () => {
    const group = new Group(
      buildGroupProps({
        owner: "user1",
        members: [],
      })
    );
    const created = await group.create();

    const isOwner = await Group.isUserOwner(created._id, "user1");
    expect(isOwner).toBe(true);
  });

  test("isUserOwner returns false for member", async () => {
    const group = new Group(
      buildGroupProps({
        owner: "user1",
        members: ["user2"],
      })
    );
    const created = await group.create();

    const isOwner = await Group.isUserOwner(created._id, "user2");
    expect(isOwner).toBe(false);
  });
});

describe("GroupMessage constructor and instance methods", () => {
  test("creates group message with correct properties", () => {
    const props = buildGroupMsgProps({});
    const msg = new GroupMessage(props);
    expect(msg.sender).toBe("1");
    expect(msg.group).toBe("1");
    expect(msg.content).toBe("Group message");
    expect(msg.status).toBe("ok");
  });
});

describe("GroupMessage create flow", () => {
  beforeEach(() => {
    GroupMessageDac.DAO = new inMemoryGroupMessageDao();
  });

  test("successful create persists group message", async () => {
    const props = buildGroupMsgProps({
      content: `group_msg_${Date.now()}`,
    });
    const msg = new GroupMessage(props);
    await msg.create();

    const messages = await GroupMessage.findByGroupId("1");
    const found = messages.find((m) => m.content === props.content);
    expect(found).toBeDefined();
    expect(found.group).toBe("1");
  });

  test("create stores message with correct sender and group", async () => {
    const props = buildGroupMsgProps({
      sender: "alice",
      group: "group1",
      content: "Hello group",
    });
    const msg = new GroupMessage(props);
    await msg.create();

    const messages = await GroupMessage.findByGroupId("group1");
    const found = messages.find((m) => m.content === "Hello group");
    expect(found).toBeDefined();
    expect(found.sender).toBe("alice");
  });
});

describe("GroupMessage static methods", () => {
  beforeEach(() => {
    GroupMessageDac.DAO = new inMemoryGroupMessageDao();
  });

  test("findByGroupId returns empty array when no messages exist", async () => {
    const messages = await GroupMessage.findByGroupId("nonexistent");
    expect(Array.isArray(messages)).toBe(true);
    expect(messages).toHaveLength(0);
  });

  test("findByGroupId returns only messages for specific group", async () => {
    const msg1 = new GroupMessage(
      buildGroupMsgProps({
        group: "group1",
        content: "Message for group 1",
      })
    );
    await msg1.create();

    const msg2 = new GroupMessage(
      buildGroupMsgProps({
        group: "group2",
        content: "Message for group 2",
      })
    );
    await msg2.create();

    const messages = await GroupMessage.findByGroupId("group1");
    const contents = messages.map((m) => m.content);
    expect(contents).toContain("Message for group 1");
    expect(contents).not.toContain("Message for group 2");
  });

  test("findByGroupId returns messages in chronological order", async () => {
    const firstMsg = new GroupMessage(
      buildGroupMsgProps({
        group: "group1",
        content: "First message",
        timestamp: new Date("2024-01-01T10:00:00Z"),
      })
    );
    await firstMsg.create();

    await new Promise((r) => setTimeout(r, 10));

    const secondMsg = new GroupMessage(
      buildGroupMsgProps({
        group: "group1",
        content: "Second message",
        timestamp: new Date("2024-01-01T10:05:00Z"),
      })
    );
    await secondMsg.create();

    const messages = await GroupMessage.findByGroupId("group1");
    expect(messages.length).toBeGreaterThanOrEqual(2);

    const firstIndex = messages.findIndex((m) => m.content === "First message");
    const secondIndex = messages.findIndex((m) => m.content === "Second message");

    expect(firstIndex).toBeLessThan(secondIndex);
  });

  test("getLatestMessageTimestamp returns latest timestamp", async () => {
    const msg1 = new GroupMessage(
      buildGroupMsgProps({
        group: "group1",
        timestamp: new Date("2024-01-01T10:00:00Z"),
      })
    );
    await msg1.create();

    const msg2 = new GroupMessage(
      buildGroupMsgProps({
        group: "group1",
        timestamp: new Date("2024-01-01T11:00:00Z"),
      })
    );
    await msg2.create();

    const timestamp = await GroupMessage.getLatestMessageTimestamp("group1");
    expect(timestamp).toBeDefined();
    expect(new Date(timestamp).getTime()).toBe(
      new Date("2024-01-01T11:00:00Z").getTime()
    );
  });

  test("getLatestMessageTimestamp returns null when no messages", async () => {
    const timestamp = await GroupMessage.getLatestMessageTimestamp("nonexistent");
    expect(timestamp).toBe(null);
  });

  test("deleteByGroupId deletes all messages for group", async () => {
    const msg1 = new GroupMessage(
      buildGroupMsgProps({
        group: "group1",
        content: "Message 1",
      })
    );
    await msg1.create();

    const msg2 = new GroupMessage(
      buildGroupMsgProps({
        group: "group1",
        content: "Message 2",
      })
    );
    await msg2.create();

    const deletedCount = await GroupMessage.deleteByGroupId("group1");
    expect(deletedCount).toBeGreaterThanOrEqual(2);

    const messages = await GroupMessage.findByGroupId("group1");
    expect(messages).toHaveLength(0);
  });
});

describe("Group Chat API", () => {
  beforeEach(() => {
    GroupDac.DAO = new inMemoryGroupDao();
    GroupMessageDac.DAO = new inMemoryGroupMessageDao();
    userDac.DAO = new inMemoryUserDao();
  });

  describe("createGroup", () => {
    test("returns 201 when group is created successfully", async () => {
      const user1Props = buildUserProps({ username: `owner_${Date.now()}` });
      const user1 = new User(user1Props);
      await user1.create();
      const found1 = await User.findByUsername(user1Props.username);

      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: found1.id },
        body: {
          groupName: "Test Group",
          memberIds: [],
        },
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

      await createGroup(req, res);

      expect(statusCode).toBe(201);
      expect(jsonBody).toHaveProperty("message");
      expect(jsonBody).toHaveProperty("groupId");
      expect(jsonBody.message).toBe("Group created successfully");
    });

    test("returns 400 when group name is missing", async () => {
      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "1" },
        body: {
          memberIds: [],
        },
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

      await createGroup(req, res);

      expect(statusCode).toBe(400);
      expect(jsonBody).toEqual({
        status: "error",
        message: "Group name is required",
      });
    });

    test("returns 400 when member count exceeds maximum", async () => {
      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "1" },
        body: {
          groupName: "Test Group",
          memberIds: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
        },
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

      await createGroup(req, res);

      expect(statusCode).toBe(400);
      expect(jsonBody.status).toBe("error");
      expect(jsonBody.message).toContain("members");
    });

    test("returns 409 when group name already exists", async () => {
      // First create a group
      const group = new Group(
        buildGroupProps({
          groupName: "Duplicate Group Name",
          owner: "1",
          members: [],
        })
      );
      await group.create();

      // Try to create another group with the same name
      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "2" },
        body: {
          groupName: "Duplicate Group Name",
          memberIds: [],
        },
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

      await createGroup(req, res);

      expect(statusCode).toBe(409);
      expect(jsonBody).toEqual({
        status: "error",
        message: "Group name already exists",
      });
    });

    test("returns 409 when group name already exists (case-sensitive with trim)", async () => {
      // Create a group with a specific name
      const group = new Group(
        buildGroupProps({
          groupName: "My Group",
          owner: "1",
          members: [],
        })
      );
      await group.create();

      // Try to create with same name but extra whitespace
      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "2" },
        body: {
          groupName: "  My Group  ",
          memberIds: [],
        },
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

      await createGroup(req, res);

      expect(statusCode).toBe(409);
      expect(jsonBody).toEqual({
        status: "error",
        message: "Group name already exists",
      });
    });
  });

  describe("addGroupMembers", () => {
    test("returns 200 when members are added successfully", async () => {
      const user1Props = buildUserProps({ username: `owner_${Date.now()}` });
      const user1 = new User(user1Props);
      await user1.create();
      const found1 = await User.findByUsername(user1Props.username);

      const group = new Group(
        buildGroupProps({
          owner: found1.id,
          members: [],
        })
      );
      const created = await group.create();

      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: found1.id },
        params: { groupId: created._id },
        body: {
          userIds: ["2", "3"],
        },
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

      await addGroupMembers(req, res);

      expect(statusCode).toBe(200);
      expect(jsonBody.message).toBe("Members added successfully");
    });

    test("returns 403 when non-owner tries to add members", async () => {
      const group = new Group(
        buildGroupProps({
          owner: "1",
          members: ["2"],
        })
      );
      const created = await group.create();

      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "2" },
        params: { groupId: created._id },
        body: {
          userIds: ["3"],
        },
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

      await addGroupMembers(req, res);

      expect(statusCode).toBe(403);
      expect(jsonBody.message).toContain("owner");
    });

    test("returns 404 when group does not exist", async () => {
      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "1" },
        params: { groupId: "nonexistent" },
        body: {
          userIds: ["2"],
        },
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

      await addGroupMembers(req, res);

      expect(statusCode).toBe(404);
      expect(jsonBody.message).toBe("Group not found");
    });
  });

  describe("removeGroupMembers", () => {
    test("returns 200 when members are removed successfully", async () => {
      const group = new Group(
        buildGroupProps({
          owner: "1",
          members: ["2", "3"],
        })
      );
      const created = await group.create();

      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "1" },
        params: { groupId: created._id },
        body: {
          userIds: ["2"],
        },
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

      await removeGroupMembers(req, res);

      expect(statusCode).toBe(200);
      expect(jsonBody.message).toBe("Members removed successfully");
    });

    test("returns 400 when trying to remove non-member", async () => {
      const group = new Group(
        buildGroupProps({
          owner: "1",
          members: ["2"],
        })
      );
      const created = await group.create();

      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "1" },
        params: { groupId: created._id },
        body: {
          userIds: ["3"],
        },
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

      await removeGroupMembers(req, res);

      expect(statusCode).toBe(400);
      expect(jsonBody.message).toContain("not members");
    });

    test("returns 403 when non-owner tries to remove members", async () => {
      const group = new Group(
        buildGroupProps({
          owner: "1",
          members: ["2", "3"],
        })
      );
      const created = await group.create();

      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "2" },
        params: { groupId: created._id },
        body: {
          userIds: ["3"],
        },
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

      await removeGroupMembers(req, res);

      expect(statusCode).toBe(403);
      expect(jsonBody.message).toContain("owner");
    });
  });

  describe("deleteGroup", () => {
    test("returns 200 when group is deleted successfully", async () => {
      const group = new Group(
        buildGroupProps({
          owner: "1",
          members: [],
        })
      );
      const created = await group.create();

      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "1" },
        params: { groupId: created._id },
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

      await deleteGroup(req, res);

      expect(statusCode).toBe(200);
      expect(jsonBody.message).toBe("Group deleted successfully");
    });

    test("returns 403 when non-owner tries to delete group", async () => {
      const group = new Group(
        buildGroupProps({
          owner: "1",
          members: ["2"],
        })
      );
      const created = await group.create();

      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "2" },
        params: { groupId: created._id },
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

      await deleteGroup(req, res);

      expect(statusCode).toBe(403);
      expect(jsonBody.message).toContain("owner");
    });

    test("returns 404 when group does not exist", async () => {
      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "1" },
        params: { groupId: "nonexistent" },
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

      await deleteGroup(req, res);

      expect(statusCode).toBe(404);
      expect(jsonBody.message).toBe("Group not found");
    });
  });

  describe("getGroupsList", () => {
    test("returns 200 with list of groups", async () => {
      const group = new Group(
        buildGroupProps({
          groupName: "My Group",
          owner: "1",
          members: ["2"],
        })
      );
      await group.create();

      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "1" },
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

      await getGroupsList(req, res);

      expect(statusCode).toBe(200);
      expect(Array.isArray(jsonBody)).toBe(true);
    });
  });

  describe("sendGroupMessage", () => {
    test("returns 201 when message is sent successfully", async () => {
      const group = new Group(
        buildGroupProps({
          owner: "1",
          members: ["2"],
        })
      );
      const created = await group.create();

      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "1" },
        params: { groupId: created._id },
        body: {
          messageText: "Hello group!",
          status: "ok",
        },
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

      await sendGroupMessage(req, res);

      expect(statusCode).toBe(201);
      expect(jsonBody.message).toBe("Message sent successfully");
      expect(jsonBody).toHaveProperty("messageId");
    });

    test("returns 403 when non-member tries to send message", async () => {
      const group = new Group(
        buildGroupProps({
          owner: "1",
          members: ["2"],
        })
      );
      const created = await group.create();

      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "3" },
        params: { groupId: created._id },
        body: {
          messageText: "Hello!",
          status: "ok",
        },
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

      await sendGroupMessage(req, res);

      expect(statusCode).toBe(403);
      expect(jsonBody.message).toContain("not a member");
    });

    test("returns 400 when message text is missing", async () => {
      const group = new Group(
        buildGroupProps({
          owner: "1",
          members: [],
        })
      );
      const created = await group.create();

      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "1" },
        params: { groupId: created._id },
        body: {
          status: "ok",
        },
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

      await sendGroupMessage(req, res);

      expect(statusCode).toBe(400);
      expect(jsonBody.message).toContain("required");
    });

    test("returns 404 when group does not exist", async () => {
      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "1" },
        params: { groupId: "nonexistent" },
        body: {
          messageText: "Hello!",
          status: "ok",
        },
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

      await sendGroupMessage(req, res);

      expect(statusCode).toBe(404);
      expect(jsonBody.message).toBe("Group not found");
    });
  });

  describe("getGroupMessages", () => {
    test("returns 200 with list of messages", async () => {
      const group = new Group(
        buildGroupProps({
          owner: "1",
          members: [],
        })
      );
      const created = await group.create();

      const msg = new GroupMessage(
        buildGroupMsgProps({
          group: created._id,
          content: "Test message",
        })
      );
      await msg.create();

      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "1" },
        params: { groupId: created._id },
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

      await getGroupMessages(req, res);

      expect(statusCode).toBe(200);
      expect(Array.isArray(jsonBody)).toBe(true);
    });

    test("returns 403 when non-member tries to get messages", async () => {
      const group = new Group(
        buildGroupProps({
          owner: "1",
          members: ["2"],
        })
      );
      const created = await group.create();

      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "3" },
        params: { groupId: created._id },
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

      await getGroupMessages(req, res);

      expect(statusCode).toBe(403);
      expect(jsonBody.message).toContain("not a member");
    });

    test("returns 404 when group does not exist", async () => {
      let statusCode = null;
      let jsonBody = null;
      const req = {
        user: { id: "1" },
        params: { groupId: "nonexistent" },
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

      await getGroupMessages(req, res);

      expect(statusCode).toBe(404);
      expect(jsonBody.message).toBe("Group not found");
    });
  });
});
