import { Router } from "express";
import { getAllUsers, updateUserProfile, requireAdmin } from "../controllers/administratorProfileController.js";
import { auth } from "../middleware/JWT.js";

const router = Router();

/**
 * @openapi
 * /api/admin/profiles:
 *   get:
 *     tags: [Administrator]
 *     summary: Get all users (active and inactive)
 *     description: Retrieves all users in the system, including both active and inactive accounts. Requires administrator privileges.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: User ID
 *                     example: "507f1f77bcf86cd799439011"
 *                   username:
 *                     type: string
 *                     description: Username
 *                     example: "john_doe"
 *                   status:
 *                     type: string
 *                     enum: [active, inactive]
 *                     description: Account status
 *                     example: "active"
 *                   role:
 *                     type: string
 *                     enum: [citizen, coordinator, admin]
 *                     description: User role
 *                     example: "citizen"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       403:
 *         description: Forbidden - Administrator privileges required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Forbidden: Administrator privileges required"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Server error"
 */
router.get("/", auth, requireAdmin, getAllUsers);

/**
 * @openapi
 * /api/admin/profiles/{userId}:
 *   put:
 *     tags: [Administrator]
 *     summary: Update user profile
 *     description: Updates one or more profile fields for a user. Supports updating status, role, username, and password. Requires administrator privileges.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to update
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 description: Account status
 *                 example: "active"
 *               role:
 *                 type: string
 *                 enum: [citizen, coordinator, admin]
 *                 description: User role
 *                 example: "citizen"
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 description: New username (must be unique, no dots allowed)
 *                 example: "newusername"
 *               password:
 *                 type: string
 *                 minLength: 4
 *                 description: New password
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully"
 *                 userId:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439011"
 *                 profile:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     username:
 *                       type: string
 *                       example: "newusername"
 *                     status:
 *                       type: string
 *                       example: "active"
 *                     role:
 *                       type: string
 *                       example: "citizen"
 *       400:
 *         description: Validation errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Validation errors"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Invalid status. Must be 'active' or 'inactive'", "Username already exists"]
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       403:
 *         description: Forbidden - Administrator privileges required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Forbidden: Administrator privileges required"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Server error"
 */
router.put("/:userId", auth, requireAdmin, updateUserProfile);

export default router;

