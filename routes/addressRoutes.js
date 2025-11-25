import express from "express";
import { verify } from "../services/address/addressVerification.js"
import { auth } from "../middleware/JWT.js";


const router = express.Router();

/**
 * @openapi
 * /api/addresses:
 *   get:
 *     tags: [Address Verification]
 *     summary: Verify and autocomplete an address
 *     description: >
 *       Uses the Mapbox Searchbox Forward API to retrieve a list of possible
 *       matching addresses based on a partial text query.  
 *       
 *       Returns an array of result objects containing a human-readable label and
 *       geographic coordinates (longitude, latitude).  
 *       
 *       Returns **400** if the query is missing or shorter than 3 characters.
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         description: The partial address text to search for (minimum 3 characters).
 *         schema:
 *           type: string
 *           example: "Carnegie Mellon"
 *     responses:
 *       200:
 *         description: List of matched address suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   label:
 *                     type: string
 *                     description: Full formatted address from Mapbox
 *                     example: "NASA Research Park Building 23 Moffett Field, Mountain View, CA 94043, United States"
 *                   lon:
 *                     type: number
 *                     description: Longitude coordinate
 *                     example: -122.0597346
 *                   lat:
 *                     type: number
 *                     description: Latitude coordinate
 *                     example: 37.4104419
 *       400:
 *         description: Query is missing or too short
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
 *                   example: "Query too short"
 *       500:
 *         description: Mapbox API error or internal server error
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
 *                   example: "Address verification failed"
 */
router.get("/", auth, verify);

export default router;
