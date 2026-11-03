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

// JWT Verification Middleware (Assignment Challenge Requirement)
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

// ==========================================
// EVENTS APIs
// ==========================================

// Create Event Endpoint with strict future-date validation
app.post("/api/events", async (req, res) => {
  try {
    const {
      title,
      description,
      eventType,
      thumbnail,
      location,
      eventDate,
      creatorName,
      creatorEmail,
    } = req.body;

    // 1. Mandatory Fields Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: "Event title is required." });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, error: "Event description is required." });
    }
    if (!location || !location.trim()) {
      return res.status(400).json({ success: false, error: "Event location/assembly point is required." });
    }
    if (!thumbnail || !thumbnail.trim()) {
      return res.status(400).json({ success: false, error: "Event thumbnail image URL is required." });
    }
    if (!eventDate) {
      return res.status(400).json({ success: false, error: "Event date is required." });
    }

    // Determine creator email: from verified token or request body
    let finalCreatorEmail = creatorEmail ? creatorEmail.trim().toLowerCase() : "";
    let finalCreatorName = creatorName ? creatorName.trim() : "Community Organizer";

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.email) {
          finalCreatorEmail = decoded.email.toLowerCase();
          if (decoded.name) finalCreatorName = decoded.name;
        }
      } catch {
        // Fallback to body creatorEmail
      }
    }

    if (!finalCreatorEmail) {
      return res.status(400).json({
        success: false,
        error: "Creator email is required to associate and authenticate event ownership.",
      });
    }

    // 2. Strict Future-Date Validation
    const eventTime = new Date(eventDate).getTime();
    const currentTime = Date.now();
    if (isNaN(eventTime) || eventTime <= currentTime) {
      return res.status(400).json({
        success: false,
        error: "Event date must be strictly in the future. Past dates are not allowed.",
      });
    }

    // 3. Construct Document
    const eventDoc = {
      title: title.trim(),
      description: description.trim(),
      eventType: eventType ? eventType.trim() : "Donation",
      thumbnail: thumbnail.trim(),
      location: location.trim(),
      eventDate: new Date(eventDate).toISOString(),
      creatorName: finalCreatorName,
      creatorEmail: finalCreatorEmail,
      createdAt: new Date().toISOString(),
    };

    const result = await eventsCollection.insertOne(eventDoc);

    return res.status(201).json({
      success: true,
      message: "Community drive created successfully!",
      insertedId: result.insertedId,
      event: { _id: result.insertedId, ...eventDoc },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to create event: " + error.message,
    });
  }
});

// Server listener
app.listen(PORT, () => {
  console.log(`🚀 UnityAid Server is running on port ${PORT}`);
});
