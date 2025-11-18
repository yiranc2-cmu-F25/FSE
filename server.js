import app from "./app.js";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import Socket from "./middleware/Socket.js";

import { makeUserModel } from "./db/UserSchema.js";
import { makeMsgModel } from "./db/MsgSchema.js";
import { makeStatusModel } from "./db/StatusSchema.js";
import { makeGroupModel } from "./db/GroupSchema.js";
import { makeGroupMessageModel } from "./db/GroupMessageSchema.js";
import { UserDao } from "./daos/UserDao.js";
import { MsgDao } from "./daos/MsgDao.js";
import { StatusDao } from "./daos/StatusDao.js";
import { GroupDao } from "./daos/GroupDao.js";
import { GroupMessageDao } from "./daos/GroupMessageDao.js";
import userDac from "./dacs/userDac.js";
import msgDac from "./dacs/msgDac.js";
import statusDac from "./dacs/statusDac.js";
import groupDac from "./dacs/groupDac.js";
import groupMessageDac from "./dacs/groupMessageDac.js";
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
  // now these use the default connection:
  const UserModel = makeUserModel(mongoose.connection);
  const MessageModel = makeMsgModel(mongoose.connection);
  const AnnouncementModel = makeAnnouncementModel(mongoose.connection);
  const StatusModel = makeStatusModel(mongoose.connection);
  const GroupModel = makeGroupModel(mongoose.connection);
  const GroupMessageModel = makeGroupMessageModel(mongoose.connection);

  // 2. Inject models into DAOs for persistence operations
  userDac.DAO = new UserDao({ UserModel });
  msgDac.DAO = new MsgDao({ MessageModel });
  AnnouncementDac.DAO = new AnnouncementDao({ AnnouncementModel });
  statusDac.DAO = new StatusDao({ StatusModel, UserModel});
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

function startServer(server) {
  let serverInstance = server.listen(process.env.PORT || 3000, () => {
    console.log(
      "Server running at http://localhost:3000/",
    );
    console.log(
      "Swagger docs at http://localhost:3000/api-docs",
    );
  });
}

await connectToMongo();
setupModels();
const server = setupSocket();
startServer(server);
