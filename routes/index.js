import authRoutes from "./authRoutes.js";
import messageRoutes from "./messageRoutes.js";
import userInfoRoutes from "./userInfoRoutes.js";
import announcementRoutes from "./announcementRoutes.js";
import searchRoutes from "./searchRoutes.js";
import taskRoutes from "./taskRoutes.js";
import coachingBoardRoutes from "./coachingBoardRoutes.js";
import categorySkillPresetRoutes from "./categorySkillPresetRoutes.js";
import groupRoutes from "./groupRoutes.js";
import callRoutes from "./callRoutes.js";
import helpcenterRoutes from "./helpcenterRoutes.js";
import addressRoutes from "./addressRoutes.js";
import emergencyProfileRoutes from "./emergencyProfileRoutes.js";
import publicEmergencyInfoRoutes from "./publicEmergencyInfoRoutes.js";
import administratorProfileRoutes from "./administratorProfileRoutes.js";
import speedTestRoutes from "./speedTestRoutes.js";
import adminPageRoutes from "./adminPageRoutes.js";
import pageRoutes from "./pageRoutes.js";

/** REST API routers keyed by mount prefix. */
const API_ROUTES = [
  ["/api/authentications", authRoutes], // login/logout, account info
  ["/api/messages", messageRoutes], // public & private messages
  ["/api/users", userInfoRoutes],
  ["/api/announcements", announcementRoutes],
  ["/api/queries", searchRoutes],
  ["/api/tasks", taskRoutes],
  ["/api/coaching-boards", coachingBoardRoutes],
  ["/api/category-skill-presets", categorySkillPresetRoutes],
  ["/api/groups", groupRoutes],
  ["/api/calls", callRoutes], // group voice calls
  ["/api/help-centers", helpcenterRoutes],
  ["/api/addresses", addressRoutes],
  ["/api/emergency-profiles", emergencyProfileRoutes],
  ["/api/public/emergency-profiles", publicEmergencyInfoRoutes],
  ["/api/admin/profiles", administratorProfileRoutes],
];

/**
 * Mounts every router on the app. Order matters: the admin pages must be
 * registered before the catch-all page router so they are not shadowed.
 */
export function mountRoutes(app) {
  for (const [prefix, router] of API_ROUTES) {
    app.use(prefix, router);
  }
  app.use("/speed-test", speedTestRoutes);
  app.use("/admin/users", adminPageRoutes);
  app.use("/", pageRoutes);
}
