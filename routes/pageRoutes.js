import express from "express";
import { authView } from "../middleware/JWT.js";

const router = express.Router();
const JOIN_PATH = "joinCommunity/";
const PUB_CHAT_PATH = "publicChat/";

router.get("/", (req, res) => {
  res.render(JOIN_PATH + "splashPage");
});

router.get("/communities", (req, res) => {
  res.render(JOIN_PATH + "joinCommunity");
});

router.get("/confirmations", (req, res) => {
  res.render(JOIN_PATH + "confirmRegistration");
});

router.get("/acknowledgements", (req, res) => {
  res.render(JOIN_PATH + "acknowledgement");
});

router.get("/profiles", authView, (req, res) => {
  res.render(JOIN_PATH + "profile");
});

router.get("/chat", authView, (req, res) => {
  res.render(PUB_CHAT_PATH + "publicChat", {
    username: req.username || "",
  });
});

export default router;
