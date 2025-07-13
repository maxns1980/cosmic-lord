import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI;
if (!uri) {
    throw new Error("Please define the MONGO_URI environment variable inside .env. It should look like: MONGO_URI=mongodb+srv://...");
}

let client: MongoClient;
export let db: Db;

export const connectDB = async () => {
    try {
        client = new MongoClient(uri);
        await client.connect();
        db = client.db('cosmic-lord'); // You can name your database here
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('Could not connect to MongoDB', error);
        throw error;
    }
};
