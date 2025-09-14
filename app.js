import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use("/api", authRoutes);

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
