import mongoose from "mongoose";
import dotenv from "dotenv";
import { makeUserModel } from "../db/UserSchema.js";
import { SHARED_STATUS } from "../constants/sharedStatus.js";
import { USER_ROLE } from "../constants/userRole.js";
import { PRIVILEGE_LEVEL } from "../constants/privilegeLevel.js";

dotenv.config();

const ADMIN_USERNAME = "esnadmin";
const ADMIN_PASSWORD = "admin";

async function createFirstAdmin() {
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

    console.log(`Checking if admin user '${ADMIN_USERNAME}' already exists...`);

    // Username is stored as lowercase in DB
    const existingAdmin = await UserModel.findOne({ username: ADMIN_USERNAME });

    if (existingAdmin) {
      console.log(`Admin user '${ADMIN_USERNAME}' already exists (ID: ${existingAdmin._id}).`);
      console.log("No action needed.");
      return;
    }

    console.log(`Creating admin user '${ADMIN_USERNAME}'...`);

    const adminUser = await UserModel.create({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      sharedstatus: SHARED_STATUS.OK,
      role: USER_ROLE.ADMIN,
      privilegeLevel: PRIVILEGE_LEVEL.ADMIN,
    });

    console.log(`\nSuccessfully created admin user:`);
    console.log(`  Username: ${adminUser.username}`);
    console.log(`  ID: ${adminUser._id}`);
    console.log(`  Role: ${adminUser.role}`);
    console.log(`  Privilege Level: ${adminUser.privilegeLevel}`);
    console.log(`  Shared Status: ${adminUser.sharedstatus}`);
    console.log(`\nYou can now log in with:`);
    console.log(`  Username: ${ADMIN_USERNAME}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);

  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
  }
}

createFirstAdmin();
