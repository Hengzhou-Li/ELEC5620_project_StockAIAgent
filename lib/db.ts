// lib/db.ts
import mongoose, { Mongoose } from 'mongoose';

// In tests, allow importing the module without env set to enable mocking.
const MONGODB_URI = process.env.MONGODB_URI || (process.env.NODE_ENV === 'test' ? 'mongodb://test.local/db' : undefined);

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

// ---- FIX IS HERE ----
// We declare a specific type for our cached mongoose connection object on the global scope.
// This tells TypeScript what to expect.
interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Extend the NodeJS global type to include our mongoose cache.
declare global {
  var mongoose: MongooseCache;
}
// --------------------

let cached: MongooseCache = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect(): Promise<Mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;