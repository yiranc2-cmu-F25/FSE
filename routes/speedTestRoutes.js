import { Router } from "express";
import {
  getFromSpeedTest,
  getSpeedTestStatus,
  postToSpeedTest,
  startSpeedTest,
  stopSpeedTest,
  switchTestPhase,
} from "./../controllers/speedTestController.js";
const router = Router();

router.post("/start", startSpeedTest);
router.post("/messages", postToSpeedTest);
router.get("/messages", getFromSpeedTest);
router.post("/next-phase", switchTestPhase);
router.post("/stop", stopSpeedTest);
router.get("/status", getSpeedTestStatus);

router.get("/", (req, res) => {
  res.render("speedTest/speedTestBegin");
});

router.get("/reports", (req, res) => {
  res.render("speedTest/speedTestReport");
});

export default router;
