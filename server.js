import app from "./app.js";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import Socket from "./middleware/Socket.js";

import { makeUserModel } from "./db/UserSchema.js";
import { makeMsgModel } from "./db/MsgSchema.js";
import { makeStatusModel } from "./db/StatusSchema.js";
import makeTaskModel from "./db/TaskSchema.js";
import makeTaskParticipantModel from "./db/TaskParticipantSchema.js";
import makeTaskLogModel from "./db/TaskLogSchema.js";
import { makeGroupModel } from "./db/GroupSchema.js";
import { makeGroupMessageModel } from "./db/GroupMessageSchema.js";
import { UserDao } from "./daos/UserDao.js";
import { MsgDao } from "./daos/MsgDao.js";
import { StatusDao } from "./daos/StatusDao.js";
import { GroupDao } from "./daos/GroupDao.js";
import { GroupMessageDao } from "./daos/GroupMessageDao.js";
import UserDac from "./dacs/userDac.js";
import MsgDac from "./dacs/msgDac.js";
import StatusDac from "./dacs/statusDac.js";
import groupDac from "./dacs/groupDac.js";
import groupMessageDac from "./dacs/groupMessageDac.js";
import { makeAnnouncementModel } from "./db/AnnouncementSchema.js";
import { AnnouncementDao } from "./daos/AnnouncementDao.js";
import AnnouncementDac from "./dacs/announcementDac.js";
import { makeHelpCenterModel } from "./db/HelpCenterSchema.js";
import { HelpCenterDao } from "./daos/HelpCenterDao.js";
import HelpCenterDac from "./dacs/helpCenterDac.js";
import TaskDao from "./daos/TaskDao.js";
import TaskDac from "./dacs/taskDac.js";
import { makeCoachingBoardModel } from "./db/CoachingBoardSchema.js";
import { CoachingBoardDao } from "./daos/CoachingBoardDao.js";
import CoachingBoardDac from "./dacs/coachingBoardDac.js";
import { makeCategorySkillPresetModel } from "./db/CategorySkillPresetSchema.js";
import { CategorySkillPresetDao } from "./daos/CategorySkillPresetDao.js";
import CategorySkillPresetDac from "./dacs/categorySkillPresetDac.js";

/**
 * Connect to MongoDB
 */
async function connectToMongo() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error(
      "MONGO_URI environment variable is not set. Please create a .env file with MONGO_URI=mongodb://localhost:27017 (or your MongoDB connection string)"
    );
  }

  const useTls = mongoUri.startsWith("mongodb://");

  await mongoose.connect(mongoUri, {
    // dbName: process.env.MONGO_DB || "myDatabase",
    ...(useTls ? { tls: true } : {}),
  });
}

function setupModels() {
  const UserModel = makeUserModel(mongoose.connection);
  const MessageModel = makeMsgModel(mongoose.connection);
  const AnnouncementModel = makeAnnouncementModel(mongoose.connection);
  const StatusModel = makeStatusModel(mongoose.connection);
  const HelpCenterModel = makeHelpCenterModel(mongoose.connection);
  const CoachingBoardModel = makeCoachingBoardModel(mongoose.connection);
  const CategorySkillPresetModel = makeCategorySkillPresetModel(mongoose.connection);
  const TaskModel = makeTaskModel(mongoose.connection);
  const TaskParticipantModel = makeTaskParticipantModel(mongoose.connection);
  const TaskLogModel = makeTaskLogModel(mongoose.connection);
  const GroupModel = makeGroupModel(mongoose.connection);
  const GroupMessageModel = makeGroupMessageModel(mongoose.connection);

  UserDac.DAO = new UserDao({ UserModel });
  MsgDac.DAO = new MsgDao({ MessageModel });
  AnnouncementDac.DAO = new AnnouncementDao({ AnnouncementModel });
  HelpCenterDac.DAO = new HelpCenterDao({ HelpCenterModel });
  StatusDac.DAO = new StatusDao({ StatusModel, UserModel });
  CoachingBoardDac.DAO = new CoachingBoardDao({ CoachingBoardModel });
  CategorySkillPresetDac.DAO = new CategorySkillPresetDao({ CategorySkillPresetModel });
  TaskDac.DAO = new TaskDao({ 
    TaskModel,
    TaskParticipantModel,
    TaskLogModel,
  });
  groupDac.DAO = new GroupDao({ GroupModel });
  groupMessageDac.DAO = new GroupMessageDao({ GroupMessageModel });
}

function setupSocket() {
  // 3. Create HTTP server and bind Socket.IO
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });
  const socketInstance = new Socket(io);

  // 4. Expose Socket.IO to routes/middleware
  // set up socket.io instance in app
  app.set("io", io);
  app.set("socketInstance", socketInstance);

  return server;
}

function getAppPort() {
  return process.env.PORT || 3000;
}

function startServer(server) {
  server.listen(getAppPort(), () => {
    console.log(
      `Server running at http://localhost:${getAppPort()}/`,
    );
    console.log(
      `Swagger docs at http://localhost:${getAppPort()}/api-docs`,
    );
  });
}

await connectToMongo();
setupModels();
const server = setupSocket();
startServer(server);
