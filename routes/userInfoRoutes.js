import { Router } from "express";
import { auth } from "../middleware/JWT.js";
import User from "../entities/User.js";
import { updateUserSkills, getUserSkills } from "../controllers/userSkillsController.js";

const router = Router();

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user information by ID
 *     description: Retrieves public information about a specific user
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "4"
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "4"
 *                 username:
 *                   type: string
 *                   example: "alice"
 *                 status:
 *                   type: string
 *                   nullable: true
 *                   example: "OK"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "not_found" }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Server error" }
 */
router.get("/:id", auth, async (req, res, next) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error: "not_found" });
    res.json({
      id: String(u._id ?? u.id ?? u.userId),
      username: u.username,
      status: u.sharedstatus ?? "UNDEFINED",
    });
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /api/users/{id}/skills:
 *   get:
 *     tags: [Users]
 *     summary: Get user skills by ID
 *     description: Retrieves the skills list for a specific user
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "68db1cc4050ba3718fab04c3"
 *     responses:
 *       200:
 *         description: User skills retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                   example: "68db1cc4050ba3718fab04c3"
 *                 skills:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Adult CPR", "AED Operation", "Bleeding Control"]
 *       400:
 *         description: Missing user ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get("/:id/skills", auth, getUserSkills);

/**
 * @openapi
 * /api/users/skills:
 *   put:
 *     tags: [Users]
 *     summary: Update user skills
 *     description: Updates the skills list for a specific user
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - skills
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The unique identifier of the user
 *                 example: "68db1cc4050ba3718fab04c3"
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of skill names from the preset
 *                 example: ["Adult CPR", "AED Operation", "Bleeding Control", "Fire Extinguisher Use"]
 *     responses:
 *       200:
 *         description: User skills updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User skills updated successfully"
 *                 userId:
 *                   type: string
 *                   example: "68db1cc4050ba3718fab04c3"
 *                 skills:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Adult CPR", "AED Operation"]
 *       400:
 *         description: Missing required fields or invalid data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put("/skills", auth, updateUserSkills);

export default router;
