import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion } from "mongodb";
import "dotenv/config";

const PORT = process.env.PORT || 5000;
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// MongoDB Client Initialization
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Database & Collections references
export const db = client.db("unityaid");
export const eventsCollection = db.collection("events");
export const joinedEventsCollection = db.collection("joinedEvents");

// Connect to MongoDB Atlas
export async function connectToMongoDB() {
  try {
    await client.connect();
    // Verify connection by pinging
    await client.db("admin").command({ ping: 1 });
    console.log("✓ Successfully connected to MongoDB Atlas (UnityAid Database)!");
    return client;
  } catch (err) {
    console.error("MongoDB Atlas connection error:", err);
  }
}

connectToMongoDB();

// Root route
app.get("/", (req, res) => {
  res.json({
    name: "UnityAid API — Social Development & Community Events Platform",
    version: "1.0.0",
    status: "active",
    documentation: "Endpoints available under /api/",
  });
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const isConnected = Boolean(client.topology && client.topology.isConnected());
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: isConnected ? "connected" : "ready",
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(500).json({
      status: "degraded",
      error: error.message,
    });
  }
});

// Server listener
app.listen(PORT, () => {
  console.log(`🚀 UnityAid Server is running on port ${PORT}`);
});
