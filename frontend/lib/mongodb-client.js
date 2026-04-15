// lib/mongodb-client.js
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI

if (!uri) throw new Error('Add MONGODB_URI to .env.local')

let clientPromise

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  const client = new MongoClient(uri)
  clientPromise = client.connect()
}

export default clientPromise