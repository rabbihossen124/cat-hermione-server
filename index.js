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

// Serverless MongoDB Connection Assurance Middleware
app.use(async (req, res, next) => {
  try {
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
    }
  } catch (err) {
    console.error("MongoDB reconnection error in serverless environment:", err);
  }
  next();
});

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

// Initial Grassroots Community Social Drives for Database Seeding (2 Demo Events)
const initialCommunityDrives = [
  {
    title: "Winter Clothes & Blanket Drive",
    description:
      "Providing warm blankets and essential winter wear to vulnerable families before the seasonal cold peak. Volunteers help sort clothing packages and assist distribution.",
    eventType: "Donation",
    thumbnail:
      "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80",
    location: "Gulshan, Dhaka",
    eventDate: "2026-11-15T10:00:00.000Z",
    creatorName: "Rahim Khan",
    creatorEmail: "rahim.khan@unityaid.org",
    createdAt: new Date().toISOString(),
  },
  {
    title: "Children Education & Stationery Drive",
    description:
      "Distributing textbooks, notebooks, and creative art kits to support informal youth literacy and primary learning.",
    eventType: "Education",
    thumbnail:
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80",
    location: "New Market, Khulna",
    eventDate: "2026-12-01T11:00:00.000Z",
    creatorName: "Nusrat Jahan",
    creatorEmail: "nusrat.edu@unityaid.org",
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

// ==========================================
// JOINED EVENTS APIs
// ==========================================

// 1. Join an Event Endpoint (With duplicate prevention)
app.post("/api/joined-events", async (req, res) => {
  try {
    const {
      eventId,
      eventTitle,
      eventDate,
      location,
      eventType,
      thumbnail,
      userEmail,
      userName,
    } = req.body;

    if (!eventId) {
      return res.status(400).json({ success: false, error: "Event ID is required to register." });
    }

    // Determine volunteer email: from verified token or request body
    let finalUserEmail = userEmail ? userEmail.trim().toLowerCase() : "";
    let finalUserName = userName ? userName.trim() : "Volunteer";

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.email) {
          finalUserEmail = decoded.email.toLowerCase();
          if (decoded.name) finalUserName = decoded.name;
        }
      } catch {
        // Fallback to body userEmail
      }
    }

    if (!finalUserEmail) {
      return res.status(401).json({
        success: false,
        error: "User authentication required. Please log in to join this community drive.",
      });
    }

    // Duplicate Prevention Check: Cannot join the same event twice
    const existing = await joinedEventsCollection.findOne({
      eventId: String(eventId),
      userEmail: finalUserEmail,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: "You are already registered as an active volunteer for this event.",
      });
    }

    const joinDoc = {
      eventId: String(eventId),
      eventTitle: (eventTitle || "Community Drive").trim(),
      eventDate: eventDate || new Date().toISOString(),
      location: (location || "Dhaka").trim(),
      eventType: (eventType || "Community").trim(),
      thumbnail: (thumbnail || "").trim(),
      userEmail: finalUserEmail,
      userName: finalUserName,
      joinedAt: new Date().toISOString(),
    };

    const result = await joinedEventsCollection.insertOne(joinDoc);

    return res.status(201).json({
      success: true,
      message: "Successfully registered as a volunteer!",
      insertedId: result.insertedId,
      record: { _id: result.insertedId, ...joinDoc },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to join event: " + error.message,
    });
  }
});

// 2. Get My Joined Events (Sorted by Event Date)
app.get("/api/joined-events/my", async (req, res) => {
  try {
    let email = req.query.email ? req.query.email.trim().toLowerCase() : "";

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.email) {
          email = decoded.email.toLowerCase();
        }
      } catch {
        // Fallback to query email
      }
    }

    if (!email) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Log in or valid user email required to view joined events.",
      });
    }

    // Find and sort chronologically by event date
    const myJoined = await joinedEventsCollection
      .find({ userEmail: email })
      .sort({ eventDate: 1 })
      .toArray();

    return res.json(myJoined);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve joined events: " + error.message,
    });
  }
});

// 3. Cancel / Withdraw Volunteer Registration
app.delete("/api/joined-events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: "Registration ID is required." });
    }

    let userEmail = "";
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.email) {
          userEmail = decoded.email.toLowerCase();
        }
      } catch {
        // ignore
      }
    }

    let filter;
    if (ObjectId.isValid(id)) {
      filter = {
        $or: [{ _id: new ObjectId(id) }, { _id: id }, { eventId: id }],
      };
    } else {
      filter = {
        $or: [{ _id: id }, { eventId: id }],
      };
    }

    if (userEmail) {
      filter.userEmail = userEmail;
    }

    const result = await joinedEventsCollection.deleteOne(filter);

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Joined event registration not found or already canceled.",
      });
    }

    return res.json({
      success: true,
      message: "Volunteer registration withdrawn successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to cancel volunteer registration: " + error.message,
    });
  }
});

// ==========================================
// ORGANIZER MANAGE EVENTS APIs
// ==========================================

// 1. Get My Hosted Events (Private Organizer Route)
app.get("/api/events/my-events", async (req, res) => {
  try {
    let email = req.query.email ? req.query.email.trim().toLowerCase() : "";

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.email) {
          email = decoded.email.toLowerCase();
        }
      } catch {
        // Fallback to query email
      }
    }

    if (!email) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Organizer authentication required to view hosted events.",
      });
    }

    const myEvents = await eventsCollection
      .find({ creatorEmail: email })
      .sort({ eventDate: 1 })
      .toArray();

    return res.json(myEvents);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve organizer events: " + error.message,
    });
  }
});

// 2. Update Event Endpoint (With Future-Date Validation & Ownership Verification)
app.put("/api/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: "Event ID is required for update." });
    }

    const { title, description, eventType, thumbnail, location, eventDate } = req.body;

    // Strict Future-Date Validation if date is being updated
    if (eventDate) {
      const eventTime = new Date(eventDate).getTime();
      const currentTime = Date.now();
      if (isNaN(eventTime) || eventTime <= currentTime) {
        return res.status(400).json({
          success: false,
          error: "Updated event date must be strictly in the future. Past dates are not allowed.",
        });
      }
    }

    let filter;
    if (ObjectId.isValid(id)) {
      filter = {
        $or: [{ _id: new ObjectId(id) }, { _id: id }],
      };
    } else {
      filter = { _id: id };
    }

    // Check if event exists
    const existing = await eventsCollection.findOne(filter);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Event not found with the provided ID.",
      });
    }

    // Ownership Verification (if token provided)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (
          decoded &&
          decoded.email &&
          existing.creatorEmail &&
          decoded.email.toLowerCase() !== existing.creatorEmail.toLowerCase()
        ) {
          return res.status(403).json({
            success: false,
            error: "Forbidden: You are only authorized to update events you have created.",
          });
        }
      } catch {
        // proceed if token decode fails or offline mode
      }
    }

    // Build update payload
    const updateFields = {};
    if (title !== undefined) updateFields.title = title.trim();
    if (description !== undefined) updateFields.description = description.trim();
    if (eventType !== undefined) updateFields.eventType = eventType.trim();
    if (thumbnail !== undefined) updateFields.thumbnail = thumbnail.trim();
    if (location !== undefined) updateFields.location = location.trim();
    if (eventDate !== undefined) updateFields.eventDate = new Date(eventDate).toISOString();
    updateFields.updatedAt = new Date().toISOString();

    const result = await eventsCollection.updateOne(filter, { $set: updateFields });

    return res.json({
      success: true,
      message: "Community drive updated successfully!",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to update event: " + error.message,
    });
  }
});

// 3. Delete Event Endpoint (With Ownership Verification & Cleanup)
app.delete("/api/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: "Event ID is required for deletion." });
    }

    let filter;
    if (ObjectId.isValid(id)) {
      filter = {
        $or: [{ _id: new ObjectId(id) }, { _id: id }],
      };
    } else {
      filter = { _id: id };
    }

    // Check if event exists
    const existing = await eventsCollection.findOne(filter);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Event not found with the provided ID.",
      });
    }

    // Ownership Verification (if token provided)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (
          decoded &&
          decoded.email &&
          existing.creatorEmail &&
          decoded.email.toLowerCase() !== existing.creatorEmail.toLowerCase()
        ) {
          return res.status(403).json({
            success: false,
            error: "Forbidden: You are only authorized to delete events you have created.",
          });
        }
      } catch {
        // proceed
      }
    }

    // Delete the event
    const result = await eventsCollection.deleteOne(filter);

    // Also clean up any volunteer registrations associated with this event
    try {
      await joinedEventsCollection.deleteMany({ eventId: String(id) });
    } catch {
      // ignore
    }

    return res.json({
      success: true,
      message: "Community drive and associated volunteer records deleted successfully.",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to delete event: " + error.message,
    });
  }
});

// Local server listener (runs only when not in Vercel serverless environment)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 UnityAid Server is running on port ${PORT}`);
  });
}

// Export default app for Vercel serverless functions
export default app;
