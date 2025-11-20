import { Router } from "express";
import {
  joinVoiceCall,
  leaveVoiceCall,
  getVoiceCallStatus,
} from "../controllers/voiceCallController.js";
import { auth } from "../middleware/JWT.js";

const router = Router();

/**
 * @openapi
 * /api/calls/join:
 *   post:
 *     tags: [Voice Calls]
 *     summary: Join a group voice call room
 *     description: Notifies the server that the authenticated user wants to join a voice call room for a specific group
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *             properties:
 *               groupId:
 *                 type: string
 *                 description: ID of the group whose voice call room to join
 *                 example: "67890"
 *               userId:
 *                 type: string
 *                 description: User ID of the participant (optional, can be derived from auth)
 *                 example: "4"
 *     responses:
 *       200:
 *         description: Successfully joined the voice call room
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Successfully joined voice call"
 *                 roomId:
 *                   type: string
 *                   example: "67890"
 *                 participants:
 *                   type: array
 *                   description: List of current participants in the call
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                         example: "4"
 *                       username:
 *                         type: string
 *                         example: "alice"
 *                       joinedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-10-24T16:00:00.000Z"
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Group ID is required" }
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
router.post("/join", auth, joinVoiceCall);

/**
 * @openapi
 * /api/calls/leave:
 *   post:
 *     tags: [Voice Calls]
 *     summary: Leave a group voice call room
 *     description: Notifies the server that the authenticated user is leaving a voice call room for a specific group
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *             properties:
 *               groupId:
 *                 type: string
 *                 description: ID of the group whose voice call room to leave
 *                 example: "67890"
 *               userId:
 *                 type: string
 *                 description: User ID of the participant (optional, can be derived from auth)
 *                 example: "4"
 *     responses:
 *       200:
 *         description: Successfully left the voice call room
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Successfully left voice call"
 *                 roomId:
 *                   type: string
 *                   example: "67890"
 *                 remainingParticipants:
 *                   type: number
 *                   description: Number of participants still in the call
 *                   example: 3
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Group ID is required" }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
 *       404:
 *         description: Group or call room not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "error" }
 *                 message: { type: string, example: "Call room not found or user not in call" }
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
router.post("/leave", auth, leaveVoiceCall);

/**
 * @openapi
 * /api/calls/status/{groupId}:
 *   get:
 *     tags: [Voice Calls]
 *     summary: Get voice call status for a group
 *     description: Returns whether a voice call is active and who is in it
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the group
 *     responses:
 *       200:
 *         description: Call status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 groupId:
 *                   type: string
 *                 isActive:
 *                   type: boolean
 *                 participantCount:
 *                   type: number
 *                 participants:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get("/status/:groupId", auth, getVoiceCallStatus);

export default router;
