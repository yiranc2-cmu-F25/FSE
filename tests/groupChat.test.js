import { jest } from '@jest/globals';
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app.js";

import { makeGroupModel } from "../db/GroupSchema.js";
import { GroupDao } from "../daos/GroupDao.js";
import GroupDac from "../dacs/groupDac.js";

import { makeGroupMessageModel } from "../db/GroupMessageSchema.js";
import { GroupMessageDao } from "../daos/GroupMessageDao.js";
import GroupMessageDac from "../dacs/groupMessageDac.js";

import { makeUserModel } from "../db/UserSchema.js";
import { UserDao } from "../daos/UserDao.js";
import UserDac from "../dacs/userDac.js";

describe("Group Chat Integration Tests", () => {
  let mongod, conn, GroupModel, GroupMessageModel, UserModel;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    await mongoose.disconnect();
    conn = await mongoose.createConnection(uri);

    GroupModel = makeGroupModel(conn);
    GroupMessageModel = makeGroupMessageModel(conn);
    UserModel = makeUserModel(conn);

    GroupDac.DAO = new GroupDao({ GroupModel });
    GroupMessageDac.DAO = new GroupMessageDao({ GroupMessageModel });
    UserDac.DAO = new UserDao({ UserModel });
  });

  afterAll(async () => {
    await conn.close();
    await mongod.stop();
  });

  afterEach(async () => {
    const collections = conn.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe("POST /api/groups - Create Group", () => {
    test("should create a new group with owner and members", async () => {
      const agent = request.agent(app);

      // Register and login as owner
      await agent
        .post("/api/authentications/registrations")
        .send({ username: "owner", password: "password123" })
        .expect(201);

      const owner = await UserDac.DAO.findByUsername("owner");

      // Register members
      await agent
        .post("/api/authentications/registrations")
        .send({ username: "member1", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "member2", password: "password123" })
        .expect(201);

      const member1 = await UserDac.DAO.findByUsername("member1");
      const member2 = await UserDac.DAO.findByUsername("member2");

      // Login as owner
      await agent
        .post("/api/authentications/login")
        .send({ username: "owner", password: "password123" })
        .expect(200);

      // Create group
      const createRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Test Group",
          memberIds: [String(member1._id), String(member2._id)],
        })
        .expect(201);

      expect(createRes.body).toHaveProperty("message", "Group created successfully");
      expect(createRes.body).toHaveProperty("groupId");

      // Verify in database
      const groups = await GroupModel.find({}).lean();
      expect(groups).toHaveLength(1);
      expect(groups[0].groupName).toBe("Test Group");
      expect(String(groups[0].owner)).toBe(String(owner._id));
      expect(groups[0].members).toHaveLength(2);
    });

    test("should reject group creation with duplicate name", async () => {
      const agent = request.agent(app);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "user1", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/login")
        .send({ username: "user1", password: "password123" })
        .expect(200);

      // Create first group
      await agent
        .post("/api/groups")
        .send({
          groupName: "Unique Group",
          memberIds: [],
        })
        .expect(201);

      // Try to create another group with same name
      const duplicateRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Unique Group",
          memberIds: [],
        })
        .expect(409);

      expect(duplicateRes.body).toHaveProperty("message", "Group name already exists");
    });

    test("should reject group with too many members", async () => {
      const agent = request.agent(app);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "owner2", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/login")
        .send({ username: "owner2", password: "password123" })
        .expect(200);

      // Try to create group with 10 members (exceeds max of 9)
      const tooManyRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Too Big Group",
          memberIds: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
        })
        .expect(400);

      expect(tooManyRes.body.message).toContain("members");
    });
  });

  describe("GET /api/groups - Get Groups List", () => {
    test("should return groups where user is owner", async () => {
      const agent = request.agent(app);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "owner3", password: "password123" })
        .expect(201);

      const owner = await UserDac.DAO.findByUsername("owner3");

      await agent
        .post("/api/authentications/login")
        .send({ username: "owner3", password: "password123" })
        .expect(200);

      // Create group
      await agent
        .post("/api/groups")
        .send({
          groupName: "Owner's Group",
          memberIds: [],
        })
        .expect(201);

      // Get groups list
      const listRes = await agent
        .get("/api/groups")
        .expect(200);

      expect(Array.isArray(listRes.body)).toBe(true);
      expect(listRes.body.length).toBeGreaterThanOrEqual(1);

      const group = listRes.body.find(g => g.groupName === "Owner's Group");
      expect(group).toBeDefined();
      expect(group).toHaveProperty("groupId");
      expect(group).toHaveProperty("usernames");
    });

    test("should return groups where user is member", async () => {
      const agent = request.agent(app);

      // Create owner
      await agent
        .post("/api/authentications/registrations")
        .send({ username: "owner4", password: "password123" })
        .expect(201);

      const owner = await UserDac.DAO.findByUsername("owner4");

      // Create member
      await agent
        .post("/api/authentications/registrations")
        .send({ username: "member3", password: "password123" })
        .expect(201);

      const member = await UserDac.DAO.findByUsername("member3");

      // Login as owner
      await agent
        .post("/api/authentications/login")
        .send({ username: "owner4", password: "password123" })
        .expect(200);

      // Create group with member
      await agent
        .post("/api/groups")
        .send({
          groupName: "Shared Group",
          memberIds: [String(member._id)],
        })
        .expect(201);

      // Login as member
      await agent
        .post("/api/authentications/login")
        .send({ username: "member3", password: "password123" })
        .expect(200);

      // Get groups list as member
      const listRes = await agent
        .get("/api/groups")
        .expect(200);

      expect(Array.isArray(listRes.body)).toBe(true);
      const group = listRes.body.find(g => g.groupName === "Shared Group");
      expect(group).toBeDefined();
    });
  });

  describe("GET /api/groups/:groupId - Get Group Details", () => {
    test("should return group details for member", async () => {
      const agent = request.agent(app);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "owner5", password: "password123" })
        .expect(201);

      const owner = await UserDac.DAO.findByUsername("owner5");

      await agent
        .post("/api/authentications/login")
        .send({ username: "owner5", password: "password123" })
        .expect(200);

      const createRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Details Group",
          memberIds: [],
        })
        .expect(201);

      const groupId = createRes.body.groupId;

      const detailsRes = await agent
        .get(`/api/groups/${groupId}`)
        .expect(200);

      expect(detailsRes.body).toHaveProperty("groupId");
      expect(detailsRes.body).toHaveProperty("groupName", "Details Group");
      expect(detailsRes.body).toHaveProperty("totalCount");
      expect(detailsRes.body).toHaveProperty("owner");
      expect(detailsRes.body).toHaveProperty("members");
      expect(detailsRes.body).toHaveProperty("isOwner", true);
    });

    test("should reject non-member access", async () => {
      const agent = request.agent(app);

      // Create owner and group
      await agent
        .post("/api/authentications/registrations")
        .send({ username: "owner6", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/login")
        .send({ username: "owner6", password: "password123" })
        .expect(200);

      const createRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Private Group",
          memberIds: [],
        })
        .expect(201);

      const groupId = createRes.body.groupId;

      // Create non-member
      await agent
        .post("/api/authentications/registrations")
        .send({ username: "outsider", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/login")
        .send({ username: "outsider", password: "password123" })
        .expect(200);

      // Try to access group details
      const detailsRes = await agent
        .get(`/api/groups/${groupId}`)
        .expect(403);

      expect(detailsRes.body.message).toContain("not a member");
    });
  });

  describe("PATCH /api/groups/:groupId/members - Add Members", () => {
    test("should allow owner to add members", async () => {
      const agent = request.agent(app);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "owner7", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "newmember", password: "password123" })
        .expect(201);

      const newMember = await UserDac.DAO.findByUsername("newmember");

      await agent
        .post("/api/authentications/login")
        .send({ username: "owner7", password: "password123" })
        .expect(200);

      const createRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Growing Group",
          memberIds: [],
        })
        .expect(201);

      const groupId = createRes.body.groupId;

      const addRes = await agent
        .patch(`/api/groups/${groupId}/members`)
        .send({
          userIds: [String(newMember._id)],
        })
        .expect(200);

      expect(addRes.body).toHaveProperty("message", "Members added successfully");

      // Verify in database
      const group = await GroupModel.findById(groupId).lean();
      expect(group.members).toHaveLength(1);
      expect(String(group.members[0])).toBe(String(newMember._id));
    });

    test("should reject non-owner adding members", async () => {
      const agent = request.agent(app);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "owner8", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "member4", password: "password123" })
        .expect(201);

      const member = await UserDac.DAO.findByUsername("member4");

      await agent
        .post("/api/authentications/login")
        .send({ username: "owner8", password: "password123" })
        .expect(200);

      const createRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Restricted Group",
          memberIds: [String(member._id)],
        })
        .expect(201);

      const groupId = createRes.body.groupId;

      // Login as member
      await agent
        .post("/api/authentications/login")
        .send({ username: "member4", password: "password123" })
        .expect(200);

      // Try to add another member
      const addRes = await agent
        .patch(`/api/groups/${groupId}/members`)
        .send({
          userIds: ["someuserid"],
        })
        .expect(403);

      expect(addRes.body.message).toContain("owner");
    });
  });

  describe("DELETE /api/groups/:groupId/members - Remove Members", () => {
    test("should allow owner to remove members", async () => {
      const agent = request.agent(app);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "owner9", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "member5", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "member6", password: "password123" })
        .expect(201);

      const member5 = await UserDac.DAO.findByUsername("member5");
      const member6 = await UserDac.DAO.findByUsername("member6");

      await agent
        .post("/api/authentications/login")
        .send({ username: "owner9", password: "password123" })
        .expect(200);

      const createRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Shrinking Group",
          memberIds: [String(member5._id), String(member6._id)],
        })
        .expect(201);

      const groupId = createRes.body.groupId;

      const removeRes = await agent
        .delete(`/api/groups/${groupId}/members`)
        .send({
          userIds: [String(member5._id)],
        })
        .expect(200);

      expect(removeRes.body).toHaveProperty("message", "Members removed successfully");

      // Verify in database
      const group = await GroupModel.findById(groupId).lean();
      expect(group.members).toHaveLength(1);
      expect(String(group.members[0])).toBe(String(member6._id));
    });

    test("should allow member to leave group", async () => {
      const agent = request.agent(app);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "owner10", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "member7", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "member7b", password: "password123" })
        .expect(201);

      const member7 = await UserDac.DAO.findByUsername("member7");
      const member7b = await UserDac.DAO.findByUsername("member7b");

      await agent
        .post("/api/authentications/login")
        .send({ username: "owner10", password: "password123" })
        .expect(200);

      const createRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Leaving Group",
          memberIds: [String(member7._id), String(member7b._id)],
        })
        .expect(201);

      const groupId = createRes.body.groupId;

      // Login as member
      await agent
        .post("/api/authentications/login")
        .send({ username: "member7", password: "password123" })
        .expect(200);

      // Member leaves
      const leaveRes = await agent
        .delete(`/api/groups/${groupId}/members`)
        .send({
          userIds: [String(member7._id)],
        })
        .expect(200);

      expect(leaveRes.body.message).toContain("removed successfully");

      // Verify in database - should have 1 member left (member7b)
      const group = await GroupModel.findById(groupId).lean();
      expect(group.members).toHaveLength(1);
      expect(String(group.members[0])).toBe(String(member7b._id));
    });

    test("should delete group when last member leaves", async () => {
      const agent = request.agent(app);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "owner11", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "lastmember", password: "password123" })
        .expect(201);

      const lastMember = await UserDac.DAO.findByUsername("lastmember");

      await agent
        .post("/api/authentications/login")
        .send({ username: "owner11", password: "password123" })
        .expect(200);

      const createRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Temporary Group",
          memberIds: [String(lastMember._id)],
        })
        .expect(201);

      const groupId = createRes.body.groupId;

      // Login as last member
      await agent
        .post("/api/authentications/login")
        .send({ username: "lastmember", password: "password123" })
        .expect(200);

      // Last member leaves
      const leaveRes = await agent
        .delete(`/api/groups/${groupId}/members`)
        .send({
          userIds: [String(lastMember._id)],
        })
        .expect(200);

      expect(leaveRes.body.message).toContain("group deleted");

      // Verify group is deleted
      const group = await GroupModel.findById(groupId).lean();
      expect(group).toBeNull();
    });
  });

  describe("DELETE /api/groups/:groupId - Delete Group", () => {
    test("should allow owner to delete group", async () => {
      const agent = request.agent(app);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "owner12", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/login")
        .send({ username: "owner12", password: "password123" })
        .expect(200);

      const createRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Doomed Group",
          memberIds: [],
        })
        .expect(201);

      const groupId = createRes.body.groupId;

      const deleteRes = await agent
        .delete(`/api/groups/${groupId}`)
        .expect(200);

      expect(deleteRes.body).toHaveProperty("message", "Group deleted successfully");

      // Verify in database
      const group = await GroupModel.findById(groupId).lean();
      expect(group).toBeNull();
    });

    test("should reject non-owner deleting group", async () => {
      const agent = request.agent(app);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "owner13", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "member8", password: "password123" })
        .expect(201);

      const member8 = await UserDac.DAO.findByUsername("member8");

      await agent
        .post("/api/authentications/login")
        .send({ username: "owner13", password: "password123" })
        .expect(200);

      const createRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Protected Group",
          memberIds: [String(member8._id)],
        })
        .expect(201);

      const groupId = createRes.body.groupId;

      // Login as member
      await agent
        .post("/api/authentications/login")
        .send({ username: "member8", password: "password123" })
        .expect(200);

      // Try to delete
      const deleteRes = await agent
        .delete(`/api/groups/${groupId}`)
        .expect(403);

      expect(deleteRes.body.message).toContain("owner");
    });
  });

  describe("POST /api/groups/:groupId/messages - Send Group Message", () => {
    test("should allow member to send message", async () => {
      const agent = request.agent(app);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "owner14", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/login")
        .send({ username: "owner14", password: "password123" })
        .expect(200);

      const createRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Chat Group",
          memberIds: [],
        })
        .expect(201);

      const groupId = createRes.body.groupId;

      const messageRes = await agent
        .post(`/api/groups/${groupId}/messages`)
        .send({
          messageText: "Hello group!",
          status: "ok",
          timestamp: new Date().toISOString(),
        })
        .expect(201);

      expect(messageRes.body).toHaveProperty("message", "Message sent successfully");
      expect(messageRes.body).toHaveProperty("messageId");

      // Verify in database
      const messages = await GroupMessageModel.find({ group: groupId }).lean();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("Hello group!");
      expect(messages[0].status).toBe("ok");
    });

    test("should reject non-member sending message", async () => {
      const agent = request.agent(app);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "owner15", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/login")
        .send({ username: "owner15", password: "password123" })
        .expect(200);

      const createRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Exclusive Group",
          memberIds: [],
        })
        .expect(201);

      const groupId = createRes.body.groupId;

      // Create outsider
      await agent
        .post("/api/authentications/registrations")
        .send({ username: "outsider2", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/login")
        .send({ username: "outsider2", password: "password123" })
        .expect(200);

      // Try to send message
      const messageRes = await agent
        .post(`/api/groups/${groupId}/messages`)
        .send({
          messageText: "Can I join?",
          status: "ok",
          timestamp: new Date().toISOString(),
        })
        .expect(403);

      expect(messageRes.body.message).toContain("not a member");
    });
  });

  describe("GET /api/groups/:groupId/messages - Get Group Messages", () => {
    test("should return messages for group member", async () => {
      const agent = request.agent(app);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "owner16", password: "password123" })
        .expect(201);

      const owner = await UserDac.DAO.findByUsername("owner16");

      await agent
        .post("/api/authentications/login")
        .send({ username: "owner16", password: "password123" })
        .expect(200);

      const createRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Message Group",
          memberIds: [],
        })
        .expect(201);

      const groupId = createRes.body.groupId;

      // Send a message
      await agent
        .post(`/api/groups/${groupId}/messages`)
        .send({
          messageText: "First message",
          status: "ok",
          timestamp: new Date().toISOString(),
        })
        .expect(201);

      // Get messages
      const messagesRes = await agent
        .get(`/api/groups/${groupId}/messages`)
        .expect(200);

      expect(Array.isArray(messagesRes.body)).toBe(true);
      expect(messagesRes.body).toHaveLength(1);
      expect(messagesRes.body[0]).toHaveProperty("messageText", "First message");
      expect(messagesRes.body[0]).toHaveProperty("status", "ok");
      expect(messagesRes.body[0]).toHaveProperty("isOwn", true);
    });

    test("should reject non-member getting messages", async () => {
      const agent = request.agent(app);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "owner17", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/login")
        .send({ username: "owner17", password: "password123" })
        .expect(200);

      const createRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Secret Group",
          memberIds: [],
        })
        .expect(201);

      const groupId = createRes.body.groupId;

      // Create outsider
      await agent
        .post("/api/authentications/registrations")
        .send({ username: "outsider3", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/login")
        .send({ username: "outsider3", password: "password123" })
        .expect(200);

      // Try to get messages
      const messagesRes = await agent
        .get(`/api/groups/${groupId}/messages`)
        .expect(403);

      expect(messagesRes.body.message).toContain("not a member");
    });
  });
});
