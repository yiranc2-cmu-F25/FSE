import app from "./app.js";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import Socket from "./Middleware/Socket.js";

import { makeUserModel } from "./db/UserSchema.js";
import { makeMsgModel } from "./db/MsgSchema.js";
import { UserDao } from "./daos/UserDao.js";
import { MsgDao } from "./daos/MsgDao.js";
import userDac from "./dacs/userDac.js";
import msgDac from "./dacs/msgDac.js";

// 1. Connect to MongoDB
const conn = await mongoose.createConnection(process.env.MONGO_URI).asPromise();
const UserModel = makeUserModel(conn);
const MessageModel = makeMsgModel(conn);
// 2. Inject models into DAOs for persistence operations
userDac.DAO = new UserDao({ UserModel });
msgDac.DAO = new MsgDao({ MessageModel });

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
    "Server running at http://localhost:" + (process.env.PORT || 3000),
    "Swagger docs at http://localhost:3000/api-docs",
  );
});
