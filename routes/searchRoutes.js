import { Router } from "express";
import { auth } from "../middleware/JWT.js";
import { search } from "../controllers/searchController.js";

const router = Router();

/**
 * @openapi
 * /api/queries:
 *   get:
 *     tags: [Search]
 *     summary: Unified search endpoint (Strategy pattern)
 *     description: Use `type` to choose the search strategy.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [citizens, citizens_status, announcements, messages_public, messages_private, boards]
 *         description: Which search strategy to apply.
 *         example: "announcements"
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: cursor
 *         required: false
 *         schema: { type: string }
 *         description: Keyset cursor like "<ISO timestamp>|<id>" for time-ordered collections.
 *       - in: query
 *         name: username
 *         required: false
 *         schema: { type: string }
 *         description: (type=citizens) partial username
 *       - in: query
 *         name: status
 *         required: false
 *         schema: { type: string }
 *         description: (type=citizens_status) user status (e.g., OK, EMERGENCY)
 *       - in: query
 *         name: content
 *         required: false
 *         schema: { type: string }
 *         description: (announcements/messages_public/messages_private) search text; if only stop-words, returns empty.
 *       - in: query
 *         name: peerId
 *         required: false
 *         schema: { type: string }
 *         description: (type=messages_private) peer user id
 *     responses:
 *       200:
 *         description: Search result
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 # ---------- citizens ----------
 *                 - type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [citizens]
 *                     count:
 *                       type: integer
 *                       example: 2
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           u:
 *                             type: object
 *                             properties:
 *                               id:     { type: string, example: "68db1cc4050ba3718fab04c3" }
 *                               name:   { type: string, example: "alice" }
 *                               status: { type: string, nullable: true, example: "EMERGENCY" }
 *                           availability:
 *                             type: string
 *                             enum: [online, offline]
 *                             example: online
 *                 # ---------- citizens_status ----------
 *                 - type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [citizens_status]
 *                     count:
 *                       type: integer
 *                       example: 1
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           u:
 *                             type: object
 *                             properties:
 *                               id:     { type: string, example: "68db1cc4050ba3718fab04c3" }
 *                               name:   { type: string, example: "tester18" }
 *                               status: { type: string, nullable: true, example: "OK" }
 *                           availability:
 *                             type: string
 *                             enum: [online, offline]
 *                             example: online
 *                 # ---------- announcements ----------
 *                 - type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [announcements]
 *                     count:
 *                       type: integer
 *                       example: 37
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:        { type: string, example: "65376c9f2a1c1a0f9e7b1f23" }
 *                           sender:    { type: string, nullable: true, example: "admin" }
 *                           content:   { type: string, example: "System maintenance scheduled for tonight" }
 *                           timestamp: { type: string, format: date-time, example: "2024-10-24T10:30:00.000Z" }
 *                           status:    { type: string, example: "OK" }
 *                     nextCursor:
 *                       type: string
 *                       nullable: true
 *                       example: "2024-10-24T10:25:00.000Z|65376c9f2a1c1a0f9e7b1f24"
 *                 # ---------- messages_public ----------
 *                 - type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [messages_public]
 *                     count:
 *                       type: integer
 *                       example: 23
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:        { type: string, example: "68db1cc4050ba3718fab04c3" }
 *                           sender:    { type: string, example: "alice" }
 *                           content:   { type: string, example: "Road is blocked near the library." }
 *                           timestamp: { type: string, format: date-time, example: "2025-11-01T07:12:45.000Z" }
 *                           status:    { type: string, example: "EMERGENCY" }
 *                           isOwn:     { type: boolean, example: false }
 *                     nextCursor:
 *                       type: string
 *                       nullable: true
 *                       example: "2025-11-01T07:12:45.000Z|68db1cc4050ba3718fab04c3"
 *                 # ---------- messages_private ----------
 *                 - type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [messages_private]
 *                     mode:
 *                       type: string
 *                       enum: [messages, status_history]
 *                       example: messages
 *                     count:
 *                       type: integer
 *                       example: 10
 *                     results:
 *                       type: array
 *                       items:
 *                         oneOf:
 *                           - type: object
 *                             properties:
 *                               id:        { type: string, example: "68db1cc4050..." }
 *                               sender:    { type: string, nullable: true, example: "alice" }
 *                               content:   { type: string, example: "Meet at 5pm." }
 *                               timestamp: { type: string, format: date-time, example: "2025-11-01T07:12:45.000Z" }
 *                               status:    { type: string, nullable: true, example: "OK" }
 *                               isOwn:     { type: boolean, example: false }
 *                           - type: object
 *                             properties:
 *                               id:        { type: string, example: "68db1cc4050..." }
 *                               status:    { type: string, example: "EMERGENCY" }
 *                               changedAt: { type: string, format: date-time, example: "2025-11-01T07:12:45.000Z" }
 *                     nextCursor:
 *                       type: string
 *                       nullable: true
 *               discriminator:
 *                 propertyName: type
 *                 mapping:
 *                   citizens: "#/paths/~1api~1queries/get/responses/200/content/application~1json/schema/oneOf/0"
 *                   citizens_status: "#/paths/~1api~1queries/get/responses/200/content/application~1json/schema/oneOf/1"
 *                   announcements: "#/paths/~1api~1queries/get/responses/200/content/application~1json/schema/oneOf/2"
 *                   messages_public: "#/paths/~1api~1queries/get/responses/200/content/application~1json/schema/oneOf/3"
 *                   messages_private: "#/paths/~1api~1queries/get/responses/200/content/application~1json/schema/oneOf/4"
 *       400:
 *         description: Missing/invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", auth, search);

export default router;
