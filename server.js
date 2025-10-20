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

const conn = await mongoose.createConnection(process.env.MONGO_URI).asPromise();
const UserModel = makeUserModel(conn);
const MessageModel = makeMsgModel(conn);
userDac.DAO = new UserDao({ UserModel });
msgDac.DAO = new MsgDao({ MessageModel });


//set up socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});
const socketInstance = new Socket(io);

app.set("io", io);
app.set("socketInstance", socketInstance);

let serverInstance = server.listen(process.env.PORT || 3000, () => {
  console.log(
    "Server running at http://localhost:" + (process.env.PORT || 3000),
    "Swagger docs at http://localhost:3000/api-docs",
  );
});
