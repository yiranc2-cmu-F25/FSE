import mongoose from "mongoose";

export default function makeTaskParticipantModel(conn) {
  const TaskParticipantSchema = new mongoose.Schema({
    // Task reference
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    // User who joined the task
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Note from user when joining
    note: {
      type: String,
      default: "",
    },
    // Timestamp when user joined
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  });

  // Compound index to ensure a user can only join a task once
  TaskParticipantSchema.index({ task: 1, user: 1 }, { unique: true });

  return conn.model("TaskParticipant", TaskParticipantSchema);
}

