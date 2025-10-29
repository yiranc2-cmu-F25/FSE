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
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of public messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PublicMessage'
 */
router.get("/public", auth, getPublicMessages);
/**
 * @openapi
 * /api/messages/public:
 *   post:
 *     tags: [Messages]
 *     summary: Post a new public message
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PublicMessage'
 *     responses:
 *       201:
 *         description: Created
 */
router.post("/public", auth, sendPublicMessage);

// TODO: req.body || query parameter
/**
 * @openapi
 * /api/messages/private/unread:
 *   get:
 *     tags: [Messages]
 *     summary: Get latest unread private messages from all users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of private messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PrivateMessage'
 */
router.get("/private/unread", auth, getUnreadMessages);

// TODO: req.body || query parameter
/**
 * @openapi
 * /api/messages/private/:peerId:
 *   get:
 *     tags: [Messages]
 *     summary: List latest private messages between two users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of private messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PrivateMessage'
 */
router.get("/private/:peerId", auth, getPrivateMessages);

/**
 * @openapi
 * /api/messages/private:
 *   post:
 *     tags: [Messages]
 *     summary: Post a new private message to channel between 2 users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PrivateMessage'
 *     responses:
 *       201:
 *         description: Created
 */
router.post("/private", auth, sendPrivateMessage);

/**
 * @openapi
 * /api/messages/private/read:
 *   post:
 *     tags: [Messages]
 *     summary: Post all DMs as read between two users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Marked as read
 */
router.post("/private/read", auth, markPrivateMessagesAsRead);

export default router;
