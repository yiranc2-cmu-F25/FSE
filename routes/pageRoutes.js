import express from "express";
import { authView } from "../middleware/JWT.js";
import jwt from "jsonwebtoken";
import { getInitials, getAvatarColor } from "../public/js/utils/avatars.js";

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

router.get("/chat", authView, (req, res) => {
    res.render(PUB_CHAT_PATH + "publicChat", {
        username: req.username || "",
    });
});

router.get("/members", authView, (req, res) => {
    const token = req.cookies?.jwt_token;
    let currentUser = { username: "Guest", initials: "GT", avatarColor: "#999" };
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const avatarColor = getAvatarColor(payload.username);
        currentUser = {
        username: payload.username,
        initials: getInitials(payload.username),
        avatarColor,
        };
    } catch (err) {
        console.warn("JWT verify failed:", err?.message);
    }
    res.render("memberList/membersLanding", { currentUser });
});

router.get("/profiles", authView, (req, res) => {
    res.render("memberProfile/memberFunction", {
        username: req.username || "",
    });
});

router.get("/status", authView, (req, res) => {
    res.render("memberProfile/profileUpdate");
});

export default router;
