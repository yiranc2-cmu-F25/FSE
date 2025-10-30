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
 * /api/queries/citizens/{criteria}:
 *   get:
 *     tags: [Auth]
 *     summary: Search to get list of community members by username
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: criteria
 *         required: true
 *         schema:
 *           type: string
 *         description: Search criteria
 *         example: "Alice"
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
router.get("/citizens/:criteria", auth, searchCitizensByUsername);

/**
 * @openapi
 * /api/queries/citizens-by-status/{criteria}:
 *   get:
 *     tags: [Auth]
 *     summary: Search to get list of community members by status
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: criteria
 *         required: true
 *         schema:
 *           type: string
 *         description: Search criteria
 *         example: "Alice"
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
router.get("/citizens-by-status/:criteria", auth, searchCitizensByStatus);

/**
 * @openapi
 * /api/queries/announcements/{criteria}:
 *   get:
 *     tags: [Announcements]
 *     summary: Search to get list of announcements
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: criteria
 *         required: true
 *         schema:
 *           type: string
 *         description: Search criteria
 *         example: "Alice"
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
router.get("/announcements/:criteria", auth, searchAnnouncements);

/**
 * @openapi
 * /api/queries/messages/public/{criteria}:
 *   get:
 *     tags: [Messages]
 *     summary: Search from public messages
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: criteria
 *         required: true
 *         schema:
 *           type: string
 *         description: Search criteria
 *         example: "Alice"
 *     responses:
 *       200:
 *         description: Array of public messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: "1"
 *                   sender:
 *                     type: string
 *                     example: "alice"
 *                   content:
 *                     type: string
 *                     example: "Hello everyone!"
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     example: "2024-10-24T10:30:00.000Z"
 *                   status:
 *                     type: string
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
router.get("/messages/public/:criteria", auth, searchPublicMessages);

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
