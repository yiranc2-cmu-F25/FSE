import { Router } from "express";
import { register, login, getMe, logout } from "../controllers/authController.js";
import { auth } from "../middleware/jwt.js";
import { usernameStatus } from "../controllers/authController.js";

const router = Router();

router.post("/registrations",  register);
router.post("/login", login);
router.post("/username-status", usernameStatus);
router.get("/accounts", auth, getMe);
router.post("/logout", auth, logout);


export default router;