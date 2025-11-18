import app from "./app.js";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import Socket from "./middleware/Socket.js";

import { makeUserModel } from "./db/UserSchema.js";
import { makeMsgModel } from "./db/MsgSchema.js";
import { makeStatusModel } from "./db/StatusSchema.js";
import { UserDao } from "./daos/UserDao.js";
import { MsgDao } from "./daos/MsgDao.js";
import { StatusDao } from "./daos/StatusDao.js";
import UserDac from "./dacs/userDac.js";
import MsgDac from "./dacs/msgDac.js";
import StatusDac from "./dacs/statusDac.js";
import { makeAnnouncementModel } from "./db/AnnouncementSchema.js";
import { AnnouncementDao } from "./daos/AnnouncementDao.js";
import AnnouncementDac from "./dacs/announcementDac.js";

async function connectToMongo() {
  // 1. Connect to MongoDB
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error(
      "MONGO_URI environment variable is not set. Please create a .env file with MONGO_URI=mongodb://localhost:27017 (or your MongoDB connection string)"
    );
  }
  await mongoose.connect(mongoUri, {
    dbName: process.env.MONGO_DB || "myDatabase",
  });
}

function setupModels() {
  const modelMap = {
    "user": makeUserModel,
    "message": makeMsgModel,
    "announcement": makeAnnouncementModel,
    "status": makeStatusModel,
  }

  // Make models
  for (const [key, model] of Object.entries(modelMap)) {
    // TODO: When needed, swap mongoose.connection with something else
    modelMap[key] = model(mongoose.connection);
  }

  MsgDac.DAO = new MsgDao({ MessageModel: modelMap.message });
  AnnouncementDac.DAO = new AnnouncementDao({ AnnouncementModel: modelMap.announcement });
  StatusDac.DAO = new StatusDao({ StatusModel: modelMap.status, UserModel: modelMap.user });
  UserDac.DAO = new UserDao({ UserModel: modelMap.user });
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
