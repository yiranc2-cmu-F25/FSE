import { Router } from "express";
import {
  register,
  login,
  getMe,
  logout,
} from "../controllers/authController.js";
import { auth } from "../middleware/JWT.js";
import { usernameStatus } from "../controllers/authController.js";

const router = Router();

router.post("/registrations", register);
router.post("/online", login);
router.post("/reserved", usernameStatus);
router.get("/accounts", auth, getMe);
router.post("/offline", auth, logout);

export default router;
