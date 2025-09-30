import { Router } from "express";
import { getPublicMessages, sendPublicMessage } from "../controllers/publicChatController.js";
import { auth } from "../middleware/JWT.js";

const router = Router();

router.get("/public", auth, getPublicMessages);
router.post("/public", auth, sendPublicMessage);

export default router;
