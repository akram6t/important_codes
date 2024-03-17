const { MongoClient } = require('mongodb');

const MONGO_URL = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'firstdb';

async function MongoConnect(){
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    const db = client.db(DB_NAME);
    return { client, db };
}

module.exports = MongoConnect;