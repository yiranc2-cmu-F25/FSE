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
            searchMode: "set",
        });
    });
}

function setupLoginRoutes() {
    router.get("/members", authView, (req, res) => {
        res.render("memberList/membersLanding", {
            username: req.username || "",
            searchMode: "all",
            searchMembers: true,
        });
    });
}

function setupUpdateStatusRoutes() {
    router.get("/status", authView, (req, res) => {
        res.render("memberProfile/profileUpdate", { username: req.username || "" });
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
            searchMode: "set",
        });
    });
}

function setupHelpCenterRoutes() {
    router.get("/help-centers", authView, (req, res) => {
        res.render("helpCenter/manageHelpCenter")
    });
    router.get("/help-centers/register", authView, (req, res) => {
        res.render("helpCenter/registerHelpCenter")
    });
    router.get("/help-centers/edit", authView, (req, res) => {
        res.render("helpCenter/editHelpCenter")
    });
    router.get("/help-centers/confirmation", authView, (req, res) => {
        res.render("helpCenter/confirmPage")
    });
    router.get("/help-centers/edit/:id", authView, async (req, res) => {
        res.render("helpCenter/editHelpCenterDetail");
    });
}

setupJoinCommunityRoutes();
setupPublicChatRoutes();
setupLoginRoutes();
setupUpdateStatusRoutes();
setupPrivateChatRoutes();
setupAnnouncementRoutes();
setupHelpCenterRoutes();

export default router;
