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

router.get("/chats", authView, (req, res) => {
    res.render(PUB_CHAT_PATH + "publicChat", { username: req.username || ""});
});

router.get("/members", authView, (req, res) => {
    res.render("memberList/membersLanding", { username: req.username || "" });
});

router.get("/profiles", authView, (req, res) => {
    res.render("memberProfile/memberFunction", { username: req.username || "" });
});

//TODO: Add parameter and state to this route, otherwise it will wrongly kick user offline 
router.get("/status", authView, (req, res) => {
    res.render("memberProfile/profileUpdate");
});

export default router;
