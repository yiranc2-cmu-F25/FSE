import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import app from "./app.js";
import Socket from "./middleware/Socket.js";
import { registerDaos } from "./config/daoRegistry.js";

/**
 * Connect to MongoDB
 */
async function connectToMongo() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error(
      "MONGO_URI environment variable is not set. Please create a .env file with MONGO_URI=mongodb://localhost:27017 (or your MongoDB connection string)",
    );
  }

  await mongoose.connect(mongoUri, {
    ...(shouldUseTls(mongoUri) ? { tls: true } : {}),
  });
}

/**
 * Non-SRV Atlas URIs (mongodb://...) need TLS, which the driver only turns on
 * by itself for mongodb+srv://. MONGO_TLS=true|false overrides the guess,
 * e.g. MONGO_TLS=false for a local MongoDB without TLS.
 */
function shouldUseTls(mongoUri) {
  const override = process.env.MONGO_TLS;
  if (override === "true" || override === "false") return override === "true";
  return mongoUri.startsWith("mongodb://");
}

/**
 * Create the HTTP server, bind Socket.IO to it and expose the socket
 * instance to routes/middleware through the Express app.
 */
function setupSocket() {
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

  return server;
}

function getAppPort() {
  return process.env.PORT || 3000;
}

function startServer(server) {
  server.listen(getAppPort(), () => {
    console.log(`Server running at http://localhost:${getAppPort()}/`);
    console.log(`Swagger docs at http://localhost:${getAppPort()}/api-docs`);
  });
}

await connectToMongo();
registerDaos(mongoose.connection);
const server = setupSocket();
startServer(server);
