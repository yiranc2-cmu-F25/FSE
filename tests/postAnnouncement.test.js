// tests/postAnnouncement.test.js
import { jest } from '@jest/globals';
import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

import { makeAnnouncementModel } from "../db/AnnouncementSchema.js";
import { AnnouncementDao } from "../daos/AnnouncementDao.js";
import AnnouncementDac from "../dacs/announcementDac.js";
import Announcement from "../entities/Announcement.js";

import { makeUserModel } from "../db/UserSchema.js";
import { UserDao } from "../daos/UserDao.js";
import UserDac from "../dacs/UserDac.js";
import User from "../entities/User.js";

// controller under test
import { postAnnouncement } from "../controllers/announcementController.js";

describe("POST /announcements", () => {
  let mongod, conn, AnnouncementModel, UserModel, app, fakeSocket, restoreErr;
  let createdUserId, createdUsername;

  beforeAll(async () => {
    // optional: keep test output clean
    restoreErr = jest.spyOn(console, "error").mockImplementation(() => {});

    mongod = await MongoMemoryServer.create();
    await mongoose.disconnect();
    conn = await mongoose.createConnection(mongod.getUri());

    // Build models from the TEST connection
    AnnouncementModel = makeAnnouncementModel(conn);
    UserModel = makeUserModel(conn);

    // Inject DAOs that use the TEST models
    AnnouncementDac.DAO = new AnnouncementDao({ AnnouncementModel });
    UserDac.DAO = new UserDao({ UserModel });

    // Minimal express app + route
    app = express();
    app.use(express.json());

    // fake socket with a spy
    fakeSocket = { emitMessageFrom: jest.fn() };
    app.set("socketInstance", fakeSocket);

    app.post("/announcements", postAnnouncement);

    // --- Seed a test user and remember its _id and username ---
    const newUser = await UserDac.DAO.create({
      // adapt these fields to your User schema
      username: "alice",
      password: "irrelevant-for-test",
      email: "alice@example.com",
    });
    createdUserId = String(newUser._id);
    createdUsername = newUser.username;
  });

  afterAll(async () => {
    restoreErr.mockRestore();
    await conn.close();
    await mongod.stop();
  });

  it("creates an announcement and emits over socket", async () => {
    const body = {
      sender: createdUserId,                 // use the REAL user id
      content: "  Hello world  ",
      status: "OK",
      timestamp: new Date().toISOString()
    };

    const res = await request(app)
      .post("/announcements")
      .send(body)
      .expect(201);

    expect(res.body).toEqual({ message: "Announcement posted" });

    // Verify DB state via the entity/DAO
    const rows = await Announcement.getAnnouncement();
    expect(rows.length).toBe(1);
    expect(rows[0].content).toBe("Hello world");       // trimmed in controller
    expect(rows[0].status).toBe("ok");                 // toLowerCase in controller

    // Verify socket emit: should use looked-up username
    expect(fakeSocket.emitMessageFrom).toHaveBeenCalledWith(
      createdUsername,                                  // "alice"
      expect.objectContaining({
        sender: createdUsername,                        // "alice"
        content: "  Hello world  ",
        status: "OK"
      })
    );
  }, 20000); // optional: increase if mongodb-memory-server is slow to start
});
