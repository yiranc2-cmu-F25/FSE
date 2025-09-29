import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import { authView } from "./middleware/JWT.js";
import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import authRoutes from "./routes/authRoutes.js";
import pageRoutes from "./routes/pageRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import Socket from "./Middleware/Socket.js";
import http from "http";
import { Server } from "socket.io";
import { getInitials, getAvatarColor } from "./public/js/utils/avatars.js";
// testing static users data
import users from "./utils/static/user.json" assert { type: "json" };
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await mongoose.connect(process.env.MONGO_URI);

const app = express();

//set up socket.io
const server = http.createServer(app);
const io = new Server(server);
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

app.use("/api/auth", authRoutes);
app.use("/", pageRoutes);

// TODO: check name RESTfulness!
app.use("/api/messages/public", publicRoutes);

// pick any "current user" you like for the greeting card
const currentUser = { firstName: "James", initials: "JB", status: "OK" };

app.get("/landingPage", authView, (req, res) => {
  const token = req.cookies.jwt_token;
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const avatarColor = getAvatarColor(payload.username);
  console.log("getting avatar color: ", avatarColor);
  const currentUser = {
    username: payload.username,
    initials: getInitials(payload.username),
    avatarColor: avatarColor,
  };
  res.render("memberList/membersLanding", { users, currentUser });
});

app.get("/userFunctions", authView, (req, res) => {
  res.render("memberProfile/memberFunction");
});

app.get("/profileUpdate", authView, (req, res) => {
  res.render("memberProfile/profileUpdate");
});

server.listen(process.env.PORT || 3000, () => {
  console.log(
    "Server running at http://localhost:" + (process.env.PORT || 3000),
  );
});
