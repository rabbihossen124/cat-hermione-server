import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
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

// Initial Grassroots Community Social Drives for Database Seeding
const initialCommunityDrives = [
  {
    title: "Winter Clothes & Warm Blanket Drive",
    description:
      "Mobilizing local community members in Gulshan and Banani to distribute heavy fleece blankets, jackets, and thermal wear to vulnerable street dwellers and low-income families before severe winter cold waves.",
    eventType: "Donation",
    thumbnail:
      "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80",
    location: "Gulshan 2 Circle, Dhaka",
    eventDate: "2026-11-15T10:00:00.000Z",
    creatorName: "Tanzim Hasan",
    creatorEmail: "tanzim.volunteer@unityaid.org",
    createdAt: new Date().toISOString(),
  },
  {
    title: "Coastal Mangrove & Urban Tree Plantation",
    description:
      "Community forestry initiative planting 1,000 mangrove saplings and shade trees along embankment perimeters to combat coastal river erosion and enhance regional green cover.",
    eventType: "Plantation",
    thumbnail:
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80",
    location: "Shyamnagar, Satkhira",
    eventDate: "2026-11-20T08:30:00.000Z",
    creatorName: "Rafiqul Islam",
    creatorEmail: "rafiqul.trees@unityaid.org",
    createdAt: new Date().toISOString(),
  },
  {
    title: "Clean City Campaign: Plastic Waste Cleanup",
    description:
      "Organizing citizen volunteers for intensive litter cleanup, plastic waste sorting, and roadside recycling education across major commuter avenues in Mirpur.",
    eventType: "Cleanup",
    thumbnail:
      "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80",
    location: "Mirpur 10 Circle, Dhaka",
    eventDate: "2026-11-25T07:00:00.000Z",
    creatorName: "Sumaiya Akter",
    creatorEmail: "sumaiya.clean@unityaid.org",
    createdAt: new Date().toISOString(),
  },
  {
    title: "Children Education & Literacy Stationery Drive",
    description:
      "Distributing textbooks, notebooks, geometry boxes, and creative art kits to support informal youth literacy centers and underprivileged primary students.",
    eventType: "Education",
    thumbnail:
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80",
    location: "New Market, Khulna",
    eventDate: "2026-12-01T11:00:00.000Z",
    creatorName: "Nusrat Jahan",
    creatorEmail: "nusrat.edu@unityaid.org",
    createdAt: new Date().toISOString(),
  },
  {
    title: "Free Rural Healthcare & Diabetes Screening",
    description:
      "Volunteer medical camp providing free physician consultations, blood glucose screening, blood pressure monitoring, and essential generic medicines for rural villagers.",
    eventType: "Medical Aid",
    thumbnail:
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80",
    location: "Pirganj, Rangpur",
    eventDate: "2026-12-08T09:00:00.000Z",
    creatorName: "Dr. Farhana Islam",
    creatorEmail: "farhana.health@unityaid.org",
    createdAt: new Date().toISOString(),
  },
  {
    title: "Emergency Food Relief & Grocery Ration Drive",
    description:
      "Packaging and delivering grocery food parcels (rice, lentils, cooking oil, potatoes, salt) to support low-income families and day-laborers facing seasonal price pressures.",
    eventType: "Donation",
    thumbnail:
      "https://images.unsplash.com/photo-1593113646773-028c64a8f1b8?auto=format&fit=crop&w=800&q=80",
    location: "Dhanmondi Lake Park, Dhaka",
    eventDate: "2026-12-15T10:00:00.000Z",
    creatorName: "Ahsan Habib",
    creatorEmail: "ahsan.relief@unityaid.org",
    createdAt: new Date().toISOString(),
  },
];

// Connect to MongoDB Atlas
export async function connectToMongoDB() {
  try {
    await client.connect();
    // Verify connection by pinging
    await client.db("admin").command({ ping: 1 });
    console.log("✓ Successfully connected to MongoDB Atlas (UnityAid Database)!");

    // Auto-seed initial community drives if collection is empty
    const count = await eventsCollection.countDocuments();
    if (count === 0) {
      await eventsCollection.insertMany(initialCommunityDrives);
      console.log("✓ Seeded 6 verified community social drives into MongoDB Atlas!");
    }

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

// 1. Get All Upcoming Events (Public Directory with search, category filtering & sorting)
app.get("/api/events", async (req, res) => {
  try {
    const { search, category, sort } = req.query;

    const query = {};

    // Strict Future-Date Constraint: Past events must not appear on Upcoming Events page
    const nowISO = new Date().toISOString();
    query.eventDate = { $gte: nowISO };

    // Category Filter (Case-insensitive)
    if (category && category !== "All") {
      query.eventType = { $regex: new RegExp(`^${category.trim()}$`, "i") };
    }

    // Search Term (Matches title, location, or description)
    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { title: { $regex: term, $options: "i" } },
        { location: { $regex: term, $options: "i" } },
        { description: { $regex: term, $options: "i" } },
      ];
    }

    // Sorting logic
    let sortOptions = { eventDate: 1 }; // Default: earliest date first
    if (sort === "date-desc") {
      sortOptions = { eventDate: -1 };
    } else if (sort === "title") {
      sortOptions = { title: 1 };
    }

    const events = await eventsCollection.find(query).sort(sortOptions).toArray();

    return res.json(events);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve events: " + error.message,
    });
  }
});

// 2. Get Recent Upcoming Events (Using .limit(6) operator of MongoDB - Assignment Requirement)
app.get("/api/events/recent", async (req, res) => {
  try {
    const nowISO = new Date().toISOString();
    // Filter for upcoming future events only
    const query = { eventDate: { $gte: nowISO } };

    // Explicitly using MongoDB .limit(6) operator, sorted chronologically
    const recentEvents = await eventsCollection
      .find(query)
      .sort({ eventDate: 1 })
      .limit(6)
      .toArray();

    return res.json(recentEvents);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve recent events: " + error.message,
    });
  }
});

// 3. Create Event Endpoint with strict future-date validation
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

    // Mandatory Fields Validation
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

    // Strict Future-Date Validation
    const eventTime = new Date(eventDate).getTime();
    const currentTime = Date.now();
    if (isNaN(eventTime) || eventTime <= currentTime) {
      return res.status(400).json({
        success: false,
        error: "Event date must be strictly in the future. Past dates are not allowed.",
      });
    }

    // Construct Document
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

// 4. Get Single Event Details (Public Lookup)
app.get("/api/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: "Event ID is required" });
    }

    let query;
    if (ObjectId.isValid(id)) {
      query = {
        $or: [{ _id: new ObjectId(id) }, { _id: id }],
      };
    } else {
      query = { _id: id };
    }

    const event = await eventsCollection.findOne(query);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Community drive not found with the provided ID",
      });
    }

    return res.json(event);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve event details: " + error.message,
    });
  }
});

// Server listener
app.listen(PORT, () => {
  console.log(`🚀 UnityAid Server is running on port ${PORT}`);
});
