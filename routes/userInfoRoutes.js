import { Router } from "express";
import { auth } from "../middleware/JWT.js";
import User from "../entities/User.js";

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

export default router;
