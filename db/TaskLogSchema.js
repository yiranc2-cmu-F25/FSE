import mongoose from "mongoose";

export default function makeTaskLogModel(conn) {
  const TaskLogSchema = new mongoose.Schema({
    // Task reference
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    // User who created the log
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Log summary/description
    summary: {
      type: String,
      required: true,
    },
    // Timestamp when log was created
    timestamp: {
      type: Date,
      default: Date.now,
    },
  });

  // Index for efficient querying by task
  TaskLogSchema.index({ task: 1, timestamp: -1 });

  return conn.model("TaskLog", TaskLogSchema);
}

