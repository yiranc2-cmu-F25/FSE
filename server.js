import app from "./app.js";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import Socket from "./middleware/Socket.js";

import { makeUserModel } from "./db/UserSchema.js";
import { makeMsgModel } from "./db/MsgSchema.js";
import { UserDao } from "./daos/UserDao.js";
import { MsgDao } from "./daos/MsgDao.js";
import userDac from "./dacs/userDac.js";
import msgDac from "./dacs/msgDac.js";
import { makeAnnouncementModel } from "./db/AnnouncementSchema.js";
import { AnnouncementDao } from "./daos/AnnouncementDao.js";
import AnnouncementDac from "./dacs/announcementDac.js";

// 1. Connect to MongoDB
await mongoose.connect(process.env.MONGO_URI, {
  dbName: process.env.MONGO_DB || "myDatabase",
});

// now these use the default connection:
const UserModel = makeUserModel(mongoose.connection);
const MessageModel = makeMsgModel(mongoose.connection);
const AnnouncementModel = makeAnnouncementModel(mongoose.connection);
// 2. Inject models into DAOs for persistence operations
userDac.DAO = new UserDao({ UserModel });
msgDac.DAO = new MsgDao({ MessageModel });
AnnouncementDac.DAO = new AnnouncementDao({ AnnouncementModel });
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

let serverInstance = server.listen(process.env.PORT || 3000, () => {
  console.log(
    "Server running at http://localhost:3000/",
  );
  console.log(
    "Swagger docs at http://localhost:3000/api-docs",
  );
});
