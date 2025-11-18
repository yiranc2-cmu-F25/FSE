import { Router } from "express";
import { auth } from "../middleware/JWT.js";
import {
  checkDuplicateTitle,
  listBoards,
  getBoard,
  getMoreComments,
  getMoreReplies,
  publishBoard,
  updateBoard,
  deleteBoard,
  addComment,
  addReply,
  toggleCommentLike,
  toggleReplyLike,
  deleteComment,
  deleteReply,
  saveDraft,
  getMyDraft,
  subscribeBoard,
  unsubscribeBoard,
  getPendingNotifications,
  markNotificationSeen
} from "../controllers/coachingBoardController.js";

const router = Router();

/**
 * @openapi
 * /api/coaching-boards/duplications:
 *   get:
 *     tags: [Coaching Boards]
 *     summary: Check if a board title already exists
 *     description: Checks for duplicate board titles to prevent duplicates
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: title
 *         required: true
 *         schema:
 *           type: string
 *         description: The board title to check for duplication
 *         example: "Basic CPR for Adults"
 *       - in: query
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Category used together with title to check uniqueness
 *         example: "First Aid"
 *     responses:
 *       200:
 *         description: Duplication check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isDuplicate:
 *                   type: boolean
 *                   description: true if title already exists, false otherwise
 *                   example: false
 *       400:
 *         description: Missing or invalid title parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Title parameter is required" }
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
router.get("/duplications", auth, checkDuplicateTitle);

/**
 * Save and fetch draft endpoints
 */
router.post("/drafts", auth, saveDraft);
router.get("/drafts/me", auth, getMyDraft);
router.post("/:bid/subscriptions", auth, subscribeBoard);
router.delete("/:bid/subscriptions", auth, unsubscribeBoard);

/**
 * @openapi
 * /api/coaching-boards/notifications:
 *   get:
 *     tags: [Coaching Boards]
 *     summary: Get pending notifications for the current user
 *     description: Retrieves all pending notifications for boards the user is subscribed to
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [board_updated, new_comment, new_reply]
 *                       boardId:
 *                         type: string
 *                       boardTitle:
 *                         type: string
 *                       commentId:
 *                         type: string
 *                       replyId:
 *                         type: string
 *                       authorName:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get("/notifications", auth, getPendingNotifications);

/**
 * @openapi
 * /api/coaching-boards/{bid}/notifications/seen:
 *   post:
 *     tags: [Coaching Boards]
 *     summary: Mark notification as seen for a board
 *     description: Marks all notifications for a specific board as seen by the current user
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: bid
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *     responses:
 *       200:
 *         description: Notification marked as seen
 *       400:
 *         description: Missing board id
 *       401:
 *         description: Unauthorized
 */
router.post("/:bid/notifications/seen", auth, markNotificationSeen);

/**
 * @openapi
 * /api/coaching-boards/{bid}/comments/{cid}/replies:
 *   post:
 *     tags: [Coaching Boards]
 *     summary: Add a reply to a comment
 *     description: Adds a reply to a specific comment on a coaching board
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: bid
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *         example: "68db1cc4050ba3718fab04c3"
 *       - in: path
 *         name: cid
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *         example: "68db1cc4050ba3718fab04c4"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reply
 *               - uid
 *               - ts
 *             properties:
 *               reply:
 *                 type: string
 *                 description: The reply content
 *                 example: "Great refresher—do you cover infant CPR differences?"
 *               uid:
 *                 type: string
 *                 description: User ID of the reply author
 *                 example: "68db1cc4050ba3718fab04c5"
 *               ts:
 *                 type: integer
 *                 format: int64
 *                 description: Timestamp when the reply is created (Unix timestamp in milliseconds)
 *                 example: 1698158400000
 *     responses:
 *       201:
 *         description: Reply added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Reply added successfully" }
 *                 replyId: { type: string, example: "68db1cc4050ba3718fab04c6" }
 *       400:
 *         description: Missing required fields or validation error
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
 *       404:
 *         description: Board or comment not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Board or comment not found" }
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
router.post("/:bid/comments/:cid/replies", auth, addReply);

/**
 * @openapi
 * /api/coaching-boards/{bid}/comments/{cid}/likes:
 *   post:
 *     tags: [Coaching Boards]
 *     summary: Toggle like on a comment
 *     description: Like or unlike a comment on a coaching board
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bid
 *         required: true
 *         schema:
 *           type: string
 *         description: The board ID
 *       - in: path
 *         name: cid
 *         required: true
 *         schema:
 *           type: string
 *         description: The comment ID
 *     responses:
 *       200:
 *         description: Like toggled successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Board or comment not found
 *       500:
 *         description: Server error
 */
router.post("/:bid/comments/:cid/likes", auth, toggleCommentLike);

/**
 * @openapi
 * /api/coaching-boards/{bid}/comments/{cid}/replies/{rid}/likes:
 *   post:
 *     tags: [Coaching Boards]
 *     summary: Toggle like on a reply
 *     description: Like or unlike a reply to a comment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bid
 *         required: true
 *         schema:
 *           type: string
 *         description: The board ID
 *       - in: path
 *         name: cid
 *         required: true
 *         schema:
 *           type: string
 *         description: The comment ID
 *       - in: path
 *         name: rid
 *         required: true
 *         schema:
 *           type: string
 *         description: The reply ID
 *     responses:
 *       200:
 *         description: Like toggled successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Board, comment, or reply not found
 *       500:
 *         description: Server error
 */
router.post("/:bid/comments/:cid/replies/:rid/likes", auth, toggleReplyLike);

/**
 * @openapi
 * /api/coaching-boards/{bid}/comments/{cid}:
 *   delete:
 *     tags: [Coaching Boards]
 *     summary: Delete a comment
 *     description: Delete a comment from a coaching board. Only the author can delete their own comment.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bid
 *         required: true
 *         schema:
 *           type: string
 *         description: The board ID
 *       - in: path
 *         name: cid
 *         required: true
 *         schema:
 *           type: string
 *         description: The comment ID
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied or comment does not exist
 *       500:
 *         description: Server error
 */
router.delete("/:bid/comments/:cid", auth, deleteComment);

/**
 * @openapi
 * /api/coaching-boards/{bid}/comments/{cid}/replies/{rid}:
 *   delete:
 *     tags: [Coaching Boards]
 *     summary: Delete a reply
 *     description: Delete a reply to a comment. Only the author can delete their own reply.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bid
 *         required: true
 *         schema:
 *           type: string
 *         description: The board ID
 *       - in: path
 *         name: cid
 *         required: true
 *         schema:
 *           type: string
 *         description: The comment ID
 *       - in: path
 *         name: rid
 *         required: true
 *         schema:
 *           type: string
 *         description: The reply ID
 *     responses:
 *       200:
 *         description: Reply deleted successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied or reply does not exist
 *       500:
 *         description: Server error
 */
router.delete("/:bid/comments/:cid/replies/:rid", auth, deleteReply);

/**
 * @openapi
 * /api/coaching-boards/{bid}/comments:
 *   post:
 *     tags: [Coaching Boards]
 *     summary: Add a comment to a board
 *     description: Adds a new comment to a specific coaching board
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: bid
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *         example: "68db1cc4050ba3718fab04c3"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - comment
 *               - uid
 *               - ts
 *             properties:
 *               comment:
 *                 type: string
 *                 description: The comment content
 *                 example: "This is a very helpful board! Thank you for sharing."
 *               uid:
 *                 type: string
 *                 description: User ID of the comment author
 *                 example: "68db1cc4050ba3718fab04c4"
 *               ts:
 *                 type: integer
 *                 format: int64
 *                 description: Timestamp when the comment is created (Unix timestamp in milliseconds)
 *                 example: 1698158400000
 *     responses:
 *       201:
 *         description: Comment added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Comment added successfully" }
 *                 commentId: { type: string, example: "68db1cc4050ba3718fab04c5" }
 *       400:
 *         description: Missing required fields or validation error
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
 *       404:
 *         description: Board not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Board not found" }
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
router.post("/:bid/comments", auth, addComment);

/**
 * @openapi
 * /api/coaching-boards/{bid}:
 *   get:
 *     tags: [Coaching Boards]
 *     summary: Get a specific coaching board
 *     description: Retrieves details of a specific coaching board by its ID. Optionally filter by comment ID (cid) and/or reply ID (rid) to get specific comment or reply details.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: bid
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *         example: "68db1cc4050ba3718fab04c3"
 *       - in: query
 *         name: cid
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional comment ID to filter for a specific comment
 *         example: "68db1cc4050ba3718fab04c4"
 *       - in: query
 *         name: rid
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional reply ID to filter for a specific reply (requires cid to be specified)
 *         example: "68db1cc4050ba3718fab04c5"
 *     responses:
 *       200:
 *         description: Coaching board details. If cid is provided, returns board with only the specified comment. If both cid and rid are provided, returns board with only the specified comment and reply.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "68db1cc4050ba3718fab04c3"
 *                 title:
 *                   type: string
 *                   example: "Basic CPR for Adults"
 *                 description:
 *                   type: string
 *                   example: "Perform CPR safely and effectively during adult cardiac arrest"
 *                 objective:
 *                   type: string
 *                   example: "Maintain blood flow until professional help arrives"
 *                 steps:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Check scene safety", "Assess responsiveness", "Call emergency services", "Begin chest compressions"]
 *                 relatedSkills:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["CPR", "Emergency Communication"]
 *                 tools:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["AED", "Gloves", "Mask"]
 *                 notes:
 *                   type: string
 *                   example: "Ensure safety for rescuer and victim before starting"
 *                 comments:
 *                   type: array
 *                   items:
 *                     type: object
 *                   description: List of comments on this board (filtered by cid/rid if provided)
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
 *       404:
 *         description: Board, comment, or reply not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Board not found" }
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
router.get("/:bid", auth, getBoard);
router.get("/:bid/comments", auth, getMoreComments);
router.get("/:bid/comments/:cid/replies", auth, getMoreReplies);

/**
 * @openapi
 * /api/coaching-boards/{bid}:
 *   put:
 *     tags: [Coaching Boards]
 *     summary: Edit/update a coaching board
 *     description: Updates an existing coaching board with new information
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: bid
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *         example: "68db1cc4050ba3718fab04c3"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: The title of the coaching board
 *                 example: "Basic CPR for Adults"
 *               description:
 *                 type: string
 *                 description: Detailed description of the coaching board
 *                 example: "Perform CPR safely and effectively during adult cardiac arrest"
 *               objective:
 *                 type: string
 *                 description: The learning objective or goal
 *                 example: "Maintain blood flow until professional help arrives"
 *               steps:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of steps to complete the board
 *                 example: ["Check scene safety", "Assess responsiveness", "Call emergency services", "Begin chest compressions"]
 *               relatedSkills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Skills related to this board
 *                 example: ["CPR", "Triage Basics", "Emergency Communication"]
 *               tools:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Tools needed for this board
 *                 example: ["AED", "Gloves", "Mask"]
 *               notes:
 *                 type: string
 *                 description: Additional notes or comments
 *                 example: "Ensure safety for rescuer and victim before starting"
 *     responses:
 *       200:
 *         description: Board updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Board updated successfully" }
 *                 boardId: { type: string, example: "68db1cc4050ba3718fab04c3" }
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Invalid request data" }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
 *       403:
 *         description: Forbidden - User does not have permission to edit this board
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "You do not have permission to edit this board" }
 *       404:
 *         description: Board not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Board not found" }
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
router.put("/:bid", auth, updateBoard);

/**
 * @openapi
 * /api/coaching-boards/{bid}:
 *   delete:
 *     tags: [Coaching Boards]
 *     summary: Delete a coaching board
 *     description: Delete a published coaching board. Only the author can delete their own board.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bid
 *         required: true
 *         schema:
 *           type: string
 *         description: The board ID
 *     responses:
 *       200:
 *         description: Board deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Board deleted successfully"
 *       400:
 *         description: Missing board id
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied or board does not exist
 *       500:
 *         description: Server error
 */
router.delete("/:bid", auth, deleteBoard);

/**
 * @openapi
 * /api/coaching-boards:
 *   get:
 *     tags: [Coaching Boards]
 *     summary: Get all coaching boards
 *     description: Retrieves a list of all available coaching boards
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of coaching boards
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: "68db1cc4050ba3718fab04c3"
 *                   title:
 *                     type: string
 *                     example: "Basic CPR for Adults"
 *                   description:
 *                     type: string
 *                     example: "Perform CPR safely and effectively during adult cardiac arrest"
 *                   objective:
 *                     type: string
 *                     example: "Maintain blood flow until professional help arrives"
 *                   relatedSkills:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["CPR", "Emergency Communication"]
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
router.get("/", auth, listBoards);

/**
 * @openapi
 * /api/coaching-boards:
 *   post:
 *     tags: [Coaching Boards]
 *     summary: Publish a new coaching board
 *     description: Creates and publishes a new coaching board with all required information
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - objective
 *               - steps
 *               - relatedSkills
 *               - tools
 *               - notes
 *               - uid
 *               - ts
 *             properties:
 *               title:
 *                 type: string
 *                 description: The title of the coaching board
 *                 example: "Introduction to JavaScript"
 *               description:
 *                 type: string
 *                 description: Detailed description of the coaching board
 *                 example: "Learn the fundamentals of JavaScript programming"
 *               objective:
 *                 type: string
 *                 description: The learning objective or goal
 *                 example: "Understand basic JavaScript syntax and concepts"
 *               steps:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of steps to complete the board
 *                 example: ["Step 1: Setup environment", "Step 2: Learn variables", "Step 3: Practice exercises"]
 *               relatedSkills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Skills related to this board
 *                 example: ["JavaScript", "Programming", "Web Development"]
 *               tools:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Tools needed for this board
 *                 example: ["VS Code", "Node.js", "Browser"]
 *               notes:
 *                 type: string
 *                 description: Additional notes or comments
 *                 example: "This is a beginner-friendly board"
 *               uid:
 *                 type: string
 *                 description: User ID of the board creator
 *                 example: "68db1cc4050ba3718fab04c3"
 *               ts:
 *                 type: integer
 *                 format: int64
 *                 description: Timestamp when the board is created (Unix timestamp in milliseconds)
 *                 example: 1698158400000
 *     responses:
 *       201:
 *         description: Board published successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Board published successfully" }
 *                 boardId: { type: string, example: "68db1cc4050ba3718fab04c4" }
 *       400:
 *         description: Missing required fields or validation error
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
router.post("/", auth, publishBoard);

export default router;

