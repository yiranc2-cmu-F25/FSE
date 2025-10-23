// tests/updateStatus.test.js
import agent from "superagent";
import axios from "axios";
import app from "../app.js";
import userDac from "../dacs/userDac.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import http from "http";

const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const AUTH_BASE = `${BASE_URL}/api/authentications`;

let appListening;

beforeAll(() => {
  // start the app so HTTP clients can hit it
  const server = http.createServer(app);
  appListening = app.listen(PORT);
});

beforeEach(() => {
  // isolate tests by using fresh in-memory DAO
  userDac.DAO = new inMemoryUserDao();
});

afterAll(async () => {
  if (appListening) await appListening.close();
});

const registerUser = async (username) => {
  const client = agent.agent();
  const registration = await client
    .post(`${AUTH_BASE}/registrations`)
    .set("Accept", "application/json")
    .send({ username, password: "testPassword" });

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

describe("Update status integration", () => {
  test("PATCH /api/authentications/newstatuses updates user status and broadcasts", async () => {
    const user = await registerUser(`status_user_${Date.now()}`);

    // attach a mock socketInstance used by controller
    // controller broadcasts (userId, newStatus)
    const mockSocket = {
      called: false,
      last: null,
      broadcastNewStatus(userId, status) {
        this.called = true;
        this.last = { userId, status };
      },
    };
    app.set("socketInstance", mockSocket);

    // call the status update endpoint
    const response = await axios.request({
      method: "PATCH",
      url: `${AUTH_BASE}/newstatuses`,
      data: { userId: user.id, newStatus: "OK" },
      headers: { Cookie: user.cookie, Accept: "application/json" },
      validateStatus: () => true,
    });

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ message: "User status updated" });

    // verify DAO change via GET /accounts
    const profileAfter = await user.client
      .get(`${AUTH_BASE}/accounts`)
      .set("Accept", "application/json");
    expect(profileAfter.status).toBe(200);
    expect(profileAfter.body.status).toBe("OK");

    // verify broadcast called — controller uses userId for broadcast in this codebase
    expect(mockSocket.called).toBe(true);
    expect(mockSocket.last).toEqual({ userId: user.id, status: "OK" });
  });

  test("PATCH /api/authentications/newstatuses returns 400 when missing fields", async () => {
    const user = await registerUser(`status_missing_${Date.now()}`);

    const response = await axios.request({
      method: "PATCH",
      url: `${AUTH_BASE}/newstatuses`,
      data: {}, // missing both fields intentionally
      headers: { Cookie: user.cookie, Accept: "application/json" },
      validateStatus: () => true,
    });

    expect(response.status).toBe(400);
    expect(response.data).toEqual({ error: "Missing required fields" });
  });

  test("PATCH /api/authentications/newstatuses returns 401 when unauthorized (no cookie)", async () => {
    const response = await axios.request({
      method: "PATCH",
      url: `${AUTH_BASE}/newstatuses`,
      data: { userId: 1, newStatus: "OK" },
      headers: { Accept: "application/json" }, // no Cookie header
      validateStatus: () => true,
    });

    expect(response.status).toBe(401);
    expect(response.data).toEqual({ error: "Unauthorized" });
  });
});