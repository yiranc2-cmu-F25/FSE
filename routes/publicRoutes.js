import { Router } from "express";
import { getPublicMessages, sendPublicMessage } from "../controllers/publicChatController.js";
import { auth } from "../middleware/JWT.js";

const router = Router();

router.get("/", auth, getPublicMessages);
router.post("/", auth, sendPublicMessage);

export default router;
