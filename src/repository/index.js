const DbConnection = require("../config/database")

const find = async (collection) => {
  const Database = DbConnection.getDb()
  const coll = Database.collection(collection)
  const data = await coll.find({}).toArray()
  return data
}

const findQuery = async (collection, query) => {
  const Database = DbConnection.getDb()
  const coll = Database.collection(collection)
  const data = await coll.find(query).toArray()
  return data
}

const insertMany = async (collection, data) => {
  const Database = DbConnection.getDb()
  const coll = Database.collection(collection)
  const insert_details = await coll.insertMany(data)
  return insert_details
}

const insertOne = async (collection, data) => {
  const Database = DbConnection.getDb()
  const coll = Database.collection(collection)
  const insert_details = await coll.insertOne(data)
  return insert_details
}



const updateOne = async (collection, filter, update, options = {}) => {
  const Database = DbConnection.getDb();
  const coll = Database.collection(collection);
  return await coll.updateOne(filter, update, options);
};

const updateMany = async (collection, filter, update, options = {}) => {
  const Database = DbConnection.getDb();
  const coll = Database.collection(collection);
  return await coll.updateMany(filter, update, options);
};


// const updateOne = async (collection, filter, update, options = {}) => {
//   const Database = DbConnection.getDb();
//   const coll = Database.collection(collection);
//   const result = await coll.updateOne(filter, update, options);
//   return result;
// };

// const updateMany = async (collection, item, data) => {
//   const Database = DbConnection.getDb()
//   const coll = Database.collection(collection)

//   const update = await coll.updateOne(item, {
//     $set: data, // Pass fields directly to $set
//   })

//   return update
// }

const deleteOne = async (collection, data) => {
  const Database = DbConnection.getDb()
  const coll = Database.collection(collection)
  const delete_details = await coll.deleteOne(data)
  return delete_details
}

const updateWithOperators = async (
  collection,
  filter,
  update,
  options = {}
) => {
  const Database = DbConnection.getDb();
  const coll = Database.collection(collection);
  const result = await coll.updateOne(filter, update, options);
  return result;
};

module.exports = {
  find,
  findQuery,
  insertMany,
  insertOne,
  updateOne,
  updateMany,
  deleteOne,
  updateWithOperators
}
