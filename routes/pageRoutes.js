import express from "express";
import { authView } from "../middleware/JWT.js";
import { se } from "date-fns/locale";

const router = express.Router();
const JOIN_PATH = "joinCommunity/";
const PUB_CHAT_PATH = "publicChat/";

function setupJoinCommunityRoutes() {
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
}

function setupPublicChatRoutes() {
    router.get("/chats", authView, (req, res) => {
        res.render(PUB_CHAT_PATH + "publicChat", {
            username: req.username || "",
            currentUserId: req.userId,
            searchMode: "set",
        });
    });
}

function setupLoginRoutes() {
    router.get("/members", authView, (req, res) => {
        res.render("memberList/membersLanding", {
            username: req.username || "",
            currentUserId: req.userId,
            searchMode: "all",
            searchMembers: true,
        });
    });
}

function setupUpdateStatusRoutes() {
    router.get("/status", authView, (req, res) => {
        res.render("memberProfile/profileUpdate", { 
            username: req.username || "",
            currentUserId: req.userId
        });
    });
}

function setupUpdateSkillsRoutes() {
    router.get("/skills", authView, (req, res) => {
        res.render("memberProfile/skillsUpdate", { 
            username: req.username || "",
            currentUserId: req.userId
        });
    });
}

function setupPrivateChatRoutes() {
    router.get("/chats/private/:peerId", authView, (req, res) => {
        const meId   = req.userId;
        //console.log("MeId is: ",meId);
        const peerId = String(req.params.peerId);

        if (meId === peerId) return res.redirect("/members");

        return res.render("privateChat/privateChat", {
            username: req.username,
            currentUserId: meId,
            peerId,
            searchMode: "set",
        });
    });
}

function setupAnnouncementRoutes() {
    router.get("/postPublicAnnouncements", authView, (req, res) => {
        res.render("announcement/publicAnnouncement", {
            username: req.username || "",
            currentUserId: req.userId,
            searchMode: "set",
        });
    });
}

function setupCoachingBoardPages() {
    router.get("/boards", authView, (req, res) => {
        res.render("coachingBoards/list", {
            username: req.username || "",
            searchMode: "set",
            currentUserId: req.userId,
        });
    });
    router.get("/boards/new", authView, (req, res) => {
        res.render("coachingBoards/form", {
            username: req.username || "",
        });
    });
    router.get("/boards/:bid", authView, (req, res) => {
        res.render("coachingBoards/detail", {
            username: req.username || "",
            boardId: req.params.bid,
            currentUserId: req.userId,
        });
    });
    router.get("/boards/:bid/edit", authView, (req, res) => {
        res.render("coachingBoards/form", {
            username: req.username || "",
            boardId: req.params.bid,
            currentUserId: req.userId,
        });
    });
}

setupJoinCommunityRoutes();
setupPublicChatRoutes();
setupLoginRoutes();
setupUpdateStatusRoutes();
setupUpdateSkillsRoutes();
setupPrivateChatRoutes();
setupAnnouncementRoutes();
setupCoachingBoardPages();

export default router;
