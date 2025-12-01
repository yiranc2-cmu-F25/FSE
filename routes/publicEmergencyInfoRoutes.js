import { Router } from "express";
import {
  getAllEmergencyProfiles,
  getBookmarkedEmergencyProfiles,
  bookmarkEmergencyProfile,
  unbookmarkEmergencyProfile,
  getProfilePhoto,
} from "../controllers/PublicEmergencyInfoContoller.js";
import { auth } from "../middleware/JWT.js";

const router = Router();

/**
 * @openapi
 * /api/public/emergency-profiles:
 *   get:
 *     tags: [Public Emergency Profiles]
 *     summary: Get all emergency profiles categorized by status
 *     description: Retrieves all public emergency profiles, categorized into emergency status and others (help, ok, undefined)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Emergency profiles retrieved successfully, categorized by user status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 emergency:
 *                   type: array
 *                   description: Profiles of users with emergency status
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                         example: "507f1f77bcf86cd799439011"
 *                       weight:
 *                         type: number
 *                         nullable: true
 *                         example: 70
 *                       height:
 *                         type: number
 *                         nullable: true
 *                         example: 175
 *                       bloodType:
 *                         type: string
 *                         example: "A_POSITIVE"
 *                       allergies:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["Peanuts"]
 *                       currentMedications:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["Aspirin"]
 *                       chronicConditions:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["Diabetes"]
 *                       emergencyContacts:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["+1234567890"]
 *                 others:
 *                   type: array
 *                   description: Profiles of users with non-emergency status (help, ok, undefined)
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                         example: "507f1f77bcf86cd799439012"
 *                       weight:
 *                         type: number
 *                         nullable: true
 *                         example: 65
 *                       height:
 *                         type: number
 *                         nullable: true
 *                         example: 160
 *                       bloodType:
 *                         type: string
 *                         example: "O_POSITIVE"
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
 *                 message: { type: string, example: "Error fetching emergency profiles" }
 */
router.get("/", auth, getAllEmergencyProfiles);

/**
 * @openapi
 * /api/public/emergency-profiles/bookmarks:
 *   get:
 *     tags: [Public Emergency Profiles]
 *     summary: Get bookmarked emergency profiles
 *     description: Retrieves all emergency profiles bookmarked by the authenticated user
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Bookmarked emergency profiles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: string
 *                     example: "507f1f77bcf86cd799439011"
 *                   weight:
 *                     type: number
 *                     nullable: true
 *                     example: 70
 *                   height:
 *                     type: number
 *                     nullable: true
 *                     example: 175
 *                   bloodType:
 *                     type: string
 *                     example: "A_POSITIVE"
 *                   allergies:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Peanuts"]
 *                   currentMedications:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Aspirin"]
 *                   chronicConditions:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Diabetes"]
 *                   emergencyContacts:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["+1234567890"]
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
 *                 message: { type: string, example: "Error fetching bookmarked emergency profiles" }
 */
router.get("/bookmarks", auth, getBookmarkedEmergencyProfiles);

/**
 * @openapi
 * /api/public/emergency-profiles/bookmarks:
 *   post:
 *     tags: [Public Emergency Profiles]
 *     summary: Bookmark an emergency profile
 *     description: Adds an emergency profile to the authenticated user's bookmarks. Acts as a toggle - if already bookmarked, it will be removed.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - profileId
 *             properties:
 *               profileId:
 *                 type: string
 *                 description: ID of the emergency profile to bookmark
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Emergency profile bookmarked successfully (or unbookmarked if already bookmarked)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Emergency profile bookmarked" }
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
 *                 message: { type: string, example: "Error bookmarking emergency profile" }
 */
/**
 * @openapi
 * /api/public/emergency-profiles/{profileId}/photos:
 *   get:
 *     tags: [Public Emergency Profiles]
 *     summary: Get emergency profile photo
 *     description: Retrieves the photo for a specific emergency profile
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
 *         description: Emergency profile ID
 *     responses:
 *       200:
 *         description: Photo retrieved successfully
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Profile or photo not found
 *       500:
 *         description: Server error
 */
router.get("/:profileId/photos", auth, getProfilePhoto);

router.post("/bookmarks", auth, bookmarkEmergencyProfile);

/**
 * @openapi
 * /api/public/emergency-profiles/bookmarks:
 *   delete:
 *     tags: [Public Emergency Profiles]
 *     summary: Unbookmark an emergency profile
 *     description: Removes an emergency profile from the authenticated user's bookmarks
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - profileId
 *             properties:
 *               profileId:
 *                 type: string
 *                 description: ID of the emergency profile to unbookmark
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Emergency profile unbookmarked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Emergency profile unbookmarked" }
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
 *                 message: { type: string, example: "Error unbookmarking emergency profile" }
 */
router.delete("/bookmarks", auth, unbookmarkEmergencyProfile);

export default router;
