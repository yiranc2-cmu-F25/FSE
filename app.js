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
import Socket from "./Middleware/Socket.js";
import http from "http";
import { Server } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await mongoose.connect(process.env.MONGO_URI);

const app = express();

//set up socket.io
const server = http.createServer(app);
const io = new Server(server);
const socketInstance = new Socket(io);
app.set('socketInstance', socketInstance);



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

app.listen(process.env.PORT || 3000, () => {
    console.log("Server running at http://localhost:" + (process.env.PORT || 3000));
});


