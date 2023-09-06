const DbConnection = require('../config/database')

const find = async (collection) => {
   const Database = DbConnection.getDb()
   const coll = Database.collection(collection)
   const data = await coll.find({}).toArray()
   return data
}

const findQuery = async (collection,query) => {
    const Database = DbConnection.getDb()
    const coll = Database.collection(collection)
    const data = await coll.find(query).toArray()
    return data
}

const insertMany=async (collection,data) => {
    const Database = DbConnection.getDb()
    const coll = Database.collection(collection)
    const insert_details = await coll.insertMany(data)
    return insert_details
}

const insertOne = async (collection,data) =>{
    const Database = DbConnection.getDb()
    const coll = Database.collection(collection)
    const insert_details = await coll.insertOne(data)
    return insert_details
}

const updateOne = async (collection,data) =>{
    //todos
}

const updateMany = async (collection, data) => { 
 //todos

}


module.exports = {
    find,
    findQuery,
    insertMany,
    insertOne,
    updateOne,
    updateMany
}