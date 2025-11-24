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
import coachingBoardRoutes from "./routes/coachingBoardRoutes.js";
import categorySkillPresetRoutes from "./routes/categorySkillPresetRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import callRoutes from "./routes/callRoutes.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger/swaggerConfig.js";
import { blockWhenSpeedTest } from "./middleware/blockWhenSpeedTest.js";
import taskRoutes from "./routes/taskRoutes.js";

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

function setupRoutes() {
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

  // Non-API Routes
  app.use("/speed-test", speedTestRoutes); // Speed Test Routes
  app.use("/", pageRoutes); // All routes for separate pages e.g. public chat wall
}