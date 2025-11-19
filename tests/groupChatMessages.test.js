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

  describe("POST /api/groups/:groupId/messages - Send Group Message", () => {
    test("should allow member to send message", async () => {
      const agent = request.agent(app);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "owner14", password: "password123" })
        .expect(201);

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "member_chat", password: "password123" })
        .expect(201);

      const member = await UserDac.DAO.findByUsername("member_chat");

      await agent
        .post("/api/authentications/login")
        .send({ username: "owner14", password: "password123" })
        .expect(200);

      const createRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Chat Group",
          memberIds: [String(member._id)],
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
        .post("/api/authentications/registrations")
        .send({ username: "member_exclusive", password: "password123" })
        .expect(201);

      const member = await UserDac.DAO.findByUsername("member_exclusive");

      await agent
        .post("/api/authentications/login")
        .send({ username: "owner15", password: "password123" })
        .expect(200);

      const createRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Exclusive Group",
          memberIds: [String(member._id)],
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
        .post("/api/authentications/registrations")
        .send({ username: "member_msg", password: "password123" })
        .expect(201);

      const member = await UserDac.DAO.findByUsername("member_msg");

      await agent
        .post("/api/authentications/login")
        .send({ username: "owner16", password: "password123" })
        .expect(200);

      const createRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Message Group",
          memberIds: [String(member._id)],
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
        .post("/api/authentications/registrations")
        .send({ username: "member_secret", password: "password123" })
        .expect(201);

      const member = await UserDac.DAO.findByUsername("member_secret");

      await agent
        .post("/api/authentications/login")
        .send({ username: "owner17", password: "password123" })
        .expect(200);

      const createRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Secret Group",
          memberIds: [String(member._id)],
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
