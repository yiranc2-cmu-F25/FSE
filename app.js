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
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger/swaggerConfig.js";
import { blockWhenSpeedTest } from "./middleware/blockWhenSpeedTest.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();

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

// Set EJS as the template engine
app.set("view engine", "ejs");

// Set the views directory (default is "views")
app.set("views", path.join(__dirname, "views/ejs"));

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Speed Test check
app.use(blockWhenSpeedTest());

//Routes
app.use("/api/authentications", authRoutes); // User Login/logout; Account Info retrieval
// console.log("DEBUG messageRoutes typeof =", typeof messageRoutes);
// console.log("DEBUG messageRoutes keys   =", Object.keys(messageRoutes || {}));
app.use("/api/messages/", messageRoutes); // Get & Post Messages
app.use("/api/users/", userInfoRoutes); 
app.use("/speed-test", speedTestRoutes); // Speed Test Routes
app.use("/api/announcements", announcementRoutes); // announcement Routes
app.use("/api/queries", searchRoutes); // search Routes

app.use("/", pageRoutes); // All routes for separate pages e.g. public chat wall


app.use((req, res) => {
  res.status(404);
  return res.format({
    html: () => res.render("errorPages/404-pageNotFound"),

    json: () => res.json({ error: "NOT_FOUND" }),
    default: () => res.type("txt").send("Not found"),
  });
});
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

export default app;
