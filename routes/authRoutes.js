import { Router } from "express";
import { login, logout, getMe } from "../controllers/loginController.js";
import { auth } from "../middleware/JWT.js";
import { usernameStatus, register} from "../controllers/joinCommunityController.js";
import { listMembers } from "../controllers/loginController.js";

const router = Router();

router.post("/registrations", register);
router.post("/online", login);
router.post("/reserved", usernameStatus);
router.get("/accounts", auth, getMe);
router.post("/offline", auth, logout);
router.get("/list", auth, listMembers);

export default router;
