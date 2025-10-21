import mongoose from "mongoose";

// Connect to default Mongo DB
function connectDefaultDB() {
  const defaultDB = mongoose.connection.db;
  if (!defaultDB) {
    throw new Error("No Mongo DB connection");
  }
  return defaultDB;
}

// Check speed test run id and generate speed test identifier
export function collectionNameFor(runId) {
  if (!runId) {
    throw new Error("runId required");
  }
  return `messages_speed_test_${runId}`;
}

// Create or reset current speed test collection
export async function createSpeedTestCollection(runId) {
  const testCollectionID = collectionNameFor(runId);
  const dbConnection = connectDefaultDB();
  const existing = await dbConnection
    .listCollections({ testCollectionID })
    .toArray();
  if (!existing.length) {
    await dbConnection.createCollection(testCollectionID);
    await dbConnection.collection(testCollectionID).createIndex({ ts: -1 }); // Timestamp index descending
  } else {
    await dbConnection.collection(testCollectionID).deleteMany({});
  }
}

// Drop the current speed test collection
export async function dropSpeedTestCollection(runId) {
  const testCollectionID = collectionNameFor(runId);
  try {
    await connectDefaultDB().dropCollection(testCollectionID);
  } catch (e) {
    // silent the err: ignore NamespaceNotFound
  }
}

// Insert one speed test message into speed test collection (20 chars)
export async function insertSpeedTestMsg(runId, payload) {
  const testCollectionID = collectionNameFor(runId);
  const testCollection = connectDefaultDB().collection(testCollectionID);
  const doc = { payload, ts: Date.now() };
  await testCollection.insertOne(doc);
}

// Read one page with limit per page (sorted newest first)
export async function readSpeedTestMessages(runId, pageNumber, msgLimit) {
  const testCollectionID = collectionNameFor(runId);
  const testCollection = connectDefaultDB().collection(testCollectionID);
  const skip = (pageNumber - 1) * msgLimit;
  const [fetchedItems, docTotal] = await Promise.all([
    testCollection
      .find({})
      .sort({ ts: -1 })
      .skip(skip)
      .limit(msgLimit)
      .toArray(),
    testCollection.estimatedDocumentCount(),
  ]);
  const hasNext = skip + fetchedItems.length < docTotal;
  return { fetchedItems, docTotal, hasNext };
}
