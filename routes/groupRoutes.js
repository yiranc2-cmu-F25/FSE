import { Router } from "express";
import {
  createGroup,
  addGroupMembers,
  removeGroupMembers,
  deleteGroup,
  getGroupsList,
  getGroupDetails,
  getGroupMessages,
  sendGroupMessage,
  markGroupAsRead,
} from "../controllers/groupChatController.js";
import { auth } from "../middleware/JWT.js";

const router = Router();

/**
 * @openapi
 * /api/groups:
 *   post:
 *     tags: [Groups]
 *     summary: Create a new group
 *     description: Creates a new group chat with the authenticated user as owner and specified members (0-9 members allowed, not including owner). Group names must be unique.
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
 *             properties:
 *               groupName:
 *                 type: string
 *                 description: Name of the group (must be unique)
 *                 example: "Project Team Alpha"
 *               memberIds:
 *                 type: array
 *                 description: Array of user IDs to add as members (0-9 members, not including owner). Owner is automatically set from authenticated user.
 *                 items:
 *                   type: string
 *                 example: ["userId1", "userId2", "userId3"]
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
 *                 message: { type: string, example: "Group name is required" }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
 *       409:
 *         description: Conflict - group name already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Group name already exists" }
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
 *                 message: { type: string, example: "Only group owner can add members" }
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
 *                 message: { type: string, example: "Only group owner can remove members" }
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
 *                 message: { type: string, example: "Only group owner can delete the group" }
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
 * /api/groups/{groupId}:
 *   get:
 *     tags: [Groups]
 *     summary: Get group details
 *     description: Retrieves detailed information about a specific group including group name, total member count, owner details, and all member details
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the group to retrieve
 *         example: "67890"
 *     responses:
 *       200:
 *         description: Group details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 groupId:
 *                   type: string
 *                   example: "67890"
 *                 groupName:
 *                   type: string
 *                   example: "Project Team Alpha"
 *                 totalCount:
 *                   type: number
 *                   description: Total number of people in the group (owner + members)
 *                   example: 4
 *                 owner:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "123"
 *                     name:
 *                       type: string
 *                       example: "alice"
 *                     status:
 *                       type: string
 *                       example: "OK"
 *                 members:
 *                   type: array
 *                   description: Array of all group members (not including owner)
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "456"
 *                       name:
 *                         type: string
 *                         example: "bob"
 *                       status:
 *                         type: string
 *                         example: "HELP"
 *                 isOwner:
 *                   type: boolean
 *                   description: Whether the authenticated user is the owner of this group
 *                   example: true
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
 *       403:
 *         description: Forbidden - user is not a member of this group
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
router.get("/:groupId", auth, getGroupDetails);

/**
 * @openapi
 * /api/groups:
 *   get:
 *     tags: [Groups]
 *     summary: Get list of groups
 *     description: Retrieves a list of all groups the authenticated user is a member of (as owner or member), including group ID, name, timestamp of the last message, and all member usernames
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
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *                     description: Timestamp of the last message in the group (null if no messages)
 *                     example: "2024-10-24T15:45:00.000Z"
 *                   usernames:
 *                     type: array
 *                     description: Array of all usernames in the group (including owner and members)
 *                     items:
 *                       type: string
 *                     example: ["alice", "bob", "charlie"]
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
 *     description: Retrieves all messages from a specific group chat, sorted by timestamp. Each message includes an isOwn flag indicating if the authenticated user sent the message.
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
 *                     example: "ok"
 *                   isOwn:
 *                     type: boolean
 *                     description: Whether this message was sent by the authenticated user
 *                     example: true
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
 *     description: Posts a new message to a specific group chat. The sender is automatically set from the authenticated user.
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
 *               - status
 *             properties:
 *               messageText:
 *                 type: string
 *                 description: Content of the message
 *                 example: "Hello team!"
 *               status:
 *                 type: string
 *                 description: Sender's current status
 *                 enum: [undefined, ok, help, emergency]
 *                 example: "ok"
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
 *                 message: { type: string, example: "Message text and status are required" }
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

/**
 * @openapi
 * /api/groups/{groupId}/read:
 *   post:
 *     tags: [Groups]
 *     summary: Mark group as read
 *     description: Clears unread message status for the current user in the specified group
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the group to mark as read
 *     responses:
 *       200:
 *         description: Group marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Group marked as read" }
 *       403:
 *         description: Forbidden - user is not a member of the group
 *       404:
 *         description: Group not found
 *       500:
 *         description: Server error
 */
router.post("/:groupId/read", auth, markGroupAsRead);

export default router;
