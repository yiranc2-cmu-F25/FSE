import mongoose from "mongoose";
import dotenv from "dotenv";
import { makeUserModel } from "../db/UserSchema.js";

dotenv.config();

async function lowercaseSharedStatus() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error(
        "MONGO_URI environment variable is not set. Please set it in your .env file"
      );
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGO_DB || "myDatabase",
    });

    const UserModel = makeUserModel(mongoose.connection);

    console.log("Fetching all users...");
    const users = await UserModel.find({}).select("username sharedstatus _id");

    console.log(`Found ${users.length} user(s).`);

    if (users.length === 0) {
      console.log("No users found.");
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;

    console.log("\nProcessing users...");

    for (const user of users) {
      const originalStatus = user.sharedstatus;
      const lowercaseStatus = originalStatus ? originalStatus.toLowerCase() : originalStatus;

      if (originalStatus !== lowercaseStatus) {
        await UserModel.findByIdAndUpdate(user._id, {
          sharedstatus: lowercaseStatus,
        });
        console.log(`  ✓ Updated '${user.username}': '${originalStatus}' → '${lowercaseStatus}'`);
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`\nCompleted:`);
    console.log(`  Updated: ${updatedCount} user(s)`);
    console.log(`  Skipped: ${skippedCount} user(s) (already lowercase)`);

  } catch (error) {
    console.error("Error updating shared status:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
  }
}

lowercaseSharedStatus();
