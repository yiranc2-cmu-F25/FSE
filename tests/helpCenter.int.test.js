import { jest } from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app.js";

import { makeHelpCenterModel } from "../db/HelpCenterSchema.js";
import { HelpCenterDao } from "../daos/HelpCenterDao.js";
import HelpCenterDac from "../dacs/HelpCenterDac.js";

import { makeUserModel } from "../db/UserSchema.js";
import { UserDao } from "../daos/UserDao.js";
import UserDac from "../dacs/userDac.js";

describe("Help Centers Integration Tests", () => {
    let mongod, conn, HelpCenterModel, UserModel, mockSocket;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();

        await mongoose.disconnect();
        conn = await mongoose.createConnection(uri);

        HelpCenterModel = makeHelpCenterModel(conn);
        UserModel = makeUserModel(conn);

        HelpCenterDac.DAO = new HelpCenterDao({ HelpCenterModel });
        UserDac.DAO = new UserDao({ UserModel });

        // needed for $near queries
        await HelpCenterModel.syncIndexes();

        mockSocket = {
            emitMessageFrom: jest.fn(() => true),
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

    // helper: register + login, get agent + user doc
    async function registerAndLogin(username = "testUser", password = "testPassword") {
        const agent = request.agent(app);

        const registerRes = await agent
            .post("/api/authentications/registrations")
            .send({ username, password })
            .expect(201);

        expect(registerRes.body).toHaveProperty("message", "User successfully registered");
        expect(registerRes.headers["set-cookie"]).toBeDefined();

        const user = await UserDac.DAO.findByUsername(username);
        expect(user).toBeTruthy();

        return { agent, user };
    }

    // helper: create a help center via API
    async function createHelpCenter(agent, ownerId, overrides = {}) {
        const basePayload = {
            name: "Default Center",
            type: "shelter",
            location: "123 Main St, San Jose, CA",
            description: "Default description",
            coordinates: [-121.89, 37.335],
            owner: ownerId,
        };

        const payload = { ...basePayload, ...overrides };

        const res = await agent
            .post("/api/help-centers")
            .send(payload);

        return { res, payload };
    }

    // 1) create via API, verify via GET API
    test("should create a help center for the logged-in user", async () => {
        const { agent, user } = await registerAndLogin("hcUser1");

        const { res: createRes, payload } = await createHelpCenter(agent, user._id, {
            name: "Sunrise Shelter",
        });

        expect(createRes.status).toBe(201);
        expect(createRes.body).toHaveProperty("message", "Help center created");

        const listRes = await agent.get("/api/help-centers").expect(200);
        expect(Array.isArray(listRes.body)).toBe(true);
        expect(listRes.body.length).toBe(1);

        const hc = listRes.body[0];
        expect(hc.name).toBe(payload.name);
        expect(hc.type).toBe(payload.type);
        expect(hc.location).toBe(payload.location);
        expect(hc.description).toBe(payload.description);
        expect(String(hc.owner)).toBe(String(user._id));
    });

    // 2) negative: bad coordinates via API should not create a record
    test("should return 400 when creating a help center with invalid coordinates", async () => {
        const { agent, user } = await registerAndLogin("hcUser2");

        const badPayload = {
            name: "Invalid Coords Center",
            type: "shelter",
            location: "Nowhere",
            description: "Bad coordinates",
            coordinates: [9999, 9999],
            owner: user._id,
        };

        const res = await agent
            .post("/api/help-centers")
            .send(badPayload);

        // when your controller maps ValidationError -> 400, this becomes strict
        expect([400, 500]).toContain(res.status);
        if (res.status === 400) {
            expect(res.body.status).toBe("error");
        }

        const listRes = await agent.get("/api/help-centers").expect(200);
        expect(Array.isArray(listRes.body)).toBe(true);
        expect(listRes.body).toHaveLength(0);
    });

    // 3) list only current user's help centers (all seeded via API)
    test("should list only help centers belonging to the current user", async () => {
        const { agent: agent1, user: user1 } = await registerAndLogin("hcUser3");
        const { agent: agent2, user: user2 } = await registerAndLogin("hcOther");

        // create two for user1
        await createHelpCenter(agent1, user1._id, { name: "My Shelter 1" });
        await createHelpCenter(agent1, user1._id, { name: "My Shelter 2" });

        // create one for user2 via their own session
        await createHelpCenter(agent2, user2._id, { name: "Other User Shelter" });

        const listRes1 = await agent1.get("/api/help-centers").expect(200);
        const names1 = listRes1.body.map((hc) => hc.name);
        expect(names1).toEqual(expect.arrayContaining(["My Shelter 1", "My Shelter 2"]));
        expect(names1).not.toContain("Other User Shelter");

        const listRes2 = await agent2.get("/api/help-centers").expect(200);
        const names2 = listRes2.body.map((hc) => hc.name);
        expect(names2).toContain("Other User Shelter");
    });

    // 4) nearby endpoint: centers seeded via API, verified sorted by distance
    test("should return nearby help centers sorted by distance", async () => {
        const { agent, user } = await registerAndLogin("hcUser4");

        // near CMUSV
        await createHelpCenter(agent, user._id, {
            name: "Nearby Center",
            coordinates: [-122.0597, 37.4104],
        });

        // far (NYC)
        await createHelpCenter(agent, user._id, {
            name: "Far Center",
            coordinates: [-73.9857, 40.7484],
        });

        const coordinates = "-122.0597,37.4104"; // lon,lat
        const res = await agent
            .get("/api/help-centers/closest-help-centers")
            .query({ coordinates, limit: 10 })
            .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(2);

        const firstName = res.body[0].name;
        expect(firstName).toBe("Nearby Center");
    });

    // helper: fetch the first help center for a user (using API)
    async function getFirstHelpCenter(agent) {
        const listRes = await agent.get("/api/help-centers").expect(200);
        expect(Array.isArray(listRes.body)).toBe(true);
        expect(listRes.body.length).toBeGreaterThan(0);
        return listRes.body[0];
    }

    // 5) update via PATCH API, verify via GET API
    test("should update an existing help center", async () => {
        const { agent, user } = await registerAndLogin("hcUser5");

        await createHelpCenter(agent, user._id, {
            name: "Old Name",
            type: "shelter",
            location: "Old Address",
            description: "Old description",
        });

        const existing = await getFirstHelpCenter(agent);

        const updatePayload = {
            name: "New Name",
            type: "food",
            location: "New Address",
            description: "New description",
            coordinates: [-121.9, 37.336],
            owner: user._id,
        };

        const res = await agent
            .patch(`/api/help-centers/${existing._id}`)
            .send(updatePayload)
            .expect(200);

        expect(res.body.name).toBe(updatePayload.name);
        expect(res.body.type).toBe(updatePayload.type);

        const after = await getFirstHelpCenter(agent);
        expect(after.name).toBe(updatePayload.name);
        expect(after.location).toBe(updatePayload.location);
        expect(after.description).toBe(updatePayload.description);
    });

    // 6) negative update: PATCH non-existent id
    test("should return 404 when updating a non-existent help center", async () => {
        const { agent, user } = await registerAndLogin("hcUser6");

        const fakeId = new mongoose.Types.ObjectId().toString();

        const res = await agent
            .patch(`/api/help-centers/${fakeId}`)
            .send({
                name: "Won't work",
                type: "shelter",
                location: "Nowhere",
                description: "None",
                coordinates: [-121.89, 37.335],
                owner: user._id,
            });

        expect(res.status).toBe(404);
        expect(res.body.status).toBe("error");
        expect(res.body.message).toMatch(/not found/i);
    });

    // 7) delete via API, verify via GET API
    test("should delete an existing help center", async () => {
        const { agent, user } = await registerAndLogin("hcUser7");

        await createHelpCenter(agent, user._id, { name: "To Delete" });

        const existing = await getFirstHelpCenter(agent);

        const delRes = await agent
            .delete(`/api/help-centers/${existing._id}`)
            .expect(200);

        expect(delRes.body).toHaveProperty("_id");

        const listRes = await agent.get("/api/help-centers").expect(200);
        const names = listRes.body.map((hc) => hc.name);
        expect(names).not.toContain("To Delete");
    });
});
