import express from "express";
import { authView } from "../middleware/JWT.js";
import { se } from "date-fns/locale";
import { setup } from "swagger-ui-express";

// Static JSON Testing Config

import helpCenterConfig from "../data/helpCenter.json" with { type: "json" };

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
    const meId = req.userId;
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
function setupMyTasksRoutes() {
  router.get("/my-tasks", authView, (req, res) => {
    res.render("helpTasks/myHelpCenter.ejs", {
      username: req.username || "",
    });
  });
}
// function setupESNTaskCenterRoutes() {
//   router.get("/esn-help-center", authView, (req, res) => {
//     res.render("helpTasks/ESNHelpCenter.ejs", {
//       username: req.username || "",
//     });
//   });
// }

function setupESNHelpCenterRoutes() {
  router.get("/esn-help-center", (req, res) => {
    const allTasks = Array.isArray(helpCenterConfig.highlightedTasks)
      ? helpCenterConfig.highlightedTasks
      : [];

    // Only tasks where joinedCount < capacity, take latest 5
    const highlightedTasks = allTasks
      .filter((t) => t.joinedCount < t.capacity)
      .slice(0, 5);

    res.render("helpTasks/ESNHelpCenter.ejs", {
      hero: helpCenterConfig.hero,
      highlightedTasks,
      username: req.username || "",
      // you can also pass req.user, users etc if needed
    });
  });
}

setupJoinCommunityRoutes();
setupPublicChatRoutes();
setupLoginRoutes();
setupUpdateStatusRoutes();
setupPrivateChatRoutes();
setupAnnouncementRoutes();
setupMyTasksRoutes();
setupESNHelpCenterRoutes();

export default router;
