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

      await agent
        .post("/api/authentications/registrations")
        .send({ username: "member_initial", password: "password123" })
        .expect(201);

      const initialMember = await UserDac.DAO.findByUsername("member_initial");

      const createRes = await agent
        .post("/api/groups")
        .send({
          groupName: "Growing Group",
          memberIds: [String(initialMember._id)],
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
      expect(group.members).toHaveLength(2);
      expect(group.members.map(String)).toContain(String(newMember._id));
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
});
