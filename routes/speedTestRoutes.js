import { Router } from "express";
import { auth, authView } from "../middleware/JWT.js";
import {
  getFromSpeedTest,
  getSpeedTestStatus,
  postToSpeedTest,
  startSpeedTest,
  stopSpeedTest,
  switchTestPhase,
} from "./../controllers/speedTestController.js";
import { requireAdmin } from "../controllers/administratorProfileController.js";
import { PRIVILEGE_LEVEL } from "../constants/privilegeLevel.js";
const router = Router();

/**
 * @openapi
 * /speed-test/start:
 *   post:
 *     tags: [Speed Test]
 *     summary: Start a new speed test session
 *     description: Initiates a new speed test and blocks normal messaging
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Speed test started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Speed test started" }
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/tests", auth, requireAdmin, startSpeedTest);

/**
 * @openapi
 * /speed-test/messages:
 *   post:
 *     tags: [Speed Test]
 *     summary: Post a message during speed test
 *     description: Sends a test message during an active speed test session
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Test message"
 *     responses:
 *       201:
 *         description: Test message posted successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/messages", auth, requireAdmin, postToSpeedTest);

/**
 * @openapi
 * /speed-test/messages:
 *   get:
 *     tags: [Speed Test]
 *     summary: Get speed test messages
 *     description: Retrieves messages from the current speed test session with pagination
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Messages per page
 *     responses:
 *       200:
 *         description: Test messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                 page: { type: integer }
 *                 totalPages: { type: integer }
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/messages", auth, requireAdmin, getFromSpeedTest);

/**
 * @openapi
 * /speed-test/next-phase:
 *   post:
 *     tags: [Speed Test]
 *     summary: Switch to next test phase
 *     description: Advances the speed test to the next phase
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Phase switched successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.patch("/tests", auth, requireAdmin, switchTestPhase);

/**
 * @openapi
 * /speed-test/stop:
 *   post:
 *     tags: [Speed Test]
 *     summary: Stop the current speed test
 *     description: Ends the active speed test session and re-enables normal messaging
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Speed test stopped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Speed test stopped" }
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete("/tests", auth, requireAdmin, stopSpeedTest);

/**
 * @openapi
 * /speed-test/status:
 *   get:
 *     tags: [Speed Test]
 *     summary: Get speed test status
 *     description: Returns the current status and phase of the speed test
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Speed test status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 active:
 *                   type: boolean
 *                   example: true
 *                 phase:
 *                   type: string
 *                   example: "posting"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/status", auth, requireAdmin, getSpeedTestStatus);

router.get("/", authView, (req, res) => {
  if (req.role !== PRIVILEGE_LEVEL.ADMIN) {
    return res.render("errorPages/403-forbidden");
  }
  res.render("speedTest/speedTestBegin", { username: req.username || "" });
});

router.get("/reports", authView, (req, res) => {
  if (req.role !== PRIVILEGE_LEVEL.ADMIN) {
    return res.render("errorPages/403-forbidden");
  }
  res.render("speedTest/speedTestReport", { username: req.username || "" });
});

export default router;
