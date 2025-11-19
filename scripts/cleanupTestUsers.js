import mongoose from "mongoose";
import dotenv from "dotenv";
import { makeUserModel } from "../db/UserSchema.js";

dotenv.config();

const TEST_USERNAME_PREFIXES = ["alice", "bob", "charlie", "status", "getstatus"];

async function cleanupTestUsers() {
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

    console.log("Searching for test users...");
    console.log(`Looking for users starting with: ${TEST_USERNAME_PREFIXES.join(", ")}`);
    
    // Username is stored as lowercase in DB
    const lowercasePatterns = TEST_USERNAME_PREFIXES.map((u) => u.toLowerCase());
    
    // Escape special regex characters and create pattern: ^(alice|bob|charlie|status)
    const escapedPatterns = lowercasePatterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regexPattern = `^(${escapedPatterns.join('|')})`;
    
    const users = await UserModel.find({
      username: { $regex: regexPattern }
    }).select("username _id");

    if (users.length === 0) {
      console.log("No test users found to delete.");
      return;
    }

    console.log(`Found ${users.length} user(s) to delete:`);
    users.forEach((user) => {
      console.log(`  - ${user.username} (ID: ${user._id})`);
    });

    // Delete all matching users
    const result = await UserModel.deleteMany({
      username: { $regex: regexPattern }
    });

    console.log(`\nSuccessfully deleted ${result.deletedCount} user(s).`);

  } catch (error) {
    console.error("Error cleaning up users:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

cleanupTestUsers();

