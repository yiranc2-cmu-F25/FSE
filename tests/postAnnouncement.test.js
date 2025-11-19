import { jest } from '@jest/globals' 
import request from "supertest";
import app from "../app.js";

import { inMemoryAnnouncementDao } from "../daos/inMemoryAnnouncementDao.js";
import AnnouncementDac from "../dacs/announcementDac.js";
import Announcement from "../entities/Announcement.js";

import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import UserDac from "../dacs/userDac.js";
import { setupTestDb, cleanupTestDb } from "../config/testDbConfig.js";

describe("Announcements Test", () => {
    let mockSocket;

    beforeAll(async () => {
        // Setup in-memory MongoDB
        await setupTestDb();

        // Set up in-memory DAOs
        AnnouncementDac.DAO = new inMemoryAnnouncementDao();
        UserDac.DAO = new inMemoryUserDao();

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
        // Cleanup test database
        await cleanupTestDb();
        
        AnnouncementDac.DAO = null;
        UserDac.DAO = null;
    });

    beforeEach(async () => {
        // Reset in-memory DAOs for test isolation
        AnnouncementDac.DAO = new inMemoryAnnouncementDao();
        UserDac.DAO = new inMemoryUserDao();
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
        if (!user) {
            throw new Error("User not found");
        }
        
        const userId = user._id || user.id;
        if (!userId) {
            throw new Error("User ID not found");
        }
        
        const postAnnouncementRes = await agent
            .post("/api/announcements")
            .send({
                sender: String(userId),
                content: "This is a test announcement",
                status: "ok"
            })
            .expect(201);

        expect(postAnnouncementRes.body).toHaveProperty("message", "Announcement posted");

        // Verify announcement was created using the entity class
        const announcements = await Announcement.getAnnouncement();
        expect(announcements).toHaveLength(1);

        const announcement = announcements[0];
        expect(announcement.content).toBe("This is a test announcement");
        expect(announcement.status).toBe("ok");
        
        // Verify socket was called
        expect(mockSocket.emitMessageFrom).toHaveBeenCalled();
    });

    test("should retrieve all announcements", async () => {
        const agent = request.agent(app);

        const registerRes = await agent
            .post("/api/authentications/registrations")
            .send({ username: "testUser2", password: "testPassword" })
            .expect(201);

        expect(registerRes.headers["set-cookie"]).toBeDefined();

        const user = await UserDac.DAO.findByUsername("testUser2");
        if (!user) {
            throw new Error("User not found");
        }
        
        const userId = user._id || user.id;
        if (!userId) {
            throw new Error("User ID not found");
        }

        // Create announcements using the entity class
        const announcement1 = new Announcement({
            sender: String(userId),
            content: "Announcement 1",
            status: "ok",
            timestamp: new Date(),
        });
        await announcement1.create();

        const announcement2 = new Announcement({
            sender: String(userId),
            content: "Announcement 2",
            status: "ok",
            timestamp: new Date(),
        });
        await announcement2.create();

        const getRes = await agent
            .get("/api/announcements")
            .expect(200);

        expect(Array.isArray(getRes.body)).toBe(true);
        expect(getRes.body.length).toBeGreaterThanOrEqual(2);

        const contents = getRes.body.map(a => a.content);
        expect(contents).toEqual(expect.arrayContaining(["Announcement 1", "Announcement 2"]));
    });
});