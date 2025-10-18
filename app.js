import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import authRoutes from "./routes/authRoutes.js";
import pageRoutes from "./routes/pageRoutes.js";
import publicMessageRoutes from "./routes/messageRoutes.js";
import speedTestRoutes from "./routes/speedTestRoutes.js";
import Socket from "./Middleware/Socket.js";
import http from "http";
import { Server } from "socket.io";
import { makeUserModel } from "./db/UserSchema.js";
import { makeMsgModel } from "./db/MsgSchema.js";
import { UserDao } from "./daos/UserDao.js";
import { MsgDao } from "./daos/MsgDao.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger/swaggerConfig.js";
import { blockWhenSpeedTest } from "./middleware/blockWhenSpeedTest.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();

const conn = await mongoose.createConnection(process.env.MONGO_URI).asPromise();
const UserModel = makeUserModel(conn);
const MessageModel = makeMsgModel(conn);
app.locals.userDao = new UserDao({ UserModel });
app.locals.msgDao = new MsgDao({ MessageModel });

//set up socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});
const socketInstance = new Socket(io);
// Serve Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.set("io", io);
app.set("socketInstance", socketInstance);

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

server.listen(process.env.PORT || 3000, () => {
  console.log(
    "Server running at http://localhost:" + (process.env.PORT || 3000),
    "Swagger docs at http://localhost:3000/api-docs",
  );
});
