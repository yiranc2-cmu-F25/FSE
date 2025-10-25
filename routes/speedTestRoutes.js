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
const router = Router();

router.post("/start", auth, startSpeedTest);
router.post("/messages", auth, postToSpeedTest);
router.get("/messages", auth, getFromSpeedTest);
router.post("/next-phase", auth, switchTestPhase);
router.post("/stop", auth, stopSpeedTest);
router.get("/status", auth, getSpeedTestStatus);

router.get("/", authView, (req, res) => {
  res.render("speedTest/speedTestBegin", { username: req.username || "" });
});

router.get("/reports", authView, (req, res) => {
  res.render("speedTest/speedTestReport", { username: req.username || "" });
});

export default router;
