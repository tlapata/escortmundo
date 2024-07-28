import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from "mongodb";


// Getting variables
dotenv.config();
const dbURL = process.env.ATLAS_URI;

const client = new MongoClient(dbURL, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
});

const connectDB = async () => {
    try {
        // Connect the client to the server
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch(err) {
        console.error(err);
    }
};

connectDB();

let db = client.db("sexceska");

export default db;