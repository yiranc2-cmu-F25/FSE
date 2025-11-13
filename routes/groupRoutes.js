import { Router } from "express";
import {
  createGroup,
  addGroupMembers,
  removeGroupMembers,
  deleteGroup,
  getGroupsList,
  getGroupMessages,
  sendGroupMessage,
} from "../controllers/groupChatController.js";
import { auth } from "../middleware/JWT.js";

const router = Router();

/**
 * @openapi
 * /api/groups:
 *   post:
 *     tags: [Groups]
 *     summary: Create a new group
 *     description: Creates a new group chat with specified members and their privileges
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupName
 *               - members
 *             properties:
 *               groupName:
 *                 type: string
 *                 description: Name of the group
 *                 example: "Project Team Alpha"
 *               members:
 *                 type: array
 *                 description: Array of members with their privileges
 *                 items:
 *                   type: object
 *                   required:
 *                     - userId
 *                     - privilege
 *                   properties:
 *                     userId:
 *                       type: string
 *                       description: User ID of the member
 *                       example: "4"
 *                     privilege:
 *                       type: string
 *                       description: Member privilege level (e.g., "admin", "member")
 *                       example: "admin"
 *                 example:
 *                   - userId: "4"
 *                     privilege: "admin"
 *                   - userId: "5"
 *                     privilege: "member"
 *     responses:
 *       201:
 *         description: Group created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Group created successfully"
 *                 groupId:
 *                   type: string
 *                   example: "67890"
 *       400:
 *         description: Missing required fields or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Group name and members are required" }
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
router.post("/", auth, createGroup);

/**
 * @openapi
 * /api/groups/{groupId}/members:
 *   patch:
 *     tags: [Groups]
 *     summary: Add members to a group
 *     description: Adds one or more members to an existing group chat
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the group to add members to
 *         example: "67890"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 description: Array of user IDs to add to the group
 *                 items:
 *                   type: string
 *                 example: ["6", "7", "8"]
 *     responses:
 *       200:
 *         description: Members added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Members added successfully" }
 *       400:
 *         description: Missing required fields or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "User IDs are required" }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
 *       403:
 *         description: Forbidden - insufficient privileges
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Insufficient privileges to add members" }
 *       404:
 *         description: Group not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Group not found" }
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
router.patch("/:groupId/members", auth, addGroupMembers);

/**
 * @openapi
 * /api/groups/{groupId}/members:
 *   delete:
 *     tags: [Groups]
 *     summary: Remove members from a group
 *     description: Removes one or more members from an existing group chat
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the group to remove members from
 *         example: "67890"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 description: Array of user IDs to remove from the group
 *                 items:
 *                   type: string
 *                 example: ["6", "7"]
 *     responses:
 *       200:
 *         description: Members removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Members removed successfully" }
 *       400:
 *         description: Missing required fields or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "User IDs are required" }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
 *       403:
 *         description: Forbidden - insufficient privileges
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Insufficient privileges to remove members" }
 *       404:
 *         description: Group not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Group not found" }
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
router.delete("/:groupId/members", auth, removeGroupMembers);

/**
 * @openapi
 * /api/groups/{groupId}:
 *   delete:
 *     tags: [Groups]
 *     summary: Delete a group
 *     description: Permanently deletes a group chat and all its associated data
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the group to delete
 *         example: "67890"
 *     responses:
 *       200:
 *         description: Group deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Group deleted successfully" }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
 *       403:
 *         description: Forbidden - insufficient privileges
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Only group admins can delete the group" }
 *       404:
 *         description: Group not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Group not found" }
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
router.delete("/:groupId", auth, deleteGroup);

/**
 * @openapi
 * /api/groups:
 *   get:
 *     tags: [Groups]
 *     summary: Get list of groups
 *     description: Retrieves a list of all groups the authenticated user is a member of, including group ID, name, and timestamp of the last message
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of groups retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   groupId:
 *                     type: string
 *                     example: "67890"
 *                   groupName:
 *                     type: string
 *                     example: "Project Team Alpha"
 *                   lastMessageTimestamp:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *                     description: Timestamp of the last message in the group (null if no messages)
 *                     example: "2024-10-24T15:45:00.000Z"
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
router.get("/", auth, getGroupsList);

/**
 * @openapi
 * /api/groups/{groupId}/messages:
 *   get:
 *     tags: [Groups]
 *     summary: Get all messages from a group
 *     description: Retrieves all messages from a specific group chat, sorted by timestamp
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the group to retrieve messages from
 *         example: "67890"
 *     responses:
 *       200:
 *         description: Array of group messages
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
 *                   groupId:
 *                     type: string
 *                     example: "67890"
 *                   senderId:
 *                     type: string
 *                     example: "4"
 *                   senderName:
 *                     type: string
 *                     example: "alice"
 *                   messageText:
 *                     type: string
 *                     example: "Hello team!"
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     example: "2024-10-24T15:45:00.000Z"
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
 *       403:
 *         description: Forbidden - user is not a member of the group
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "You are not a member of this group" }
 *       404:
 *         description: Group not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Group not found" }
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
router.get("/:groupId/messages", auth, getGroupMessages);

/**
 * @openapi
 * /api/groups/{groupId}/messages:
 *   post:
 *     tags: [Groups]
 *     summary: Send a message to a group
 *     description: Posts a new message to a specific group chat
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the group to send the message to
 *         example: "67890"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageText
 *               - senderId
 *               - status
 *             properties:
 *               messageText:
 *                 type: string
 *                 description: Content of the message
 *                 example: "Hello team!"
 *               senderId:
 *                 type: string
 *                 description: User ID of the sender
 *                 example: "4"
 *               status:
 *                 type: string
 *                 description: Sender's current status
 *                 example: "OK"
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Optional timestamp (defaults to current time)
 *                 example: "2024-10-24T15:45:00.000Z"
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Message sent successfully" }
 *                 messageId: { type: string, example: "12345" }
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Message text, sender ID, and status are required" }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
 *       403:
 *         description: Forbidden - user is not a member of the group
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "You are not a member of this group" }
 *       404:
 *         description: Group not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Group not found" }
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
router.post("/:groupId/messages", auth, sendGroupMessage);

export default router;
