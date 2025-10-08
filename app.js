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
import Socket from "./Middleware/Socket.js";
import http from "http";
import { Server } from "socket.io";
import { makeUserModel } from "./db/UserSchema.js";
import { makeMsgModel } from "./db/MsgSchema.js";
import { UserDao } from "./daos/UserDao.js";
import { MsgDao } from "./daos/MsgDao.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();

const conn = await mongoose.createConnection(process.env.MONGO_URI).asPromise();
const UserModel = makeUserModel(conn);
const MessageModel = makeMsgModel(conn)
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

//Routes
app.use("/api/auth", authRoutes);
app.use("/", pageRoutes);
app.use("/api/messages/", publicMessageRoutes);

server.listen(process.env.PORT || 3000, () => {
  console.log(
    "Server running at http://localhost:" + (process.env.PORT || 3000),
  );
});
