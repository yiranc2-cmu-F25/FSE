const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongo;

module.exports.connect = async () => {
  mongo = await MongoMemoryServer.create();         // ① start in-memory Mongo server
  const uri = mongo.getUri();                       // ② get its temporary URI
  await mongoose.connect(uri, { dbName: "testdb" }); // ③ connect Mongoose to it
};

module.exports.cleanup = async () => {
  const { collections } = mongoose.connection;      // ④ get all collections
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});          // ⑤ delete all docs (reset)
  }
};

module.exports.disconnect = async () => {
  await mongoose.connection.dropDatabase();         // ⑥ drop everything
  await mongoose.connection.close();                // ⑦ close Mongoose connection
  if (mongo) await mongo.stop();                    // ⑧ stop memory server
};
