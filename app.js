import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import authRoutes from "./routes/authRoutes.js";
import pageRoutes from "./routes/pageRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import speedTestRoutes from "./routes/speedTestRoutes.js";
import userInfoRoutes from "./routes/userInfoRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import helpcenterRoutes from "./routes/helpcenterRoutes.js";
import addressRoutes from "./routes/addressRoutes.js"
import coachingBoardRoutes from "./routes/coachingBoardRoutes.js";
import categorySkillPresetRoutes from "./routes/categorySkillPresetRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import callRoutes from "./routes/callRoutes.js";
import emergencyProfileRoutes from "./routes/emergencyProfileRoutes.js";
import publicEmergencyInfoRoutes from "./routes/publicEmergencyInfoRoutes.js";
import administratorProfileRoutes from "./routes/administratorProfileRoutes.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger/swaggerConfig.js";
import { blockWhenSpeedTest } from "./middleware/blockWhenSpeedTest.js";
import taskRoutes from "./routes/taskRoutes.js";
import { authView } from "./middleware/JWT.js";
import User from "./entities/User.js";
import { USER_ROLE } from "./constants/userRole.js";
import { USER_STATUS } from "./constants/userStatus.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();

function serveSwaggerUI() {
  // Serve Swagger UI
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      swaggerOptions: {
        persistAuthorization: true,
        requestInterceptor: (req) => {
          req.withCredentials = true;
          req.credentials = "include";
          return req;
        },
      },
    })
  );
}

function setupViewEngine() {
  // Set EJS as the template engine
  app.set("view engine", "ejs");

  // Set the views directory (default is "views")
  app.set("views", path.join(__dirname, "views/ejs"));
}
function setupMiddleware() {
  // Middleware
  app.use(express.static(path.join(__dirname, "public")));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Speed Test check
  app.use(blockWhenSpeedTest());
}

function setupDefaultRoute() {
  app.use((req, res) => {
    res.status(404);
    return res.format({
      html: () => res.render("errorPages/404-pageNotFound"),

      json: () => res.json({ error: "NOT_FOUND" }),
      default: () => res.type("txt").send("Not found"),
    });
  });
}

function setupErrorHandling() {
  // Error Handling using err object
  app.use((err, req, res, next) => {
    // if (res.headersSent) return next(err);
    const status = err.status || err.statusCode || 500;
    const msg = err.message || "Internal Server Error";

    console.error(`Error Handling: ${err}`);
    res.status(status);
    return res.format({
      html: () =>
        res.render(
          status === 503
            ? "errorPages/503-serviceUnavailable"
            : "errorPages/404-pageNotFound",
          {
            reason: status === 503 ? msg : undefined,
          },
        ),
      json: () => res.json({ error: status, message: msg }),
      default: () => res.type("txt").send(`${status} ${msg}`),
    });
  });
}

// Initialize all setups
serveSwaggerUI();
setupViewEngine();
setupMiddleware();
setupRoutes();
setupDefaultRoute();
setupErrorHandling();

export default app;

// Helper function to map backend role to frontend privilege
function mapRoleToPrivilege(role) {
  if (role === USER_ROLE.ADMIN) return "Administrator";
  if (role === USER_ROLE.COORDINATOR) return "Coordinator";
  if (role === USER_ROLE.CITIZEN) return "Citizen";
  return "Citizen"; // default
}

// Helper function to map backend status to frontend status
function mapStatusToDisplay(status) {
  if (status === USER_STATUS.ACTIVE) return "Active";
  if (status === USER_STATUS.INACTIVE) return "Inactive";
  return "Inactive"; // default
}

// Helper function to map frontend privilege to backend role
function mapPrivilegeToRole(privilege) {
  if (privilege === "Administrator") return USER_ROLE.ADMIN;
  if (privilege === "Coordinator") return USER_ROLE.COORDINATOR;
  if (privilege === "Citizen") return USER_ROLE.CITIZEN;
  return USER_ROLE.CITIZEN; // default
}

// Helper function to map frontend status to backend status
function mapDisplayToStatus(status) {
  if (status === "Active") return USER_STATUS.ACTIVE;
  if (status === "Inactive") return USER_STATUS.INACTIVE;
  return USER_STATUS.INACTIVE; // default
}

function setupAPIRoutes() {
  // API Routes
  app.use("/api/authentications", authRoutes); // User Login/logout; Account Info retrieval
  app.use("/api/messages/", messageRoutes); // Get & Post Messages
  app.use("/api/users/", userInfoRoutes);
  app.use("/api/announcements", announcementRoutes); // announcement Routes
  app.use("/api/queries", searchRoutes); // search Routes
  app.use("/api/tasks", taskRoutes); // task Routes
  app.use("/api/coaching-boards", coachingBoardRoutes); // coaching board Routes
  app.use("/api/category-skill-presets", categorySkillPresetRoutes); // category skill preset Routes
  app.use("/api/groups/", groupRoutes); // group Routes
  app.use("/api/calls/", callRoutes); // group voice call Routes
  app.use("/api/help-centers", helpcenterRoutes); // help center Routes
  app.use("/api/addresses", addressRoutes);
  app.use("/api/emergency-profiles", emergencyProfileRoutes); // emergency profile Routes
  app.use("/api/public/emergency-profiles", publicEmergencyInfoRoutes); // public emergency profile Routes
  app.use("/api/admin/profiles", administratorProfileRoutes); // administrator profile management Routes
}

function setupSpeedTestRoutes() {
  // Non-API Routes
  app.use("/speed-test", speedTestRoutes); // Speed Test Routes
}

function setupAdminUserListRoute() {
  // Admin User Profile Pages - must be before pageRoutes to avoid 404
  app.get('/admin/users', authView, async (req, res) => {
    try {
      // Fetch current user from database to get up-to-date role (not from JWT)
      const currentUser = await User.findById(req.userId);
      if (!currentUser) {
        return res.status(401).redirect("/");
      }

      // Check if user is admin (from database, not JWT)
      const currentUserObj = currentUser.toObject ? currentUser.toObject() : currentUser;
      if (currentUserObj.role !== USER_ROLE.ADMIN) {
        return res.status(403).render('errorPages/404-pageNotFound');
      }

      // Fetch users directly from database (same logic as controller)
      const activeUsers = await User.getAllUsers();
      const inactiveUsers = await User.getInactiveUsers();
      const allUsers = [...activeUsers, ...inactiveUsers];

      // Map backend format to frontend format
      const members = allUsers.map(user => {
        const userObj = user.toObject ? user.toObject() : user;
        return {
          id: String(userObj._id || userObj.id),
          username: userObj.username,
          status: mapStatusToDisplay(userObj.status),
          privilege: mapRoleToPrivilege(userObj.role)
        };
      });

      res.render('adminUserProfile/pages/member-list', {
        members: members,
        pageTitle: 'Administer User Profile',
        privilege: currentUserObj.role, // Pass current user's role (lowercase: "admin", "coordinator", "citizen")
        username: currentUserObj.username // Pass current user's username for websocket authentication
      });
    } catch (err) {
      console.error("Error fetching users for admin page:", err);
      res.render('adminUserProfile/pages/member-list', {
        members: [],
        pageTitle: 'Administer User Profile',
        privilege: "citizen", // Default fallback
        username: req.username || "" // Fallback to JWT username
      });
    }
  });
}

function setupAdminUserEditRoute() {
  app.get('/admin/users/:id/edit', authView, async (req, res) => {
    try {
      // Fetch current user from database to get up-to-date role (not from JWT)
      const currentUser = await User.findById(req.userId);
      if (!currentUser) {
        return res.status(401).redirect("/");
      }

      // Check if current user is admin (from database, not JWT)
      const currentUserObj = currentUser.toObject ? currentUser.toObject() : currentUser;
      if (currentUserObj.role !== USER_ROLE.ADMIN) {
        return res.status(403).render('errorPages/404-pageNotFound');
      }

      const userId = req.params.id;

      // Fetch user from database
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).render('errorPages/404-pageNotFound');
      }

      // Map backend format to frontend format
      const userObj = user.toObject ? user.toObject() : user;
      const frontendUser = {
        id: String(userObj._id || userObj.id),
        username: userObj.username,
        passwordHash: "********", // Don't expose real password hash
        privilege: mapRoleToPrivilege(userObj.role),
        status: mapStatusToDisplay(userObj.status)
      };

      res.render('adminUserProfile/pages/edit-profile', {
        user: frontendUser,
        pageTitle: 'Edit User Profile',
        privilege: currentUserObj.role, // Pass current user's role (lowercase: "admin", "coordinator", "citizen")
        username: currentUserObj.username // Pass current user's username for websocket authentication
      });
    } catch (err) {
      console.error("Error fetching user for edit page:", err);
      res.status(500).render('errorPages/404-pageNotFound');
    }
  });
}

function setupPageRoutes() {
  app.use("/", pageRoutes); // All routes for separate pages e.g. public chat wall
}

function setupRoutes() {
  setupAPIRoutes();
  setupSpeedTestRoutes();
  setupAdminUserListRoute();
  setupAdminUserEditRoute();
  setupPageRoutes();
}