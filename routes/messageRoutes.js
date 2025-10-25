import { Router } from "express";
import {
  getPublicMessages,
  sendPublicMessage,
} from "../controllers/publicChatController.js";
import {
  getPrivateMessages,
  sendPrivateMessage,
  markPrivateMessagesAsRead,
  getUnreadMessages
} from "../controllers/privateChatController.js";
import { auth } from "../middleware/JWT.js";

const router = Router();

/**
 * @openapi
 * /api/messages/public:
 *   get:
 *     tags: [Messages]
 *     summary: List latest public messages
 *     description: Retrieves all public messages from the community wall
 *     security:
 *       - cookieAuth: []
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
router.get("/public", auth, getPublicMessages);

/**
 * @openapi
 * /api/messages/public:
 *   post:
 *     tags: [Messages]
 *     summary: Post a new public message
 *     description: Creates a new public message on the community wall
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sender
 *               - content
 *               - status
 *             properties:
 *               sender:
 *                 type: string
 *                 description: User ID of the sender
 *                 example: "4"
 *               content:
 *                 type: string
 *                 description: Message text content
 *                 example: "Hello everyone!"
 *               status:
 *                 type: string
 *                 description: Sender's current status
 *                 example: "OK"
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Optional timestamp (defaults to current time)
 *                 example: "2024-10-24T10:30:00.000Z"
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Message sent successfully" }
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Missing required fields" }
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
router.post("/public", auth, sendPublicMessage);

/**
 * @openapi
 * /api/messages/private/unread:
 *   get:
 *     tags: [Messages]
 *     summary: Get latest unread private messages
 *     description: Retrieves all unread private messages sent to the authenticated user
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of unread private messages
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
 *                     example: "4"
 *                   receiver:
 *                     type: string
 *                     example: "5"
 *                   content:
 *                     type: string
 *                     example: "Hi there!"
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     example: "2024-10-24T10:30:00.000Z"
 *                   read:
 *                     type: boolean
 *                     example: false
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
router.get("/private/unread", auth, getUnreadMessages);

/**
 * @openapi
 * /api/messages/private/{peerId}:
 *   get:
 *     tags: [Messages]
 *     summary: List private messages between two users
 *     description: Retrieves all private messages exchanged between the authenticated user and another user (peerId). Messages are merged, deduplicated, and sorted by timestamp.
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
 *                 message: { type: string, example: "Missing userId or peerId" }
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
router.get("/private/:peerId", auth, getPrivateMessages);

/**
 * @openapi
 * /api/messages/private:
 *   post:
 *     tags: [Messages]
 *     summary: Send a private message
 *     description: Creates a new private message from the authenticated user to another user
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiver
 *               - content
 *             properties:
 *               receiver:
 *                 type: string
 *                 description: User ID of the message recipient
 *                 example: "5"
 *               content:
 *                 type: string
 *                 description: Message text content
 *                 example: "Hi there!"
 *               status:
 *                 type: string
 *                 description: Sender's current status (optional)
 *                 example: "OK"
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Optional timestamp (defaults to current time)
 *                 example: "2024-10-24T10:30:00.000Z"
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Message sent successfully" }
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Receiver and content are required" }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
 *       500:
 *         description: Server error (e.g., sender or receiver not found)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Sender or receiver not found" }
 */
router.post("/private", auth, sendPrivateMessage);

/**
 * @openapi
 * /api/messages/private/read:
 *   post:
 *     tags: [Messages]
 *     summary: Mark private messages as read
 *     description: Marks all messages from a specific sender to the authenticated user as read
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - senderId
 *             properties:
 *               senderId:
 *                 type: string
 *                 description: User ID of the sender whose messages should be marked as read
 *                 example: "4"
 *     responses:
 *       200:
 *         description: Messages marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Messages marked as read" }
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Sender ID is required" }
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
router.post("/private/read", auth, markPrivateMessagesAsRead);

export default router;
