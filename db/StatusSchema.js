import mongoose from "mongoose";
import { SHARED_STATUS } from "../constants/sharedStatus.js";

export function makeStatusModel(conn) {
  const StatusHistorySchema = new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      status: {
        type: String,
        enum: Object.values(SHARED_STATUS),
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
        index: true,
      },
    }
  );

  StatusHistorySchema.index({ user: 1, timestamp: -1, _id: -1 });

  return conn.model("StatusHistory", StatusHistorySchema);
}
