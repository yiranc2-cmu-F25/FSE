import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import authRoutes from "./routes/authRoutes.js";
import pageRoutes from "./routes/pageRoutes.js";
import publicMessageRoutes from "./routes/messageRoutes.js";
import speedTestRoutes from "./routes/speedTestRoutes.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger/swaggerConfig.js";
import { blockWhenSpeedTest } from "./middleware/blockWhenSpeedTest.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();

// Serve Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
app.use("/", pageRoutes); // All routes for separate pages e.g. public chat wall
app.use("/api/messages/", publicMessageRoutes); // Get & Post Public Messages
// app.use("/api/privateMessages/", privateMessageRoutes);

app.use("/speed-test", speedTestRoutes); // Speed Test Routes

// app.use("/error/503", (req, res) => {
//   res.render("errorPages/503-serviceUnavailable");
// });
// app.use("/error/404", (req, res) => {
//   res.render("errorPages/404-pageNotFound");
// });

// 404 handler: Not Found Page Catcher
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
  const status = err.status || error.statusCode || 500;
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
