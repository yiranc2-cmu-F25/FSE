import { Router } from "express";
import {
  searchCitizensByUsername,
  searchCitizensByStatus,
  searchAnnouncements,
  searchPublicMessages,
  searchPrivateMessages,
  searchStatusChange
} from "../controllers/searchInformationController.js";
import { auth } from "../middleware/JWT.js";

const router = Router();

/**
 * @openapi
 * /api/queries/citizens:
 *   get:
 *     tags: [Search]
 *     summary: Search community members by (partial) username
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: username
 *         required: true
 *         schema: { type: string }
 *         description: Username or its substring to search (case-insensitive).
 *         example: "Alice"
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: integer, minimum: 0, default: 50 }
 *       - in: query
 *         name: offset
 *         required: false
 *         schema: { type: integer, minimum: 0, default: 0 }
 *     responses:
 *       200:
 *         description: Search results (online first, alphabetical within groups)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       u:
 *                         type: object
 *                         properties:
 *                           id:     { type: string, example: "68db1cc4050ba3718fab04c3" }
 *                           name:   { type: string, example: "alice" }
 *                           status: { type: string, nullable: true, example: "EMERGENCY" }
 *                       availability:
 *                         type: string
 *                         enum: [online, offline]
 *                         example: online
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: "error" }
 *                 message: { type: string, example: "Missing criteria" }
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
 *                 error:  { type: string, example: "Forbidden" }
 *                 reason: { type: string, example: "TokenExpiredError" }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
router.get("/citizens", auth, searchCitizensByUsername);

/**
 * @openapi
 * /api/queries/citizens-by-status:
 *   get:
 *     tags: [Search]
 *     summary: Search community members by user status (online first, alphabetical within groups)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: true
 *         schema: { type: string }
 *         description: User status to match (e.g., OK / EMERGENCY)
 *         example: "OK"
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: integer, minimum: 0, default: 50 }
 *       - in: query
 *         name: offset
 *         required: false
 *         schema: { type: integer, minimum: 0, default: 0 }
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count: { type: integer, example: 1 }
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       u:
 *                         type: object
 *                         properties:
 *                           id:     { type: string, example: "68db1cc4050ba3718fab04c3" }
 *                           name:   { type: string, example: "tester18" }
 *                           status: { type: string, nullable: true, example: "EMERGENCY" }
 *                       availability:
 *                         type: string
 *                         enum: [online, offline]
 *                         example: online
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: "error" }
 *                 message: { type: string, example: "Missing criteria" }
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
 *                 error:  { type: string, example: "Forbidden" }
 *                 reason: { type: string, example: "TokenExpiredError" }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
router.get("/citizens-by-status", auth, searchCitizensByStatus);

/**
 * @openapi
 * /api/queries/announcements?content={content}:
 *   get:
 *     tags: [Search]
 *     summary: Search to get list of announcements
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: content
 *         required: true
 *         schema:
 *           type: string
 *         description: Search criteria
 *         example: "hello"
 *     responses:
 *       200:
 *         description: Array of announcements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   sender:
 *                     type: string
 *                     description: Username of the announcement sender
 *                     example: "admin"
 *                   content:
 *                     type: string
 *                     description: Announcement message content
 *                     example: "System maintenance scheduled for tonight"
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     description: Time when announcement was posted
 *                     example: "2024-10-24T10:30:00.000Z"
 *                   status:
 *                     type: string
 *                     description: Status of the sender when posting
 *                     example: "OK"
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Missing criteria" }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
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
router.get("/announcements", auth, searchAnnouncements);

/**
 * @openapi
 * /api/queries/messages/public:
 *   get:
 *     tags: [Search]
 *     summary: Search public messages by keywords (reverse chronological, cursor pagination)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: content
 *         required: true
 *         schema: { type: string }
 *         description: Search text. If it contains only stop words, no results are returned.
 *         example: "hello"
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *         description: Number of items per page (default 10).
 *       - in: query
 *         name: cursor
 *         required: false
 *         schema: { type: string }
 *         description: Cursor for the next page. Format is "<ISO timestamp>|<messageId>".
 *     responses:
 *       200:
 *         description: Search results (online latest first, reverse chronological)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: Total number of matched messages (without applying the cursor).
 *                   example: 23
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:        { type: string, example: "68db1cc4050ba3718fab04c3" }
 *                       sender:    { type: string, example: "alice" }
 *                       content:   { type: string, example: "Road is blocked near the library." }
 *                       timestamp: { type: string, format: date-time, example: "2025-11-01T07:12:45.000Z" }
 *                       status:    { type: string, example: "EMERGENCY" }
 *                       isOwn:     { type: boolean, example: false }
 *                 nextCursor:
 *                   type: string
 *                   nullable: true
 *                   description: Pass this value to the next request to fetch the next page. Null means no more data.
 *                   example: "2025-11-01T07:12:45.000Z|68db1cc4050ba3718fab04c3"
 *       400:
 *         description: Missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:   { type: string, example: "Missing query param: content" }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: "error" }
 *                 message: { type: string, example: "Server error" }
 */
router.get("/messages/public", auth, searchPublicMessages);

/**
 * @openapi
 * /api/queries/messages/private/{peerId}/{criteria}:
 *   get:
 *     tags: [Messages]
 *     summary: Search private messages between two users
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: peerId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of the other person in the conversation
 *         example: "5"
 *       - in: path
 *         name: criteria
 *         required: true
 *         schema:
 *           type: string
 *         description: Search criteria
 *         example: "Alice"
 *     responses:
 *       200:
 *         description: Conversation messages between two users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "1"
 *                       sender:
 *                         type: string
 *                         example: "alice"
 *                       content:
 *                         type: string
 *                         example: "Hi Bob!"
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-10-24T10:30:00.000Z"
 *                       status:
 *                         type: string
 *                         example: "OK"
 *                       isOwn:
 *                         type: boolean
 *                         description: True if the authenticated user sent this message
 *                         example: true
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Missing userId or peerId or criteria" }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
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
router.get("/messages/private/:peerId/:criteria", auth, searchPrivateMessages);

/**
 * @openapi
 * /api/queries/status/{peerId}/{criteria}:
 *   get:
 *     tags: [Messages]
 *     summary: Search status change of another user
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: peerId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of the other person in the conversation
 *         example: "5"
 *       - in: path
 *         name: criteria
 *         required: true
 *         schema:
 *           type: string
 *         description: Search criteria
 *         example: "Alice"
 *     responses:
 *       200:
 *         description: Array of status change
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "1"
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-10-24T10:30:00.000Z"
 *                       status:
 *                         type: string
 *                         example: "OK"
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Missing userId or peerId or criteria" }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
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
router.get("/status/:peerId/:criteria", auth, searchStatusChange);

export default router;
