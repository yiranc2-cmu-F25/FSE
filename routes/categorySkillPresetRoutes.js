import { Router } from "express";
import { auth } from "../middleware/JWT.js";
import {
  getPresets,
  updatePresets,
  addCategory,
  deleteCategory,
  addSkill,
  deleteSkill
} from "../controllers/categorySkillPresetController.js";

const router = Router();

/**
 * @openapi
 * /api/category-skill-presets:
 *   get:
 *     tags: [Category Skill Presets]
 *     summary: Get category and skill presets
 *     description: Retrieves the list of available categories and skills
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Presets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["First Aid", "Mental Health Support", "Fire Safety"]
 *                 skills:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Adult CPR", "Child/Infant CPR", "AED Operation"]
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
router.get("/", auth, getPresets);

/**
 * @openapi
 * /api/category-skill-presets:
 *   put:
 *     tags: [Category Skill Presets]
 *     summary: Update all category and skill presets
 *     description: Updates the entire list of categories and skills
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - categories
 *               - skills
 *             properties:
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["First Aid", "Mental Health Support"]
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Adult CPR", "Child/Infant CPR"]
 *     responses:
 *       200:
 *         description: Presets updated successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.put("/", auth, updatePresets);

/**
 * @openapi
 * /api/category-skill-presets/categories:
 *   post:
 *     tags: [Category Skill Presets]
 *     summary: Add a new category
 *     description: Adds a new category to the preset list
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *             properties:
 *               category:
 *                 type: string
 *                 example: "First Aid"
 *     responses:
 *       200:
 *         description: Category added successfully
 *       400:
 *         description: Invalid request data
 *       409:
 *         description: Category already exists
 *       500:
 *         description: Server error
 */
router.post("/categories", auth, addCategory);

/**
 * @openapi
 * /api/category-skill-presets/categories:
 *   delete:
 *     tags: [Category Skill Presets]
 *     summary: Delete a category
 *     description: Removes a category from the preset list
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *             properties:
 *               category:
 *                 type: string
 *                 example: "First Aid"
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.delete("/categories", auth, deleteCategory);

/**
 * @openapi
 * /api/category-skill-presets/skills:
 *   post:
 *     tags: [Category Skill Presets]
 *     summary: Add a new skill
 *     description: Adds a new skill to the preset list
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - skill
 *             properties:
 *               skill:
 *                 type: string
 *                 example: "Adult CPR"
 *     responses:
 *       200:
 *         description: Skill added successfully
 *       400:
 *         description: Invalid request data
 *       409:
 *         description: Skill already exists
 *       500:
 *         description: Server error
 */
router.post("/skills", auth, addSkill);

/**
 * @openapi
 * /api/category-skill-presets/skills:
 *   delete:
 *     tags: [Category Skill Presets]
 *     summary: Delete a skill
 *     description: Removes a skill from the preset list
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - skill
 *             properties:
 *               skill:
 *                 type: string
 *                 example: "Adult CPR"
 *     responses:
 *       200:
 *         description: Skill deleted successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Skill not found
 *       500:
 *         description: Server error
 */
router.delete("/skills", auth, deleteSkill);

export default router;

