import agent from "superagent";
import axios from "axios";
import app from "../app.js";
import userDac from "../dacs/userDac.js";
import msgDac from "../dacs/msgDac.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import { inMemoryMsgDao } from "../daos/inMemoryMsgDao.js";
import http from "http";
import { Server } from "socket.io";
import Socket from "../Middleware/Socket.js";

const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const AUTH_BASE = `${BASE_URL}/api/authentications`;
const PRIVATE_MESSAGES_URL = `${BASE_URL}/api/messages/private`;
const DEFAULT_PASSWORD = "testPassword";

let appListening;

beforeAll(() => {
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: {
            origin: true,
            credentials: true,
        },
    });
    const socketInstance = new Socket(io);

    app.set("io", io);
    app.set("socketInstance", socketInstance);
    appListening = app.listen(PORT);
});

beforeEach(() => {
    userDac.DAO = new inMemoryUserDao();
    msgDac.DAO = new inMemoryMsgDao();
});

afterAll(async () => {
    if (appListening) await appListening.close();
});

const registerUser = async (username) => {
    const client = agent.agent();
    const registration = await client
        .post(`${AUTH_BASE}/registrations`)
        .set("Accept", "application/json")
        .send({ username, password: DEFAULT_PASSWORD });

    expect(registration.status).toBe(201);

    const cookieHeader = registration.headers["set-cookie"];
    const cookie = Array.isArray(cookieHeader)
        ? cookieHeader[0]?.split(";")[0]
        : cookieHeader?.split(";")[0];
    expect(cookie).toBeTruthy();

    const profile = await client
        .get(`${AUTH_BASE}/accounts`)
        .set("Accept", "application/json");

    expect(profile.status).toBe(200);
    expect(profile.body?.id).toBeTruthy();

    return {
        username,
        id: profile.body.id,
        cookie,
        client,
    };
};

const getPrivateMessages = async ({ cookie, senderId, receiverId }) => {
    const response = await axios.request({
        method: "GET",
        url: PRIVATE_MESSAGES_URL,
        data: { sender: senderId, receiver: receiverId },
        headers: {
            Cookie: cookie,
            Accept: "application/json",
        },
        validateStatus: () => true,
    });
    return response;
};

describe("Private chat controller integration", () => {
    test("GET /api/messages/private returns empty list for a new conversation", async () => {
        const sender = await registerUser("alice_private_get");
        const receiver = await registerUser("bob_private_get");

        const response = await getPrivateMessages({
            cookie: sender.cookie,
            senderId: sender.id,
            receiverId: receiver.id,
        });

        expect(response.status).toBe(200);
        expect(response.data).toEqual([]);
    });

    test("POST /api/messages/private stores a message between two users", async () => {
        const sender = await registerUser("charlie_private_post");
        const receiver = await registerUser("dana_private_post");
        const timestamp = new Date().toISOString();

        const sendResponse = await sender.client
            .post(PRIVATE_MESSAGES_URL)
            .set("Accept", "application/json")
            .send({
                sender: sender.id,
                receiver: receiver.id,
                content: "Hello Dana",
                status: "OK",
                timestamp,
            });

        expect(sendResponse.status).toBe(201);
        expect(sendResponse.body).toEqual({
            message: "Message sent successfully",
        });
    });

    test("GET /api/messages/private returns stored messages with receiver perspective", async () => {
        const sender = await registerUser("eve_private_get");
        const receiver = await registerUser("frank_private_get");
        const timestamp = new Date().toISOString();

        const sendResponse = await sender.client
            .post(PRIVATE_MESSAGES_URL)
            .set("Accept", "application/json")
            .send({
                sender: sender.id,
                receiver: receiver.id,
                content: "Checking in",
                status: "HELP",
                timestamp,
            });

        expect(sendResponse.status).toBe(201);

        const response = await getPrivateMessages({
            cookie: receiver.cookie,
            senderId: sender.id,
            receiverId: receiver.id,
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveLength(1);
        expect(response.data[0]).toMatchObject({
            content: "Checking in",
            status: "HELP",
            isOwn: false,
        });
    });
});
