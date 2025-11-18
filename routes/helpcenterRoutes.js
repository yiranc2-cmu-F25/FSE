import { Router } from "express";
import { getHelpCentersByUserId, getClosestHelpCenters, updateHelpCenter, deleteHelpCenter, registerHelpCenter } from "../controllers/helpCenterController.js";
import { auth } from "../middleware/JWT.js";

const router = Router();

/**
 * @openapi
 * /api/help-centers:
 *   get:
 *     tags: [HelpCenters]
 *     summary: Get help centers owned by the current user
 *     description: |
 *       Returns all help centers created/owned by the currently authenticated user.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of help centers belonging to the current user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Unique identifier of the help center
 *                     example: "6741f6f1c3a2b71234567890"
 *                   name:
 *                     type: string
 *                     description: Name of the help center
 *                     example: "Downtown Emergency Shelter"
 *                   type:
 *                     type: string
 *                     description: Type of help center
 *                     example: "shelter"
 *                   location:
 *                     type: string
 *                     description: Human-readable address or location description
 *                     example: "123 Main St, San Jose, CA"
 *                   description:
 *                     type: string
 *                     description: Detailed description of the help center
 *                     example: "Provides temporary shelter and basic medical support."
 *                   coordinates:
 *                     type: array
 *                     description: "[longitude, latitude] of the help center"
 *                     items:
 *                       type: number
 *                     example: [-121.8863, 37.3382]
 *                   owner:
 *                     type: string
 *                     description: ID of the user who created the help center
 *                     example: "672abc123def456789012345"
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     description: Time when the help center was created
 *                     example: "2024-10-24T10:30:00.000Z"
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *                     description: Time when the help center was last updated
 *                     example: "2024-10-25T12:15:00.000Z"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.get("/", auth, getHelpCentersByUserId);

/**
 * @openapi
 * /api/help-centers/nearby:
 *   get:
 *     tags: [HelpCenters]
 *     summary: Get nearby help centers
 *     description: |
 *       Returns help centers ordered by distance from the given coordinates.
 *       The `coordinates` query parameter must be provided as a comma-separated
 *       string in the format `longitude,latitude` (e.g., `-121.8863,37.3382`).
 *     parameters:
 *       - in: query
 *         name: coordinates
 *         required: true
 *         schema:
 *           type: string
 *           example: "-121.8863,37.3382"
 *         description: >
 *           Comma-separated coordinates in the format `longitude,latitude`.
 *           Used as the center point for the distance search.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *           example: 5
 *         description: Maximum number of help centers to return.
 *     responses:
 *       200:
 *         description: Array of nearby help centers sorted by distance
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Unique identifier of the help center
 *                     example: "6741f6f1c3a2b71234567890"
 *                   name:
 *                     type: string
 *                     description: Name of the help center
 *                     example: "Downtown Emergency Shelter"
 *                   type:
 *                     type: string
 *                     description: Type of help center
 *                     example: "shelter"
 *                   location:
 *                     type: string
 *                     description: Human-readable address or location description
 *                     example: "123 Main St, San Jose, CA"
 *                   description:
 *                     type: string
 *                     description: Detailed description of the help center
 *                     example: "Provides temporary shelter and basic medical support."
 *                   coordinates:
 *                     type: array
 *                     description: "[longitude, latitude] of the help center"
 *                     items:
 *                       type: number
 *                     example: [-121.8863, 37.3382]
 *                   owner:
 *                     type: string
 *                     description: ID of the user who created the help center
 *                     example: "672abc123def456789012345"
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     description: Time when the help center was created
 *                     example: "2024-10-24T10:30:00.000Z"
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *                     description: Time when the help center was last updated
 *                     example: "2024-10-25T12:15:00.000Z"
 *       400:
 *         description: Bad request (missing or invalid coordinates)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Invalid or missing coordinates"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.get("/nearby", auth, getClosestHelpCenters);

/**
 * @openapi
 * /api/help-centers/{id}:
 *   patch:
 *     tags: [HelpCenters]
 *     summary: Update an existing help center
 *     description: |
 *       Partially updates a help center by its ID. 
 *       Only fields provided in the request body will be updated.
 *       Requires authentication. The authenticated user must be the owner
 *       of the help center in order to update it.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the help center to update
 *         schema:
 *           type: string
 *           example: "6741f6f1c3a2b71234567890"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the help center
 *                 example: "Updated Emergency Shelter"
 *               type:
 *                 type: string
 *                 description: Type of help center
 *                 example: "shelter"
 *               location:
 *                 type: string
 *                 description: Human-readable address or area description
 *                 example: "500 University Ave, Palo Alto, CA"
 *               description:
 *                 type: string
 *                 description: Additional description
 *                 example: "Newly updated shelter with medical support."
 *               coordinates:
 *                 type: array
 *                 description: "GeoJSON coordinate array in the format [longitude, latitude]"
 *                 items:
 *                   type: number
 *                 example: [-122.1700, 37.4275]
 *     responses:
 *       200:
 *         description: Help center successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "6741f6f1c3a2b71234567890"
 *                 name:
 *                   type: string
 *                   example: "Updated Emergency Shelter"
 *                 type:
 *                   type: string
 *                   example: "shelter"
 *                 location:
 *                   type: string
 *                   example: "500 University Ave, Palo Alto, CA"
 *                 description:
 *                   type: string
 *                   example: "Newly updated shelter with medical support."
 *                 coordinates:
 *                   type: array
 *                   items:
 *                     type: number
 *                   example: [-122.1700, 37.4275]
 *                 owner:
 *                   type: string
 *                   example: "672abc123def456789012345"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-10-24T10:30:00.000Z"
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-10-25T12:15:00.000Z"
 *       404:
 *         description: Help center not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.patch("/:id", auth, updateHelpCenter);

/**
 * @openapi
 * /api/help-centers/{id}:
 *   delete:
 *     tags: [HelpCenters]
 *     summary: Delete a help center
 *     description: |
 *       Deletes a help center by its ID. Requires authentication.
 *       The authenticated user should typically be the owner of the help center
 *       (authorization check can be enforced in the controller or middleware).
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the help center to delete
 *         schema:
 *           type: string
 *           example: "6741f6f1c3a2b71234567890"
 *     responses:
 *       200:
 *         description: Help center successfully deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "6741f6f1c3a2b71234567890"
 *                 name:
 *                   type: string
 *                   example: "Downtown Emergency Shelter"
 *                 type:
 *                   type: string
 *                   example: "shelter"
 *                 location:
 *                   type: string
 *                   example: "123 Main St, San Jose, CA"
 *                 description:
 *                   type: string
 *                   example: "Provides temporary shelter and basic medical support."
 *                 coordinates:
 *                   type: array
 *                   items:
 *                     type: number
 *                   example: [-121.8863, 37.3382]
 *                 owner:
 *                   type: string
 *                   example: "672abc123def456789012345"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-10-24T10:30:00.000Z"
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-10-25T12:15:00.000Z"
 *       404:
 *         description: Help center not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Help center not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.delete("/:id", auth, deleteHelpCenter);

/**
 * @openapi
 * /api/help-centers:
 *   post:
 *     tags: [HelpCenters]
 *     summary: Register a new help center
 *     description: |
 *       Creates a new help center. Requires authentication.
 *       The request body must include basic information about the help center
 *       such as name, type, location, and coordinates.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - location
 *               - coordinates
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the help center
 *                 example: "Downtown Emergency Shelter"
 *               type:
 *                 type: string
 *                 description: Type of help center
 *                 example: "shelter"
 *               location:
 *                 type: string
 *                 description: Human-readable address or location description
 *                 example: "123 Main St, San Jose, CA"
 *               description:
 *                 type: string
 *                 description: Additional description of the help center
 *                 example: "Provides temporary shelter and basic medical support."
 *               coordinates:
 *                 type: array
 *                 description: "GeoJSON coordinate array in the format [longitude, latitude]"
 *                 items:
 *                   type: number
 *                 example: [-121.8863, 37.3382]
 *     responses:
 *       201:
 *         description: Help center successfully created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Help center created"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.post("/", auth, registerHelpCenter);

export default router;
