import mongoose from "mongoose";

export function makeTaskModel(conn) {
  const TaskSchema = new mongoose.Schema({
    // ===============================
    // Required fields START
    // ===============================
    title: {
      type: String,
      required: true,
      maxLength: 50,
    },
    helpers: {
      type: Number,
      required: true,
      min: 1,
    },
    // If type is asap or schedule, then dueDate is not required
    taskType: {
      type: String,
      enum: ["normal", "asap", "schedule"],
      required: true,
      default: "normal",
    },
    emergencyLevel: {
      type: String,
      enum: ["critical", "urgent", "standard", "scheduled"],
      required: true,
    },
    category: {
      type: String,
      enum: [
        "debris_removal_and_cleanup",
        "temporary_repair",
        "animal_care",
        "others",
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    // ===============================
    // Required fields END
    // ===============================

    // Conditionally required, but this is not enforced in the schema level but rather in app logic
    // Check descriptions of taskType for more details
    dueDate: {
      type: Date,
    },

    // OPTIONAL fields START
    location: {
      type: String,
    },
    // A Map with String keys and Integer values. Can be empty.
    resourcesNeeded: {
      type: Map,
      of: {
        type: Number,
      },
      default: {},
    },
    skillsRequired: {
      type: [String],
      default: [],
    },
    isOpen: {
      "type": Boolean,
      "default": true,
    }
    // OPTIONAL fields END
  });

  return conn.model("Task", TaskSchema);
}
