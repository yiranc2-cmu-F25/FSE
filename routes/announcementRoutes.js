import { Router } from "express";
import { getAnnouncements, postAnnouncement} from "../controllers/announcementController.js";
import { auth } from "../middleware/JWT.js";

const router = Router();

/**
 * @openapi
 * /api/announcements:
 *   get:
 *     tags: [Announcements]
 *     summary: Get all announcements
 *     description: Retrieves all announcements posted by administrators
 *     security:
 *       - cookieAuth: []
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
router.get("/", auth, getAnnouncements);

/**
 * @openapi
 * /api/announcements:
 *   post:
 *     tags: [Announcements]
 *     summary: Post a new announcement
 *     description: Creates a new announcement (typically for administrators or coordinators)
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
 *                 description: User ID of the announcement sender
 *                 example: "1"
 *               content:
 *                 type: string
 *                 description: Announcement message content (will be trimmed)
 *                 example: "System maintenance scheduled for tonight at 11 PM"
 *               status:
 *                 type: string
 *                 description: Current status of the sender
 *                 example: "OK"
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Optional timestamp (defaults to current time)
 *                 example: "2024-10-24T10:30:00.000Z"
 *     responses:
 *       201:
 *         description: Announcement posted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Announcement posted" }
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
 *         description: Server error (e.g., socket instance not found, database error)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Socket instance not found" }
 */
router.post("/", auth, postAnnouncement);

export default router;