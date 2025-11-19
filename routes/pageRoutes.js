import express from "express";
import { authView, optionalAuth } from "../middleware/JWT.js";
import { se } from "date-fns/locale";
import { setup } from "swagger-ui-express";

// Static JSON Testing Config

import helpCenterConfig from "../data/helpCenter.json" with { type: "json" };

import myHelpCenterConfig from "../data/myHelpCenter.json" with { type: "json" };
import detailMock from "../data/taskDetailMock.json" with { type: "json" };
import { set } from "mongoose";

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

function setupESNHelpCenterRoutes() {
  console.log("Setting up ESN Help Center Routes...");
  router.get("/esn-help-center", optionalAuth, async (req, res) => {
    const allTasks = Array.isArray(helpCenterConfig.highlightedTasks)
      ? helpCenterConfig.highlightedTasks
      : [];

    // Only tasks where joinedCount < capacity, take latest 5
    const highlightedTasks = allTasks
      .filter((t) => t.joinedCount < t.capacity)
      .slice(0, 5);
    const taskListMeta = helpCenterConfig.taskListMeta || {};
    
    // Get current user ID if authenticated
    const currentUserId = req.userId || req.user?.id || null;
    
    // Get participant count for the badge (only if user is authenticated)
    let participantCount = 0;
    if (currentUserId) {
      try {
        const Task = (await import("../entities/Task.js")).default;
        participantCount = await Task.countTasksByParticipant(currentUserId, {});
      } catch (error) {
        console.error("Error fetching participant count:", error);
        // Use default value 0 on error
      }
    }
    
    // Update hero config with participant count
    const heroWithCount = {
      ...helpCenterConfig.hero,
      navButtons: {
        ...helpCenterConfig.hero.navButtons,
        joinedTasks: {
          ...helpCenterConfig.hero.navButtons.joinedTasks,
          activeCount: participantCount,
        },
      },
    };
    
    res.render("helpTasks/ESNHelpCenter.ejs", {
      hero: heroWithCount,
      highlightedTasks,
      username: req.username || "",
      tasks: allTasks,
      taskListMeta,
      currentUserId: currentUserId,
      // Task detail modal will be populated from API when clicked
      task: null,
      viewer: null,
    });
  });
}

function setupMyHelpCenterRoutes() {
  router.get("/my-tasks", authView, (req, res) => {
    // Get current user ID if authenticated
    const currentUserId = req.userId || req.user?.id || null;
    
    // Use same taskListMeta structure as ESN Help Center
    const taskListMeta = {
      title: "Tasks",
      searchPlaceholder: "Search tasks",
      filterLabel: "Filter by",
    };
    
    res.render("helpTasks/myHelpCenter.ejs", {
      hero: myHelpCenterConfig.hero,
      taskListMeta: taskListMeta,
      tasks: [], // Empty array - will be fetched from API on client side
      username: req.username || "",
      currentUserId: currentUserId,
      task: null,
      viewer: null,
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

function setupEditTaskRoutes() {
  router.get("/task-edit/:id", authView, async (req, res) => {
    try {
      const taskId = req.params.id;
      if (!taskId) {
        return res.status(400).send("Task ID is required");
      }

      // Fetch task details from API
      const Task = (await import("../entities/Task.js")).default;
      const currentUserId = req.userId || req.user?.id;
      const task = await Task.getTask(taskId, currentUserId);
      
      if (!task) {
        return res.status(404).send("Task not found");
      }

      // Check if current user is the creator
      const creatorId = task.creator?.id || task.creator?._id || task.creator;
      
      if (!currentUserId || String(creatorId) !== String(currentUserId)) {
        return res.status(403).send("Unauthorized: Only the task owner can edit this task");
      }

      // Ensure task has id field (normalize _id to id if needed)
      const normalizedTask = {
        ...task,
        id: task.id || task._id?.toString() || taskId,
      };

      res.render("helpTasks/editTask.ejs", {
        username: req.username || "",
        task: normalizedTask,
      });
    } catch (error) {
      console.error("Error loading edit task page:", error);
      res.status(500).send("Server error");
    }
  });
}
// function setupViewTaskDetailRoutes() {
//   router.get("/task-detail/demo-taskId", (req, res) => {
//     res.render("helpTasks/taskDetail.ejs", {
//       username: req.username || "",
//       task: detailMock.task,
//       viewer: detailMock.viewer,
//     });
//   });
// }
console.log("Setting up routes...");
setupJoinCommunityRoutes();
setupPublicChatRoutes();
setupLoginRoutes();
setupUpdateStatusRoutes();
setupPrivateChatRoutes();
setupAnnouncementRoutes();
setupESNHelpCenterRoutes();
setupMyHelpCenterRoutes();
setupCreateTaskRoutes();
setupEditTaskRoutes();
// setupViewTaskDetailRoutes();

export default router;
