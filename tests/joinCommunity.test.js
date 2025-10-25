import User from "../entities/User.js";
import userDac from "../dacs/userDac.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";

const BASE_PROPS = Object.freeze({
  username: "validuser",
  password: "validPass",
  sharedstatus: "undefined",
  status: "active",
  role: "member",
});

const buildProps = (overrides) => ({ ...BASE_PROPS, ...overrides });

describe("User constructor validation", () => {
  describe("username validation", () => {
    test("accepts username with minimum valid length", () => {
      const user = new User(buildProps({ username: "abc" }));
      expect(user.username).toBe("abc");
    });

    test("accepts username containing underscores", () => {
      const user = new User(buildProps({ username: "user_name" }));
      expect(user.username).toBe("user_name");
    });

    test("accepts alphanumeric username", () => {
      const user = new User(buildProps({ username: "user123" }));
      expect(user.username).toBe("user123");
    });

    test("rejects username shorter than three characters", () => {
      expect(() => new User(buildProps({ username: "ab" }))).toThrow(
        "Invalid username",
      );
    });

    test("rejects username that is forbidden", () => {
      expect(() => new User(buildProps({ username: "admin" }))).toThrow(
        "Invalid username",
      );
    });

    test("rejects username containing periods", () => {
      expect(() => new User(buildProps({ username: "john.doe" }))).toThrow(
        "Invalid username",
      );
    });

    test("rejects non-string username values", () => {
      expect(() => new User(buildProps({ username: 1234 }))).toThrow(
        "Invalid username",
      );
    });
  });

  describe("password validation", () => {
    test("accepts password with minimum valid length", () => {
      const user = new User(buildProps({ password: "abcd" }));
      expect(user.password).toBe("abcd");
    });

    test("accepts longer password strings", () => {
      const user = new User(buildProps({ password: "strongPassword123" }));
      expect(user.password).toBe("strongPassword123");
    });

    test("rejects password shorter than four characters", () => {
      expect(() => new User(buildProps({ password: "abc" }))).toThrow(
        "Invalid password",
      );
    });

    test("rejects non-string password values", () => {
      expect(() => new User(buildProps({ password: 1234 }))).toThrow(
        "Invalid password",
      );
    });
  });
});

describe("User registration flow", () => {
  beforeEach(() => {
    // inject a fresh in-memory DAO for test isolation
    userDac.DAO = new inMemoryUserDao();
  });

  // Test async registration process
  test("successful registration creates user", async () => {
    const props = buildProps({ username: `u_${Date.now()}` });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);
    expect(found).not.toBeNull();
    expect(found.username).toBe(props.username);
  });

  // Test duplicate username handling
  test("rejects duplicate username registration", async () => {
    const props = buildProps({ username: "duplicate_test" });
    await new User(props).create();
    // second create should cause DAO to either throw or not create duplicate
    await expect(new User(props).create()).rejects.toThrow();
  });

  // Test status management
  test("new user has correct default status", async () => {
    const props = buildProps({
      username: `u2_${Date.now()}`,
      sharedstatus: undefined,
    });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);
    expect(found.status).toBe("active");
    // DAO sets default sharedstatus to string 'undefined'
    expect(found.sharedstatus).toBe("undefined");
  });

  // Test role validation
  test("invalid role is normalized by DAO on create", async () => {
    const props = buildProps({ username: `u3_${Date.now()}`, role: "invalid" });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);
    // in-memory DAO defaults role to 'citizen' when falsy/invalid
    expect(found.role).toBe("citizen");
  });
});

describe("User model function testing", () => {
  beforeEach(() => {
    // inject a fresh in-memory DAO for test isolation
    userDac.DAO = new inMemoryUserDao();
  });

  test("validatePassword returns true for correct password", async () => {
    const props = buildProps({ username: "testuser1", password: "testpass" });
    const user = new User(props);
    await user.create();
    const isValid = await User.validatePassword(
      props.username,
      props.password,
    );
    expect(isValid).toBe(true);
  });

  test("validatePassword returns false for incorrect password", async () => {
    const props = buildProps({ username: "testuser2", password: "testpass" });
    const user = new User(props);
    await user.create();
    const isValid = await User.validatePassword(
      props.username,
      "wrongpass",
    );
    expect(isValid).toBe(false);
  });

  test("getUsernameById returns correct username", async () => {
    const props = buildProps({ username: "testuser3" });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);
    const username = await User.getUsernameById(found.id);
    expect(username).toBe(props.username);
    const userObject = await User.findById(found.id);
    expect(userObject.username).toBe(props.username);
  });

  test("getUsernameById returns null for non-existent ID", async () => {
    const username = await User.getUsernameById(9999); // assuming this ID doesn't exist
    expect(username).toBeNull();
  });

  test("findById returns null for non-existent ID", async () => {
    const user = await User.findById(9999); // assuming this ID doesn't exist
    expect(user).toBeNull();
  });

  test("getAllUsers returns all active users", async () => {
    const props1 = buildProps({ username: "activeuser1" });
    const props2 = buildProps({ username: "activeuser2" });
    const user1 = new User(props1);
    const user2 = new User(props2);
    await user1.create();
    await user2.create();
    const users = await User.getAllUsers();
    const usernames = users.map((u) => u.username);
    expect(usernames).toContain(props1.username);
    expect(usernames).toContain(props2.username);
  });

  test("updateStatusById changes user status", async () => {
    const props = buildProps({ username: "statususer" });
    const user = new User(props);
    await user.create();
    const found = await User.findByUsername(props.username);
    expect(found.sharedstatus).toBe("undefined");
    await User.updateStatusById(found.id, "ok");
    const updated = await User.findByUsername(props.username);
    expect(updated.sharedstatus).toBe("ok");
  });

  test("findByUsername returns null for non-existent username", async () => {
    const user = await User.findByUsername("nonexistentuser");
    expect(user).toBeNull();
  });
});
