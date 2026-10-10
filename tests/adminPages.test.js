import request from "superagent";
import app from "../app.js";
import UserDac from "../dacs/userDac.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";
import { USER_ROLE } from "../constants/userRole.js";
import User from "../entities/User.js";

const PORT = 3006;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PASSWORD = "pass1234";

let server;

async function createUser(username, role) {
  await new User({
    username,
    password: PASSWORD,
    sharedstatus: "undefined",
    status: "active",
    role,
  }).create();
  return User.findByUsername(username);
}

async function loginAs(username) {
  const client = request.agent();
  const res = await client
    .post(`${BASE_URL}/api/authentications/sessions`)
    .set("Accept", "application/json")
    .send({ username, password: PASSWORD })
    .ok(() => true);
  expect(res.status).toBe(200);
  return client;
}

const getPage = (client, path) =>
  client
    .get(`${BASE_URL}${path}`)
    .set("Accept", "text/html")
    .redirects(0)
    .ok(() => true);

describe("Admin user pages (/admin/users)", () => {
  beforeAll(async () => {
    UserDac.DAO = new inMemoryUserDao();
    await new Promise((resolve) => {
      server = app.listen(PORT, resolve);
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    UserDac.DAO = null;
  });

  test("redirects anonymous visitors to the splash page", async () => {
    const res = await getPage(request.agent(), "/admin/users");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");
  });

  test("returns 403 for a signed-in non-admin", async () => {
    await createUser("page_citizen", USER_ROLE.CITIZEN);
    const client = await loginAs("page_citizen");
    const res = await getPage(client, "/admin/users");
    expect(res.status).toBe(403);
  });

  test("renders the member list for an admin", async () => {
    await createUser("page_admin", USER_ROLE.ADMIN);
    const member = await createUser("page_member", USER_ROLE.COORDINATOR);
    const client = await loginAs("page_admin");
    const res = await getPage(client, "/admin/users");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toContain("page_member");
    expect(res.text).toContain(`/admin/users/${member.id}/edit`);
  });

  test("renders the edit page for an existing user without exposing the password", async () => {
    await createUser("page_admin2", USER_ROLE.ADMIN);
    const target = await createUser("page_target", USER_ROLE.CITIZEN);
    const client = await loginAs("page_admin2");
    const res = await getPage(client, `/admin/users/${target.id}/edit`);
    expect(res.status).toBe(200);
    expect(res.text).toContain("page_target");
    expect(res.text).not.toContain(PASSWORD);
  });

  test("returns 404 on the edit page for an unknown user id", async () => {
    await createUser("page_admin3", USER_ROLE.ADMIN);
    const client = await loginAs("page_admin3");
    const res = await getPage(client, "/admin/users/999999/edit");
    expect(res.status).toBe(404);
  });
});
