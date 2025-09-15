import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import pageRoutes from "./routes/pageRoutes.js";


dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const app = express();

// Set EJS as the template engine
app.set("view engine", "ejs");

// Set the views directory (default is "views")
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api", authRoutes);
app.use("/", pageRoutes);


app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
