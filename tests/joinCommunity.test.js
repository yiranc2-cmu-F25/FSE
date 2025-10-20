import User from "../entities/User.js";

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
            expect(
                () => new User(buildProps({ username: "john.doe" })),
            ).toThrow("Invalid username");
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
            const user = new User(
                buildProps({ password: "strongPassword123" }),
            );
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
