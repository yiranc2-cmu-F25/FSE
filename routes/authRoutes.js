import { Router } from "express";
import { login, logout, getMe } from "../controllers/loginController.js";
import { auth } from "../middleware/JWT.js";
import {
  usernameStatus,
  register,
} from "../controllers/joinCommunityController.js";
import { listMembers } from "../controllers/loginController.js";

const router = Router();
/**
 * @openapi
 * /api/auth/registrations:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Creates a new user account and sets an HTTP-only `jwt_token` cookie on success.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User successfully registered
 *         headers:
 *           Set-Cookie:
 *             description: HTTP-only JWT cookie `jwt_token` (expiry per `EXPIRATION_TIME`)
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid username or password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Invalid username" }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Server error" }
 */
router.post("/registrations", register);
/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in and get a JWT
 *     description: Authenticates a user and sets an HTTP-only `jwt_token` cookie on success.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login OK
 *         headers:
 *           Set-Cookie:
 *             description: HTTP-only JWT cookie `jwt_token`
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 username: { type: string, example: "alice" }
 *                 ok: { type: boolean, example: true }
 *       401:
 *         description: Invalid password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Invalid password" }
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "User not found" }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
router.post("/login", login);
/**
 * @openapi
 * /api/auth/users/usernames:
 *   post:
 *     tags: [Auth]
 *     summary: Check username reservation/availability status
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status of the username
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     status: { type: string, enum: ["reserved"], example: "reserved" }
 *                     reason: { type: string, example: "banned_username" }
 *                     message: { type: string, example: "This username is not allowed." }
 *                 - type: object
 *                   properties:
 *                     status: { type: string, enum: ["exists"], example: "exists" }
 *                 - type: object
 *                   properties:
 *                     status: { type: string, enum: ["available"], example: "available" }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
router.post("/users/usernames", usernameStatus);
/**
 * @openapi
 * /api/auth/accounts:
 *   get:
 *     tags: [Auth]
 *     summary: Get the authenticated user's profile
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 username: { type: string }
 *                 status: { type: string, nullable: true, example: "OK" }
 *                 role: { type: string, example: "citizen" }
 *                 image: { type: string, example: "https://example.com/avatar.png" }
 *       401:
 *         description: Unauthorized (no or invalid token)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
 *       403:
 *         description: Forbidden (token verification failed)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Forbidden" }
 *                 reason: { type: string, example: "TokenExpiredError" }
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "User not found" }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
router.get("/accounts", auth, getMe);
/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out current user
 *     description: Clears the `jwt_token` cookie.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logged out
 *         headers:
 *           Set-Cookie:
 *             description: Clears `jwt_token`
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
 *       403:
 *         description: Forbidden (token verification failed)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Forbidden" }
 *                 reason: { type: string, example: "JsonWebTokenError" }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
router.post("/logout", auth, logout);
/**
 * @openapi
 * /api/auth/lists:
 *   get:
 *     tags: [Auth]
 *     summary: Get list of community members
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   username: { type: string }
 *                   status: { type: string, nullable: true }
 *                   role: { type: string }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
 *       403:
 *         description: Forbidden (token verification failed)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Forbidden" }
 *                 reason: { type: string, example: "TokenExpiredError" }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
router.get("/lists", auth, listMembers);

export default router;
