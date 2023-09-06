require("dotenv").config();
const {MongoClient} = require('mongodb');
const dbname = process.env.DB_NAME || 'xwapit';
const url = process.env.DB_URI || 'mongodb://127.0.0.1:27017';
const cluster = process.env.DB_CLUSTER || 'cluster0.0jx8t';
const client = new MongoClient(url);
let Db;



const connect = async() => {
  try {
    let con = await client.connect()
         Db = con.db(dbname)
    console.log(`connected to Db:${Db.databaseName}.`)
    return Db;
  } catch (error) {
    //console.log(`App cannot start this time as database connect cannot be established.`)
    return false
  }
  

}

const getDb = () => {
  return Db;
}

module.exports = {
  connect,
  getDb
}