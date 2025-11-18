import { Router } from "express";
import {
  getPersonalEmergencyProfile,
  updatePersonalEmergencyProfile,
  deletePersonalEmergencyProfile,
  updatePersonalEmergencyProfilePhoto,
} from "../controllers/EmergencyProfileController.js";
import { auth } from "../middleware/JWT.js";
import multer from "multer";

const router = Router();

/**
 * @openapi
 * /api/emergency-profiles:
 *   get:
 *     tags: [Emergency Profiles]
 *     summary: Get personal emergency profile
 *     description: Retrieves the authenticated user's personal emergency profile including face photo
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Emergency profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                   description: User ID
 *                   example: "507f1f77bcf86cd799439011"
 *                 weight:
 *                   type: number
 *                   nullable: true
 *                   description: Weight in kg
 *                   example: 70
 *                 height:
 *                   type: number
 *                   nullable: true
 *                   description: Height in cm
 *                   example: 175
 *                 bloodType:
 *                   type: string
 *                   description: Blood type
 *                   example: "A_POSITIVE"
 *                 allergies:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: List of allergies
 *                   example: ["Peanuts", "Shellfish"]
 *                 currentMedications:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: List of current medications
 *                   example: ["Aspirin", "Metformin"]
 *                 chronicConditions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: List of chronic conditions
 *                   example: ["Diabetes", "Hypertension"]
 *                 emergencyContacts:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: List of emergency contact information
 *                   example: ["+1234567890", "emergency@example.com"]
 *                 facePhoto:
 *                   type: object
 *                   nullable: true
 *                   description: Profile photo object
 *                 facePhotoId:
 *                   type: string
 *                   nullable: true
 *                   description: Profile photo ID
 *                 visibility:
 *                   type: object
 *                   description: Visibility settings for each field
 *                   properties:
 *                     weight:
 *                       type: string
 *                       example: "EMERGENCY_ONLY"
 *                     height:
 *                       type: string
 *                       example: "EMERGENCY_ONLY"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
 *       404:
 *         description: Emergency profile not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Emergency profile not found" }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Error fetching emergency profile" }
 */
router.get("/", auth, getPersonalEmergencyProfile);

/**
 * @openapi
 * /api/emergency-profiles:
 *   put:
 *     tags: [Emergency Profiles]
 *     summary: Update personal emergency profile
 *     description: Updates the authenticated user's personal emergency profile
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weight:
 *                 type: number
 *                 nullable: true
 *                 description: Weight in kg
 *                 example: 70
 *               height:
 *                 type: number
 *                 nullable: true
 *                 description: Height in cm
 *                 example: 175
 *               bloodType:
 *                 type: string
 *                 description: Blood type
 *                 example: "A_POSITIVE"
 *               allergies:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of allergies
 *                 example: ["Peanuts", "Shellfish"]
 *               currentMedications:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of current medications
 *                 example: ["Aspirin", "Metformin"]
 *               chronicConditions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of chronic conditions
 *                 example: ["Diabetes", "Hypertension"]
 *               emergencyContacts:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of emergency contact information
 *                 example: ["+1234567890", "emergency@example.com"]
 *               visibility:
 *                 type: object
 *                 description: Visibility settings for each field
 *                 properties:
 *                   weight:
 *                     type: string
 *                     example: "EMERGENCY_ONLY"
 *                   height:
 *                     type: string
 *                     example: "EMERGENCY_ONLY"
 *     responses:
 *       200:
 *         description: Emergency profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439011"
 *                 weight:
 *                   type: number
 *                   nullable: true
 *                   example: 70
 *                 height:
 *                   type: number
 *                   nullable: true
 *                   example: 175
 *                 bloodType:
 *                   type: string
 *                   example: "A_POSITIVE"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
 *       404:
 *         description: Emergency profile not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Emergency profile not found" }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Error updating emergency profile" }
 */
router.put("/", auth , updatePersonalEmergencyProfile);

/**
 * @openapi
 * /api/emergency-profiles:
 *   delete:
 *     tags: [Emergency Profiles]
 *     summary: Delete personal emergency profile
 *     description: Deletes the authenticated user's personal emergency profile
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Emergency profile deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Emergency profile deleted" }
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
 *                 message: { type: string, example: "Error deleting emergency profile" }
 */
router.delete("/", auth , deletePersonalEmergencyProfile);

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

/**
 * @openapi
 * /api/emergency-profiles/photo:
 *   post:
 *     tags: [Emergency Profiles]
 *     summary: Upload personal emergency profile photo
 *     description: Uploads a photo for the authenticated user's personal emergency profile
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [photo]
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Profile photo image file
 *               visibility:
 *                 type: string
 *                 description: Visibility setting for the photo
 *                 example: "emergencyOnly"
 *     responses:
 *       200:
 *         description: Profile photo uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Profile photo updated successfully" }
 *       400:
 *         description: Bad request (no file or invalid file)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/photo", auth, upload.single("photo"), updatePersonalEmergencyProfilePhoto);

export default router;
