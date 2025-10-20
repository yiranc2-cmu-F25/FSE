import User from "../entities/User.js";
import userDac from "../dacs/userDac.js";
import { inMemoryUserDao } from "../daos/inMemoryUserDao.js";

const BASE_PROPS = Object.freeze({
  username: "validuser",
  password: "validPass",
  sharedstatus: "private",
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
