import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod = null;

export async function setupTestDb() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("setupTestDb should only be called in test environment");
  }

  if (mongod) {
    await mongod.stop();
    mongod = null;
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  await mongoose.connect(uri, {
    dbName: "test-db",
  });

  return { mongod, uri };
}

export async function setupTestDbWithConnection() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  await mongoose.disconnect();
  
  const conn = await mongoose.createConnection(uri);

  return { mongod, conn, uri };
}


export async function cleanupTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}

export async function cleanupTestDbConnection(conn) {
  if (conn) {
    await conn.close();
  }
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}

