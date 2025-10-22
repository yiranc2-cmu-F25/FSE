import mongoose from "mongoose";
import dotenv from "dotenv";
import { makeMsgModel } from "../db/MsgSchema.js";

dotenv.config();

async function runMigration() {
  const conn = await mongoose.createConnection(process.env.MONGO_URI).asPromise();
  console.log("[MongoDB] Connected");

  const MessageModel = makeMsgModel(conn);

  const result = await MessageModel.updateMany(
    { receiver: { $ne: null } },
    { $set: { isRead: true } }
  );

  console.log("[Migration Result]:", result);
  await conn.close();
  console.log("[MongoDB] Connection closed");
}

runMigration().catch(err => {
  console.error("[Migration Error]:", err);
  process.exit(1);
});
