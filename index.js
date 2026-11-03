import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { MongoClient, ServerApiVersion } from "mongodb";
import "dotenv/config";

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "unityaid_super_secret_jwt_key_2026_bangladesh";

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

// JWT Verification Middleware (Assignment Challenge part)
export function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized access: Authorization header missing",
    });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      success: false,
      error: "Unauthorized access: Bearer token format required",
    });
  }

  const token = parts[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: "Forbidden access: Invalid or expired token",
      });
    }
    req.user = decoded;
    next();
  });
}

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

// JWT Token Generation Endpoint
app.post("/api/auth/jwt", (req, res) => {
  try {
    const user = req.body;
    if (!user || !user.email) {
      return res.status(400).json({
        success: false,
        error: "User email is required to issue a JWT token",
      });
    }

    const payload = {
      email: user.email,
      name: user.name || "",
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
    res.json({
      success: true,
      token,
      message: "JWT token issued successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to generate JWT token: " + error.message,
    });
  }
});

// Protected Profile / Token Verification Endpoint
app.get("/api/auth/me", verifyJWT, (req, res) => {
  res.json({
    success: true,
    message: "Authenticated successfully with JWT token",
    user: req.user,
  });
});

// Server listener
app.listen(PORT, () => {
  console.log(`🚀 UnityAid Server is running on port ${PORT}`);
});
