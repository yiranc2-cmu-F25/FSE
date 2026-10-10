import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger/swaggerConfig.js";
import { blockWhenSpeedTest } from "./middleware/blockWhenSpeedTest.js";
import { mountRoutes } from "./routes/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

function serveSwaggerUI() {
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
    }),
  );
}

function setupViewEngine() {
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views/ejs"));
}

function setupMiddleware() {
  app.use(express.static(path.join(__dirname, "public")));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(blockWhenSpeedTest());
}

/** 404 for anything no router handled. */
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

/** Central error handler: renders an error page or returns JSON by Accept header. */
function setupErrorHandling() {
  app.use((err, req, res, next) => {
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
          { reason: status === 503 ? msg : undefined },
        ),
      json: () => res.json({ error: status, message: msg }),
      default: () => res.type("txt").send(`${status} ${msg}`),
    });
  });
}

serveSwaggerUI();
setupViewEngine();
setupMiddleware();
mountRoutes(app);
setupDefaultRoute();
setupErrorHandling();

export default app;
