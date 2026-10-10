import express from "express";
import { authView, optionalAuth } from "../middleware/JWT.js";
import User from "../entities/User.js";
import Task from "../entities/Task.js";
import { toPlainObject } from "../utils/toPlainObject.js";
import helpCenterConfig from "../data/helpCenter.json" with { type: "json" };
import myHelpCenterConfig from "../data/myHelpCenter.json" with { type: "json" };

const router = express.Router();
const JOIN_PATH = "joinCommunity/";
const PUB_CHAT_PATH = "publicChat/";
const DEFAULT_PRIVILEGE = "citizen";
const NOT_FOUND_VIEW = "errorPages/404-pageNotFound";

const MY_TASKS_META = Object.freeze({
  title: "Tasks",
  searchPlaceholder: "Search tasks",
  filterLabel: "Filter by",
});

/**
 * Re-reads the current user from the database so pages show the up-to-date
 * username and role (an admin can change both while the JWT is still valid).
 * Falls back to the JWT values when there is no user or the lookup fails.
 */
async function resolveCurrentUser(req) {
  const fallback = {
    username: req.username || "",
    role: req.role || DEFAULT_PRIVILEGE,
  };
  if (!req.userId) return fallback;
  try {
    const user = toPlainObject(await User.findById(req.userId));
    return {
      username: user?.username || fallback.username,
      role: user?.role || fallback.role,
    };
  } catch (err) {
    console.error("Error fetching current user for page render:", err);
    return fallback;
  }
}

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

function setupMemberListRoutes() {
  router.get("/members", authView, async (req, res) => {
    const me = await resolveCurrentUser(req);
    res.render("memberList/membersLanding", {
      username: me.username,
      currentUserId: req.userId,
      searchMode: "all",
      searchMembers: true,
      privilege: me.role,
    });
  });
}

function setupUpdateStatusRoutes() {
  router.get("/status", authView, (req, res) => {
    res.render("memberProfile/profileUpdate", {
      username: req.username || "",
      currentUserId: req.userId,
    });
  });
}

function setupUpdateSkillsRoutes() {
  router.get("/skills", authView, (req, res) => {
    res.render("memberProfile/skillsUpdate", {
      username: req.username || "",
      currentUserId: req.userId,
    });
  });
}

function setupPrivateChatRoutes() {
  router.get("/chats/private/:peerId", authView, (req, res) => {
    const meId = req.userId;
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
      privilege: req.role,
    });
  });
}

function setupHelpCenterRoutes() {
  const pages = [
    ["/help-centers/manage", "helpCenter/manageHelpCenter"],
    ["/help-centers/manage/register", "helpCenter/registerHelpCenter"],
    ["/help-centers/manage/edit", "helpCenter/editHelpCenter"],
    ["/help-centers/manage/edit/:id", "helpCenter/editHelpCenterDetail"],
    ["/help-centers/confirm", "helpCenter/confirmPage"],
    ["/help-centers/view", "helpCenter/viewHelpCenter"],
    ["/help-centers/view/:id", "helpCenter/viewHelpCenterDetail"],
    ["/help-centers/map", "helpCenter/viewHelpCenterMap"],
  ];
  for (const [path, view] of pages) {
    router.get(path, authView, (req, res) => res.render(view));
  }
}

/** Highlighted tasks: the first five that still have room for participants. */
function pickHighlightedTasks(config) {
  const allTasks = Array.isArray(config.highlightedTasks)
    ? config.highlightedTasks
    : [];
  const highlightedTasks = allTasks
    .filter((t) => t.joinedCount < t.capacity)
    .slice(0, 5);
  return { allTasks, highlightedTasks };
}

async function countJoinedTasks(userId) {
  if (!userId) return 0;
  try {
    return await Task.countTasksByParticipant(userId, {});
  } catch (error) {
    console.error("Error fetching participant count:", error);
    return 0;
  }
}

function heroWithJoinedCount(hero, activeCount) {
  return {
    ...hero,
    navButtons: {
      ...hero.navButtons,
      joinedTasks: { ...hero.navButtons.joinedTasks, activeCount },
    },
  };
}

function setupESNHelpCenterRoutes() {
  router.get("/esn-help-center", optionalAuth, async (req, res) => {
    try {
      const currentUserId = req.userId || req.user?.id || null;
      const me = await resolveCurrentUser(req);
      const { allTasks, highlightedTasks } =
        pickHighlightedTasks(helpCenterConfig);
      const participantCount = await countJoinedTasks(currentUserId);

      res.render("helpTasks/ESNHelpCenter.ejs", {
        hero: heroWithJoinedCount(helpCenterConfig.hero, participantCount),
        highlightedTasks,
        username: me.username,
        tasks: allTasks,
        taskListMeta: helpCenterConfig.taskListMeta || {},
        currentUserId,
        // Task detail modal is populated from the API when a card is clicked.
        task: null,
        viewer: null,
        privilege: me.role,
      });
    } catch (err) {
      console.error("Error in ESN Help Center route:", err);
      res.status(500).render(NOT_FOUND_VIEW);
    }
  });
}

function setupMyHelpCenterRoutes() {
  router.get("/my-tasks", authView, async (req, res) => {
    const me = await resolveCurrentUser(req);
    res.render("helpTasks/myHelpCenter.ejs", {
      hero: myHelpCenterConfig.hero,
      taskListMeta: MY_TASKS_META,
      tasks: [], // fetched from the API on the client
      username: me.username,
      currentUserId: req.userId || req.user?.id || null,
      task: null,
      viewer: null,
      privilege: me.role,
    });
  });
}

function setupCreateTaskRoutes() {
  router.get("/task-creation", authView, (req, res) => {
    res.render("helpTasks/createTask.ejs", {
      username: req.username || "",
    });
  });
}

function isTaskOwner(task, userId) {
  const creatorId = task.creator?.id || task.creator?._id || task.creator;
  return Boolean(userId) && String(creatorId) === String(userId);
}

function setupEditTaskRoutes() {
  router.get("/task-edit/:id", authView, async (req, res) => {
    try {
      const taskId = req.params.id;
      if (!taskId) return res.status(400).send("Task ID is required");

      const currentUserId = req.userId || req.user?.id;
      const task = await Task.getTask(taskId, currentUserId);
      if (!task) return res.status(404).send("Task not found");

      if (!isTaskOwner(task, currentUserId)) {
        return res
          .status(403)
          .send("Unauthorized: Only the task owner can edit this task");
      }

      res.render("helpTasks/editTask.ejs", {
        username: req.username || "",
        task: { ...task, id: task.id || task._id?.toString() || taskId },
      });
    } catch (error) {
      console.error("Error loading edit task page:", error);
      res.status(500).send("Server error");
    }
  });
}

function setupCoachingBoardPages() {
  router.get("/boards", authView, async (req, res) => {
    const me = await resolveCurrentUser(req);
    res.render("coachingBoards/list", {
      username: me.username,
      searchMode: "set",
      currentUserId: req.userId,
      privilege: me.role,
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

function setupGroupRoutes() {
  router.get("/groups", authView, (req, res) => {
    res.render("helpGroup/groupsList", {
      username: req.username || "",
    });
  });

  router.get("/groupchats/:groupId", authView, (req, res) => {
    res.render("helpGroup/groupChat", {
      username: req.username || "",
      currentUserId: req.userId,
      groupId: String(req.params.groupId),
    });
  });
}

function setupEmergencyProfileRoutes() {
  router.get("/emergency-profile", authView, (req, res) => {
    res.render("emergencyProfile/publicEmergencyInfo", {
      username: req.username || "",
      searchMode: "set",
    });
  });

  router.get("/personal-emergency-profile", authView, (req, res) => {
    res.render("emergencyProfile/personalEmergencyProfile", {
      username: req.username || "",
      searchMode: "set",
    });
  });
}

setupJoinCommunityRoutes();
setupPublicChatRoutes();
setupMemberListRoutes();
setupUpdateStatusRoutes();
setupUpdateSkillsRoutes();
setupPrivateChatRoutes();
setupAnnouncementRoutes();
setupHelpCenterRoutes();
setupESNHelpCenterRoutes();
setupMyHelpCenterRoutes();
setupCreateTaskRoutes();
setupEditTaskRoutes();
setupCoachingBoardPages();
setupGroupRoutes();
setupEmergencyProfileRoutes();

export default router;
