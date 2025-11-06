import { jest } from '@jest/globals' 
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app.js";

import { makeAnnouncementModel } from "../db/AnnouncementSchema.js";
import { AnnouncementDao } from "../daos/AnnouncementDao.js";
import AnnouncementDac from "../dacs/announcementDac.js";

import { makeUserModel } from "../db/UserSchema.js";
import { UserDao } from "../daos/UserDao.js";
import UserDac from "../dacs/userDac.js";

describe("Announcements Test", () => {
    let mongod, conn, AnnouncementModel, UserModel, mockSocket;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();

        await mongoose.disconnect();
        conn = await mongoose.createConnection(uri);

        AnnouncementModel = makeAnnouncementModel(conn);
        UserModel = makeUserModel(conn);

        AnnouncementDac.DAO = new AnnouncementDao({ AnnouncementModel });
        UserDac.DAO = new UserDao({ UserModel });

        mockSocket = {
            // jest.fn() so we can assert calls
            emitMessageFrom: jest.fn((username, payload) => {
                // you can optionally simulate broadcast behavior,
                // or just leave it as a noop
                return true;
            }),
        };

        app.set("socketInstance", mockSocket);
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

    test("should post a new announcement", async () => {

        const agent = request.agent(app);

        const registerRes = await agent
            .post("/api/authentications/registrations")
            .send({ username: "testUser", password: "testPassword" })
            .expect(201);

        expect(registerRes.body).toHaveProperty("message", "User successfully registered");
        expect(registerRes.body).toHaveProperty("username", "testUser");

        expect(registerRes.headers['set-cookie']).toBeDefined();

        const user = await UserDac.DAO.findByUsername("testUser");

        const postAnnouncementRes = await agent
            .post("/api/announcements")
            .send({
                sender: user._id,
                content: "This is a test announcement",
                status: "ok"
            })
            .expect(201);

        expect(postAnnouncementRes.body).toHaveProperty("message", "Announcement posted");

        const docs = await AnnouncementModel.find({}).lean();
        expect(docs).toHaveLength(1);

        const doc = docs[0];
        expect(String(doc.sender)).toBe(String(user._id));
        expect(doc.content).toBe("This is a test announcement");
        expect(doc.status).toBe("ok");               // ensure it’s stored normalized
    });

    test("should retrieve all announcements", async () => {

        const agent = request.agent(app);

        const registerRes = await agent
            .post("/api/authentications/registrations")
            .send({ username: "testUser2", password: "testPassword" })
            .expect(201);

        expect(registerRes.headers["set-cookie"]).toBeDefined();

        const user = await UserDac.DAO.findByUsername("testUser2");

        await AnnouncementModel.insertMany([
            { sender: user._id, content: "Announcement 1", status: "ok", timestamp: new Date() },
            { sender: user._id, content: "Announcement 2", status: "ok", timestamp: new Date() },
        ]);

        const getRes = await agent
            .get("/api/announcements")
            .expect(200);

        expect(Array.isArray(getRes.body)).toBe(true);
        expect(getRes.body.length).toBeGreaterThanOrEqual(2);

        const contents = getRes.body.map(a => a.content);
        expect(contents).toEqual(expect.arrayContaining(["Announcement 1", "Announcement 2"]));

    });
});
