import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.render("splashPage");
});

router.get("/join", (req, res) => {
  res.render("joinCommunity");
});

router.get("/confirm", (req, res) => {
  res.render("confirmRegistration");
});

router.get("/acknowledgement", (req, res) => {
  res.render("acknowledgement");
});

router.get("/profile", (req, res) => {
  res.render("profile");
});

export default router;
